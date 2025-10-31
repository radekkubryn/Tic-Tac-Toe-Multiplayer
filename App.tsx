
import React, { useState, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import GameScreen from './components/GameScreen';
import type { Player } from './types';

const App: React.FC = () => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<Player | null>(null);

  const handleCreateGame = useCallback((newGameId: string) => {
    setGameId(newGameId);
    setPlayerRole('X');
  }, []);

  const handleJoinGame = useCallback((joinedGameId: string) => {
    setGameId(joinedGameId);
    setPlayerRole('O');
  }, []);

  const handlePlayVsComputer = useCallback(() => {
    setGameId('local-ai');
    setPlayerRole('X');
  }, []);

  const handleLeaveGame = useCallback(() => {
    setGameId(null);
    setPlayerRole(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <header className="text-center mb-8">
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
          Tic-Tac-Toe
        </h1>
        <p className="text-slate-400 mt-2">Multiplayer Mayhem</p>
      </header>
      <main className="w-full max-w-md">
        {!gameId || !playerRole ? (
          <HomeScreen
            onCreateGame={handleCreateGame}
            onJoinGame={handleJoinGame}
            onPlayVsComputer={handlePlayVsComputer}
          />
        ) : (
          <GameScreen gameId={gameId} playerRole={playerRole} onLeaveGame={handleLeaveGame} />
        )}
      </main>
      <footer className="absolute bottom-4 text-slate-500 text-sm">
        Built by a world-class senior frontend React engineer.
      </footer>
    </div>
  );
};

export default App;
