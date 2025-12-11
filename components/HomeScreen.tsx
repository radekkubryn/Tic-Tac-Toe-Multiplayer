
import React, { useState } from 'react';
import type { GameState } from '../types';

interface HomeScreenProps {
  onCreateGame: (gameId: string) => void;
  onJoinGame: (gameId: string) => void;
  onPlayVsComputer: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onCreateGame, onJoinGame, onPlayVsComputer }) => {
  const [joinId, setJoinId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use relative path for production (served by same origin)
  // For local dev with separate ports, you might need a proxy or keep localhost:8000, 
  // but for Docker we serve from same port.
  // To make it work in both:
  const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : '';

  const handleCreate = async () => {
    try {
      const response = await fetch(`${API_URL}/create`, { method: 'POST' });
      const data = await response.json();
      onCreateGame(data.gameId);
    } catch (e) {
      console.error("Failed to create game", e);
      setError("Failed to create game. Is backend running?");
    }
  };

  const handleJoin = async () => {
    setError(null);
    if (!joinId) {
      setError('Please enter a Game ID.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/game/${joinId.toUpperCase()}`);
      const data = await response.json();

      if (data.error) {
        setError('Game ID not found. Please check the ID and try again.');
        return;
      }

      onJoinGame(joinId.toUpperCase());
    } catch (e) {
      console.error("Failed to join game", e);
      setError("Failed to connect to server.");
    }
  };

  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full animate-fade-in">
      <h2 className="text-2xl font-bold text-center text-slate-200 mb-4">Multiplayer</h2>
      <div className="flex flex-col space-y-4">
        <input
          type="text"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          placeholder="Enter 5-digit Game ID"
          maxLength={5}
          className="p-3 bg-slate-700 border-2 border-slate-600 rounded-md text-center uppercase tracking-widest focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
          aria-label="Game ID to join"
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
      <button
        onClick={handleCreate}
        className="w-full bg-cyan-500 text-white font-bold py-3 rounded-md hover:bg-cyan-600 transition-transform transform hover:scale-105"
      >
        Create New Game
      </button>

      <div className="my-8 border-t border-slate-700"></div>

      <h2 className="text-2xl font-bold text-center text-slate-200 mb-4">Single Player</h2>
      <button
        onClick={onPlayVsComputer}
        className="w-full bg-green-500 text-white font-bold py-3 rounded-md hover:bg-green-600 transition-transform transform hover:scale-105"
      >
        Play vs Computer
      </button>
    </div>
  );
};

export default HomeScreen;
