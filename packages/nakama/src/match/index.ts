import { MatchState, createInitialState, getPlayerRole, hasEmptySlot } from './state';
import { OpCode, GAME_CONSTANTS } from './constants';
import { buildStateSyncPayload } from './helpers';
import { handleJoinGame, handleLeaveGame, handleReady, handleUnready, handleMove, handleKickPlayer, handleRematchVote } from './handlers';

/**
 * Match initialization
 */
export const matchInit: nkruntime.MatchInitFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string }
) {
  const channelId = params['channel_id'] || 'unknown';
  logger.info(`Match init for channel: ${channelId}`);

  const state = createInitialState(channelId);

  return {
    state,
    tickRate: GAME_CONSTANTS.TICK_RATE,
    label: JSON.stringify({ channel_id: channelId }),
  };
};

/**
 * Called when a user attempts to join
 */
export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any }
) {
  // Allow all joins (they start as spectators)
  logger.debug(`Join attempt: ${presence.username}`);
  return { state, accept: true };
};

/**
 * Called when users successfully join
 */
export const matchJoin: nkruntime.MatchJoinFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  presences: nkruntime.Presence[]
) {
  for (const presence of presences) {
    logger.info(`Player joined: ${presence.username} (${presence.sessionId})`);

    // Store presence for broadcasting
    state.presences[presence.sessionId] = presence;

    // Send full state to new player
    const syncPayload = buildStateSyncPayload(state);
    dispatcher.broadcastMessage(
      OpCode.STATE_SYNC,
      JSON.stringify(syncPayload),
      [presence],
      null,
      true
    );

    // Notify others about new spectator
    dispatcher.broadcastMessage(
      OpCode.PLAYER_JOINED,
      JSON.stringify({
        odiscrdId: presence.userId,
        username: presence.username,
        role: 'spectator',
      }),
      null,
      presence,
      true
    );
  }

  return { state };
};

/**
 * Called when users leave
 */
export const matchLeave: nkruntime.MatchLeaveFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  presences: nkruntime.Presence[]
) {
  for (const presence of presences) {
    logger.info(`Player left: ${presence.username}`);

    const role = getPlayerRole(state, presence.sessionId);

    // Remove from presences
    delete state.presences[presence.sessionId];

    if (role === 'player1' || role === 'player2') {
      // Player left - opponent wins if game in progress
      if (state.phase === 'playing') {
        const winner = role === 'player1' ? 'player2' : 'player1';
        state.winner = winner;
        state.winReason = 'opponent_left';
        state.phase = 'ended';

        dispatcher.broadcastMessage(
          OpCode.GAME_END,
          JSON.stringify({
            winner,
            reason: 'opponent_left',
          }),
          null,
          null,
          true
        );
      }

      // Clear player slot
      if (role === 'player1') {
        state.player1 = null;
        state.player1Ready = false;
      } else {
        state.player2 = null;
        state.player2Ready = false;
      }

      // Reset to waiting if we were in ready phase
      if (state.phase === 'ready') {
        state.phase = 'waiting';
      }
    }

    // Notify others
    dispatcher.broadcastMessage(
      OpCode.PLAYER_LEFT,
      JSON.stringify({
        odiscrdId: presence.userId,
        role,
      }),
      null,
      null,
      true
    );
  }

  // Close match if no one left
  const presenceCount = Object.keys(state.presences).length;
  if (presenceCount === 0) {
    logger.info('No players left, closing match');
    return null;
  }

  return { state };
};

/**
 * Main game loop - called every tick
 */
export const matchLoop: nkruntime.MatchLoopFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  messages: nkruntime.MatchMessage[]
) {
  // Process all messages
  let msgIdx = 0;
  for (const message of messages) {
    msgIdx++;
    const sender = message.sender;
    let data: any = {};
    const rawDataStr = message.data ? nk.binaryToString(message.data) : '';

    // Debug: log string details
    logger.info(`matchLoop[${msgIdx}]: rawDataStr.length=${rawDataStr.length}, firstChar=${rawDataStr.charCodeAt(0)}, lastChar=${rawDataStr.charCodeAt(rawDataStr.length - 1)}`);
    logger.info(`matchLoop[${msgIdx}]: rawDataStr bytes=[${rawDataStr.split('').map(c => c.charCodeAt(0)).join(',')}]`);

    try {
      if (message.data && message.data.length > 0) {
        data = JSON.parse(rawDataStr);
        logger.info(`matchLoop[${msgIdx}]: JSON.parse succeeded, result keys=${Object.keys(data)}, result=${JSON.stringify(data)}`);
      }
    } catch (e) {
      logger.error(`Failed to parse message data: ${e}`);
      continue;
    }

    logger.info(`matchLoop[${msgIdx}/${messages.length}]: opCode=${message.opCode}, sender=${sender.username}`);
    logger.info(`matchLoop[${msgIdx}]: rawData="${rawDataStr}", parsed=${JSON.stringify(data)}, parsedType=${typeof data}`);

    switch (message.opCode) {
      case OpCode.JOIN_GAME:
        state = handleJoinGame(state, sender, dispatcher, logger);
        break;

      case OpCode.LEAVE_GAME:
        state = handleLeaveGame(state, sender, dispatcher, logger);
        break;

      case OpCode.READY:
        state = handleReady(state, sender, tick, dispatcher, logger);
        break;

      case OpCode.UNREADY:
        state = handleUnready(state, sender, dispatcher, logger);
        break;

      case OpCode.MOVE:
        logger.info(`matchLoop[${msgIdx}]: calling handleMove with data=${JSON.stringify(data)}, data.cellIndex=${data.cellIndex}`);
        state = handleMove(state, sender, data, tick, dispatcher, logger);
        break;

      case OpCode.KICK_PLAYER:
        state = handleKickPlayer(state, sender, data, tick, dispatcher, logger);
        break;

      case OpCode.REMATCH_VOTE:
        state = handleRematchVote(state, sender, data, dispatcher, logger);
        break;

      default:
        logger.warn(`Unknown opcode: ${message.opCode}`);
    }
  }

  // Check turn timeout
  if (state.phase === 'playing' && state.currentTurn) {
    const elapsed = tick - state.turnStartTick;
    if (elapsed >= state.turnTimeoutTicks) {
      // Auto-move: pick random empty cell
      state = handleTurnTimeout(state, tick, dispatcher, logger);
    }
  }

  return { state };
};

/**
 * Handle turn timeout - auto place piece
 */
function handleTurnTimeout(
  state: MatchState,
  tick: number,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): MatchState {
  if (!state.currentTurn) return state;

  // Find empty cells
  const emptyCells: number[] = [];
  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i] === null) {
      emptyCells.push(i);
    }
  }

  if (emptyCells.length === 0) return state;

  // Pick random cell
  const randomIndex = Math.floor(Math.random() * emptyCells.length);
  const cellIndex = emptyCells[randomIndex];

  logger.info(`Turn timeout for ${state.currentTurn}, auto-placing at ${cellIndex}`);

  // Create fake sender for the current player
  const currentPlayer = state.currentTurn === 'player1' ? state.player1 : state.player2;
  if (!currentPlayer) return state;

  const fakeSender: nkruntime.Presence = {
    userId: currentPlayer.nakamaId,
    sessionId: currentPlayer.sessionId,
    username: currentPlayer.username,
    node: '',
  };

  return handleMove(state, fakeSender, { cellIndex }, tick, dispatcher, logger);
}

/**
 * Called when match is terminated
 */
export const matchTerminate: nkruntime.MatchTerminateFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  graceSeconds: number
) {
  logger.info(`Match terminating, grace period: ${graceSeconds}s`);
  return { state };
};

/**
 * Handle external signals
 */
export const matchSignal: nkruntime.MatchSignalFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  data: string
) {
  logger.debug(`Match signal received: ${data}`);
  return { state, data: 'ok' };
};
