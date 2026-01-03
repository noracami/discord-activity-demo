<template>
  <div class="game-view">
    <!-- Player Status -->
    <div class="game-status">
      <div class="player-card" :class="{ active: game.currentTurn === 'player1' }">
        <img
          v-if="player1AvatarUrl"
          :src="player1AvatarUrl"
          :alt="game.player1?.username"
          class="status-avatar"
        />
        <div v-else class="status-avatar-placeholder">O</div>
        <span class="player-name">{{ game.player1?.username ?? '玩家 1' }}</span>
        <span class="symbol symbol-o">O</span>
      </div>

      <div class="turn-indicator">
        <span v-if="game.isMyTurn" class="your-turn-badge">你的回合!</span>
        <span v-else class="vs-text">VS</span>
      </div>

      <div class="player-card" :class="{ active: game.currentTurn === 'player2' }">
        <img
          v-if="player2AvatarUrl"
          :src="player2AvatarUrl"
          :alt="game.player2?.username"
          class="status-avatar"
        />
        <div v-else class="status-avatar-placeholder">X</div>
        <span class="player-name">{{ game.player2?.username ?? '玩家 2' }}</span>
        <span class="symbol symbol-x">X</span>
      </div>
    </div>

    <!-- Opponent Disconnected Warning -->
    <div v-if="game.opponentDisconnected" class="disconnect-warning">
      <span class="disconnect-icon">⚠️</span>
      <span>對手已斷線，等待重新連線中...</span>
    </div>

    <!-- Turn Timer -->
    <TurnTimer
      :duration="TURN_TIME_LIMIT"
      :isMyTurn="game.isMyTurn"
      :turnStartTime="game.turnStartTime"
    />

    <!-- Game Board -->
    <GameBoard
      :board="game.board"
      :player1="game.player1"
      :player2="game.player2"
      :isMyTurn="game.isMyTurn"
      :winningCells="game.winningCells"
      @move="handleMove"
    />

    <!-- Spectator Notice -->
    <div v-if="game.myRole === 'spectator'" class="spectator-notice">
      <span class="spectator-icon">👁</span>
      <span>你正在觀戰</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game.store';
import { useNakamaStore } from '@/stores/nakama.store';
import { GAME_CONSTANTS } from '@shared/types';
import GameBoard from './GameBoard.vue';
import TurnTimer from './TurnTimer.vue';

const game = useGameStore();
const nakama = useNakamaStore();

const TURN_TIME_LIMIT = GAME_CONSTANTS.TURN_TIME_LIMIT;

const player1AvatarUrl = computed(() => {
  if (!game.player1) return '';
  return game.player1.avatarUrl || getDefaultAvatar(game.player1.odiscrdId);
});

const player2AvatarUrl = computed(() => {
  if (!game.player2) return '';
  return game.player2.avatarUrl || getDefaultAvatar(game.player2.odiscrdId);
});

function getDefaultAvatar(odiscrdId: string): string {
  const hash = hashCode(odiscrdId);
  return `https://cdn.discordapp.com/embed/avatars/${Math.abs(hash) % 5}.png`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

function handleMove(cellIndex: number) {
  if (game.isMyTurn) {
    game.setPendingMove(true);
    nakama.move(cellIndex);
  }
}
</script>

<style scoped>
.game-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
}

/* Player Status */
.game-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.player-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background-color: #2f3136;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: border-color 0.2s, background-color 0.2s;
  min-width: 100px;
}

.player-card.active {
  border-color: #3ba55c;
  background-color: rgba(59, 165, 92, 0.1);
}

.status-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.status-avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #202225;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: #4f545c;
}

.player-name {
  font-size: 14px;
  font-weight: 500;
  color: #dcddde;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.symbol {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: white;
}

.symbol-o {
  background-color: #5865f2;
}

.symbol-x {
  background-color: #ed4245;
}

.turn-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}

.vs-text {
  font-size: 20px;
  font-weight: 700;
  color: #4f545c;
}

.your-turn-badge {
  background-color: #3ba55c;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* Spectator Notice */
.spectator-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: #2f3136;
  border-radius: 8px;
  color: #b9bbbe;
  font-size: 14px;
}

.spectator-icon {
  font-size: 18px;
}

/* Disconnect Warning */
.disconnect-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: rgba(250, 168, 26, 0.15);
  border: 1px solid #faa81a;
  border-radius: 8px;
  color: #faa81a;
  font-size: 14px;
  animation: pulse-warning 2s ease-in-out infinite;
}

.disconnect-icon {
  font-size: 18px;
}

@keyframes pulse-warning {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
