# Bug 追蹤

## 開放中的問題

（目前無開放中的問題）

---

## 已解決的問題

### BUG-009: Server 重啟後玩家加入不同 Match 且 Timer 不倒數
- **解決日期:** 2026-01-04
- **優先級:** Critical
- **症狀:**
  1. Nakama 重啟後，兩位玩家被分配到不同的 Match
  2. 雙方都看不到對方的落子
  3. 30 秒後雙方都被判定獲勝（因為對手離開）
  4. Timer 卡在 30 秒不會倒數

#### 根因分析

**問題 1: Race Condition 導致不同 Match**

```
Server 重啟後：
1. Player A 呼叫 findOrCreateMatch → matchList 搜尋 → 沒找到 → 建立 Match-A
2. Player B 幾乎同時呼叫 findOrCreateMatch → matchList 搜尋 → 沒找到（Match-A 尚未被 index）→ 建立 Match-B
3. 兩個 Match 都從同一個 Storage 載入狀態
4. 兩人各自加入不同的 Match
```

Nakama 的 `matchList` API 有延遲，新建立的 Match 不會立即被搜尋到。

**問題 2: Timer 不倒數**

- Server 從 Storage 恢復狀態時，`turnStartTick` 是舊值（如 500）
- Server 重啟後 tick 從 0 開始
- `elapsed = tick - turnStartTick` 變成負數
- Client 端 `turnStartTime` 設為 null 時，Timer 顯示 30 秒但不倒數

**問題 3: 雙方都被判定獲勝**

- Storage 恢復時設 `disconnectedAtTick = 0`
- `elapsed = tick - 0 = tick`
- 30 秒後 `tick >= 300`，觸發斷線逾時
- 兩個獨立的 Match 各自判定「對手離開」

#### 解決方案

**1. 使用 Storage Registry 追蹤 Match ID**

```typescript
// 不依賴 matchList，改用 Storage 記錄 channel -> matchId
const existingRegistry = nk.storageRead([{
  collection: 'match_registry',
  key: `channel_${channelId}`,
  userId: SYSTEM_USER,
}]);

if (existingRegistry.length > 0) {
  // 驗證 match 是否存在
  const matches = nk.matchList(...);
  if (matchExists) return registeredMatchId;

  // Match 不存在（server 重啟），刪除 stale registry
  nk.storageDelete(...);
}
```

**2. 處理 Race Condition**

```typescript
// 建立後讀回確認
nk.storageWrite([{ ... matchId ... }]);
const confirmed = nk.storageRead([...]);

if (confirmed.matchId !== ourMatchId) {
  // 別人先建立了，使用他們的 match
  return confirmed.matchId;
}
```

**3. 修正 Timer**

Server:
```typescript
// 重連時重置 turnStartTick
if (state.phase === 'playing') {
  state.turnStartTick = tick;
}
```

Client:
```typescript
// syncState 時強制設定 turnStartTime
if (data.phase === 'playing' && data.currentTurn) {
  turnStartTime.value = Date.now();
}
```

**4. 修正斷線逾時**

```typescript
// Storage 恢復時設為 null，不觸發逾時
state.player1.disconnectedAtTick = null;
```

#### 相關檔案
- `packages/nakama/src/rpc/find-or-create-match.ts`
- `packages/nakama/src/match/index.ts`
- `packages/nakama/src/match/storage.ts`
- `apps/client/src/stores/game.store.ts`

#### 相關 commits
- `f4e904a` - Storage registry 解決 race condition
- `4e9ff3b` - 修正 timer 不倒數
- `894a429` - disconnectedAtTick 設為 null

---

### BUG-002: Rebuild 時活動會斷掉
- **解決日期:** 2026-01-04
- **優先級:** Medium
- **描述:** Zeabur 重新部署時，正在進行的 Activity 會斷線

#### 解決方案
實作 FEAT-003 連線恢復機制，詳見 `FEATURES.md`：
1. Client 端指數退避重連
2. Server 端 30 秒斷線寬限期
3. Match state 持久化到 Nakama Storage
4. Match registry 解決重啟後 race condition

---

### BUG-008: 落子時 cellIndex 為 undefined
- **解決日期:** 2026-01-03
- **優先級:** Critical
- **症狀:** 點擊棋盤落子時，伺服器收到的 cellIndex 是 undefined，導致 INVALID_MOVE 錯誤

#### 根因分析
Nakama 使用 **goja**（Go 實作的 ECMAScript 5.1 runtime），`message.data.length` 返回 `undefined`，導致 JSON.parse 被跳過。

```typescript
// 問題程式碼
if (message.data && message.data.length > 0) {  // length = undefined
  data = JSON.parse(nk.binaryToString(message.data));
}
```

#### 解決方案
```typescript
const rawDataStr = message.data ? nk.binaryToString(message.data) : '';
if (rawDataStr.length > 0) {
  data = JSON.parse(rawDataStr);
}
```

- **相關 commit:** `39dc863`
- **相關檔案:** `packages/nakama/src/match/index.ts`

---

### BUG-003: 大頭貼未顯示
- **解決日期:** 2026-01-03
- **優先級:** Medium
- **描述:** 玩家的 Discord 大頭貼沒有正確顯示

#### 根因分析
1. 客戶端發送 `JOIN_GAME` 時沒有帶上 avatar URL
2. Nakama `MatchPlayer` 沒有儲存 `avatarUrl`
3. `PLAYER_JOINED` 廣播沒有包含 avatar 資訊

#### 解決方案
1. `MatchPlayer` 新增 `avatarUrl` 欄位
2. `handleJoinGame` 接收並儲存 `avatarUrl`
3. `joinGame()` 傳送 Discord avatar URL
4. 修正 fallback 使用正確的 Discord 預設頭像計算 `(user_id >> 22) % 6`

#### 備註
Server Nickname 功能已實作，使用 `guilds.members.read` scope 透過 Discord API 取得成員資訊。

---

### BUG-006: FIFO 移除時機不符合規則
- **解決日期:** 2026-01-03
- **結論:** 經確認，原本的規則是正確的（勝利判斷在移除後進行）
- **調整:** 將「即將移除」的視覺效果從閃爍改為縮小 + 變淡
- **相關 commit:** `3b060ec`

---

### BUG-007: 取消準備按鈕無效
- **解決日期:** 2026-01-03
- **解決方案:** 在後端新增 `handleUnready` handler 處理 UNREADY (OpCode 4)
- **相關 commit:** `9c00dc9`

---

### BUG-005: 結束畫面按鈕無反應
- **解決日期:** 2026-01-03
- **解決方案:** 當對手離開時，顯示「對手已離開」和「離開座位」按鈕
- **相關 commit:** `9c00dc9`

---

### BUG-004: 入座後仍顯示「你正在觀戰」
- **解決日期:** 2026-01-03
- **解決方案:** 使用 Nakama userId 判斷角色
- **相關 commit:** `0718917`

---

### BUG-001: Player 無法離座
- **解決日期:** 2026-01-03
- **解決方案:** 在 PlayerSlot 新增「離座」按鈕
- **相關 commit:** `9c00dc9`

---

## 總覽

| ID | 標題 | 優先級 | 狀態 |
|----|------|--------|------|
| BUG-001 | Player 無法離座 | High | 🟢 Resolved |
| BUG-002 | Rebuild 時活動會斷掉 | Medium | 🟢 Resolved |
| BUG-003 | 大頭貼未顯示 | Medium | 🟢 Resolved |
| BUG-004 | 入座後仍顯示觀戰 | Low | 🟢 Resolved |
| BUG-005 | 結束畫面按鈕無反應 | High | 🟢 Resolved |
| BUG-006 | FIFO 移除時機不符合規則 | Medium | 🟢 Resolved |
| BUG-007 | 取消準備按鈕無效 | High | 🟢 Resolved |
| BUG-008 | 落子時 cellIndex 為 undefined | Critical | 🟢 Resolved |
| BUG-009 | Server 重啟後玩家加入不同 Match | Critical | 🟢 Resolved |
