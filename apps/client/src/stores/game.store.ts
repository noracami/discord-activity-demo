import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { OpCode, GAME_CONSTANTS } from '@shared/types';
import type {
  GamePhase,
  PlayerRole,
  Player,
  BoardState,
  RematchVotes,
  Piece,
} from '@shared/types';

export const useGameStore = defineStore('game', () => {
  // State
  const phase = ref<GamePhase>('waiting');
  const player1 = ref<Player | null>(null);
  const player2 = ref<Player | null>(null);
  const board = ref<BoardState>(Array(9).fill(null));
  const currentTurn = ref<'player1' | 'player2' | null>(null);
  const player1Ready = ref(false);
  const player2Ready = ref(false);
  const readyStartTime = ref<number | null>(null);
  const turnStartTime = ref<number | null>(null);
  const winner = ref<'player1' | 'player2' | null>(null);
  const winReason = ref<'three_in_row' | 'opponent_left' | null>(null);
  const winningCells = ref<number[]>([]);
  const rematchVotes = ref<RematchVotes>({ player1: null, player2: null });
  const hasEmptySlot = ref(true);
  const myRole = ref<PlayerRole>('spectator');
  const pendingMove = ref(false); // Prevent rapid clicks
  const opponentDisconnected = ref(false); // Track if opponent is temporarily disconnected

  // Getters
  const isMyTurn = computed(() => {
    return phase.value === 'playing' && currentTurn.value === myRole.value && !pendingMove.value;
  });

  const canJoin = computed(() => {
    return myRole.value === 'spectator' && hasEmptySlot.value && phase.value !== 'playing';
  });

  const myPlayer = computed(() => {
    if (myRole.value === 'player1') return player1.value;
    if (myRole.value === 'player2') return player2.value;
    return null;
  });

  const opponentPlayer = computed(() => {
    if (myRole.value === 'player1') return player2.value;
    if (myRole.value === 'player2') return player1.value;
    return null;
  });

  // Actions
  function handleServerMessage(opCode: number, data: any) {
    switch (opCode) {
      case OpCode.STATE_SYNC:
        syncState(data);
        break;

      case OpCode.PLAYER_JOINED:
        handlePlayerJoined(data);
        break;

      case OpCode.PLAYER_LEFT:
        handlePlayerLeft(data);
        break;

      case OpCode.READY_UPDATE:
        player1Ready.value = data.player1Ready;
        player2Ready.value = data.player2Ready;
        break;

      case OpCode.GAME_START:
        phase.value = 'playing';
        currentTurn.value = data.firstTurn;
        turnStartTime.value = Date.now();
        // Use board from server if provided, otherwise reset
        board.value = data.board || Array(9).fill(null);
        pendingMove.value = false;
        console.log('GAME_START: board synced, firstTurn:', data.firstTurn);
        break;

      case OpCode.MOVE_MADE:
        handleMoveMade(data);
        pendingMove.value = false;
        break;

      case OpCode.TURN_CHANGE:
        currentTurn.value = data.currentTurn;
        turnStartTime.value = Date.now();
        pendingMove.value = false;
        break;

      case OpCode.GAME_END:
        phase.value = 'ended';
        winner.value = data.winner;
        winReason.value = data.reason;
        winningCells.value = data.winningCells || [];
        pendingMove.value = false;
        break;

      case OpCode.REMATCH_UPDATE:
        console.log('REMATCH_UPDATE received:', data);
        rematchVotes.value = data;
        break;

      case OpCode.PLAYER_KICKED:
        handlePlayerKicked(data);
        break;

      case OpCode.PLAYER_DISCONNECTED:
        handlePlayerDisconnected(data);
        break;

      case OpCode.PLAYER_RECONNECTED:
        handlePlayerReconnected(data);
        break;

      case OpCode.VERSION_CHECK:
        handleVersionCheck(data);
        break;

      case OpCode.ERROR:
        console.error('Game error:', data.code, data.message);
        pendingMove.value = false; // Clear pending move on error
        break;
    }
  }

  function handleVersionCheck(data: { version: string }) {
    const serverVersion = data.version;
    const clientVersion = __CLIENT_VERSION__;

    if (serverVersion !== clientVersion) {
      console.log(`Version mismatch: server=${serverVersion}, client=${clientVersion}`);

      // Only auto-reload if not in playing phase (avoid disrupting active game)
      if (phase.value !== 'playing') {
        console.log('Auto-reloading to get new version...');
        window.location.reload();
      } else {
        console.log('In playing phase, will reload after game ends');
      }
    }
  }

  function syncState(data: any) {
    console.log('STATE_SYNC received:', JSON.stringify(data));
    phase.value = data.phase;
    player1.value = data.player1;
    player2.value = data.player2;
    board.value = data.board;
    currentTurn.value = data.currentTurn;
    player1Ready.value = data.player1Ready;
    player2Ready.value = data.player2Ready;
    readyStartTime.value = data.readyStartTime;

    // Always reset timer to now if game is in progress
    // This gives full turn time after reconnection
    if (data.phase === 'playing' && data.currentTurn) {
      turnStartTime.value = Date.now();
    } else {
      turnStartTime.value = null;
    }

    winner.value = data.winner;
    winReason.value = data.winReason;
    rematchVotes.value = data.rematchVotes;
    hasEmptySlot.value = data.hasEmptySlot;
    opponentDisconnected.value = false; // Reset on full sync

    // Note: myRole will be updated by the watch in App.vue
    console.log('STATE_SYNC processed, phase:', phase.value, 'currentTurn:', currentTurn.value, 'turnStartTime:', turnStartTime.value);
  }

  function handlePlayerJoined(data: any) {
    if (data.role === 'player1') {
      player1.value = {
        odiscrdId: data.odiscrdId,
        nakamaId: data.odiscrdId,
        username: data.username,
        avatarUrl: data.avatarUrl || '',
        symbol: 'O',
      };
    } else if (data.role === 'player2') {
      player2.value = {
        odiscrdId: data.odiscrdId,
        nakamaId: data.odiscrdId,
        username: data.username,
        avatarUrl: data.avatarUrl || '',
        symbol: 'X',
      };
    }
    hasEmptySlot.value = player1.value === null || player2.value === null;
  }

  function handlePlayerLeft(data: any) {
    if (data.role === 'player1') {
      player1.value = null;
      player1Ready.value = false;
    } else if (data.role === 'player2') {
      player2.value = null;
      player2Ready.value = false;
    }
    hasEmptySlot.value = true;
  }

  function handleMoveMade(data: any) {
    const { player, cellIndex, removedCellIndex } = data;

    // Remove old piece if FIFO triggered
    if (removedCellIndex !== null && removedCellIndex !== undefined) {
      board.value[removedCellIndex] = null;
    }

    // Place new piece
    board.value[cellIndex] = {
      owner: player,
      cellIndex,
      placedAt: Date.now(),
      isAboutToRemove: false,
    };

    // Update isAboutToRemove flags for FIFO visual indication
    updateAboutToRemoveFlags();
  }

  function updateAboutToRemoveFlags() {
    // Collect pieces by player, sorted by placedAt
    const playerPieces: { player1: Piece[], player2: Piece[] } = {
      player1: [],
      player2: [],
    };

    board.value.forEach((piece) => {
      if (piece) {
        const owner = piece.owner as 'player1' | 'player2';
        playerPieces[owner].push(piece);
      }
    });

    // Sort by placedAt (oldest first)
    playerPieces.player1.sort((a, b) => a.placedAt - b.placedAt);
    playerPieces.player2.sort((a, b) => a.placedAt - b.placedAt);

    // Reset all flags first
    board.value.forEach((piece) => {
      if (piece) {
        piece.isAboutToRemove = false;
      }
    });

    // Mark oldest piece as about to remove when player has MAX pieces
    const MAX_PIECES = GAME_CONSTANTS.MAX_PIECES_PER_PLAYER;
    if (playerPieces.player1.length >= MAX_PIECES) {
      playerPieces.player1[0].isAboutToRemove = true;
    }
    if (playerPieces.player2.length >= MAX_PIECES) {
      playerPieces.player2[0].isAboutToRemove = true;
    }
  }

  function handlePlayerKicked(data: any) {
    if (data.role === 'player1') {
      player1.value = null;
      player1Ready.value = false;
    } else {
      player2.value = null;
      player2Ready.value = false;
    }
    hasEmptySlot.value = true;
    phase.value = 'waiting';
  }

  function handlePlayerDisconnected(data: any) {
    const { role } = data;
    console.log(`Player ${role} disconnected temporarily`);

    // Check if it's opponent who disconnected
    if (
      (myRole.value === 'player1' && role === 'player2') ||
      (myRole.value === 'player2' && role === 'player1')
    ) {
      opponentDisconnected.value = true;
    }
  }

  function handlePlayerReconnected(data: any) {
    const { role } = data;
    console.log(`Player ${role} reconnected`);

    // Check if it's opponent who reconnected
    if (
      (myRole.value === 'player1' && role === 'player2') ||
      (myRole.value === 'player2' && role === 'player1')
    ) {
      opponentDisconnected.value = false;
    }
  }

  function setMyRole(odiscrdId: string) {
    if (player1.value?.odiscrdId === odiscrdId) {
      myRole.value = 'player1';
    } else if (player2.value?.odiscrdId === odiscrdId) {
      myRole.value = 'player2';
    } else {
      myRole.value = 'spectator';
    }
  }

  function setPendingMove(pending: boolean) {
    pendingMove.value = pending;
  }

  function reset() {
    phase.value = 'waiting';
    player1.value = null;
    player2.value = null;
    board.value = Array(9).fill(null);
    currentTurn.value = null;
    player1Ready.value = false;
    player2Ready.value = false;
    readyStartTime.value = null;
    turnStartTime.value = null;
    winner.value = null;
    winReason.value = null;
    winningCells.value = [];
    rematchVotes.value = { player1: null, player2: null };
    hasEmptySlot.value = true;
    myRole.value = 'spectator';
    pendingMove.value = false;
    opponentDisconnected.value = false;
  }

  return {
    // State
    phase,
    player1,
    player2,
    board,
    currentTurn,
    player1Ready,
    player2Ready,
    readyStartTime,
    turnStartTime,
    winner,
    winReason,
    winningCells,
    rematchVotes,
    hasEmptySlot,
    myRole,
    opponentDisconnected,
    // Getters
    isMyTurn,
    canJoin,
    myPlayer,
    opponentPlayer,
    // Actions
    handleServerMessage,
    setMyRole,
    setPendingMove,
    reset,
  };
});
