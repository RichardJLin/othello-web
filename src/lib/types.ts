export interface OthelloGameInstance {
  getGameState: () => string;
  makeMove: (position: number) => boolean;
  makeAIMove: () => boolean;
  setAISimulationTime: (milliseconds: number) => void;
  newGame: (playerColor: number) => void;
  getPossibleMoves: () => string;
  getCurrentPlayer: () => number;
  getMCTSStats: (position: number) => string;
}

export interface OthelloModule {
  OthelloGame: new (playerColor: number) => OthelloGameInstance;
}


export interface GameInstance {
  module: OthelloModule | null;
  game: OthelloGameInstance | null;
}


/*
export interface GameInstance {
	OthelloModule: new (playerColor: number) => OthelloModule;
}
*/

export interface GameState {
  board: (0 | 1 | null)[];
  currentPlayer: number;
  possibleMoves: number[];
  winner: number | null;
  blackCount: number;
  whiteCount: number;
}

export interface GameScores {
  black: number;
  white: number;
}

export interface MCTSStats {
  visits: number;
  wins: number;
}

export interface MCTSStatsOverlayProps {
  stats: MCTSStats | null;
}
declare global {
  interface Window {
    createOthelloModule: (options?: Record<string, unknown>) => Promise<OthelloModule>;
  }
}
