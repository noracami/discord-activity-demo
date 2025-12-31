/**
 * Discord user info
 */
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

/**
 * Discord state
 */
export interface DiscordState {
  isReady: boolean;
  isAuthenticated: boolean;
  user: DiscordUser | null;
  channelId: string | null;
  guildId: string | null;
  accessToken: string | null;
  error: string | null;
}
