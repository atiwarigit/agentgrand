// @ts-ignore
console.log('main.tsx: Starting import process...');

try {
  const React = await import('react');
  console.log('main.tsx: React imported', React);
  
  const { createRoot } = await import('react-dom/client');
  console.log('main.tsx: createRoot imported', createRoot);
  
  const { default: App } = await import('./App.js');
  console.log('main.tsx: App imported', App);

  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root element not found');
  }

  const root = createRoot(container);
  root.render(React.default.createElement(App));
  console.log('main.tsx: App rendered successfully');
} catch (error) {
  console.error('main.tsx: Error loading app:', error);
  document.getElementById('root').innerHTML = `
    <div style="padding: 20px; background: #fee; border: 1px solid #fcc; border-radius: 5px;">
      <h1 style="color: #c00;">Error Loading Application</h1>
      <pre style="margin-top: 10px; font-size: 12px;">${error.message}\n${error.stack}</pre>
    </div>
  `;
}