import { MatchState, getPlayerRole, hasEmptySlot, getEmptySlot } from '../state';
import { OpCode, GAME_CONSTANTS } from '../constants';
import { buildStateSyncPayload, checkWinner, makeMove, resetForRematch } from '../helpers';

/**
 * Handle JOIN_GAME - spectator becomes player
 */
export function handleJoinGame(
  state: MatchState,
  sender: nkruntime.Presence,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): MatchState {
  const currentRole = getPlayerRole(state, sender.sessionId);

  // Already a player
  if (currentRole !== 'spectator') {
    dispatcher.broadcastMessage(
      OpCode.ERROR,
      JSON.stringify({ code: 'ALREADY_PLAYER', message: 'Already a player' }),
      [sender],
      null,
      true
    );
    return state;
  }

  // No empty slot
  const emptySlot = getEmptySlot(state);
  if (!emptySlot) {
    dispatcher.broadcastMessage(
      OpCode.ERROR,
      JSON.stringify({ code: 'NO_SLOT', message: 'No empty player slot' }),
      [sender],
      null,
      true
    );
    return state;
  }

  // Game already in progress
  if (state.phase === 'playing') {
    dispatcher.broadcastMessage(
      OpCode.ERROR,
      JSON.stringify({ code: 'GAME_IN_PROGRESS', message: 'Game already in progress' }),
      [sender],
      null,
      true
    );
    return state;
  }

  // Join as player
  const player = {
    odiscrdId: sender.userId,
    nakamaId: sender.userId,
    sessionId: sender.sessionId,
    username: sender.username,
  };

  if (emptySlot === 'player1') {
    state.player1 = player;
  } else {
    state.player2 = player;
  }

  logger.info(`${sender.username} joined as ${emptySlot}`);

  // Broadcast player joined
  dispatcher.broadcastMessage(
    OpCode.PLAYER_JOINED,
    JSON.stringify({
      odiscrdId: sender.userId,
      username: sender.username,
      role: emptySlot,
    }),
    null,
    null,
    true
  );

  // If both players present, move to ready phase
  if (state.player1 && state.player2) {
    state.phase = 'ready';
    state.readyStartTick = 0; // Will be set on first tick

    const syncPayload = buildStateSyncPayload(state);
    dispatcher.broadcastMessage(
      OpCode.STATE_SYNC,
      JSON.stringify(syncPayload),
      null,
      null,
      true
    );
  }

  return state;
}

/**
 * Handle LEAVE_GAME - player becomes spectator
 */
export function handleLeaveGame(
  state: MatchState,
  sender: nkruntime.Presence,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): MatchState {
  const role = getPlayerRole(state, sender.sessionId);

  if (role === 'spectator') {
    return state;
  }

  // Clear player slot
  if (role === 'player1') {
    state.player1 = null;
    state.player1Ready = false;
  } else {
    state.player2 = null;
    state.player2Ready = false;
  }

  // Handle game state
  if (state.phase === 'playing') {
    // Opponent wins
    const winner = role === 'player1' ? 'player2' : 'player1';
    state.winner = winner;
    state.winReason = 'opponent_left';
    state.phase = 'ended';

    dispatcher.broadcastMessage(
      OpCode.GAME_END,
      JSON.stringify({ winner, reason: 'opponent_left' }),
      null,
      null,
      true
    );
  } else if (state.phase === 'ready' || state.phase === 'ended') {
    // Reset game state when leaving from ready or ended phase
    state.phase = 'waiting';
    state.board = Array(GAME_CONSTANTS.BOARD_SIZE).fill(null);
    state.player1Queue = [];
    state.player2Queue = [];
    state.currentTurn = null;
    state.winner = null;
    state.winReason = null;
    state.rematchVotes = { player1: null, player2: null };
    state.player1Ready = false;
    state.player2Ready = false;

    // Send state sync to update all clients
    const syncPayload = buildStateSyncPayload(state);
    dispatcher.broadcastMessage(
      OpCode.STATE_SYNC,
      JSON.stringify(syncPayload),
      null,
      null,
      true
    );
  }

  dispatcher.broadcastMessage(
    OpCode.PLAYER_LEFT,
    JSON.stringify({ odiscrdId: sender.userId, role }),
    null,
    null,
    true
  );

  logger.info(`${sender.username} left player slot ${role}`);

  return state;
}

/**
 * Handle READY
 */
export function handleReady(
  state: MatchState,
  sender: nkruntime.Presence,
  tick: number,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): MatchState {
  const role = getPlayerRole(state, sender.sessionId);

  if (role === 'spectator') {
    return state;
  }

  if (state.phase !== 'ready' && state.phase !== 'waiting') {
    return state;
  }

  // Set ready
  if (role === 'player1') {
    state.player1Ready = true;
  } else {
    state.player2Ready = true;
  }

  // Set ready start tick if this is first ready
  if (state.readyStartTick === 0) {
    state.readyStartTick = tick;
  }

  dispatcher.broadcastMessage(
    OpCode.READY_UPDATE,
    JSON.stringify({
      player1Ready: state.player1Ready,
      player2Ready: state.player2Ready,
    }),
    null,
    null,
    true
  );

  logger.info(`${sender.username} (${role}) is ready`);

  // Check if both ready
  if (state.player1Ready && state.player2Ready && state.player1 && state.player2) {
    // Reset board and game state for new game
    state.board = Array(GAME_CONSTANTS.BOARD_SIZE).fill(null);
    state.player1Queue = [];
    state.player2Queue = [];
    state.winner = null;
    state.winReason = null;
    state.rematchVotes = { player1: null, player2: null };

    // Start game
    state.phase = 'playing';
    state.currentTurn = Math.random() < 0.5 ? 'player1' : 'player2';
    state.turnStartTick = tick;

    // Send GAME_START with full state to ensure client has correct board
    dispatcher.broadcastMessage(
      OpCode.GAME_START,
      JSON.stringify({
        firstTurn: state.currentTurn,
        board: state.board, // Include empty board to sync state
      }),
      null,
      null,
      true
    );

    logger.info(`Game started! First turn: ${state.currentTurn}`);
  }

  return state;
}

/**
 * Handle UNREADY
 */
export function handleUnready(
  state: MatchState,
  sender: nkruntime.Presence,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): MatchState {
  const role = getPlayerRole(state, sender.sessionId);

  if (role === 'spectator') {
    return state;
  }

  // Can only unready in ready/waiting phase
  if (state.phase !== 'ready' && state.phase !== 'waiting') {
    return state;
  }

  // Set unready
  if (role === 'player1') {
    state.player1Ready = false;
  } else {
    state.player2Ready = false;
  }

  dispatcher.broadcastMessage(
    OpCode.READY_UPDATE,
    JSON.stringify({
      player1Ready: state.player1Ready,
      player2Ready: state.player2Ready,
    }),
    null,
    null,
    true
  );

  logger.info(`${sender.username} (${role}) cancelled ready`);

  return state;
}

/**
 * Handle MOVE
 */
export function handleMove(
  state: MatchState,
  sender: nkruntime.Presence,
  data: { cellIndex: number },
  tick: number,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): MatchState {
  const role = getPlayerRole(state, sender.sessionId);

  // Validate
  if (state.phase !== 'playing') {
    return state;
  }

  if (role !== state.currentTurn) {
    dispatcher.broadcastMessage(
      OpCode.ERROR,
      JSON.stringify({ code: 'NOT_YOUR_TURN', message: 'Not your turn' }),
      [sender],
      null,
      true
    );
    return state;
  }

  const { cellIndex } = data;
  if (cellIndex < 0 || cellIndex >= 9 || state.board[cellIndex] !== null) {
    dispatcher.broadcastMessage(
      OpCode.ERROR,
      JSON.stringify({ code: 'INVALID_MOVE', message: 'Invalid cell' }),
      [sender],
      null,
      true
    );
    return state;
  }

  // Make move
  const { removedCellIndex } = makeMove(state, role, cellIndex, tick);

  // Broadcast move
  dispatcher.broadcastMessage(
    OpCode.MOVE_MADE,
    JSON.stringify({
      player: role,
      cellIndex,
      removedCellIndex,
    }),
    null,
    null,
    true
  );

  logger.info(`${sender.username} placed at ${cellIndex}${removedCellIndex !== null ? `, removed ${removedCellIndex}` : ''}`);

  // Check winner
  const winner = checkWinner(state);
  if (winner) {
    state.winner = winner;
    state.winReason = 'three_in_row';
    state.phase = 'ended';

    dispatcher.broadcastMessage(
      OpCode.GAME_END,
      JSON.stringify({ winner, reason: 'three_in_row' }),
      null,
      null,
      true
    );

    logger.info(`Game ended! Winner: ${winner}`);
    return state;
  }

  // Switch turn
  state.currentTurn = role === 'player1' ? 'player2' : 'player1';
  state.turnStartTick = tick;

  dispatcher.broadcastMessage(
    OpCode.TURN_CHANGE,
    JSON.stringify({ currentTurn: state.currentTurn }),
    null,
    null,
    true
  );

  return state;
}

/**
 * Handle KICK_PLAYER
 */
export function handleKickPlayer(
  state: MatchState,
  sender: nkruntime.Presence,
  data: { targetRole: 'player1' | 'player2' },
  tick: number,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): MatchState {
  const senderRole = getPlayerRole(state, sender.sessionId);

  // Only players can kick
  if (senderRole === 'spectator') {
    return state;
  }

  // Can only kick the other player
  if (senderRole === data.targetRole) {
    return state;
  }

  // Can only kick in ready phase after timeout
  if (state.phase !== 'ready') {
    return state;
  }

  // Check if target is not ready and timeout passed
  const targetReady = data.targetRole === 'player1' ? state.player1Ready : state.player2Ready;
  const elapsed = tick - state.readyStartTick;

  if (targetReady || elapsed < state.readyTimeoutTicks) {
    dispatcher.broadcastMessage(
      OpCode.ERROR,
      JSON.stringify({ code: 'CANNOT_KICK', message: 'Cannot kick player yet' }),
      [sender],
      null,
      true
    );
    return state;
  }

  // Kick player
  const kickedPlayer = data.targetRole === 'player1' ? state.player1 : state.player2;
  if (!kickedPlayer) return state;

  if (data.targetRole === 'player1') {
    state.player1 = null;
    state.player1Ready = false;
  } else {
    state.player2 = null;
    state.player2Ready = false;
  }

  state.phase = 'waiting';

  dispatcher.broadcastMessage(
    OpCode.PLAYER_KICKED,
    JSON.stringify({
      odiscrdId: kickedPlayer.odiscrdId,
      role: data.targetRole,
    }),
    null,
    null,
    true
  );

  logger.info(`${sender.username} kicked ${kickedPlayer.username}`);

  return state;
}

/**
 * Handle REMATCH_VOTE
 */
export function handleRematchVote(
  state: MatchState,
  sender: nkruntime.Presence,
  data: { accept: boolean },
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): MatchState {
  const role = getPlayerRole(state, sender.sessionId);

  if (role === 'spectator' || state.phase !== 'ended') {
    return state;
  }

  // Record vote
  if (role === 'player1') {
    state.rematchVotes.player1 = data.accept;
  } else {
    state.rematchVotes.player2 = data.accept;
  }

  dispatcher.broadcastMessage(
    OpCode.REMATCH_UPDATE,
    JSON.stringify(state.rematchVotes),
    null,
    null,
    true
  );

  logger.info(`${sender.username} voted ${data.accept ? 'yes' : 'no'} for rematch`);

  // Check if both voted
  if (state.rematchVotes.player1 !== null && state.rematchVotes.player2 !== null) {
    if (state.rematchVotes.player1 && state.rematchVotes.player2) {
      // Both agreed - reset game
      state = resetForRematch(state);

      // Move to ready phase since both players still present
      state.phase = 'ready';

      const syncPayload = buildStateSyncPayload(state);
      dispatcher.broadcastMessage(
        OpCode.STATE_SYNC,
        JSON.stringify(syncPayload),
        null,
        null,
        true
      );

      logger.info('Rematch started!');
    } else {
      // Someone declined - they become spectator
      if (!state.rematchVotes.player1 && state.player1) {
        const player = state.player1;
        state.player1 = null;
        state.player1Ready = false;

        dispatcher.broadcastMessage(
          OpCode.PLAYER_LEFT,
          JSON.stringify({ odiscrdId: player.odiscrdId, role: 'player1' }),
          null,
          null,
          true
        );
      }

      if (!state.rematchVotes.player2 && state.player2) {
        const player = state.player2;
        state.player2 = null;
        state.player2Ready = false;

        dispatcher.broadcastMessage(
          OpCode.PLAYER_LEFT,
          JSON.stringify({ odiscrdId: player.odiscrdId, role: 'player2' }),
          null,
          null,
          true
        );
      }

      state = resetForRematch(state);
      state.phase = 'waiting';

      const syncPayload = buildStateSyncPayload(state);
      dispatcher.broadcastMessage(
        OpCode.STATE_SYNC,
        JSON.stringify(syncPayload),
        null,
        null,
        true
      );
    }
  }

  return state;
}
