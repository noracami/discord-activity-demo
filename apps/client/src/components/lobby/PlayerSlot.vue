<template>
  <div class="player-slot" :class="{ empty: !player, ready: isReady }">
    <!-- Empty Slot -->
    <template v-if="!player">
      <div class="empty-content">
        <div class="empty-avatar">
          <span class="symbol">{{ symbol }}</span>
        </div>
        <p class="empty-text">等待玩家</p>
        <button
          v-if="canJoin"
          class="btn-join"
          @click="$emit('join')"
        >
          加入
        </button>
      </div>
    </template>

    <!-- Filled Slot -->
    <template v-else>
      <div class="player-content">
        <div class="avatar-wrapper">
          <img
            :src="avatarUrl"
            :alt="player.username"
            class="avatar"
          />
          <span class="symbol-badge" :class="symbolClass">{{ symbol }}</span>
        </div>
        <div class="player-info">
          <span class="username">{{ player.username }}</span>
          <span class="status" :class="{ ready: isReady }">
            {{ isReady ? '已準備' : '未準備' }}
          </span>
        </div>
        <div v-if="isMe" class="my-badge">你</div>
      </div>

      <!-- Buttons for self -->
      <div v-if="isMe && !isGameStarted" class="self-buttons">
        <button
          class="btn-ready"
          :class="{ 'is-ready': isReady }"
          @click="$emit('toggleReady')"
        >
          {{ isReady ? '取消準備' : '準備' }}
        </button>
        <button
          class="btn-leave"
          @click="$emit('leave')"
        >
          離座
        </button>
      </div>

      <!-- Kick Button for opponent (when can kick) -->
      <button
        v-if="canKick && !isMe"
        class="btn-kick"
        @click="$emit('kick')"
      >
        踢出
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@shared/types';

const props = defineProps<{
  player: Player | null;
  symbol: 'O' | 'X';
  isReady: boolean;
  isMe: boolean;
  canJoin: boolean;
  canKick: boolean;
  isGameStarted: boolean;
}>();

defineEmits<{
  (e: 'join'): void;
  (e: 'toggleReady'): void;
  (e: 'kick'): void;
  (e: 'leave'): void;
}>();

const symbolClass = computed(() => ({
  'symbol-o': props.symbol === 'O',
  'symbol-x': props.symbol === 'X',
}));

const avatarUrl = computed(() => {
  if (!props.player) return '';
  return props.player.avatarUrl || `https://cdn.discordapp.com/embed/avatars/${Math.abs(hashCode(props.player.odiscrdId)) % 5}.png`;
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
.player-slot {
  background-color: #2f3136;
  border-radius: 12px;
  padding: 20px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border: 2px solid transparent;
  transition: border-color 0.2s, background-color 0.2s;
}

.player-slot.ready {
  border-color: #3ba55c;
  background-color: rgba(59, 165, 92, 0.1);
}

.player-slot.empty {
  border-style: dashed;
  border-color: #4f545c;
}

/* Empty Slot Styles */
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #202225;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-avatar .symbol {
  font-size: 36px;
  color: #4f545c;
  font-weight: bold;
}

.empty-text {
  color: #72767d;
  font-size: 14px;
}

.btn-join {
  background-color: #5865f2;
  color: white;
  border: none;
  padding: 8px 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-join:hover {
  background-color: #4752c4;
}

/* Filled Slot Styles */
.player-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}

.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid #4f545c;
}

.player-slot.ready .avatar {
  border-color: #3ba55c;
}

.symbol-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  color: white;
}

.symbol-badge.symbol-o {
  background-color: #5865f2;
}

.symbol-badge.symbol-x {
  background-color: #ed4245;
}

.player-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.username {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.status {
  font-size: 12px;
  color: #72767d;
}

.status.ready {
  color: #3ba55c;
}

.my-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #faa61a;
  color: #202225;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.self-buttons {
  display: flex;
  gap: 8px;
  width: 100%;
}

.btn-ready {
  background-color: #3ba55c;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  flex: 1;
}

.btn-ready:hover {
  background-color: #2d7d46;
}

.btn-ready.is-ready {
  background-color: #4f545c;
}

.btn-ready.is-ready:hover {
  background-color: #5d6269;
}

.btn-leave {
  background-color: #4f545c;
  color: #dcddde;
  border: none;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-leave:hover {
  background-color: #5d6269;
}

.btn-kick {
  background-color: #ed4245;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-kick:hover {
  background-color: #c73e41;
}
</style>
