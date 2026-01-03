<template>
  <div class="app">
    <!-- Reconnecting Overlay -->
    <div v-if="nakama.isReconnecting" class="reconnecting-overlay">
      <div class="reconnecting-content">
        <div class="reconnecting-spinner"></div>
        <p class="reconnecting-text">重新連線中...</p>
        <p class="reconnecting-attempts">嘗試 {{ nakama.reconnectAttempts }} / 5</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="discord.isLoading || nakama.isConnecting" class="center-container">
      <LoadingSpinner :message="loadingMessage" />
    </div>

    <!-- Error State / Landing Page -->
    <div v-else-if="(discord.error || nakama.error) && !nakama.isReconnecting" class="center-container landing-container">
      <h1 class="landing-title">無盡圈圈叉叉</h1>
      <p class="landing-subtitle">Infinite Tic-Tac-Toe</p>
      <p class="landing-desc">一個 Discord Activity 遊戲，請在 Discord 語音頻道中開啟</p>

      <a
        href="https://github.com/noracami/discord-activity-demo"
        target="_blank"
        rel="noopener noreferrer"
        class="btn-github"
      >
        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        View on GitHub
      </a>

      <div class="landing-links">
        <a href="/privacy.html">Privacy Policy</a>
        <span class="divider">|</span>
        <a href="/terms.html">Terms of Service</a>
      </div>
    </div>

    <!-- Connected State -->
    <div v-else-if="discord.isAuthenticated && nakama.isConnected" class="main-container">
      <header class="header">
        <div class="user-info">
          <img
            v-if="discord.avatarUrl"
            :src="discord.avatarUrl"
            :alt="discord.displayName || ''"
            class="avatar"
          />
          <span class="username">{{ discord.displayName }}</span>
          <span class="role-badge" :class="game.myRole">
            {{ roleLabel }}
          </span>
        </div>
        <div class="connection-status">
          <span class="status-dot connected"></span>
          <span>已連接</span>
        </div>
      </header>

      <main class="content">
        <!-- Lobby View (waiting/ready phase) -->
        <LobbyView v-if="game.phase === 'waiting' || game.phase === 'ready'" />

        <!-- Game View (playing phase) -->
        <GameView v-else-if="game.phase === 'playing'" />

        <!-- Game Ended View -->
        <GameResult v-else-if="game.phase === 'ended'" />
      </main>
    </div>

    <!-- Initial State -->
    <div v-else class="center-container">
      <LoadingSpinner message="初始化中..." />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, watch } from 'vue';
import { useDiscordStore, useNakamaStore, useGameStore } from '@/stores';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import LobbyView from '@/components/lobby/LobbyView.vue';
import { GameView, GameResult } from '@/components/game';

const discord = useDiscordStore();
const nakama = useNakamaStore();
const game = useGameStore();

const loadingMessage = computed(() => {
  if (discord.isLoading) return '連接 Discord 中...';
  if (nakama.isConnecting) return '連接遊戲伺服器中...';
  return '載入中...';
});

const roleLabel = computed(() => {
  switch (game.myRole) {
    case 'player1': return 'O';
    case 'player2': return 'X';
    default: return '觀戰';
  }
});

async function initialize() {
  await discord.initialize();
}

// Watch for Discord auth completion to connect Nakama
watch(
  () => discord.isAuthenticated,
  async (isAuth) => {
    if (isAuth && discord.user && discord.channelId) {
      await nakama.connect(
        discord.user.id,
        discord.user.username,
        discord.channelId
      );
      // Set my role after connection using Nakama user ID
      if (nakama.userId) {
        game.setMyRole(nakama.userId);
      }
    }
  }
);

// Update role when players change
watch(
  () => [game.player1, game.player2],
  () => {
    if (nakama.userId) {
      game.setMyRole(nakama.userId);
    }
  }
);

onMounted(() => {
  initialize();
});
</script>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.center-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.landing-container {
  gap: 16px;
  text-align: center;
}

.landing-title {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.landing-subtitle {
  font-size: 16px;
  color: #72767d;
  margin: 0;
}

.landing-desc {
  font-size: 14px;
  color: #b9bbbe;
  margin: 8px 0 16px;
}

.btn-github {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #24292e;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-github:hover {
  background-color: #2f363d;
}

.landing-links {
  margin-top: 24px;
  font-size: 12px;
  color: #72767d;
}

.landing-links a {
  color: #5865f2;
  text-decoration: none;
}

.landing-links a:hover {
  text-decoration: underline;
}

.landing-links .divider {
  margin: 0 8px;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #2f3136;
  border-bottom: 1px solid #202225;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.username {
  font-weight: 500;
}

.role-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.role-badge.player1 {
  background-color: #5865f2;
  color: white;
}

.role-badge.player2 {
  background-color: #ed4245;
  color: white;
}

.role-badge.spectator {
  background-color: #4f545c;
  color: #b9bbbe;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #b9bbbe;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.connected {
  background-color: #3ba55c;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 20px;
}

/* Reconnecting Overlay */
.reconnecting-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.reconnecting-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.reconnecting-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #4f545c;
  border-top-color: #5865f2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.reconnecting-text {
  color: #ffffff;
  font-size: 18px;
  font-weight: 500;
  margin: 0;
}

.reconnecting-attempts {
  color: #b9bbbe;
  font-size: 14px;
  margin: 0;
}

</style>
