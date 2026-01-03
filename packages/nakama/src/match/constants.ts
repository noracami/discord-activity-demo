/**
 * Game constants (duplicated here for Nakama runtime)
 */
export const GAME_CONSTANTS = {
  BOARD_SIZE: 9,
  MAX_PIECES_PER_PLAYER: 3,
  TURN_TIME_LIMIT: 30,
  READY_TIME_LIMIT: 30,
  RECONNECT_TIME_LIMIT: 30, // seconds to wait for reconnection
  TICK_RATE: 10,
} as const;

/**
 * Win patterns
 */
export const WIN_PATTERNS: readonly number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * OpCodes for match messages
 */
export const OpCode = {
  // Client -> Server
  JOIN_GAME: 1,
  LEAVE_GAME: 2,
  READY: 3,
  UNREADY: 4,
  MOVE: 5,
  KICK_PLAYER: 6,
  REMATCH_VOTE: 7,

  // Server -> Client
  STATE_SYNC: 100,
  PLAYER_JOINED: 101,
  PLAYER_LEFT: 102,
  READY_UPDATE: 103,
  GAME_START: 104,
  MOVE_MADE: 105,
  PIECE_REMOVED: 106,
  TURN_CHANGE: 107,
  GAME_END: 108,
  REMATCH_UPDATE: 109,
  PLAYER_KICKED: 110,
  PLAYER_DISCONNECTED: 111,
  PLAYER_RECONNECTED: 112,
  VERSION_CHECK: 113,
  ERROR: 199,
} as const;
