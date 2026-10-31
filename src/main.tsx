import React from 'react';
import ReactDOM from 'react-dom/client';
import RTTutor from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RTTutor />
    </React.StrictMode>
  );
}

