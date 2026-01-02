<template>
  <div class="app">
    <!-- Loading State -->
    <div v-if="discord.isLoading || nakama.isConnecting" class="center-container">
      <LoadingSpinner :message="loadingMessage" />
    </div>

    <!-- Error State -->
    <div v-else-if="discord.error || nakama.error" class="center-container error-container">
      <p class="error-title">連接失敗</p>
      <p class="error-message">{{ discord.error || nakama.error }}</p>
      <button class="btn-primary" @click="initialize">
        重試
      </button>
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
        <div v-else-if="game.phase === 'playing'" class="game-view">
          <div class="game-info">
            <p>
              目前回合: <strong>{{ game.currentTurn === 'player1' ? 'O' : 'X' }}</strong>
              <span v-if="game.isMyTurn" class="your-turn">(你的回合)</span>
            </p>
          </div>
          <!-- Game Board Placeholder -->
          <div class="board-placeholder">
            <p>遊戲棋盤（Phase 5 實作）</p>
          </div>
        </div>

        <!-- Game Ended View -->
        <div v-else-if="game.phase === 'ended'" class="game-ended">
          <div class="result-card">
            <h2 class="result-title">
              {{ game.winner ? (game.winner === game.myRole ? '你贏了!' : '你輸了') : '遊戲結束' }}
            </h2>
            <p class="result-reason">
              {{ game.winReason === 'three_in_row' ? '三連線獲勝' : '對手離開' }}
            </p>
            <div class="rematch-section">
              <p>重賽?</p>
              <div class="rematch-buttons">
                <button class="btn-success" @click="nakama.rematchVote(true)">同意</button>
                <button class="btn-danger" @click="nakama.rematchVote(false)">拒絕</button>
              </div>
            </div>
          </div>
        </div>
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
      // Set my role after connection
      game.setMyRole(discord.user.id);
    }
  }
);

// Update role when players change
watch(
  () => [game.player1, game.player2],
  () => {
    if (discord.user) {
      game.setMyRole(discord.user.id);
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

.error-container {
  gap: 12px;
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: #ed4245;
}

.error-message {
  color: #b9bbbe;
  font-size: 14px;
  text-align: center;
  max-width: 300px;
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

.game-info {
  text-align: center;
  color: #b9bbbe;
}

.game-info p {
  margin: 4px 0;
}

.your-turn {
  color: #3ba55c;
  font-weight: 600;
}

.board-placeholder {
  width: 300px;
  height: 300px;
  background-color: #2f3136;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #72767d;
}

/* Game View */
.game-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* Game Ended View */
.game-ended {
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-card {
  background-color: #2f3136;
  border-radius: 12px;
  padding: 32px 48px;
  text-align: center;
}

.result-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #ffffff;
}

.result-reason {
  color: #b9bbbe;
  margin: 0 0 24px 0;
}

.rematch-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rematch-section p {
  color: #dcddde;
  font-weight: 500;
  margin: 0;
}

.rematch-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-success {
  background-color: #3ba55c;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-success:hover {
  background-color: #2d7d46;
}

.btn-danger {
  background-color: #ed4245;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-danger:hover {
  background-color: #c73e41;
}
</style>
