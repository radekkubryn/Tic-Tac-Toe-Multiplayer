
import React, { useState } from 'react';
import type { GameState, Player } from '../types';

interface HomeScreenProps {
  onCreateGame: (gameId: string) => void;
  onJoinGame: (gameId: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onCreateGame, onJoinGame }) => {
  const [joinId, setJoinId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const generateGameId = (): string => {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  const handleCreate = () => {
    const newGameId = generateGameId();
    const initialGameState: GameState = {
      board: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null,
      winningLine: null,
      playerJoined: false,
    };
    localStorage.setItem(`ttt-game-${newGameId}`, JSON.stringify(initialGameState));
    onCreateGame(newGameId);
  };

  const handleJoin = () => {
    setError(null);
    if (!joinId) {
      setError('Please enter a Game ID.');
      return;
    }

    const gameData = localStorage.getItem(`ttt-game-${joinId.toUpperCase()}`);
    if (!gameData) {
      setError('Game ID not found. Please check the ID and try again.');
      return;
    }

    const gameState: GameState = JSON.parse(gameData);
    if (gameState.playerJoined) {
        // Allow rejoining if the game is already started
        // This is a simple implementation, in a real app you might have player-specific tokens
    }
    
    gameState.playerJoined = true;
    localStorage.setItem(`ttt-game-${joinId.toUpperCase()}`, JSON.stringify(gameState));

    onJoinGame(joinId.toUpperCase());
  };

  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full animate-fade-in">
      <div className="flex flex-col space-y-4">
        <h2 className="text-2xl font-bold text-center text-slate-200">Join a Game</h2>
        <input
          type="text"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          placeholder="Enter 5-digit Game ID"
          maxLength={5}
          className="p-3 bg-slate-700 border-2 border-slate-600 rounded-md text-center uppercase tracking-widest focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
        />
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button
          onClick={handleJoin}
          className="w-full bg-purple-600 text-white font-bold py-3 rounded-md hover:bg-purple-700 transition-transform transform hover:scale-105"
        >
          Join Game
        </button>
      </div>
      <div className="relative flex py-5 items-center">
        <div className="flex-grow border-t border-slate-600"></div>
        <span className="flex-shrink mx-4 text-slate-400">OR</span>
        <div className="flex-grow border-t border-slate-600"></div>
      </div>
      <div className="text-center">
        <button
          onClick={handleCreate}
          className="w-full bg-cyan-500 text-white font-bold py-3 rounded-md hover:bg-cyan-600 transition-transform transform hover:scale-105"
        >
          Create New Game
        </button>
      </div>
    </div>
  );
};

export default HomeScreen;
