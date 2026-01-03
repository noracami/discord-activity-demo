import { Client, Session, Socket } from '@heroiclabs/nakama-js';

let client: Client | null = null;
let session: Session | null = null;
let socket: Socket | null = null;
let wsPatched = false;

/**
 * Check if running inside Discord Activity iframe
 */
function isDiscordActivity(): boolean {
  return typeof window !== 'undefined' &&
         window.location.hostname.includes('discordsays.com');
}

/**
 * Patch WebSocket and fetch to route through Discord proxy
 */
function patchNetworkForDiscord(): void {
  if (wsPatched || !isDiscordActivity()) return;

  const discordHost = window.location.hostname;

  // Patch WebSocket
  const OriginalWebSocket = window.WebSocket;
  const PatchedWebSocket = function(url: string, protocols?: string | string[]) {
    if (url.includes('ouroboros-nakama.zeabur.app')) {
      const urlObj = new URL(url);
      const newUrl = `wss://${discordHost}/.proxy/nakama${urlObj.pathname}${urlObj.search}`;
      console.log('Rewriting WebSocket URL:', url, '->', newUrl);
      return new OriginalWebSocket(newUrl, protocols);
    }
    return new OriginalWebSocket(url, protocols);
  } as unknown as typeof WebSocket;

  // Copy static properties and prototype
  Object.defineProperties(PatchedWebSocket, {
    CONNECTING: { value: OriginalWebSocket.CONNECTING },
    OPEN: { value: OriginalWebSocket.OPEN },
    CLOSING: { value: OriginalWebSocket.CLOSING },
    CLOSED: { value: OriginalWebSocket.CLOSED },
    prototype: { value: OriginalWebSocket.prototype },
  });

  window.WebSocket = PatchedWebSocket;

  // Patch fetch for Nakama HTTP requests
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url.includes('ouroboros-nakama.zeabur.app')) {
      const urlObj = new URL(url);
      const newUrl = `https://${discordHost}/.proxy/nakama${urlObj.pathname}${urlObj.search}`;
      console.log('Rewriting fetch URL:', url, '->', newUrl);
      return originalFetch(newUrl, init);
    }
    return originalFetch(input, init);
  };

  wsPatched = true;
  console.log('Network patched for Discord proxy');
}

// Patch network early
patchNetworkForDiscord();

/**
 * Get or create Nakama client
 */
export function getNakamaClient(): Client {
  if (!client) {
    if (isDiscordActivity()) {
      // In Discord Activity, use the real Nakama host
      // The WebSocket patch will rewrite the URL to use Discord proxy
      client = new Client(
        'defaultkey',
        'ouroboros-nakama.zeabur.app',
        '443',
        true
      );

      console.log('Nakama client created for Discord Activity');
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
 * Uses TextEncoder to handle Unicode characters (e.g., Chinese nicknames)
 */
export function sendMatchMessage(matchId: string, opCode: number, data: object): void {
  if (!socket) {
    throw new Error('Socket not connected');
  }

  // Encode as UTF-8 bytes to avoid btoa Unicode issues
  const encoder = new TextEncoder();
  const payload = encoder.encode(JSON.stringify(data));
  socket.sendMatchState(matchId, opCode, payload);
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
