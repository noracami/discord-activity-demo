import { DiscordSDK } from '@discord/embedded-app-sdk';
import type { DiscordUser } from '@/types/discord.types';

let discordSdk: DiscordSDK | null = null;

/**
 * Get the Discord SDK instance
 */
export function getDiscordSdk(): DiscordSDK {
  if (!discordSdk) {
    throw new Error('Discord SDK not initialized');
  }
  return discordSdk;
}

/**
 * Initialize the Discord SDK
 */
export async function initializeDiscord(): Promise<{
  channelId: string | null;
  guildId: string | null;
}> {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

  if (!clientId) {
    throw new Error('VITE_DISCORD_CLIENT_ID is not set');
  }

  discordSdk = new DiscordSDK(clientId);
  await discordSdk.ready();

  return {
    channelId: discordSdk.channelId,
    guildId: discordSdk.guildId,
  };
}

/**
 * Authorize with Discord and get access token
 */
export async function authorizeDiscord(): Promise<string> {
  const sdk = getDiscordSdk();
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

  // Request authorization code
  const { code } = await sdk.commands.authorize({
    client_id: clientId,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify', 'guilds'],
  });

  // Exchange code for access token via our server
  const response = await fetch('/api/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange token');
  }

  const { access_token } = await response.json();
  return access_token;
}

/**
 * Authenticate with Discord using access token
 */
export async function authenticateDiscord(accessToken: string): Promise<DiscordUser> {
  const sdk = getDiscordSdk();

  const auth = await sdk.commands.authenticate({
    access_token: accessToken,
  });

  if (!auth.user) {
    throw new Error('Failed to get user info');
  }

  return {
    id: auth.user.id,
    username: auth.user.username,
    discriminator: auth.user.discriminator,
    avatar: auth.user.avatar ?? null,
    global_name: auth.user.global_name ?? null,
  };
}

/**
 * Get Discord avatar URL
 */
export function getAvatarUrl(user: DiscordUser, size: number = 128): string {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
  }
  // Default avatar
  const defaultIndex = Number(BigInt(user.id) >> 22n) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}
