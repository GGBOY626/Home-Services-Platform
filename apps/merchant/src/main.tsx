import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@home-services/ui';
import { AuthProvider } from './auth';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Toaster>
    </BrowserRouter>
  </React.StrictMode>
);
