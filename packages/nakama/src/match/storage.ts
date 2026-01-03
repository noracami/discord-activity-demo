import { MatchState } from './state';

const COLLECTION = 'match_states';
const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';

/**
 * Serializable match state (excludes presences which can't be restored)
 */
export interface StoredMatchState {
  channelId: string;
  phase: MatchState['phase'];
  player1: MatchState['player1'];
  player2: MatchState['player2'];
  board: MatchState['board'];
  player1Queue: MatchState['player1Queue'];
  player2Queue: MatchState['player2Queue'];
  currentTurn: MatchState['currentTurn'];
  turnStartTick: number;
  player1Ready: boolean;
  player2Ready: boolean;
  readyStartTick: number;
  winner: MatchState['winner'];
  winReason: MatchState['winReason'];
  rematchVotes: MatchState['rematchVotes'];
  savedAt: number;
}

/**
 * Save match state to storage
 */
export function saveMatchState(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  state: MatchState
): void {
  // Only save if game is in progress or has meaningful state
  if (state.phase === 'waiting' && !state.player1 && !state.player2) {
    return;
  }

  const stored: StoredMatchState = {
    channelId: state.channelId,
    phase: state.phase,
    player1: state.player1,
    player2: state.player2,
    board: state.board,
    player1Queue: state.player1Queue,
    player2Queue: state.player2Queue,
    currentTurn: state.currentTurn,
    turnStartTick: state.turnStartTick,
    player1Ready: state.player1Ready,
    player2Ready: state.player2Ready,
    readyStartTick: state.readyStartTick,
    winner: state.winner,
    winReason: state.winReason,
    rematchVotes: state.rematchVotes,
    savedAt: Date.now(),
  };

  try {
    nk.storageWrite([
      {
        collection: COLLECTION,
        key: state.channelId,
        userId: SYSTEM_USER,
        value: stored,
        permissionRead: 0, // No read permission for clients
        permissionWrite: 0, // No write permission for clients
      },
    ]);
    logger.debug(`Match state saved for channel ${state.channelId}`);
  } catch (e: any) {
    logger.error(`Failed to save match state: ${e?.message || e}`);
  }
}

/**
 * Load match state from storage
 */
export function loadMatchState(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  channelId: string
): StoredMatchState | null {
  try {
    const results = nk.storageRead([
      {
        collection: COLLECTION,
        key: channelId,
        userId: SYSTEM_USER,
      },
    ]);

    if (results.length === 0) {
      logger.debug(`No stored state for channel ${channelId}`);
      return null;
    }

    const stored = results[0].value as StoredMatchState;

    // Check if state is too old (e.g., older than 1 hour)
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - stored.savedAt > ONE_HOUR) {
      logger.info(`Stored state for channel ${channelId} is too old, ignoring`);
      deleteMatchState(nk, logger, channelId);
      return null;
    }

    logger.info(`Loaded stored state for channel ${channelId}, phase: ${stored.phase}`);
    return stored;
  } catch (e: any) {
    logger.error(`Failed to load match state: ${e?.message || e}`);
    return null;
  }
}

/**
 * Delete match state from storage
 */
export function deleteMatchState(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  channelId: string
): void {
  try {
    nk.storageDelete([
      {
        collection: COLLECTION,
        key: channelId,
        userId: SYSTEM_USER,
      },
    ]);
    logger.debug(`Match state deleted for channel ${channelId}`);
  } catch (e: any) {
    logger.error(`Failed to delete match state: ${e?.message || e}`);
  }
}

/**
 * Restore match state from stored state
 */
export function restoreMatchState(
  state: MatchState,
  stored: StoredMatchState,
  logger: nkruntime.Logger
): MatchState {
  // Restore game state
  state.phase = stored.phase;
  state.player1 = stored.player1;
  state.player2 = stored.player2;
  state.board = stored.board;
  state.player1Queue = stored.player1Queue;
  state.player2Queue = stored.player2Queue;
  state.currentTurn = stored.currentTurn;
  state.winner = stored.winner;
  state.winReason = stored.winReason;
  state.rematchVotes = stored.rematchVotes;

  // Mark both players as disconnected (they need to reconnect)
  // Use null for disconnectedAtTick so timeout won't trigger until they actually disconnect during game
  if (state.player1) {
    state.player1.isDisconnected = true;
    state.player1.disconnectedAtTick = null; // null = waiting for reconnect after restore, no timeout
  }
  if (state.player2) {
    state.player2.isDisconnected = true;
    state.player2.disconnectedAtTick = null;
  }

  // Reset ready state (players need to re-ready after reconnect)
  state.player1Ready = false;
  state.player2Ready = false;

  logger.info(`Match state restored: phase=${state.phase}, players=${state.player1?.username || 'none'}/${state.player2?.username || 'none'}`);

  return state;
}
