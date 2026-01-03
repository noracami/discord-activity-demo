<template>
  <div
    class="game-piece"
    :class="{
      'about-to-remove': isAboutToRemove,
      'winning': isWinning,
      'symbol-o': symbol === 'O',
      'symbol-x': symbol === 'X',
    }"
  >
    <img
      :src="avatarUrl"
      :alt="player.username"
      class="piece-avatar"
    />
    <span class="symbol-badge" :class="symbolClass">{{ symbol }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@shared/types';

const props = defineProps<{
  player: Player;
  symbol: 'O' | 'X';
  isAboutToRemove: boolean;
  isWinning: boolean;
}>();

const symbolClass = computed(() => ({
  'badge-o': props.symbol === 'O',
  'badge-x': props.symbol === 'X',
}));

const avatarUrl = computed(() => {
  if (props.player.avatarUrl) {
    return props.player.avatarUrl;
  }
  // Discord default avatar fallback using Discord ID
  // Discord uses (user_id >> 22) % 6 for default avatar index
  const odiscrdId = props.player.odiscrdId;
  try {
    const defaultIndex = Number(BigInt(odiscrdId) >> 22n) % 6;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  } catch {
    // Fallback if BigInt fails
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }
});
</script>

<style scoped>
.game-piece {
  position: relative;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.piece-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid #4f545c;
  object-fit: cover;
}

.symbol-o .piece-avatar {
  border-color: #5865f2;
}

.symbol-x .piece-avatar {
  border-color: #ed4245;
}

.symbol-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: white;
  border: 2px solid #36393f;
}

.symbol-badge.badge-o {
  background-color: #5865f2;
}

.symbol-badge.badge-x {
  background-color: #ed4245;
}

/* FIFO: About to remove - shrink and fade */
.about-to-remove {
  transform: scale(0.7);
  opacity: 0.5;
  transition: transform 0.3s, opacity 0.3s;
}

/* Winning piece pulse effect */
.winning {
  animation: winning-pulse 0.8s ease-in-out infinite;
}

.winning .piece-avatar {
  border-color: #3ba55c !important;
  box-shadow: 0 0 15px rgba(59, 165, 92, 0.8);
}

@keyframes winning-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
