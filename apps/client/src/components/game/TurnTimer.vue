<template>
  <div
    class="turn-timer"
    :class="{
      warning: isWarning,
      critical: isCritical,
      'my-turn': isMyTurn,
    }"
  >
    <div class="timer-bar">
      <div class="timer-fill" :style="{ width: `${progress}%` }"></div>
    </div>
    <div class="timer-text">
      <span class="timer-icon">{{ isMyTurn ? '👆' : '⏳' }}</span>
      <span>{{ isMyTurn ? '你的回合' : '對手回合' }}: {{ remainingSeconds }}秒</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  duration: number;
  isMyTurn: boolean;
  turnStartTime: number | null;
}>();

const now = ref(Date.now());
let interval: number | null = null;

const remainingMs = computed(() => {
  if (!props.turnStartTime) return props.duration * 1000;
  const elapsed = now.value - props.turnStartTime;
  return Math.max(0, props.duration * 1000 - elapsed);
});

const remainingSeconds = computed(() => {
  return Math.ceil(remainingMs.value / 1000);
});

const progress = computed(() => {
  return (remainingMs.value / (props.duration * 1000)) * 100;
});

const isWarning = computed(() => {
  return remainingSeconds.value <= 10 && remainingSeconds.value > 5;
});

const isCritical = computed(() => {
  return remainingSeconds.value <= 5;
});

function tick() {
  now.value = Date.now();
}

onMounted(() => {
  interval = window.setInterval(tick, 100);
});

onUnmounted(() => {
  if (interval) {
    clearInterval(interval);
  }
});

// Reset timer when turn changes
watch(() => props.turnStartTime, () => {
  now.value = Date.now();
});
</script>

<style scoped>
.turn-timer {
  width: 100%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timer-bar {
  height: 8px;
  background-color: #202225;
  border-radius: 4px;
  overflow: hidden;
}

.timer-fill {
  height: 100%;
  background-color: #4f545c;
  transition: width 0.1s linear, background-color 0.3s;
  border-radius: 4px;
}

.turn-timer.my-turn .timer-fill {
  background-color: #3ba55c;
}

.turn-timer.warning .timer-fill {
  background-color: #faa61a;
}

.turn-timer.critical .timer-fill {
  background-color: #ed4245;
  animation: pulse-bar 0.5s ease-in-out infinite;
}

.timer-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  color: #72767d;
}

.turn-timer.my-turn .timer-text {
  color: #3ba55c;
  font-weight: 500;
}

.turn-timer.warning .timer-text {
  color: #faa61a;
}

.turn-timer.critical .timer-text {
  color: #ed4245;
  font-weight: 600;
}

.timer-icon {
  font-size: 16px;
}

@keyframes pulse-bar {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
