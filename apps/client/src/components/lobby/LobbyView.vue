<template>
  <div class="lobby">
    <h2 class="lobby-title">無盡圈圈叉叉</h2>
    <p class="lobby-subtitle">{{ statusText }}</p>

    <!-- Players Area -->
    <div class="players-area">
      <PlayerSlot
        :player="game.player1"
        symbol="O"
        :isReady="game.player1Ready"
        :isMe="game.myRole === 'player1'"
        :canJoin="game.myRole === 'spectator' && !game.player1"
        :canKick="canKickPlayer1"
        :isGameStarted="game.phase === 'playing'"
        @join="handleJoinAsPlayer1"
        @toggleReady="handleToggleReady"
        @kick="handleKick('player1')"
        @leave="handleLeave"
      />

      <div class="vs-divider">
        <span class="vs-text">VS</span>
      </div>

      <PlayerSlot
        :player="game.player2"
        symbol="X"
        :isReady="game.player2Ready"
        :isMe="game.myRole === 'player2'"
        :canJoin="game.myRole === 'spectator' && !game.player2"
        :canKick="canKickPlayer2"
        :isGameStarted="game.phase === 'playing'"
        @join="handleJoinAsPlayer2"
        @toggleReady="handleToggleReady"
        @kick="handleKick('player2')"
        @leave="handleLeave"
      />
    </div>

    <!-- Ready Timer -->
    <ReadyTimer
      v-if="showReadyTimer"
      :startTime="game.readyStartTime"
      :duration="30"
      @timeout="handleReadyTimeout"
    />

    <!-- Spectator Info -->
    <div v-if="game.myRole === 'spectator'" class="spectator-info">
      <span class="spectator-icon">👁</span>
      <span>你正在觀戰</span>
    </div>

    <!-- Game Start Countdown -->
    <div v-if="bothPlayersReady" class="start-countdown">
      <span class="countdown-text">遊戲即將開始...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/game.store';
import { useNakamaStore } from '@/stores/nakama.store';
import PlayerSlot from './PlayerSlot.vue';
import ReadyTimer from './ReadyTimer.vue';

const game = useGameStore();
const nakama = useNakamaStore();

const readyTimeoutTriggered = ref(false);

const statusText = computed(() => {
  const playerCount = (game.player1 ? 1 : 0) + (game.player2 ? 1 : 0);

  if (playerCount === 0) {
    return '等待玩家加入...';
  } else if (playerCount === 1) {
    return '等待第二位玩家...';
  } else if (!game.player1Ready || !game.player2Ready) {
    return '等待玩家準備...';
  } else {
    return '準備開始!';
  }
});

const bothPlayersReady = computed(() => {
  return game.player1 && game.player2 && game.player1Ready && game.player2Ready;
});

const showReadyTimer = computed(() => {
  // Show timer when both players are present but at least one is not ready
  return game.player1 && game.player2 &&
         (!game.player1Ready || !game.player2Ready) &&
         game.phase !== 'playing';
});

const canKickPlayer1 = computed((): boolean => {
  // Can kick player1 if: I'm player2, player1 is not ready, and ready timeout
  return game.myRole === 'player2' &&
         !!game.player1 &&
         !game.player1Ready &&
         readyTimeoutTriggered.value;
});

const canKickPlayer2 = computed((): boolean => {
  // Can kick player2 if: I'm player1, player2 is not ready, and ready timeout
  return game.myRole === 'player1' &&
         !!game.player2 &&
         !game.player2Ready &&
         readyTimeoutTriggered.value;
});

function handleJoinAsPlayer1() {
  nakama.joinGame();
}

function handleJoinAsPlayer2() {
  nakama.joinGame();
}

function handleToggleReady() {
  if (game.myRole === 'player1' && game.player1Ready) {
    nakama.sendMessage(4); // UNREADY opcode
  } else if (game.myRole === 'player2' && game.player2Ready) {
    nakama.sendMessage(4); // UNREADY opcode
  } else {
    nakama.ready();
  }
}

function handleKick(targetRole: 'player1' | 'player2') {
  nakama.kickPlayer(targetRole);
}

function handleLeave() {
  nakama.leaveGame();
}

function handleReadyTimeout() {
  readyTimeoutTriggered.value = true;
}
</script>

<style scoped>
.lobby {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  gap: 24px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.lobby-title {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.lobby-subtitle {
  font-size: 16px;
  color: #b9bbbe;
  margin: 0;
}

.players-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  width: 100%;
}

.vs-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.vs-text {
  font-size: 24px;
  font-weight: 700;
  color: #72767d;
}

.spectator-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background-color: #2f3136;
  border-radius: 8px;
  color: #b9bbbe;
  font-size: 14px;
}

.spectator-icon {
  font-size: 18px;
}

.start-countdown {
  padding: 16px 32px;
  background: linear-gradient(135deg, #5865f2, #3ba55c);
  border-radius: 8px;
  animation: pulse 1s ease-in-out infinite;
}

.countdown-text {
  color: white;
  font-size: 18px;
  font-weight: 600;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
}

/* Responsive */
@media (max-width: 500px) {
  .players-area {
    flex-direction: column;
  }

  .vs-divider {
    transform: rotate(90deg);
  }
}
</style>
