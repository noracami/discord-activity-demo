import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Session, Socket, MatchData } from '@heroiclabs/nakama-js';
import {
  authenticateNakama,
  connectSocket,
  disconnectSocket,
  findOrCreateMatch,
  joinMatch,
  sendMatchMessage,
  leaveMatch,
  getNakamaSocket,
} from '@/services/nakama.service';
import {
  enableRemoteLogging,
  disableRemoteLogging,
  setLogMatchId,
} from '@/services/remote-logger.service';
import { useGameStore } from './game.store';
import { OpCode } from '@shared/types';

export const useNakamaStore = defineStore('nakama', () => {
  // State
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const isReconnecting = ref(false);
  const matchId = ref<string | null>(null);
  const userId = ref<string | null>(null);
  const error = ref<string | null>(null);

  // Reconnection state
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  // Store connection params for reconnection
  let connectionParams: {
    discordId: string;
    username: string;
    channelId: string;
  } | null = null;

  // Actions
  async function connect(odiscrdId: string, username: string, channelId: string) {
    if (isConnecting.value || isConnected.value) return;

    isConnecting.value = true;
    error.value = null;

    // Store params for potential reconnection
    connectionParams = { discordId: odiscrdId, username, channelId };

    try {
      // Authenticate
      const session = await authenticateNakama(odiscrdId, username);
      userId.value = session.user_id ?? null;

      // Connect socket
      const socket = await connectSocket();

      // Setup message handlers
      setupSocketHandlers(socket);

      // Find or create match for this channel
      const mId = await findOrCreateMatch(channelId);
      matchId.value = mId;

      // Join match
      await joinMatch(mId);

      isConnected.value = true;
      isReconnecting.value = false;
      reconnectAttempts.value = 0;
      console.log('Nakama fully connected, match:', mId);

      // Enable remote logging
      enableRemoteLogging(mId);
      setLogMatchId(mId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Connection failed';
      console.error('Nakama connection failed:', err);

      // If reconnecting and failed, try again
      if (isReconnecting.value) {
        scheduleReconnect();
      }
    } finally {
      isConnecting.value = false;
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  async function reconnect() {
    if (!connectionParams || isConnecting.value || isConnected.value) return;

    if (reconnectAttempts.value >= maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      isReconnecting.value = false;
      error.value = '無法重新連線，請重新整理頁面';
      return;
    }

    isReconnecting.value = true;
    reconnectAttempts.value++;

    console.log(`Reconnect attempt ${reconnectAttempts.value}/${maxReconnectAttempts}`);

    // Clean up old socket before reconnecting
    try {
      disconnectSocket();
    } catch (e) {
      console.log('Error disconnecting old socket:', e);
    }

    // Reset state for reconnection
    isConnected.value = false;
    matchId.value = null;
    error.value = null;

    await connect(
      connectionParams.discordId,
      connectionParams.username,
      connectionParams.channelId
    );
  }

  /**
   * Schedule a reconnection with exponential backoff
   */
  function scheduleReconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    if (reconnectAttempts.value >= maxReconnectAttempts) {
      isReconnecting.value = false;
      error.value = '無法重新連線，請重新整理頁面';
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.value);
    console.log(`Scheduling reconnect in ${delay}ms`);

    reconnectTimeout = setTimeout(() => {
      reconnect();
    }, delay);
  }

  /**
   * Cancel any pending reconnection
   */
  function cancelReconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    isReconnecting.value = false;
    reconnectAttempts.value = 0;
  }

  function setupSocketHandlers(socket: Socket) {
    const gameStore = useGameStore();

    socket.onmatchdata = (matchData: MatchData) => {
      const opCode = matchData.op_code;
      let data: any = {};

      try {
        if (matchData.data) {
          const decoded = new TextDecoder().decode(matchData.data as Uint8Array);
          data = JSON.parse(decoded);
        }
      } catch (e) {
        console.error('Failed to parse match data:', e);
        return;
      }

      console.log('Match data received: opCode=', opCode, 'data=', JSON.stringify(data));
      gameStore.handleServerMessage(opCode, data);
    };

    socket.onmatchpresence = (presenceEvent) => {
      console.log('Match presence:', presenceEvent);
    };

    socket.ondisconnect = () => {
      console.log('Socket disconnected, isReconnecting:', isReconnecting.value, 'isConnecting:', isConnecting.value);
      isConnected.value = false;

      // Attempt to reconnect if we have connection params and not already reconnecting/connecting
      if (connectionParams && !isReconnecting.value && !isConnecting.value) {
        console.log('Unexpected disconnect, attempting to reconnect...');
        scheduleReconnect();
      }
    };
  }

  function sendMessage(opCode: number, data: object = {}) {
    if (!matchId.value) {
      console.error('No match to send message to');
      return;
    }
    console.log('Sending message:', opCode, data, 'to match:', matchId.value);
    sendMatchMessage(matchId.value, opCode, data);
  }

  async function disconnect() {
    // Cancel any pending reconnection
    cancelReconnect();
    connectionParams = null;

    // Disable remote logging before disconnect
    disableRemoteLogging();

    if (matchId.value) {
      await leaveMatch(matchId.value);
      matchId.value = null;
    }
    disconnectSocket();
    isConnected.value = false;
  }

  // Game actions (convenience methods)
  function joinGame(avatarUrl?: string) {
    sendMessage(OpCode.JOIN_GAME, { avatarUrl: avatarUrl || '' });
  }

  function leaveGame() {
    sendMessage(OpCode.LEAVE_GAME);
  }

  function ready() {
    sendMessage(OpCode.READY);
  }

  function unready() {
    sendMessage(OpCode.UNREADY);
  }

  function move(cellIndex: number) {
    sendMessage(OpCode.MOVE, { cellIndex });
  }

  function kickPlayer(targetRole: 'player1' | 'player2') {
    sendMessage(OpCode.KICK_PLAYER, { targetRole });
  }

  function rematchVote(accept: boolean) {
    console.log('nakama.rematchVote called with:', accept);
    sendMessage(OpCode.REMATCH_VOTE, { accept });
  }

  return {
    // State
    isConnected,
    isConnecting,
    isReconnecting,
    reconnectAttempts,
    matchId,
    userId,
    error,
    // Actions
    connect,
    disconnect,
    reconnect,
    cancelReconnect,
    sendMessage,
    // Game actions
    joinGame,
    leaveGame,
    ready,
    unready,
    move,
    kickPlayer,
    rematchVote,
  };
});
