<template>
  <div class="ready-timer" :class="{ warning: isWarning, critical: isCritical }">
    <div class="timer-bar">
      <div class="timer-fill" :style="{ width: `${progress}%` }"></div>
    </div>
    <div class="timer-text">
      <span class="timer-icon">⏱</span>
      <span>準備時間: {{ remainingSeconds }}秒</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  startTime: number | null;
  duration: number; // in seconds
}>();

const emit = defineEmits<{
  (e: 'timeout'): void;
}>();

const now = ref(Date.now());
let interval: number | null = null;

const remainingMs = computed(() => {
  if (!props.startTime) return props.duration * 1000;
  const elapsed = now.value - props.startTime;
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

  if (remainingMs.value <= 0) {
    emit('timeout');
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }
}

onMounted(() => {
  interval = window.setInterval(tick, 100);
});

onUnmounted(() => {
  if (interval) {
    clearInterval(interval);
  }
});

watch(() => props.startTime, () => {
  now.value = Date.now();
});
</script>

<style scoped>
.ready-timer {
  width: 100%;
  max-width: 400px;
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
  background-color: #3ba55c;
  transition: width 0.1s linear, background-color 0.3s;
  border-radius: 4px;
}

.ready-timer.warning .timer-fill {
  background-color: #faa61a;
}

.ready-timer.critical .timer-fill {
  background-color: #ed4245;
  animation: pulse-bar 0.5s ease-in-out infinite;
}

.timer-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  color: #b9bbbe;
}

.ready-timer.warning .timer-text {
  color: #faa61a;
}

.ready-timer.critical .timer-text {
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
