import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import './App.css'; // Import global styles

// Create root element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Could not find root element');
}

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);