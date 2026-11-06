import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/noto-sans-kannada/400.css';
import '@fontsource/noto-sans-kannada/500.css';
import '@fontsource/noto-sans-kannada/600.css';
import '@fontsource/noto-serif-kannada/600.css';
import '@fontsource/noto-serif-kannada/700.css';
import './styles.css';
import App from './App';
import { ToastProvider } from './components/ui';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
