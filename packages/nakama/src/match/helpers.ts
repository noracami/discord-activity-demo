import { MatchState, MatchPlayer, MatchPiece } from './state';
import { WIN_PATTERNS, GAME_CONSTANTS } from './constants';

/**
 * Build state sync payload for client
 */
export function buildStateSyncPayload(state: MatchState) {
  return {
    phase: state.phase,
    player1: state.player1 ? buildPlayerPayload(state.player1, 'O') : null,
    player2: state.player2 ? buildPlayerPayload(state.player2, 'X') : null,
    board: state.board.map((piece, index) => piece ? {
      owner: piece.owner,
      cellIndex: index,
      placedAt: piece.placedTick, // Include for FIFO sorting on client
      isAboutToRemove: isAboutToRemove(state, piece),
    } : null),
    currentTurn: state.currentTurn,
    player1Ready: state.player1Ready,
    player2Ready: state.player2Ready,
    readyStartTime: state.readyStartTick, // Include ready start time
    turnStartTime: state.turnStartTick, // Include turn start time
    winner: state.winner,
    winReason: state.winReason,
    rematchVotes: state.rematchVotes,
    hasEmptySlot: state.player1 === null || state.player2 === null,
  };
}

/**
 * Build player payload
 */
function buildPlayerPayload(player: MatchPlayer, symbol: 'O' | 'X') {
  return {
    odiscrdId: player.odiscrdId,
    nakamaId: player.nakamaId,
    username: player.username,
    avatarUrl: player.avatarUrl,
    symbol,
  };
}

/**
 * Check if piece is about to be removed (FIFO)
 */
function isAboutToRemove(state: MatchState, piece: MatchPiece): boolean {
  const queue = piece.owner === 'player1' ? state.player1Queue : state.player2Queue;

  // If queue is at max, the oldest piece will be removed on next move
  if (queue.length >= GAME_CONSTANTS.MAX_PIECES_PER_PLAYER) {
    return queue[0] === piece.cellIndex;
  }

  return false;
}

/**
 * Check for winner - returns winner and winning cells
 */
export function checkWinner(state: MatchState): { winner: 'player1' | 'player2'; winningCells: number[] } | null {
  for (const pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern;
    const pieceA = state.board[a];
    const pieceB = state.board[b];
    const pieceC = state.board[c];

    if (
      pieceA !== null &&
      pieceB !== null &&
      pieceC !== null &&
      pieceA.owner === pieceB.owner &&
      pieceA.owner === pieceC.owner
    ) {
      return { winner: pieceA.owner, winningCells: [a, b, c] };
    }
  }

  return null;
}

/**
 * Make a move on the board
 */
export function makeMove(
  state: MatchState,
  playerRole: 'player1' | 'player2',
  cellIndex: number,
  tick: number
): { removedCellIndex: number | null } {
  const queue = playerRole === 'player1' ? state.player1Queue : state.player2Queue;
  let removedCellIndex: number | null = null;

  // FIFO: Remove oldest piece if at max
  if (queue.length >= GAME_CONSTANTS.MAX_PIECES_PER_PLAYER) {
    removedCellIndex = queue.shift()!;
    state.board[removedCellIndex] = null;
  }

  // Place new piece
  state.board[cellIndex] = {
    owner: playerRole,
    cellIndex,
    placedTick: tick,
  };
  queue.push(cellIndex);

  return { removedCellIndex };
}

/**
 * Reset game state for rematch
 */
export function resetForRematch(state: MatchState): MatchState {
  state.phase = 'waiting';
  state.board = Array(GAME_CONSTANTS.BOARD_SIZE).fill(null);
  state.player1Queue = [];
  state.player2Queue = [];
  state.currentTurn = null;
  state.turnStartTick = 0;
  state.player1Ready = false;
  state.player2Ready = false;
  state.readyStartTick = 0;
  state.winner = null;
  state.winReason = null;
  state.rematchVotes = { player1: null, player2: null };

  return state;
}
