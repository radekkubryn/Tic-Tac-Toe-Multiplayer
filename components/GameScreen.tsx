
import React, { useState, useEffect, useCallback } from 'react';
import Board from './Board';
import type { GameState, Player, BoardState } from '../types';
import { playSound } from '../utils/audio';

interface GameScreenProps {
  gameId: string;
  playerRole: Player;
  onLeaveGame: () => void;
}

const calculateWinner = (board: BoardState): { winner: Player | 'draw' | null, line: number[] | null } => {
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

const findBestMove = (board: BoardState): number => {
  const checkWin = (b: BoardState, player: Player): number => {
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        const tempBoard = [...b];
        tempBoard[i] = player;
        const { winner } = calculateWinner(tempBoard);
        if (winner === player) return i;
      }
    }
    return -1;
  };

  let move = checkWin(board, 'O'); // Win
  if (move !== -1) return move;

  move = checkWin(board, 'X'); // Block
  if (move !== -1) return move;

  if (board[4] === null) return 4; // Center

  const corners = [0, 2, 6, 8].filter(i => board[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

  const available = board.map((val, idx) => val === null ? idx : -1).filter(idx => idx !== -1);
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)];

  return -1;
};


const GameScreen: React.FC<GameScreenProps> = ({ gameId, playerRole, onLeaveGame }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const isVsComputer = gameId === 'local-ai';

  const [ws, setWs] = useState<WebSocket | null>(null);
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = React.useRef(0);

  useEffect(() => {
    if (isVsComputer) {
      setGameState({
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        winningLine: null,
        playerJoined: true,
      });
      return;
    }

    const connectWebSocket = () => {
      // Determine WS URL dynamically
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = import.meta.env.DEV ? 'localhost:8000' : window.location.host;
      const socket = new WebSocket(`${protocol}//${host}/ws/${gameId}`);

      socket.onopen = () => {
        console.log("Connected to WebSocket");
        reconnectAttempts.current = 0; // Reset attempts on successful connection
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'STATE_UPDATE') {
          setGameState(message.payload);
        } else if (message.type === 'REMATCH_DECLINED') {
          alert("Opponent declined the rematch.");
          onLeaveGame();
        }
      };

      socket.onclose = (event) => {
        console.log("Disconnected from WebSocket", event.code, event.reason);
        setWs(null); // Clear socket state

        // Auto-reconnect if not clean close (e.g. lost network)
        // 1000 is normal closure, 1001 going away. 
        // If unmounted, cleanup function should clear timeout, so this logic is safe if component checks refs or unmounts.
        // But cleaning up properly in return is key.

        if (!event.wasClean && reconnectAttempts.current < 5) {
          const timeout = Math.min(1000 * (2 ** reconnectAttempts.current), 10000); // Exponential backoff
          console.log(`Attempting to reconnect in ${timeout}ms...`);
          reconnectAttempts.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, timeout);
        }
      };

      setWs(socket);
    };

    connectWebSocket();

    return () => {
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // We can't easily close socket here without access to the *current* socket instance 
      // if it changed or inside the closure. 
      // But we can close 'ws' from state if we add it to dependency or ref.
      // Actually 'ws' state updates. 
      // Better: Create a ref for the socket itself to close it on unmount reliably.
    };
  }, [gameId, isVsComputer]);

  // Separate effect to clean up socket when unmounting or leaving
  // This avoids circular dependencies in the main connection effect
  useEffect(() => {
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  }, [ws]);

  // Only for vsComputer logic
  useEffect(() => {
    if (isVsComputer && gameState?.currentPlayer === 'O' && !gameState.winner) {
      const timer = setTimeout(() => {
        const bestMove = findBestMove(gameState.board);
        if (bestMove !== -1) {
          const newBoard = [...gameState.board];
          newBoard[bestMove] = 'O';
          const { winner, line } = calculateWinner(newBoard);
          setGameState({
            ...gameState,
            board: newBoard,
            currentPlayer: 'X',
            winner: winner,
            winningLine: line,
          })
        }
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [gameState, isVsComputer]);


  const makeMove = useCallback((index: number) => {
    if (isVsComputer) {
      if (!gameState || gameState.winner || gameState.board[index] !== null) return;

      const newBoard = [...gameState.board];
      newBoard[index] = 'X';
      const { winner, line } = calculateWinner(newBoard);

      setGameState({
        ...gameState,
        board: newBoard,
        currentPlayer: 'O',
        winner: winner,
        winningLine: line,
      });
    } else {
      // Multiplayer Move
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'MAKE_MOVE',
          index: index,
          player: playerRole
        }));
      } else {
        console.error("WebSocket not ready", ws?.readyState);
        // Optional: Show toast or alert?
        // alert("Connection not ready. Please wait."); 
        // Better not to spam alerts, but log is good.
      }
    }
  }, [gameState, isVsComputer, ws, playerRole]);

  useEffect(() => {
    if (gameState?.winner) {
      if (gameState.winner === 'draw') {
        playSound('draw');
      } else if (gameState.winner !== playerRole && !isVsComputer) {
        // Played when opponent wins, logic to play 'lose' sound could be added here
        playSound('win');
      } else {
        playSound('win');
      }
    }
  }, [gameState?.winner, playerRole, isVsComputer]);

  // Ref to track previous board state for sound
  const prevBoardRef = React.useRef<BoardState>(Array(9).fill(null));

  useEffect(() => {
    if (!gameState) return;

    const prev = prevBoardRef.current;
    const curr = gameState.board;

    const prevCount = prev.filter(c => c).length;
    const currCount = curr.filter(c => c).length;

    // Play sound if a move was made (count increased)
    if (currCount > prevCount) {
      playSound('move');
    }

    prevBoardRef.current = curr;
  }, [gameState?.board]);

  const handleCellClick = (index: number) => {
    if (!gameState || gameState.winner || gameState.board[index]) return;

    // Explicitly allow move if it's player's turn, ignoring playerJoined for local optimistic UI? 
    // No, strictly follow turn order. 
    // Backend validation will catch if playerJoined is false but currentPlayer is set? 
    // Actually, currentPlayer is initialized to X. Move 1 from X is valid even if O hasn't joined yet? 
    // Usually yes, unless we want to block until 2 players.
    // The previous logic allowed it. 
    // User says "Cannot click", so maybe they are blocked?

    // Let's verify 'playerRole'.
    const isPlayerTurn = isVsComputer ? gameState.currentPlayer === 'X' : gameState.currentPlayer === playerRole;

    if (isPlayerTurn) {
      makeMove(index);
    }
  };

  const handleResetGame = () => {
    // Legacy or Admin reset? For now this is only called by the button if we keep it. 
    // But we are removing the button that calls this.
    // So this function is only for AI reset?
    if (isVsComputer) {
      setGameState({
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        winningLine: null,
        playerJoined: true,
      });
    }
    // If multiplayer, we use the Modal flow now.
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
    if (isVsComputer) {
      status = winner === 'X' ? 'You Win!' : winner === 'O' ? 'Computer Wins!' : "It's a Draw!";
    } else {
      status = winner === 'draw' ? "It's a Draw!" : `Player ${winner} Won!`;
    }
  } else if (!isVsComputer && !playerJoined) {
    status = 'Waiting for Player 2 to join...';
  } else {
    if (isVsComputer) {
      status = currentPlayer === 'X' ? 'Your Turn' : "Computer's Turn...";
    } else {
      status = `Player ${currentPlayer}'s Turn`;
    }
  }

  const isMyTurn = (!winner && playerJoined) && (isVsComputer ? currentPlayer === 'X' : currentPlayer === playerRole);

  return (
    <div className="flex flex-col items-center space-y-6 w-full animate-fade-in touch-manipulation">
      {/* Top Info Bar - Compact */}
      <div className="w-full max-w-lg bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl shadow-xl flex items-center justify-between border border-slate-700/50 relative z-10 mx-4">
        {/* Left: Game ID & Status */}
        <div className="flex flex-col items-start">
          {!isVsComputer && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">ID:</span>
              <span className="text-sm font-mono font-bold text-cyan-400 tracking-wider flex items-center gap-1 cursor-pointer hover:bg-slate-700/50 rounded px-1 -ml-1 transition" onClick={handleCopyId} title="Copy ID">
                {gameId}
                <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </span>
            </div>
          )}
          <div className="text-[10px] flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${ws?.readyState === WebSocket.OPEN ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 animate-pulse'}`}></div>
            <span className="text-slate-400 font-medium">{ws?.readyState === WebSocket.OPEN ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
        </div>

        {/* Center: Score Board */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-700/50">
          <div className={`flex flex-col items-center transition-all ${gameState?.currentPlayer === 'X' && !winner ? 'scale-110 opacity-100' : 'opacity-70 scale-100'}`}>
            <span className="text-[10px] font-bold text-cyan-500 mb-0.5">X</span>
            <span className="text-lg font-bold text-slate-100 leading-none">{gameState?.scores?.X || 0}</span>
          </div>
          <div className="h-6 w-px bg-slate-700"></div>
          <div className={`flex flex-col items-center transition-all ${gameState?.currentPlayer === 'O' && !winner ? 'scale-110 opacity-100' : 'opacity-70 scale-100'}`}>
            <span className="text-[10px] font-bold text-purple-500 mb-0.5">O</span>
            <span className="text-lg font-bold text-slate-100 leading-none">{gameState?.scores?.O || 0}</span>
          </div>
        </div>

        {/* Right: Player Role */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">YOU ARE</span>
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${playerRole === 'X' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
            <span className="text-lg font-black">{playerRole}</span>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-xl transition-shadow duration-300 ${isMyTurn ? 'shadow-[0_0_30px_rgba(34,211,238,0.15)] bg-slate-800/30' : ''} mt-2`}>
        <Board board={board} onClick={handleCellClick} winningLine={winningLine} />
      </div>

      <div className="w-full max-w-sm text-center min-h-[3rem] flex items-center justify-center">
        <p className={`text-xl md:text-2xl font-bold tracking-wide transition-all duration-300 ${winner ? 'text-green-400 animate-bounce' : 'text-slate-200'}`}>{status}</p>
      </div>

      {/* Buttons only visible if strictly needed, mostly hidden by Modal flow now */}
      <div className="flex space-x-4 w-full max-w-sm pt-2 px-4 pb-6">
        {/* Only show 'Leave' here as 'Play Again' is in modal. For Local AI we might need reset? */}
        {isVsComputer && winner && (
          <button onClick={handleResetGame} className="flex-1 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 font-bold py-3 rounded-xl hover:bg-cyan-600/40 transition">New Game</button>
        )}
        <button
          onClick={onLeaveGame}
          className="flex-1 bg-slate-700/50 border border-slate-600 text-slate-300 text-sm font-bold py-3 rounded-xl hover:bg-slate-700 hover:text-white transition touch-manipulation"
        >
          Menu
        </button>
      </div>

      {/* Rematch / Game Over Modal */}
      {winner && !isVsComputer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-slate-900 p-1 pb-1 rounded-3xl shadow-2xl w-full max-w-xs relative overflow-hidden ring-1 ring-white/10">
            {/* Gradient Border content wrapper */}
            <div className="bg-slate-900 rounded-[22px] p-6 text-center relative z-10 h-full flex flex-col items-center">

              {/* Graphics */}
              <div className="mb-6 mt-2 relative">
                {/* Glow effect */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-3xl opacity-50 ${winner === playerRole ? 'bg-green-500' : winner === 'draw' ? 'bg-blue-500' : 'bg-red-500'}`}></div>

                {winner === playerRole ? (
                  <svg className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                ) : winner === 'draw' ? (
                  <svg className="w-24 h-24 text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                ) : (
                  <svg className="w-24 h-24 text-slate-500 drop-shadow-[0_0_15px_rgba(100,116,139,0.4)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              <h3 className="text-3xl font-black text-white mb-1 tracking-tight">
                {winner === playerRole ? 'VICTORY!' : winner === 'draw' ? 'DRAW' : 'DEFEAT'}
              </h3>
              <p className="text-slate-400 text-sm mb-8 font-medium">
                {winner === playerRole ? 'Great match!' : winner === 'draw' ? 'Well played both.' : 'Better luck next time.'}
              </p>

              {gameState?.rematchRequests?.[playerRole] ? (
                <div className="w-full bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 animate-pulse">
                  <p className="text-cyan-400 font-bold text-sm tracking-wide">WAITING FOR OPPONENT...</p>
                </div>
              ) : (
                <div className="flex flex-col w-full space-y-3">
                  <button
                    onClick={() => {
                      if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'REQUEST_REMATCH', player: playerRole }));
                      }
                    }}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-95 transition-all text-lg"
                  >
                    PLAY AGAIN
                  </button>
                  <button
                    onClick={() => {
                      if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'DECLINE_REMATCH' }));
                      }
                      onLeaveGame();
                    }}
                    className="w-full bg-transparent border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 font-semibold py-3 rounded-xl transition-all text-sm"
                  >
                    Return to Menu
                  </button>
                </div>
              )}

              {/* Opponent status msg */}
              {gameState?.rematchRequests &&
                ((playerRole === 'X' && gameState.rematchRequests['O']) || (playerRole === 'O' && gameState.rematchRequests['X'])) &&
                !gameState.rematchRequests[playerRole] && (
                  <div className="absolute top-4 right-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
