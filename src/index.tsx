import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './renderer/App';
import './renderer/styles/index.css';
import './renderer/i18n';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
