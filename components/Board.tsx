
import React from 'react';
import Cell from './Cell';
import type { BoardState } from '../types';

interface BoardProps {
  board: BoardState;
  onClick: (index: number) => void;
  winningLine: number[] | null;
}

const Board: React.FC<BoardProps> = ({ board, onClick, winningLine }) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {board.map((value, index) => {
        const isWinningCell = winningLine ? winningLine.includes(index) : false;
        return (
          <Cell 
            key={index} 
            value={value} 
            onClick={() => onClick(index)}
            isWinningCell={isWinningCell}
          />
        );
      })}
    </div>
  );
};

export default Board;
