import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@thuraaung2493/dynamic-form-react/styles.css';
import './styles.css';
import { App } from './app/App.js';

const root = document.querySelector('#root');
if (root === null) {
  throw new Error('The application root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
