import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL;

// Configure axios baseURL for production
// Remove trailing slash if present
if (API_URL && API_URL.trim() !== '') {
  axios.defaults.baseURL = API_URL.trim().replace(/\/$/, '');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
