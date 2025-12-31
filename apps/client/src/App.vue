<template>
  <div class="app">
    <!-- Loading State -->
    <div v-if="discord.isLoading" class="center-container">
      <LoadingSpinner message="連接 Discord 中..." />
    </div>

    <!-- Error State -->
    <div v-else-if="discord.error" class="center-container error-container">
      <p class="error-title">連接失敗</p>
      <p class="error-message">{{ discord.error }}</p>
      <button class="btn-primary" @click="discord.initialize">
        重試
      </button>
    </div>

    <!-- Authenticated State -->
    <div v-else-if="discord.isAuthenticated" class="main-container">
      <header class="header">
        <div class="user-info">
          <img
            v-if="discord.avatarUrl"
            :src="discord.avatarUrl"
            :alt="discord.displayName || ''"
            class="avatar"
          />
          <span class="username">{{ discord.displayName }}</span>
        </div>
        <div class="channel-info">
          <span class="label">頻道 ID:</span>
          <code>{{ discord.channelId || 'N/A' }}</code>
        </div>
      </header>

      <main class="content">
        <p class="status-text">Discord 連接成功！等待 Nakama 整合...</p>
      </main>
    </div>

    <!-- Initial State (shouldn't normally show) -->
    <div v-else class="center-container">
      <LoadingSpinner message="初始化中..." />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useDiscordStore } from '@/stores';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';

const discord = useDiscordStore();

onMounted(() => {
  discord.initialize();
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

.channel-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.label {
  color: #b9bbbe;
}

code {
  background-color: #202225;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 11px;
}

.content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.status-text {
  color: #3ba55c;
  font-size: 16px;
}
</style>
