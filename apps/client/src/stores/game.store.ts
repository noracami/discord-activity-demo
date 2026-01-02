import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { OpCode } from '@shared/types';
import type {
  GamePhase,
  PlayerRole,
  Player,
  BoardState,
  RematchVotes,
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
  const winner = ref<'player1' | 'player2' | null>(null);
  const winReason = ref<'three_in_row' | 'opponent_left' | null>(null);
  const rematchVotes = ref<RematchVotes>({ player1: null, player2: null });
  const hasEmptySlot = ref(true);
  const myRole = ref<PlayerRole>('spectator');

  // Getters
  const isMyTurn = computed(() => {
    return phase.value === 'playing' && currentTurn.value === myRole.value;
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
        break;

      case OpCode.MOVE_MADE:
        handleMoveMade(data);
        break;

      case OpCode.TURN_CHANGE:
        currentTurn.value = data.currentTurn;
        break;

      case OpCode.GAME_END:
        phase.value = 'ended';
        winner.value = data.winner;
        winReason.value = data.reason;
        break;

      case OpCode.REMATCH_UPDATE:
        rematchVotes.value = data;
        break;

      case OpCode.PLAYER_KICKED:
        handlePlayerKicked(data);
        break;

      case OpCode.ERROR:
        console.error('Game error:', data.code, data.message);
        break;
    }
  }

  function syncState(data: any) {
    phase.value = data.phase;
    player1.value = data.player1;
    player2.value = data.player2;
    board.value = data.board;
    currentTurn.value = data.currentTurn;
    player1Ready.value = data.player1Ready;
    player2Ready.value = data.player2Ready;
    readyStartTime.value = data.readyStartTime;
    winner.value = data.winner;
    winReason.value = data.winReason;
    rematchVotes.value = data.rematchVotes;
    hasEmptySlot.value = data.hasEmptySlot;

    // Determine my role based on my Discord ID
    // This will be set after we know our Discord ID
  }

  function handlePlayerJoined(data: any) {
    if (data.role === 'player1') {
      player1.value = {
        odiscrdId: data.odiscrdId,
        nakamaId: data.odiscrdId,
        username: data.username,
        avatarUrl: '',
        symbol: 'O',
      };
    } else if (data.role === 'player2') {
      player2.value = {
        odiscrdId: data.odiscrdId,
        nakamaId: data.odiscrdId,
        username: data.username,
        avatarUrl: '',
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

  function setMyRole(odiscrdId: string) {
    if (player1.value?.odiscrdId === odiscrdId) {
      myRole.value = 'player1';
    } else if (player2.value?.odiscrdId === odiscrdId) {
      myRole.value = 'player2';
    } else {
      myRole.value = 'spectator';
    }
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
    winner.value = null;
    winReason.value = null;
    rematchVotes.value = { player1: null, player2: null };
    hasEmptySlot.value = true;
    myRole.value = 'spectator';
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
    winner,
    winReason,
    rematchVotes,
    hasEmptySlot,
    myRole,
    // Getters
    isMyTurn,
    canJoin,
    myPlayer,
    opponentPlayer,
    // Actions
    handleServerMessage,
    setMyRole,
    reset,
  };
});
