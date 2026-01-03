<template>
  <div
    class="game-cell"
    :class="{
      clickable: isClickable,
      occupied: piece !== null,
      winning: isWinningCell,
    }"
    @click="handleClick"
  >
    <GamePiece
      v-if="piece && player"
      :player="player"
      :symbol="piece.owner === 'player1' ? 'O' : 'X'"
      :isAboutToRemove="isAboutToRemove"
      :isWinning="isWinningCell"
    />
  </div>
</template>

<script setup lang="ts">
import type { Piece, Player } from '@shared/types';
import GamePiece from './GamePiece.vue';

const props = defineProps<{
  index: number;
  piece: Piece | null;
  player: Player | null;
  isClickable: boolean;
  isAboutToRemove: boolean;
  isWinningCell: boolean;
}>();

const emit = defineEmits<{
  (e: 'cellClick', index: number): void;
}>();

function handleClick() {
  if (props.isClickable) {
    emit('cellClick', props.index);
  }
}
</script>

<style scoped>
.game-cell {
  width: 100%;
  height: 100%;
  background-color: #202225;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, transform 0.1s;
}

.game-cell.clickable {
  cursor: pointer;
}

.game-cell.clickable:hover {
  background-color: #2f3136;
}

.game-cell.clickable:active {
  transform: scale(0.95);
}

.game-cell.occupied {
  cursor: default;
}

/* Winning cell glow effect */
.game-cell.winning {
  background-color: rgba(59, 165, 92, 0.3);
  box-shadow: 0 0 20px rgba(59, 165, 92, 0.6), inset 0 0 10px rgba(59, 165, 92, 0.3);
  animation: winning-glow 1s ease-in-out infinite alternate;
}

@keyframes winning-glow {
  from {
    box-shadow: 0 0 15px rgba(59, 165, 92, 0.5), inset 0 0 8px rgba(59, 165, 92, 0.2);
  }
  to {
    box-shadow: 0 0 25px rgba(59, 165, 92, 0.8), inset 0 0 12px rgba(59, 165, 92, 0.4);
  }
}
</style>
