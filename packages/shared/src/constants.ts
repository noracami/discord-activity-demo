/**
 * Game constants
 */
export const GAME_CONSTANTS = {
  /** Board size (3x3) */
  BOARD_SIZE: 9,

  /** Maximum pieces per player on the board */
  MAX_PIECES_PER_PLAYER: 3,

  /** Turn time limit in seconds */
  TURN_TIME_LIMIT: 30,

  /** Ready time limit in seconds */
  READY_TIME_LIMIT: 30,

  /** Nakama match tick rate (ticks per second) */
  TICK_RATE: 10,
} as const;

/**
 * Win patterns for 3x3 board
 * Each pattern is an array of cell indices that form a winning line
 */
export const WIN_PATTERNS: readonly number[][] = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal
  [2, 4, 6], // Anti-diagonal
];
