import { DiscordSDK, patchUrlMappings } from '@discord/embedded-app-sdk';
import type { DiscordUser } from '@/types/discord.types';

let discordSdk: DiscordSDK | null = null;

// Setup URL mappings for Discord proxy
// This patches fetch/WebSocket to work through Discord's proxy
patchUrlMappings([
  { prefix: '/api', target: 'ouroboros-api.zeabur.app/api' },
]);

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
 * Combined authorize and authenticate flow
 * Uses the new Discord SDK pattern for Activities
 */
export async function setupDiscordAuth(): Promise<{
  accessToken: string;
  user: DiscordUser;
}> {
  const sdk = getDiscordSdk();
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

  // For Activities, we need to use the proper OAuth2 flow
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
    const errorText = await response.text();
    console.error('Token exchange failed:', errorText);
    throw new Error('Failed to exchange token');
  }

  const { access_token } = await response.json();

  // Authenticate with the access token
  const auth = await sdk.commands.authenticate({
    access_token,
  });

  if (!auth.user) {
    throw new Error('Failed to get user info');
  }

  return {
    accessToken: access_token,
    user: {
      id: auth.user.id,
      username: auth.user.username,
      discriminator: auth.user.discriminator,
      avatar: auth.user.avatar ?? null,
      global_name: auth.user.global_name ?? null,
    },
  };
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
