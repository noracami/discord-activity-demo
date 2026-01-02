import { Client, Session, Socket } from '@heroiclabs/nakama-js';
import { patchUrlMappings } from '@discord/embedded-app-sdk';

let client: Client | null = null;
let session: Session | null = null;
let socket: Socket | null = null;
let urlMappingsPatched = false;

/**
 * Check if running inside Discord Activity iframe
 */
function isDiscordActivity(): boolean {
  return typeof window !== 'undefined' &&
         window.location.hostname.includes('discordsays.com');
}

/**
 * Setup URL mappings for Discord proxy (patches fetch and WebSocket)
 */
function setupDiscordProxy(): void {
  if (urlMappingsPatched) return;

  if (isDiscordActivity()) {
    patchUrlMappings([
      { prefix: '/nakama', target: 'ouroboros-nakama.zeabur.app' },
    ]);
    urlMappingsPatched = true;
    console.log('Discord URL mappings patched for Nakama');
  }
}

/**
 * Get or create Nakama client
 */
export function getNakamaClient(): Client {
  if (!client) {
    // Setup Discord proxy if needed
    setupDiscordProxy();

    if (isDiscordActivity()) {
      // In Discord Activity, connect through proxy
      // patchUrlMappings will rewrite the URL
      client = new Client(
        'defaultkey',
        'ouroboros-nakama.zeabur.app',
        '443',
        true
      );
    } else {
      // Local development
      const host = import.meta.env.VITE_NAKAMA_HOST || 'localhost';
      const port = import.meta.env.VITE_NAKAMA_PORT || '7350';
      const useSSL = import.meta.env.VITE_NAKAMA_USE_SSL === 'true';
      client = new Client('defaultkey', host, port, useSSL);
    }
  }
  return client;
}

/**
 * Get current session
 */
export function getNakamaSession(): Session | null {
  return session;
}

/**
 * Get current socket
 */
export function getNakamaSocket(): Socket | null {
  return socket;
}

/**
 * Authenticate with Nakama using Discord user ID
 */
export async function authenticateNakama(odiscrdId: string, username: string): Promise<Session> {
  const nakamaClient = getNakamaClient();

  // Use custom authentication with Discord user ID
  session = await nakamaClient.authenticateCustom(odiscrdId, true, username);

  console.log('Nakama authenticated:', session.user_id);
  return session;
}

/**
 * Connect to Nakama realtime socket
 */
export async function connectSocket(): Promise<Socket> {
  if (!session) {
    throw new Error('Must authenticate before connecting socket');
  }

  const nakamaClient = getNakamaClient();
  socket = nakamaClient.createSocket();

  await socket.connect(session, true);
  console.log('Nakama socket connected');

  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect(true);
    socket = null;
  }
}

/**
 * Find or create a match for a Discord channel
 */
export async function findOrCreateMatch(channelId: string): Promise<string> {
  if (!socket) {
    throw new Error('Socket not connected');
  }

  const response = await socket.rpc('find_or_create_match', JSON.stringify({
    channel_id: channelId,
  }));

  const data = JSON.parse(response.payload || '{}');
  return data.match_id;
}

/**
 * Join a match
 */
export async function joinMatch(matchId: string): Promise<void> {
  if (!socket) {
    throw new Error('Socket not connected');
  }

  await socket.joinMatch(matchId);
  console.log('Joined match:', matchId);
}

/**
 * Send match data
 */
export function sendMatchMessage(matchId: string, opCode: number, data: object): void {
  if (!socket) {
    throw new Error('Socket not connected');
  }

  socket.sendMatchState(matchId, opCode, JSON.stringify(data));
}

/**
 * Leave current match
 */
export async function leaveMatch(matchId: string): Promise<void> {
  if (!socket) {
    return;
  }

  await socket.leaveMatch(matchId);
  console.log('Left match:', matchId);
}
