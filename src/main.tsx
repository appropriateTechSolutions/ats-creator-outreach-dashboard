import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { APP_NAME } from './lib/constants';

// Single source of truth for the browser tab title (white-label friendly).
document.title = APP_NAME;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
