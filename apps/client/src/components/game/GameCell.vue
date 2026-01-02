<template>
  <div
    class="game-cell"
    :class="{
      clickable: isClickable,
      occupied: piece !== null,
    }"
    @click="handleClick"
  >
    <GamePiece
      v-if="piece && player"
      :player="player"
      :symbol="piece.owner === 'player1' ? 'O' : 'X'"
      :isAboutToRemove="isAboutToRemove"
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
}>();

const emit = defineEmits<{
  (e: 'click', index: number): void;
}>();

function handleClick() {
  if (props.isClickable) {
    emit('click', props.index);
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
</style>
