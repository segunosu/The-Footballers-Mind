import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@tpm/design-system/tokens.css';
import '@tpm/design-system/typography.css';
import '@tpm/design-system/components.css';
import './app.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
