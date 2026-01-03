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
  const matchId = ref<string | null>(null);
  const userId = ref<string | null>(null);
  const error = ref<string | null>(null);

  // Actions
  async function connect(odiscrdId: string, username: string, channelId: string) {
    if (isConnecting.value || isConnected.value) return;

    isConnecting.value = true;
    error.value = null;

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
      console.log('Nakama fully connected, match:', mId);

      // Enable remote logging
      enableRemoteLogging(mId);
      setLogMatchId(mId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Connection failed';
      console.error('Nakama connection failed:', err);
    } finally {
      isConnecting.value = false;
    }
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
      console.log('Socket disconnected');
      isConnected.value = false;
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
    matchId,
    userId,
    error,
    // Actions
    connect,
    disconnect,
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
