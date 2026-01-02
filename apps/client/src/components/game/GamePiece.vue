<template>
  <div
    class="game-piece"
    :class="{
      'about-to-remove': isAboutToRemove,
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
}>();

const symbolClass = computed(() => ({
  'badge-o': props.symbol === 'O',
  'badge-x': props.symbol === 'X',
}));

const avatarUrl = computed(() => {
  if (props.player.avatarUrl) {
    return props.player.avatarUrl;
  }
  // Discord default avatar fallback
  const hash = hashCode(props.player.odiscrdId);
  return `https://cdn.discordapp.com/embed/avatars/${Math.abs(hash) % 5}.png`;
});

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}
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

/* FIFO: About to remove blink effect */
.about-to-remove {
  animation: blink 0.6s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
