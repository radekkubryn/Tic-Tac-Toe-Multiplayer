
import React, { useState, useEffect, useCallback } from 'react';
import Board from './Board';
import type { GameState, Player } from '../types';

interface GameScreenProps {
  gameId: string;
  playerRole: Player;
  onLeaveGame: () => void;
}

const calculateWinner = (board: (Player | null)[]): { winner: Player | 'draw' | null, line: number[] | null } => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: lines[i] };
    }
  }
  if (board.every(cell => cell !== null)) {
    return { winner: 'draw', line: null };
  }
  return { winner: null, line: null };
};


const GameScreen: React.FC<GameScreenProps> = ({ gameId, playerRole, onLeaveGame }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const updateGameState = useCallback((newState: GameState) => {
    localStorage.setItem(`ttt-game-${gameId}`, JSON.stringify(newState));
    setGameState(newState);
  }, [gameId]);

  useEffect(() => {
    const initialData = localStorage.getItem(`ttt-game-${gameId}`);
    if (initialData) {
      setGameState(JSON.parse(initialData));
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `ttt-game-${gameId}` && event.newValue) {
        setGameState(JSON.parse(event.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [gameId]);

  const handleCellClick = (index: number) => {
    if (!gameState || !gameState.playerJoined || gameState.winner || gameState.board[index] || gameState.currentPlayer !== playerRole) {
      return;
    }

    const newBoard = [...gameState.board];
    newBoard[index] = playerRole;
    const { winner, line } = calculateWinner(newBoard);

    updateGameState({
      ...gameState,
      board: newBoard,
      currentPlayer: playerRole === 'X' ? 'O' : 'X',
      winner: winner,
      winningLine: line,
    });
  };

  const handleResetGame = () => {
    if(!gameState) return;
    const newGameState: GameState = {
      board: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null,
      winningLine: null,
      playerJoined: true,
    };
    updateGameState(newGameState);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(gameId);
  };
  
  if (!gameState) {
    return <div className="text-center text-slate-400">Loading game...</div>;
  }
  
  const { board, currentPlayer, winner, playerJoined, winningLine } = gameState;

  let status;
  if (winner) {
    status = winner === 'draw' ? "It's a Draw!" : `Player ${winner} Wins!`;
  } else if (!playerJoined) {
    status = 'Waiting for Player 2 to join...';
  } else {
    status = `Player ${currentPlayer}'s Turn`;
  }

  const isMyTurn = !winner && playerJoined && currentPlayer === playerRole;

  return (
    <div className="flex flex-col items-center space-y-6 w-full animate-fade-in">
        <div className="bg-slate-800 p-4 rounded-lg shadow-lg w-full text-center">
            <p className="text-slate-400 text-sm">Game ID</p>
            <div className="flex justify-center items-center gap-2 mt-1">
                <p className="text-2xl font-mono tracking-widest text-cyan-400">{gameId}</p>
                <button onClick={handleCopyId} className="p-1.5 rounded-md hover:bg-slate-700 transition" title="Copy Game ID">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
            <p className="text-sm mt-2 text-slate-400">You are Player <span className={`font-bold ${playerRole === 'X' ? 'text-cyan-400' : 'text-purple-400'}`}>{playerRole}</span></p>
        </div>

      <div className={`p-2 rounded-lg transition-shadow ${isMyTurn ? 'shadow-lg shadow-cyan-500/20' : ''}`}>
        <Board board={board} onClick={handleCellClick} winningLine={winningLine}/>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg shadow-lg w-full text-center h-20 flex items-center justify-center">
        <p className={`text-2xl font-bold transition-all duration-300 ${winner ? 'text-green-400' : 'text-slate-200'}`}>{status}</p>
      </div>
      
      <div className="flex space-x-4 w-full">
        {winner && (
            <button
            onClick={handleResetGame}
            className="flex-1 bg-cyan-500 text-white font-bold py-3 rounded-md hover:bg-cyan-600 transition-transform transform hover:scale-105"
            >
            Play Again
            </button>
        )}
        <button
            onClick={onLeaveGame}
            className="flex-1 bg-red-600 text-white font-bold py-3 rounded-md hover:bg-red-700 transition-transform transform hover:scale-105"
        >
            Leave Game
        </button>
      </div>
    </div>
  );
};

export default GameScreen;
