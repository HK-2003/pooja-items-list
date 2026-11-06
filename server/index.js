import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { seedItems, defaultSettings } from './seed.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'; // set MONGODB_URI in .env
const DB_NAME = process.env.DB_NAME || 'pooja_samagri';
const PORT = Number(process.env.PORT || 4000);

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db(DB_NAME);
const Items = db.collection('items');
const Lists = db.collection('lists');
const Settings = db.collection('settings');
const Functions = db.collection('functions');
const Users = db.collection('users');

const id = () => randomUUID();
const out = ({ _id, ...rest }) => ({ id: _id, ...rest });

async function seedItemsIfEmpty(force = false) {
  if (force) await Items.deleteMany({});
  if ((await Items.countDocuments()) === 0) {
    await Items.insertMany(seedItems.map(([name, qty, unit], i) => ({ _id: id(), name, qty, unit, order: i })));
  }
}
await seedItemsIfEmpty();
if ((await Functions.countDocuments()) === 0) {
  await Functions.insertMany(
    ['ಗಣಪತಿ ಹೋಮಕ್ಕೆ', 'ಸತ್ಯನಾರಾಯಣ ಪೂಜೆಗೆ', 'ಗೃಹಪ್ರವೇಶಕ್ಕೆ', 'ನವಗ್ರಹ ಹೋಮಕ್ಕೆ', 'ಮೃತ್ಯುಂಜಯ ಹೋಮಕ್ಕೆ'].map((name, order) => ({ _id: id(), name, order })),
  );
}
await Settings.updateOne({ _id: 'main' }, { $setOnInsert: defaultSettings }, { upsert: true });
await Lists.createIndex({ userId: 1, updatedAt: -1 });
await Users.createIndex({ phone: 1 }, { unique: true });
// Sample list matching the original PDF (only on a fresh database)
if ((await Lists.countDocuments()) === 0) {
  const items = await Items.find().sort({ order: 1 }).toArray();
  const now = Date.now();
  await Lists.insertOne({
    _id: id(),
    poojaName: 'ಗಣಪತಿ ಹೋಮಕ್ಕೆ',
    hostName: '',
    date: '',
    place: '',
    notes: '',
    entries: items.map((i) => ({ itemId: i._id, name: i.name, qty: i.qty, unit: i.unit })),
    createdAt: now,
    updatedAt: now,
  });
}

const getSettings = () => Settings.findOne({ _id: 'main' });
const publicSettings = ({ _id, pin, ...s }) => s;

const app = express();
app.use(cors());
app.use(express.json({ limit: '3mb' }));

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: 'Server error' });
});

/** Admin-only routes require the PIN in the x-admin-pin header. */
const admin = (fn) => wrap(async (req, res) => {
  const s = await getSettings();
  if (req.get('x-admin-pin') !== s.pin) return res.status(401).json({ error: 'Invalid PIN' });
  return fn(req, res);
});

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ---------- Settings ---------- */
app.get('/api/settings', wrap(async (_req, res) => res.json(publicSettings(await getSettings()))));

app.post('/api/admin/verify', wrap(async (req, res) => {
  const s = await getSettings();
  res.status(req.body?.pin === s.pin ? 200 : 401).json({ ok: req.body?.pin === s.pin });
}));

app.put('/api/settings', admin(async (req, res) => {
  const b = req.body || {};
  const update = {};
  for (const k of ['symbol', 'blessing', 'priestName', 'place', 'phone', 'subtitle']) if (k in b) update[k] = str(b[k]);
  if (b.pin !== undefined) {
    if (!/^\d{4,8}$/.test(b.pin)) return res.status(400).json({ error: 'PIN must be 4–8 digits' });
    update.pin = b.pin;
  }
  if (b.logo !== undefined) {
    const ok = b.logo === 'default' || b.logo === 'none' || (typeof b.logo === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(b.logo) && b.logo.length < 2_000_000);
    if (!ok) return res.status(400).json({ error: 'Logo must be a PNG, JPG or WebP under 1.5 MB' });
    update.logo = b.logo;
  }
  await Settings.updateOne({ _id: 'main' }, { $set: update });
  res.json(publicSettings(await getSettings()));
}));

/* ---------- Items ---------- */
const allItems = async () => (await Items.find().sort({ order: 1 }).toArray()).map(out);

app.get('/api/items', wrap(async (_req, res) => res.json(await allItems())));

app.post('/api/items', admin(async (req, res) => {
  const name = str(req.body?.name);
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const last = await Items.find().sort({ order: -1 }).limit(1).next();
  const doc = { _id: id(), name, qty: str(req.body.qty, 60), unit: str(req.body.unit, 40), order: (last?.order ?? -1) + 1 };
  await Items.insertOne(doc);
  res.status(201).json(out(doc));
}));

app.put('/api/items/:id', admin(async (req, res) => {
  const name = str(req.body?.name);
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const r = await Items.findOneAndUpdate(
    { _id: req.params.id },
    { $set: { name, qty: str(req.body.qty, 60), unit: str(req.body.unit, 40) } },
    { returnDocument: 'after' },
  );
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(out(r));
}));

app.delete('/api/items/:id', admin(async (req, res) => {
  await Items.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
}));

app.post('/api/items/reorder', admin(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (ids.length) await Items.bulkWrite(ids.map((_id, order) => ({ updateOne: { filter: { _id }, update: { $set: { order } } } })));
  res.json(await allItems());
}));

app.post('/api/items/reset', admin(async (_req, res) => {
  await seedItemsIfEmpty(true);
  res.json(await allItems());
}));

/* ---------- Predefined functions (pooja names) ---------- */
const allFunctions = async () => (await Functions.find().sort({ order: 1 }).toArray()).map(out);

app.get('/api/functions', wrap(async (_req, res) => res.json(await allFunctions())));

app.post('/api/functions', admin(async (req, res) => {
  const name = str(req.body?.name);
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (await Functions.findOne({ name })) return res.status(409).json({ error: 'This function already exists' });
  const last = await Functions.find().sort({ order: -1 }).limit(1).next();
  const doc = { _id: id(), name, order: (last?.order ?? -1) + 1 };
  await Functions.insertOne(doc);
  res.status(201).json(out(doc));
}));

app.put('/api/functions/:id', admin(async (req, res) => {
  const name = str(req.body?.name);
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const r = await Functions.findOneAndUpdate({ _id: req.params.id }, { $set: { name } }, { returnDocument: 'after' });
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(out(r));
}));

app.delete('/api/functions/:id', admin(async (req, res) => {
  await Functions.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
}));

app.post('/api/functions/reorder', admin(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (ids.length) await Functions.bulkWrite(ids.map((_id, order) => ({ updateOne: { filter: { _id }, update: { $set: { order } } } })));
  res.json(await allFunctions());
}));

/* ---------- Saved lists ---------- */
const cleanList = (b = {}) => ({
  poojaName: str(b.poojaName),
  hostName: str(b.hostName),
  date: str(b.date, 40),
  place: str(b.place),
  notes: str(b.notes, 2000),
  entries: (Array.isArray(b.entries) ? b.entries : []).slice(0, 500).map((e) => ({
    itemId: str(e.itemId, 80),
    name: str(e.name),
    qty: str(e.qty, 60),
    unit: str(e.unit, 40),
  })).filter((e) => e.name),
});

/* ---------- Users (each device registers once; phone identifies the person) ---------- */
const cleanPhone = (v) => (typeof v === 'string' ? v.replace(/[^\d+]/g, '').slice(0, 15) : '');
const cleanUser = (b = {}) => ({ name: str(b.name, 80), place: str(b.place, 80), phone: cleanPhone(b.phone), blessing: str(b.blessing, 120) });
const userErr = (u) => (!u.name ? 'Name is required' : !u.place ? 'Place is required' : u.phone.replace(/\D/g, '').length < 10 ? 'Enter a valid 10-digit phone number' : '');

app.post('/api/users', wrap(async (req, res) => {
  const u = cleanUser(req.body);
  const err = userErr(u);
  if (err) return res.status(400).json({ error: err });
  const existing = await Users.findOne({ phone: u.phone });
  if (existing) return res.json({ ...out(existing), existing: true });
  const doc = { _id: id(), ...u, createdAt: Date.now() };
  await Users.insertOne(doc);
  res.status(201).json(out(doc));
}));

app.get('/api/users/:id', wrap(async (req, res) => {
  const u = await Users.findOne({ _id: req.params.id });
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(out(u));
}));

app.put('/api/users/:id', wrap(async (req, res) => {
  const u = cleanUser(req.body);
  const err = userErr(u);
  if (err) return res.status(400).json({ error: err });
  const clash = await Users.findOne({ phone: u.phone, _id: { $ne: req.params.id } });
  if (clash) return res.status(409).json({ error: 'This phone number is already registered' });
  const r = await Users.findOneAndUpdate({ _id: req.params.id }, { $set: u }, { returnDocument: 'after' });
  if (!r) return res.status(404).json({ error: 'User not found' });
  res.json(out(r));
}));

app.get('/api/admin/users', admin(async (_req, res) => {
  const counts = Object.fromEntries((await Lists.aggregate([{ $group: { _id: '$userId', n: { $sum: 1 } } }]).toArray()).map((c) => [c._id, c.n]));
  res.json((await Users.find().sort({ createdAt: -1 }).toArray()).map((u) => ({ ...out(u), lists: counts[u._id] || 0 })));
}));

/** Lists belong to the user identified by the x-user-id header. */
const withUser = (fn) => wrap(async (req, res) => {
  const userId = req.get('x-user-id');
  if (!userId || !(await Users.findOne({ _id: userId }))) return res.status(401).json({ error: 'Please set up your profile first' });
  req.userId = userId;
  return fn(req, res);
});

app.get('/api/lists', withUser(async (req, res) => {
  res.json((await Lists.find({ userId: req.userId }).sort({ updatedAt: -1 }).toArray()).map(out));
}));

app.post('/api/lists', withUser(async (req, res) => {
  const data = cleanList(req.body);
  if (!data.poojaName) return res.status(400).json({ error: 'Pooja name is required' });
  if (!data.entries.length) return res.status(400).json({ error: 'Select at least one item' });
  const now = Date.now();
  const doc = { _id: id(), userId: req.userId, ...data, createdAt: now, updatedAt: now };
  await Lists.insertOne(doc);
  res.status(201).json(out(doc));
}));

app.put('/api/lists/:id', withUser(async (req, res) => {
  const data = cleanList(req.body);
  if (!data.poojaName) return res.status(400).json({ error: 'Pooja name is required' });
  if (!data.entries.length) return res.status(400).json({ error: 'Select at least one item' });
  const r = await Lists.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { $set: { ...data, updatedAt: Date.now() } }, { returnDocument: 'after' });
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(out(r));
}));

app.delete('/api/lists/:id', withUser(async (req, res) => {
  await Lists.deleteOne({ _id: req.params.id, userId: req.userId });
  res.json({ ok: true });
}));

app.listen(PORT, '0.0.0.0', () => console.log(`API on http://localhost:${PORT} (db: ${DB_NAME})`));
