# Bug 追蹤

## 開放中的問題

### BUG-002: Rebuild 時活動會斷掉
- **狀態:** 🔴 Open
- **優先級:** Medium
- **描述:** Zeabur 重新部署時，正在進行的 Activity 會斷線
- **預期行為:** 應該有優雅的斷線處理或重連機制
- **可能解決方案:**
  - [ ] 實作自動重連機制
  - [ ] 顯示「伺服器更新中，請稍後」提示
  - [ ] 實作 Blue-Green 部署避免斷線

---

## 已解決的問題

### BUG-003: 大頭貼未顯示
- **解決日期:** 2026-01-03
- **優先級:** Medium
- **描述:** 玩家的 Discord 大頭貼沒有正確顯示，使用預設 Discord logo

#### 根因分析
1. 客戶端發送 `JOIN_GAME` 時沒有帶上 avatar URL
2. Nakama `MatchPlayer` 沒有儲存 `avatarUrl`
3. `PLAYER_JOINED` 廣播沒有包含 avatar 資訊
4. `buildStateSyncPayload` 沒有包含 `avatarUrl`

#### 解決方案
1. **Nakama state.ts**: `MatchPlayer` 新增 `avatarUrl` 欄位
2. **Nakama handlers**: `handleJoinGame` 接收並儲存 `avatarUrl`
3. **Nakama helpers**: `buildPlayerPayload` 包含 `avatarUrl`
4. **Client nakama.store**: `joinGame()` 傳送 `avatarUrl`
5. **Client LobbyView**: 呼叫 `joinGame()` 時傳入 Discord avatar URL
6. **Client game.store**: 使用伺服器回傳的 `avatarUrl`
7. **PlayerSlot/GamePiece**: 修正 fallback 使用正確的 Discord 預設頭像計算 `(user_id >> 22) % 6`

#### 相關檔案
- `packages/nakama/src/match/state.ts`
- `packages/nakama/src/match/handlers/index.ts`
- `packages/nakama/src/match/helpers.ts`
- `apps/client/src/stores/nakama.store.ts`
- `apps/client/src/stores/game.store.ts`
- `apps/client/src/components/lobby/LobbyView.vue`
- `apps/client/src/components/lobby/PlayerSlot.vue`
- `apps/client/src/components/game/GamePiece.vue`

#### 備註
Server Nickname 功能尚未實作，需要使用 Discord SDK `guilds.members.read` scope 並透過 API 取得成員資訊。

---

### BUG-001: Player 無法離座
- **解決日期:** 2026-01-03
- **解決方案:** 在 PlayerSlot 新增「離座」按鈕，呼叫 `nakama.leaveGame()`
- **相關 commit:** `9c00dc9`

---

### BUG-004: 入座後仍顯示「你正在觀戰」
- **解決日期:** 2026-01-03
- **解決方案:** 使用 Nakama userId 判斷角色，修正 `nakama.store.ts` 和 `App.vue`
- **相關 commit:** `0718917`

---

### BUG-005: 結束畫面按鈕無反應
- **解決日期:** 2026-01-03
- **解決方案:**
  - 當對手離開時，顯示「對手已離開」和「離開座位」按鈕
  - 修正後端在 ended 階段離開時重置狀態
- **相關 commit:** `9c00dc9`

---

### BUG-007: 取消準備按鈕無效
- **解決日期:** 2026-01-03
- **解決方案:** 在後端新增 `handleUnready` handler 處理 UNREADY (OpCode 4)
- **相關 commit:** `9c00dc9`

---

### BUG-008: 落子時 cellIndex 為 undefined
- **解決日期:** 2026-01-03
- **優先級:** Critical
- **症狀:** 點擊棋盤落子時，伺服器收到的 cellIndex 是 undefined，導致 INVALID_MOVE 錯誤
- **伺服器 log:**
  ```
  matchLoop[1]: rawData="{"cellIndex":0}", parsed={}, parsedType=object
  handleMove: cellIndex=undefined
  handleMove: INVALID_MOVE - cellIndex=undefined, board[undefined]=undefined
  ```

#### 根因分析

**問題發現過程：**
1. 最初懷疑是前端沒有正確傳遞 cellIndex
2. 透過遠端 log 確認前端確實有送出正確資料 `{"cellIndex": 7}`
3. 伺服器 log 顯示 `rawData` 正確但 `parsed={}` 是空物件
4. 加入詳細除錯日誌後發現：
   ```
   matchLoop[1]: BEFORE JSON.parse, message.data exists=true, length=undefined
   matchLoop[1]: skipping JSON.parse - no data
   ```

**根本原因：**
Nakama 使用 **goja**（Go 實作的 ECMAScript 5.1 runtime）執行 JavaScript。在 goja 中，`message.data` 是一個 `ArrayBuffer` 或類似的二進位物件，**不具有標準的 `.length` 屬性**。

原本的程式碼：
```typescript
if (message.data && message.data.length > 0) {
  data = JSON.parse(nk.binaryToString(message.data));
}
```

- `message.data` 存在 ✅ (truthy)
- `message.data.length` 返回 `undefined` ❌
- `undefined > 0` = `false`
- 導致 `JSON.parse` 被跳過，`data` 保持為空物件 `{}`

**為什麼 Turn timeout 自動落子可以運作？**
因為自動落子時，伺服器直接建立物件傳給 `handleMove`，沒有經過 `JSON.parse`：
```typescript
return handleMove(state, fakeSender, { cellIndex }, tick, dispatcher, logger);
```

#### 解決方案

改用已經轉換好的字串長度來檢查：
```typescript
const rawDataStr = message.data ? nk.binaryToString(message.data) : '';

if (rawDataStr.length > 0) {
  data = JSON.parse(rawDataStr);
}
```

- **相關 commit:** `39dc863`
- **相關檔案:** `packages/nakama/src/match/index.ts`

#### 學到的經驗

1. **Nakama goja runtime 與標準 Node.js 有差異**：不能假設所有 JavaScript API 行為一致
2. **二進位資料存取方式不同**：`message.data` 需要先用 `nk.binaryToString()` 轉換
3. **詳細的除錯日誌很重要**：逐步追蹤才能找到真正的問題點

---

### BUG-006: FIFO 移除時機不符合規則
- **解決日期:** 2026-01-03
- **結論:** 經確認，**原本的規則是正確的**

#### 原本的理解（錯誤）
以為正確規則是：回合開始時先移除舊棋，讓玩家可以選擇放在被移除的位置。

#### 實際正確的規則
1. 放置新棋時，同時移除最舊的棋子
2. **勝利判斷在移除後進行**，所以即將消失的棋子不能用來組成連線
3. 玩家需要策略性規劃，不能依賴即將消失的棋子獲勝

#### 調整項目
- 將「即將移除」的視覺效果從閃爍改為**縮小 + 變淡**（更直觀地表示該棋子「快要消失」）

- **相關 commit:** `3b060ec`
- **相關檔案:** `apps/client/src/components/game/GamePiece.vue`

---

## 功能需求

### FEAT-001: 透過 curl 查詢伺服器端 log
- **狀態:** 📝 Planned
- **描述:** 目前只能透過 Zeabur Dashboard 查看 Nakama 伺服器 log，希望能透過 curl/API 查詢
- **目前狀態:** 已有 `query_logs` RPC 可查詢前端遠端 log
- **需求:**
  - [ ] 將伺服器端 `logger.info/warn/error` 也存入 Storage
  - [ ] 或提供 API 代理 Zeabur/Nakama log 查詢

---

### FEAT-002: 設定 Zeabur Watch Paths 優化部署
- **狀態:** 📝 Planned
- **描述:** 目前任何檔案變動都會觸發所有服務重新部署，應設定 Watch Paths 讓各服務只在相關資料夾變動時才部署
- **設定方式:** Zeabur Dashboard → Service → Settings → Watch Paths
- **建議設定:**
  | 服務 | Watch Paths |
  |------|-------------|
  | Client | `apps/client/**`, `packages/shared/**` |
  | Nakama | `packages/nakama/**`, `packages/shared/**` |
- **參考文件:** [Watch Paths - Zeabur](https://zeabur.com/docs/en-US/deploy/watch-paths)

---

## 問題分類

| ID | 標題 | 優先級 | 狀態 |
|----|------|--------|------|
| BUG-001 | Player 無法離座 | High | 🟢 Resolved |
| BUG-002 | Rebuild 時活動會斷掉 | Medium | 🔴 Open |
| BUG-003 | 大頭貼未顯示 | Medium | 🟢 Resolved |
| BUG-004 | 入座後仍顯示觀戰 | Low | 🟢 Resolved |
| BUG-005 | 結束畫面按鈕無反應 | High | 🟢 Resolved |
| BUG-006 | FIFO 移除時機不符合規則 | Medium | 🟢 Resolved |
| BUG-007 | 取消準備按鈕無效 | High | 🟢 Resolved |
| BUG-008 | 落子時 cellIndex 為 undefined | Critical | 🟢 Resolved |
