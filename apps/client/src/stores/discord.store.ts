import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DiscordUser, DiscordState } from '@/types/discord.types';
import {
  initializeDiscord,
  authorizeDiscord,
  authenticateDiscord,
  getAvatarUrl,
} from '@/services/discord.service';

export const useDiscordStore = defineStore('discord', () => {
  // State
  const isReady = ref(false);
  const isAuthenticated = ref(false);
  const user = ref<DiscordUser | null>(null);
  const channelId = ref<string | null>(null);
  const guildId = ref<string | null>(null);
  const accessToken = ref<string | null>(null);
  const error = ref<string | null>(null);
  const isLoading = ref(false);

  // Getters
  const avatarUrl = computed(() => {
    if (!user.value) return null;
    return getAvatarUrl(user.value);
  });

  const displayName = computed(() => {
    if (!user.value) return null;
    return user.value.global_name || user.value.username;
  });

  // Actions
  async function initialize() {
    if (isLoading.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Step 1: Initialize SDK
      const { channelId: cId, guildId: gId } = await initializeDiscord();
      channelId.value = cId;
      guildId.value = gId;
      isReady.value = true;

      // Step 2: Authorize and get token
      const token = await authorizeDiscord();
      accessToken.value = token;

      // Step 3: Authenticate and get user info
      const userInfo = await authenticateDiscord(token);
      user.value = userInfo;
      isAuthenticated.value = true;

      console.log('Discord initialized:', {
        user: userInfo.username,
        channelId: cId,
        guildId: gId,
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Discord initialization failed:', err);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    isReady,
    isAuthenticated,
    user,
    channelId,
    guildId,
    accessToken,
    error,
    isLoading,
    // Getters
    avatarUrl,
    displayName,
    // Actions
    initialize,
  };
});
