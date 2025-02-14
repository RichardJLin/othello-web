export default async function createModule(options = {}) {
  if (typeof window === 'undefined') {
    throw new Error('WASM module can only be loaded in the browser');
  }

  try {
    if (!window.createOthelloModule) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'wasm/othello.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    if (typeof window.createOthelloModule !== 'function') {
      throw new Error('WASM module initialization function not found');
    }

    const moduleInstance = await window.createOthelloModule(options);
    console.log('Module loaded:', moduleInstance);
    return moduleInstance;
  } catch (error) {
    console.error('Failed to load WASM module:', error);
    throw error;
  }
}
