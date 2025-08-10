// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/themes.css';       // defines CSS variables like --card-bg, --text-primary
import './styles/components.css';  // your global component styles
import App from './App';
import reportWebVitals from './reportWebVitals';

// Create root element and render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance monitoring (optional)
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();