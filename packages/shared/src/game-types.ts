/**
 * Game phase
 */
export type GamePhase = 'waiting' | 'ready' | 'playing' | 'ended';

/**
 * Player role
 */
export type PlayerRole = 'player1' | 'player2' | 'spectator';

/**
 * Player symbol
 */
export type PlayerSymbol = 'O' | 'X';

/**
 * Player information
 */
export interface Player {
  odiscrdId: string;
  nakamaId: string;
  username: string;
  avatarUrl: string;
  symbol: PlayerSymbol;
}

/**
 * A piece on the board
 */
export interface Piece {
  owner: 'player1' | 'player2';
  cellIndex: number;
  placedAt: number; // timestamp
  isAboutToRemove: boolean;
}

/**
 * Board state (9 cells, null means empty)
 */
export type BoardState = (Piece | null)[];

/**
 * Rematch votes
 */
export interface RematchVotes {
  player1: boolean | null;
  player2: boolean | null;
}

/**
 * Game state sent from server to client
 */
export interface GameState {
  phase: GamePhase;

  // Players
  player1: Player | null;
  player2: Player | null;

  // Board
  board: BoardState;

  // FIFO queues (cell indices)
  player1Queue: number[];
  player2Queue: number[];

  // Turn info
  currentTurn: 'player1' | 'player2' | null;
  turnStartTime: number | null;

  // Ready state
  player1Ready: boolean;
  player2Ready: boolean;
  readyStartTime: number | null;

  // Game result
  winner: 'player1' | 'player2' | null;
  winReason: 'three_in_row' | 'opponent_left' | null;

  // Rematch
  rematchVotes: RematchVotes;
}

/**
 * Move request payload
 */
export interface MovePayload {
  cellIndex: number;
}

/**
 * Kick player request payload
 */
export interface KickPlayerPayload {
  targetRole: 'player1' | 'player2';
}

/**
 * Rematch vote payload
 */
export interface RematchVotePayload {
  accept: boolean;
}

/**
 * Error payload
 */
export interface ErrorPayload {
  code: string;
  message: string;
}
