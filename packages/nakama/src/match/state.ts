import { GAME_CONSTANTS } from './constants';

/**
 * Player info stored in match state
 */
export interface MatchPlayer {
  odiscrdId: string;
  nakamaId: string;
  sessionId: string;
  username: string;
}

/**
 * Piece on the board
 */
export interface MatchPiece {
  owner: 'player1' | 'player2';
  cellIndex: number;
  placedTick: number;
}

/**
 * Game phase
 */
export type GamePhase = 'waiting' | 'ready' | 'playing' | 'ended';

/**
 * Match state
 */
export interface MatchState {
  // Match info
  channelId: string;
  phase: GamePhase;

  // Players (null = empty slot)
  player1: MatchPlayer | null;
  player2: MatchPlayer | null;

  // Presences for broadcasting
  presences: { [sessionId: string]: nkruntime.Presence };

  // Board state (9 cells)
  board: (MatchPiece | null)[];

  // FIFO queues (cell indices, oldest first)
  player1Queue: number[];
  player2Queue: number[];

  // Turn info
  currentTurn: 'player1' | 'player2' | null;
  turnStartTick: number;

  // Ready state
  player1Ready: boolean;
  player2Ready: boolean;
  readyStartTick: number;

  // Game result
  winner: 'player1' | 'player2' | null;
  winReason: 'three_in_row' | 'opponent_left' | null;

  // Rematch votes
  rematchVotes: {
    player1: boolean | null;
    player2: boolean | null;
  };

  // Timeouts (in ticks)
  turnTimeoutTicks: number;
  readyTimeoutTicks: number;
}

/**
 * Create initial match state
 */
export function createInitialState(channelId: string): MatchState {
  return {
    channelId,
    phase: 'waiting',

    player1: null,
    player2: null,
    presences: {},

    board: Array(GAME_CONSTANTS.BOARD_SIZE).fill(null),

    player1Queue: [],
    player2Queue: [],

    currentTurn: null,
    turnStartTick: 0,

    player1Ready: false,
    player2Ready: false,
    readyStartTick: 0,

    winner: null,
    winReason: null,

    rematchVotes: {
      player1: null,
      player2: null,
    },

    turnTimeoutTicks: GAME_CONSTANTS.TURN_TIME_LIMIT * GAME_CONSTANTS.TICK_RATE,
    readyTimeoutTicks: GAME_CONSTANTS.READY_TIME_LIMIT * GAME_CONSTANTS.TICK_RATE,
  };
}

/**
 * Get player role by session ID
 */
export function getPlayerRole(state: MatchState, sessionId: string): 'player1' | 'player2' | 'spectator' {
  if (state.player1?.sessionId === sessionId) return 'player1';
  if (state.player2?.sessionId === sessionId) return 'player2';
  return 'spectator';
}

/**
 * Check if there's an empty player slot
 */
export function hasEmptySlot(state: MatchState): boolean {
  return state.player1 === null || state.player2 === null;
}

/**
 * Get empty slot
 */
export function getEmptySlot(state: MatchState): 'player1' | 'player2' | null {
  if (state.player1 === null) return 'player1';
  if (state.player2 === null) return 'player2';
  return null;
}
