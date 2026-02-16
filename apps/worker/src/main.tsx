import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@home-services/ui';
import { AuthProvider } from './auth';
import App from './App';
import './index.css';

const basename = (import.meta.env.VITE_BASE_PATH as string | undefined)?.replace(/\/$/, '') || '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <Toaster position="top-right">
        <AuthProvider>
          <App />
        </AuthProvider>
      </Toaster>
    </BrowserRouter>
  </React.StrictMode>
);
