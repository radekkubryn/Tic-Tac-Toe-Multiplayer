
import React from 'react';
import type { CellValue } from '../types';

interface CellProps {
  value: CellValue;
  onClick: () => void;
  isWinningCell: boolean;
}

const Cell: React.FC<CellProps> = ({ value, onClick, isWinningCell }) => {
  const cellContent = value === 'X' ? (
    <svg className="w-12 h-12 md:w-16 md:h-16 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  ) : value === 'O' ? (
    <svg className="w-12 h-12 md:w-16 md:h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
  ) : null;

  const winningClass = isWinningCell ? 'bg-green-500/30 ring-2 ring-green-500' : 'bg-slate-700 hover:bg-slate-600 active:bg-slate-800';

  return (
    <button
      onClick={onClick}
      className={`w-20 h-20 md:w-28 md:h-28 flex items-center justify-center rounded-xl shadow-inner transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 touch-manipulation ${winningClass}`}
      disabled={!!value}
    >
      <div className="transform transition-transform duration-300 ease-in-out scale-0 animate-pop-in w-2/3 h-2/3 flex items-center justify-center">
        {cellContent}
      </div>
      <style>{`
        @keyframes pop-in {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          70% { transform: scale(1.1) rotate(5deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        .animate-pop-in {
          animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </button>
  );
};

export default Cell;
