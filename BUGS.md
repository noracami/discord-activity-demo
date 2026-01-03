# Bug 追蹤

## 開放中的問題

### BUG-002: Rebuild 時活動會斷掉
- **狀態:** 🔴 Open
- **優先級:** Medium
- **描述:** Zeabur 重新部署時，正在進行的 Activity 會斷線
- **預期行為:** 應該有優雅的斷線處理或重連機制

#### 情境分析

| 情境 | 影響 |
|------|------|
| Client 重新部署 | 舊版 JS 仍在運行，重新整理才會更新 |
| Nakama 重新部署 | WebSocket 中斷、Match state 遺失、遊戲結束 |
| 網路短暫中斷 | WebSocket 斷線、無法繼續遊戲 |

#### 目前設計
- 玩家離開（有意或無意）→ 遊戲結束，判定勝負
- 不重新連線
- 對手不需等待

#### 相關需求
→ 見 `FEATURES.md` FEAT-003 (連線恢復機制)

---

## 已解決的問題

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
| BUG-002 | Rebuild 時活動會斷掉 | Medium | 🔴 Open |
| BUG-003 | 大頭貼未顯示 | Medium | 🟢 Resolved |
| BUG-004 | 入座後仍顯示觀戰 | Low | 🟢 Resolved |
| BUG-005 | 結束畫面按鈕無反應 | High | 🟢 Resolved |
| BUG-006 | FIFO 移除時機不符合規則 | Medium | 🟢 Resolved |
| BUG-007 | 取消準備按鈕無效 | High | 🟢 Resolved |
| BUG-008 | 落子時 cellIndex 為 undefined | Critical | 🟢 Resolved |
