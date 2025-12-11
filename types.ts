
export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type BoardState = CellValue[];

export interface GameState {
  board: BoardState;
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  winningLine: number[] | null;
  playerJoined: boolean;
  scores?: {
    X: number;
    O: number;
  };
}
