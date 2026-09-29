import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './theme/ThemeProvider';
import { buildThemeStylesheet } from './theme/themes';

// Theme tokens are generated from the registry so themes live in one place.
const themeStyle = document.createElement('style');
themeStyle.id = 'theme-tokens';
themeStyle.textContent = buildThemeStylesheet();
document.head.appendChild(themeStyle);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
