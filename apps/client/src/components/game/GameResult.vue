<template>
  <div class="game-result">
    <div class="result-card">
      <!-- Winner Display -->
      <div class="winner-section">
        <div class="winner-avatar-wrapper" :class="resultClass">
          <img
            v-if="winnerAvatarUrl"
            :src="winnerAvatarUrl"
            :alt="winnerName"
            class="winner-avatar"
          />
          <div v-else class="winner-avatar-placeholder">
            {{ winnerSymbol }}
          </div>
          <span class="winner-symbol" :class="winnerSymbolClass">{{ winnerSymbol }}</span>
        </div>
        <h2 class="result-title" :class="resultClass">
          {{ resultTitle }}
        </h2>
        <p class="result-reason">{{ resultReason }}</p>
      </div>

      <!-- Rematch Section (only for players) -->
      <div v-if="isPlayer" class="rematch-section">
        <p class="rematch-title">再來一局?</p>

        <!-- Vote Buttons (if not voted yet) -->
        <div v-if="!hasVoted" class="rematch-buttons">
          <button class="btn-accept" @click="vote(true)">
            <span class="btn-icon">✓</span>
            同意
          </button>
          <button class="btn-decline" @click="vote(false)">
            <span class="btn-icon">✕</span>
            拒絕
          </button>
        </div>

        <!-- Waiting for opponent -->
        <div v-else class="vote-status">
          <p class="my-vote">
            你選擇了: <strong :class="myVote ? 'vote-yes' : 'vote-no'">{{ myVote ? '同意' : '拒絕' }}</strong>
          </p>
          <p v-if="!opponentHasVoted" class="waiting-text">
            <span class="loading-dots">等待對手回應</span>
          </p>
        </div>
      </div>

      <!-- Spectator Notice -->
      <div v-else class="spectator-section">
        <p class="spectator-text">等待玩家決定是否重賽...</p>
        <div class="votes-display">
          <span class="vote-indicator" :class="player1VoteClass">
            {{ player1VoteText }}
          </span>
          <span class="vote-separator">|</span>
          <span class="vote-indicator" :class="player2VoteClass">
            {{ player2VoteText }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game.store';
import { useNakamaStore } from '@/stores/nakama.store';

const game = useGameStore();
const nakama = useNakamaStore();

// Computed properties
const isPlayer = computed(() => game.myRole === 'player1' || game.myRole === 'player2');

const isWinner = computed(() => {
  return game.winner === game.myRole;
});

const isLoser = computed(() => {
  return isPlayer.value && game.winner !== null && game.winner !== game.myRole;
});

const resultClass = computed(() => ({
  'win': isWinner.value,
  'lose': isLoser.value,
}));

const resultTitle = computed(() => {
  if (!isPlayer.value) {
    const winnerName = game.winner === 'player1' ? game.player1?.username : game.player2?.username;
    return `${winnerName || '玩家'} 獲勝!`;
  }
  return isWinner.value ? '你贏了!' : '你輸了';
});

const resultReason = computed(() => {
  return game.winReason === 'three_in_row' ? '三連線獲勝' : '對手離開了遊戲';
});

const winnerPlayer = computed(() => {
  return game.winner === 'player1' ? game.player1 : game.player2;
});

const winnerAvatarUrl = computed(() => {
  if (!winnerPlayer.value) return '';
  return winnerPlayer.value.avatarUrl || getDefaultAvatar(winnerPlayer.value.odiscrdId);
});

const winnerName = computed(() => winnerPlayer.value?.username || '');

const winnerSymbol = computed(() => game.winner === 'player1' ? 'O' : 'X');

const winnerSymbolClass = computed(() => ({
  'symbol-o': game.winner === 'player1',
  'symbol-x': game.winner === 'player2',
}));

// Rematch voting
const myVote = computed(() => {
  if (game.myRole === 'player1') return game.rematchVotes.player1;
  if (game.myRole === 'player2') return game.rematchVotes.player2;
  return null;
});

const hasVoted = computed(() => myVote.value !== null);

const opponentHasVoted = computed(() => {
  if (game.myRole === 'player1') return game.rematchVotes.player2 !== null;
  if (game.myRole === 'player2') return game.rematchVotes.player1 !== null;
  return false;
});

// Spectator vote display
const player1VoteClass = computed(() => {
  if (game.rematchVotes.player1 === null) return 'vote-pending';
  return game.rematchVotes.player1 ? 'vote-yes' : 'vote-no';
});

const player2VoteClass = computed(() => {
  if (game.rematchVotes.player2 === null) return 'vote-pending';
  return game.rematchVotes.player2 ? 'vote-yes' : 'vote-no';
});

const player1VoteText = computed(() => {
  const name = game.player1?.username || 'Player 1';
  if (game.rematchVotes.player1 === null) return `${name}: ...`;
  return `${name}: ${game.rematchVotes.player1 ? '✓' : '✕'}`;
});

const player2VoteText = computed(() => {
  const name = game.player2?.username || 'Player 2';
  if (game.rematchVotes.player2 === null) return `${name}: ...`;
  return `${name}: ${game.rematchVotes.player2 ? '✓' : '✕'}`;
});

function vote(accept: boolean) {
  nakama.rematchVote(accept);
}

function getDefaultAvatar(odiscrdId: string): string {
  const hash = hashCode(odiscrdId);
  return `https://cdn.discordapp.com/embed/avatars/${Math.abs(hash) % 5}.png`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}
</script>

<style scoped>
.game-result {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.result-card {
  background-color: #2f3136;
  border-radius: 16px;
  padding: 32px 48px;
  text-align: center;
  min-width: 320px;
}

/* Winner Section */
.winner-section {
  margin-bottom: 24px;
}

.winner-avatar-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.winner-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 4px solid #4f545c;
  object-fit: cover;
}

.winner-avatar-wrapper.win .winner-avatar {
  border-color: #3ba55c;
  box-shadow: 0 0 20px rgba(59, 165, 92, 0.4);
}

.winner-avatar-wrapper.lose .winner-avatar {
  border-color: #ed4245;
  opacity: 0.7;
}

.winner-avatar-placeholder {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background-color: #202225;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
  color: #4f545c;
}

.winner-symbol {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: white;
  border: 3px solid #2f3136;
}

.winner-symbol.symbol-o {
  background-color: #5865f2;
}

.winner-symbol.symbol-x {
  background-color: #ed4245;
}

.result-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #ffffff;
}

.result-title.win {
  color: #3ba55c;
}

.result-title.lose {
  color: #ed4245;
}

.result-reason {
  color: #b9bbbe;
  margin: 0;
  font-size: 14px;
}

/* Rematch Section */
.rematch-section {
  border-top: 1px solid #4f545c;
  padding-top: 24px;
}

.rematch-title {
  color: #dcddde;
  font-weight: 600;
  font-size: 16px;
  margin: 0 0 16px 0;
}

.rematch-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-accept,
.btn-decline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.btn-accept {
  background-color: #3ba55c;
  color: white;
}

.btn-accept:hover {
  background-color: #2d7d46;
}

.btn-decline {
  background-color: #4f545c;
  color: #dcddde;
}

.btn-decline:hover {
  background-color: #5d6269;
}

.btn-accept:active,
.btn-decline:active {
  transform: scale(0.95);
}

.btn-icon {
  font-size: 14px;
}

/* Vote Status */
.vote-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.my-vote {
  color: #b9bbbe;
  margin: 0;
}

.vote-yes {
  color: #3ba55c;
}

.vote-no {
  color: #ed4245;
}

.waiting-text {
  color: #72767d;
  margin: 0;
}

.loading-dots::after {
  content: '';
  animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
  0%, 20% { content: ''; }
  40% { content: '.'; }
  60% { content: '..'; }
  80%, 100% { content: '...'; }
}

/* Spectator Section */
.spectator-section {
  border-top: 1px solid #4f545c;
  padding-top: 24px;
}

.spectator-text {
  color: #72767d;
  margin: 0 0 12px 0;
  font-size: 14px;
}

.votes-display {
  display: flex;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
}

.vote-indicator {
  padding: 4px 12px;
  border-radius: 4px;
  background-color: #202225;
}

.vote-indicator.vote-pending {
  color: #72767d;
}

.vote-indicator.vote-yes {
  color: #3ba55c;
}

.vote-indicator.vote-no {
  color: #ed4245;
}

.vote-separator {
  color: #4f545c;
}
</style>
