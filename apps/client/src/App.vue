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
        <div class="game-info">
          <p>遊戲階段: <strong>{{ phaseLabel }}</strong></p>
          <p v-if="game.currentTurn">
            目前回合: <strong>{{ game.currentTurn === 'player1' ? 'O' : 'X' }}</strong>
            <span v-if="game.isMyTurn" class="your-turn">(你的回合)</span>
          </p>
        </div>

        <!-- Join Button -->
        <button
          v-if="game.canJoin"
          class="btn-primary btn-large"
          @click="nakama.joinGame"
        >
          加入遊戲
        </button>

        <!-- Ready Button -->
        <button
          v-if="showReadyButton"
          class="btn-success btn-large"
          @click="nakama.ready"
        >
          準備
        </button>

        <!-- Game Board Placeholder -->
        <div class="board-placeholder">
          <p>遊戲棋盤（Phase 4 實作）</p>
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

const phaseLabel = computed(() => {
  switch (game.phase) {
    case 'waiting': return '等待玩家';
    case 'ready': return '準備中';
    case 'playing': return '遊戲中';
    case 'ended': return '遊戲結束';
    default: return game.phase;
  }
});

const showReadyButton = computed(() => {
  if (game.phase !== 'ready' && game.phase !== 'waiting') return false;
  if (game.myRole === 'spectator') return false;
  if (game.myRole === 'player1' && game.player1Ready) return false;
  if (game.myRole === 'player2' && game.player2Ready) return false;
  return true;
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

.btn-large {
  padding: 12px 32px;
  font-size: 16px;
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
</style>
