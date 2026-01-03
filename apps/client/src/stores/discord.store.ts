import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DiscordUser, DiscordState } from '@/types/discord.types';
import {
  initializeDiscord,
  authorizeDiscord,
  authenticateDiscord,
  getAvatarUrl,
  getGuildMember,
  getMemberAvatarUrl,
  type GuildMember,
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
  const guildMember = ref<GuildMember | null>(null);

  // Getters
  const avatarUrl = computed(() => {
    if (!user.value) return null;
    // Use server-specific avatar if available
    if (guildId.value && guildMember.value) {
      return getMemberAvatarUrl(
        user.value.id,
        guildId.value,
        guildMember.value.avatar,
        user.value.avatar
      );
    }
    return getAvatarUrl(user.value);
  });

  const displayName = computed(() => {
    if (!user.value) return null;
    // Priority: Server nickname > Global name > Username
    if (guildMember.value?.nick) {
      return guildMember.value.nick;
    }
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

      // Step 4: Get guild member info (nickname, server avatar)
      if (gId) {
        const memberInfo = await getGuildMember(token, gId);
        guildMember.value = memberInfo;
        console.log('Guild member info:', memberInfo);
      }

      console.log('Discord initialized:', {
        user: userInfo.username,
        nickname: guildMember.value?.nick,
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
    guildMember,
    // Getters
    avatarUrl,
    displayName,
    // Actions
    initialize,
  };
});
