
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

  const winningClass = isWinningCell ? 'bg-green-500/30' : 'bg-slate-800 hover:bg-slate-700';

  return (
    <button
      onClick={onClick}
      className={`w-24 h-24 md:w-32 md:h-32 flex items-center justify-center rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${winningClass}`}
      disabled={!!value}
    >
      <div className="transform transition-transform duration-300 ease-in-out scale-0 animate-pop-in">
        {cellContent}
      </div>
      <style>{`
        @keyframes pop-in {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
        .animate-pop-in {
          animation: pop-in 0.3s ease-out forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </button>
  );
};

export default Cell;
