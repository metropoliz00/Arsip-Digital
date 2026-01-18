import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<div style="color:red; padding:20px;">Error: Root element not found.</div>';
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Render Error:", error);
  rootElement.innerHTML = `<div style="padding: 20px; font-family: sans-serif;">
    <h3 style="color: red;">Aplikasi Gagal Dimuat</h3>
    <p>Silakan refresh halaman atau hubungi admin.</p>
    <pre style="background: #f0f0f0; padding: 10px; overflow: auto;">${error instanceof Error ? error.message : JSON.stringify(error)}</pre>
  </div>`;
}