import type { OthelloModule } from './types';

let othelloModule: OthelloModule | null = null;

export async function loadOthelloModule(): Promise<OthelloModule> {
  if (othelloModule) return othelloModule;
  
  try {
    // Dynamically import the WASM module
    const OthelloWasm = await import('./wasm-loader').then(m => m.default);
    othelloModule = await OthelloWasm({
      locateFile: (path: string) => `wasm/${path}`
    });
    return othelloModule;
  } catch (error) {
    console.error('Failed to load Othello WASM module:', error);
    throw error;
  }
}

