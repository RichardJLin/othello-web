"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { loadOthelloModule } from '@/lib/othello';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type {
  GameInstance,
  GameState,
  GameScores,
  MCTSStats,
  MCTSStatsOverlayProps
} from '@/lib/types';

const MCTSStatsOverlay = ({ stats }: MCTSStatsOverlayProps) => {
  if (!stats || !stats.visits) return null;
  
  const winRate = stats.visits > 0 ? (stats.wins / stats.visits * 100).toFixed(1) : 0;
  
  return (
    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-2 shadow-lg z-50 whitespace-nowrap">
      <div className="text-sm font-medium">
        Win Rate: {winRate}%
      </div>
      <div className="text-xs text-gray-500">
        ({stats.wins}/{stats.visits} simulations)
      </div>
    </div>
  );
};

const OthelloBoard = () => {
  const [board, setBoard] = useState<(0 | 1 | null)[]>(() => {
    const initialBoard = Array(64).fill(null);
    initialBoard[27] = 0; // White
    initialBoard[28] = 1; // Black
    initialBoard[35] = 1; // Black
    initialBoard[36] = 0; // White
    return initialBoard;
  });

  const [gameInstance, setGameInstance] = useState<GameInstance>({
    module: null,
    game: null
  });
  
  const [currentPlayer, setCurrentPlayer] = useState<number>(1);
  const [possibleMoves, setPossibleMoves] = useState<number[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<GameScores>({ black: 2, white: 2 });
  const [playerColor, setPlayerColor] = useState<number>(0);
  const [showStartScreen, setShowStartScreen] = useState<boolean>(true);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [hoveredCellStats, setHoveredCellStats] = useState<MCTSStats | null>(null);
  const [hint, setHint] = useState<number | null>(null);
  const [hintStats, setHintStats] = useState<MCTSStats | null>(null);

  const updateGameState = useCallback((gameState: string) => {
    const state: GameState = JSON.parse(gameState);
    setBoard(state.board);
    setCurrentPlayer(state.currentPlayer);
    setPossibleMoves(state.possibleMoves);
    setWinner(state.winner === -1 ? null : state.winner);
    setScores({
      black: state.blackCount,
      white: state.whiteCount
    });
  }, []);

  // Initialize WASM module
  useEffect(() => {
    const initGame = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const othelloModule = await loadOthelloModule();
        setGameInstance({
					module: othelloModule,
					game: null
				});
				setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize Othello:', error);
        setError('Failed to load the game. Please refresh to try again.');
        setIsLoading(false);
      }
    };

    initGame();
  }, []);

  const startGame = useCallback((selectedColor: number) => {
    if (!gameInstance || !gameInstance.module) return;
    setPlayerColor(selectedColor);
    const game = new gameInstance.module.OthelloGame(selectedColor);
    setGameInstance((prev) => {
      if (!prev || !prev.module) {
				throw new Error("Module not initialized");
			} 
      return { ...prev, game };
    });

    // If player chose white, make AI's first move
    if (selectedColor === 0) {
      setTimeout(() => {
        game.makeAIMove();
        updateGameState(game.getGameState());
      }, 100);
    } else {
      updateGameState(game.getGameState());
    }
    
    setShowStartScreen(false);
  }, [gameInstance, updateGameState]);

  const handleCellClick = useCallback((index: number) => {
    if (!gameInstance?.game || !possibleMoves.includes(index) || winner !== null) return;

    const moveSuccessful = gameInstance.game.makeMove(index);
    if (moveSuccessful) {
      updateGameState(gameInstance.game.getGameState());
      // Clear any active hints or stats
      setHint(null);
      setHintStats(null);
      setHoveredCell(null);
      setHoveredCellStats(null);
    }
  }, [gameInstance, possibleMoves, winner, updateGameState]);

  const handleCellHover = useCallback((index: number | null) => {
    if (!gameInstance?.game || !index || !possibleMoves.includes(index) || currentPlayer !== playerColor) {
      setHoveredCell(null);
      setHoveredCellStats(null);
      return;
    }

    setHoveredCell(index);
    try {
      const stats = JSON.parse(gameInstance.game.getMCTSStats(index));
      if (stats.visits > 0) {
	setHoveredCellStats({
	  visits: stats.visits,
	  wins: stats.visits - stats.wins
	});
      } else {
	setHoveredCellStats(null);
      }
    } catch (error) {
      console.error('Error getting MCTS stats:', error);
      setHoveredCellStats(null);
    }
  }, [gameInstance, possibleMoves, currentPlayer, playerColor]);

  const handleShowHint = useCallback(() => {
    if (!gameInstance?.game || currentPlayer !== playerColor) return;
    
    let bestMove = -1;
    let bestStats = null;
    let maxWinRate = -1;
    
    possibleMoves.forEach(move => {
      try {
	const game = gameInstance.game;
	if (!game) return;
	
	const stats = JSON.parse(game.getMCTSStats(move));
	if (stats.visits > 0) {
	  const winRate = 1 - (stats.wins / stats.visits);
	  if (winRate > maxWinRate) {
	    maxWinRate = winRate;
	    bestMove = move;
	    bestStats = {
	      visits: stats.visits,
	      wins: stats.visits - stats.wins
	    };
	  }
	}
      } catch (error) {
	console.error('Error analyzing move:', error);
      }
    });

    setHint(bestMove);
    setHintStats(bestStats);
    
    setTimeout(() => {
      setHint(null);
      setHintStats(null);
    }, 3000);
  }, [gameInstance, currentPlayer, playerColor, possibleMoves]);


  const startNewGame = useCallback(() => {
    setShowStartScreen(true);
    setHint(null);
    setHintStats(null);
    setHoveredCell(null);
    setHoveredCellStats(null);
  }, []);

  const renderCell = (value: 0 | 1 | null, index: number) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    const isPossibleMove = possibleMoves.includes(index);
    const isHovered = index === hoveredCell;
    const isHint = index === hint;
    
    return (
      <div 
        key={`cell-${index}`}
        onClick={() => handleCellClick(index)}
        onMouseEnter={() => handleCellHover(index)}
        onMouseLeave={() => handleCellHover(null)}
        className={`relative aspect-square min-w-[2rem] min-h-[2rem] w-full 
          border border-green-900/50 flex items-center justify-center 
          ${isPossibleMove ? 'cursor-pointer bg-green-700/50' : 'bg-green-800'}
          ${isHovered || isHint ? 'ring-2 ring-yellow-400' : ''}`}
      >
        {value !== null && (
          <div 
            className={`absolute w-[80%] h-[80%] rounded-full transform transition-all duration-200
              ${value === 1 ? 'bg-black' : 'bg-white border-2 border-gray-300'}`}
          />
        )}
        {isPossibleMove && (
          <div className="absolute w-[15%] h-[15%] rounded-full bg-green-400 opacity-50" />
        )}
        {isHovered && hoveredCellStats && (
          <MCTSStatsOverlay stats={hoveredCellStats} />
        )}
        {isHint && hintStats && (
          <MCTSStatsOverlay stats={hintStats} />
        )}
        {index < 8 && (
          <div className="absolute -top-8 text-sm font-semibold text-gray-700">{col}</div>
        )}
        {col === 0 && (
          <div className="absolute -left-8 text-sm font-semibold text-gray-700">{row}</div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold">Loading Othello...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-red-600">{error}</div>
      </div>
    );
  }

  if (showStartScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-3xl font-bold mb-6">Choose Your Color</h1>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => startGame(1)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
            >
              <div className="w-4 h-4 rounded-full bg-black border border-white"></div>
              Play as Black
            </button>
            <button
              onClick={() => startGame(0)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-900 rounded hover:bg-gray-200 transition-colors"
            >
              <div className="w-4 h-4 rounded-full bg-white border border-gray-300"></div>
              Play as White
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-[95vw] w-[800px] mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6">
        {currentPlayer === playerColor && !winner && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Hover over possible moves to see win rates from AI analysis
            </AlertDescription>
          </Alert>
        )}
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-4">Othello</h1>
          <div className="flex justify-between items-center px-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-black" />
              <span className="font-medium">
                Black {playerColor === 1 ? '(You)' : '(AI)'}: {scores.black}
              </span>
            </div>
            <div className="text-lg font-semibold">
              {winner !== null ? (
                `Winner: ${winner === playerColor ? 'You' : winner === -2 ? 'Draw' : 'AI'}`
              ) : (
                `Current Player: ${currentPlayer === playerColor ? 'You' : 'AI'}`
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                White {playerColor === 0 ? '(You)' : '(AI)'}: {scores.white}
              </span>
              <div className="w-4 h-4 rounded-full bg-white border border-gray-300" />
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            {winner !== null && (
              <button
                onClick={startNewGame}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                New Game
              </button>
            )}
            {winner === null && currentPlayer === playerColor && (
              <button
                onClick={handleShowHint}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Show Hint
              </button>
            )}
          </div>
        </div>
        
        <div className="relative pt-8 pl-8">
          <div className="grid grid-cols-8 gap-0 aspect-square w-full max-w-[800px] mx-auto">
            {board.map((value, index) => renderCell(value, index))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OthelloBoard;
