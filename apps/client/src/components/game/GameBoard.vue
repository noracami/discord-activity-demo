<template>
  <div class="game-board">
    <GameCell
      v-for="(cell, index) in board"
      :key="index"
      :index="index"
      :piece="cell"
      :player="getPlayerForPiece(cell)"
      :isClickable="canClickCell(index)"
      :isAboutToRemove="cell?.isAboutToRemove ?? false"
      @click="handleCellClick"
    />
  </div>
</template>

<script setup lang="ts">
import type { BoardState, Piece, Player } from '@shared/types';
import GameCell from './GameCell.vue';

const props = defineProps<{
  board: BoardState;
  player1: Player | null;
  player2: Player | null;
  isMyTurn: boolean;
}>();

const emit = defineEmits<{
  (e: 'move', cellIndex: number): void;
}>();

function getPlayerForPiece(piece: Piece | null): Player | null {
  if (!piece) return null;
  return piece.owner === 'player1' ? props.player1 : props.player2;
}

function canClickCell(index: number): boolean {
  return props.isMyTurn && props.board[index] === null;
}

function handleCellClick(index: number) {
  if (canClickCell(index)) {
    emit('move', index);
  }
}
</script>

<style scoped>
.game-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 4px;
  width: 300px;
  height: 300px;
  background-color: #4f545c;
  padding: 4px;
  border-radius: 12px;
}
</style>
