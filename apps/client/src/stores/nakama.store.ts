import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Session, Socket, MatchData } from '@heroiclabs/nakama-js';
import {
  authenticateNakama,
  connectSocket,
  disconnectSocket,
  findOrCreateMatch,
  clearMatch,
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
      let mId = await findOrCreateMatch(channelId);
      matchId.value = mId;

      // Join match - if fails, clear registry and retry once
      try {
        console.log('Attempting to join match:', mId);
        await joinMatch(mId);
        console.log('Successfully joined match:', mId);
      } catch (joinErr) {
        console.log('joinMatch failed:', joinErr);
        console.log('Clearing registry and retrying...');
        try {
          await clearMatch(channelId);
          console.log('Registry cleared');
          mId = await findOrCreateMatch(channelId);
          console.log('Got new matchId:', mId);
          matchId.value = mId;
          await joinMatch(mId);
          console.log('Successfully joined new match:', mId);
        } catch (retryErr) {
          console.error('Retry also failed:', retryErr);
          throw retryErr;
        }
      }

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
   * Strategy: try old matchId first, fallback to findOrCreateMatch
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

    // Save old matchId before cleanup
    const oldMatchId = matchId.value;

    // Clean up old socket before reconnecting
    try {
      disconnectSocket();
    } catch (e) {
      console.log('Error disconnecting old socket:', e);
    }

    // Reset state for reconnection
    isConnected.value = false;
    error.value = null;

    try {
      // Re-authenticate and connect socket
      const session = await authenticateNakama(
        connectionParams.discordId,
        connectionParams.username
      );
      userId.value = session.user_id ?? null;

      const socket = await connectSocket();
      setupSocketHandlers(socket);

      // Always use findOrCreateMatch to get the correct matchId for this channelId
      // This ensures we always join the registered match, not an orphaned one
      let correctMatchId = await findOrCreateMatch(connectionParams.channelId);

      // If we were in a different match, log it
      if (oldMatchId && oldMatchId !== correctMatchId) {
        console.log(`Match changed: ${oldMatchId} -> ${correctMatchId}`);
      }

      matchId.value = correctMatchId;

      // Join match - if fails, clear registry and retry once
      try {
        console.log('Attempting to join match:', correctMatchId);
        await joinMatch(correctMatchId);
        console.log('Successfully joined match:', correctMatchId);
      } catch (joinErr) {
        console.log('joinMatch failed:', joinErr);
        console.log('Clearing registry and retrying...');
        try {
          await clearMatch(connectionParams.channelId);
          console.log('Registry cleared');
          correctMatchId = await findOrCreateMatch(connectionParams.channelId);
          console.log('Got new matchId:', correctMatchId);
          matchId.value = correctMatchId;
          await joinMatch(correctMatchId);
          console.log('Successfully joined new match:', correctMatchId);
        } catch (retryErr) {
          console.error('Retry also failed:', retryErr);
          throw retryErr;
        }
      }

      isConnected.value = true;
      isReconnecting.value = false;
      reconnectAttempts.value = 0;
      console.log('Nakama reconnected to match:', correctMatchId);

      enableRemoteLogging(correctMatchId);
      setLogMatchId(correctMatchId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Reconnection failed';
      console.error('Nakama reconnection failed:', err);
      matchId.value = null;
      scheduleReconnect();
    }
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
  function joinGame(avatarUrl?: string, nickname?: string) {
    sendMessage(OpCode.JOIN_GAME, {
      avatarUrl: avatarUrl || '',
      nickname: nickname || '',
    });
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

  /**
   * Clear match registry and reconnect
   * Used when stuck in wrong/stale match
   */
  async function clearAndReconnect() {
    if (!connectionParams) {
      console.error('No connection params, cannot clear and reconnect');
      return;
    }

    console.log('Clearing match registry and reconnecting...');

    try {
      // Clear the registry
      await clearMatch(connectionParams.channelId);
      console.log('Match registry cleared');

      // Leave current match if any
      if (matchId.value) {
        try {
          await leaveMatch(matchId.value);
        } catch (e) {
          console.log('Failed to leave match:', e);
        }
        matchId.value = null;
      }

      // Reconnect
      const gameStore = useGameStore();
      gameStore.resetState();

      const mId = await findOrCreateMatch(connectionParams.channelId);
      matchId.value = mId;
      await joinMatch(mId);

      console.log('Reconnected to new match:', mId);
      enableRemoteLogging(mId);
      setLogMatchId(mId);
    } catch (err) {
      console.error('Failed to clear and reconnect:', err);
      error.value = err instanceof Error ? err.message : 'Failed to clear and reconnect';
    }
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
    clearAndReconnect,
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
