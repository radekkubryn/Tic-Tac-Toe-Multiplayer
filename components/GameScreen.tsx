
import React, { useState, useEffect, useCallback } from 'react';
import Board from './Board';
import type { GameState, Player, BoardState } from '../types';

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

    // Connect to WebSocket
    // Determine WS URL dynamically
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.DEV ? 'localhost:8000' : window.location.host;
    const socket = new WebSocket(`${protocol}//${host}/ws/${gameId}`);

    socket.onopen = () => {
      console.log("Connected to WebSocket");
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'STATE_UPDATE') {
        setGameState(message.payload);
      }
    };

    socket.onclose = () => {
      console.log("Disconnected from WebSocket");
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [gameId, isVsComputer]);

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
      }
    }
  }, [gameState, isVsComputer, ws, playerRole]);

  const handleCellClick = (index: number) => {
    if (!gameState || gameState.winner || gameState.board[index]) return;

    const isPlayerTurn = isVsComputer ? gameState.currentPlayer === 'X' : gameState.currentPlayer === playerRole;

    if (isPlayerTurn) {
      makeMove(index);
    }
  };

  const handleResetGame = () => {
    if (isVsComputer) {
      setGameState({
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        winningLine: null,
        playerJoined: true,
      });
    } else {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'RESET_GAME'
        }));
      }
    }
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
      status = winner === 'draw' ? "It's a Draw!" : `Player ${winner} Wins!`;
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
    <div className="flex flex-col items-center space-y-6 w-full animate-fade-in">
      {!isVsComputer ? (
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
      ) : (
        <div className="bg-slate-800 p-4 rounded-lg shadow-lg w-full text-center">
          <p className="text-xl text-slate-300">Playing against the Computer</p>
          <p className="text-sm mt-2 text-slate-400">You are Player <span className="font-bold text-cyan-400">X</span></p>
        </div>
      )}

      <div className={`p-2 rounded-lg transition-shadow ${isMyTurn ? 'shadow-lg shadow-cyan-500/20' : ''}`}>
        <Board board={board} onClick={handleCellClick} winningLine={winningLine} />
      </div>

      <div className="bg-slate-800 p-4 rounded-lg shadow-lg w-full text-center h-20 flex items-center justify-center">
        <p className={`text-2xl font-bold transition-all duration-300 ${winner ? 'text-green-400' : 'text-slate-200'}`}>{status}</p>
      </div>

      <div className="flex space-x-4 w-full">
        {winner && playerRole === 'X' && (
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
          {isVsComputer ? 'Back to Menu' : 'Leave Game'}
        </button>
      </div>
    </div>
  );
};

export default GameScreen;
