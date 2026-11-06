// Builds every logo/icon asset from assets/deity-cutout.png (background already removed).
import sharp from 'sharp';

const deity = await sharp('assets/deity-cutout.png').trim().png().toBuffer();

// Small transparent image used at the top of the PDF
await sharp(deity).resize({ height: 360 }).png({ compressionLevel: 9 }).toFile('public/deity.png');

const bgSvg = (rx) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#a8302f"/><stop offset="0.6" stop-color="#7d181a"/><stop offset="1" stop-color="#4f0d0f"/></radialGradient>
    <radialGradient id="halo" cx="50%" cy="45%" r="45%"><stop offset="0" stop-color="#f7c65c" stop-opacity="0.35"/><stop offset="1" stop-color="#f7c65c" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1024" height="1024" rx="${rx}" fill="url(#bg)"/>
  <circle cx="512" cy="480" r="420" fill="url(#halo)"/>
</svg>`);

async function compose(size, rx, scale) {
  const h = Math.round(1024 * scale);
  const art = await sharp(deity).resize({ height: h, width: Math.round(h * 0.9), fit: 'inside' }).toBuffer();
  const meta = await sharp(art).metadata();
  const img = await sharp(bgSvg(rx))
    .composite([{ input: art, left: Math.round((1024 - meta.width) / 2), top: Math.round((1024 - meta.height) / 2) }])
    .png()
    .toBuffer();
  return sharp(img).resize(size, size);
}

await (await compose(256, 230, 0.86)).toFile('public/logo.png');
await (await compose(512, 230, 0.86)).toFile('public/icon-512.png');
await (await compose(180, 0, 0.86)).toFile('public/apple-touch-icon.png');
await (await compose(64, 230, 0.9)).toFile('public/favicon.png');

// Capacitor sources
await (await compose(1024, 0, 0.86)).toFile('assets/icon-only.png');
const fgArt = await sharp(deity).resize({ height: 600, width: 560, fit: 'inside' }).toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: fgArt, gravity: 'center' }]).png().toFile('assets/icon-foreground.png');
await sharp(bgSvg(0)).png().toFile('assets/icon-background.png');
const splashArt = await (await compose(720, 160, 0.86)).toBuffer();
for (const [name, color] of [['splash.png', '#f5efe3'], ['splash-dark.png', '#2a1c14']]) {
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: color } })
    .composite([{ input: splashArt, gravity: 'center' }]).png().toFile('assets/' + name);
}
console.log('icons done');
