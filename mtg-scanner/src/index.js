import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Aqui ele importa o código do scanner que você salvou no App.js

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Este bloco ativa o PWA (instalação no celular)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Scanner PWA: Pronto!', reg))
      .catch(err => console.error('Erro no registro do PWA:', err));
  });
}