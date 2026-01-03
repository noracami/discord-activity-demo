# Bug 追蹤

## 開放中的問題

### BUG-001: Player 無法離座
- **狀態:** 🔴 Open
- **優先級:** High
- **描述:** 玩家入座後沒有離座功能，無法讓出位置給其他人
- **預期行為:** 玩家應該可以點擊按鈕離開座位，變回觀戰者
- **重現步驟:**
  1. 進入 Activity
  2. 點擊「加入」入座
  3. 無法找到離座按鈕

---

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

### BUG-003: 大頭貼與 Server Nickname 未顯示
- **狀態:** 🔴 Open
- **優先級:** Medium
- **描述:** 玩家的 Discord 大頭貼沒有正確顯示，使用預設 Discord logo；Server Nickname 也未顯示
- **預期行為:** 應顯示玩家的 Discord 大頭貼和伺服器暱稱
- **可能原因:**
  - [ ] 大頭貼 URL 取得方式有問題
  - [ ] 未請求正確的 OAuth2 scope
  - [ ] 未使用 Discord SDK 取得伺服器成員資訊

---

### BUG-004: 入座後仍顯示「你正在觀戰」
- **狀態:** 🟢 Resolved
- **優先級:** Low
- **描述:** 玩家已入座為 Player 1，但畫面下方仍顯示「你正在觀戰」
- **預期行為:** 入座後應顯示「你是 O」或「你是 X」，而非觀戰狀態
- **相關檔案:** `apps/client/src/stores/game.store.ts`
- **解決方案:** 使用 Nakama userId 而非 Discord ID 來判斷玩家角色

---

### BUG-005: 結束畫面按鈕無反應
- **狀態:** 🔴 Open
- **優先級:** High
- **描述:** 遊戲結束後，點擊「再來一局」或「離開」按鈕都沒有反應
- **預期行為:**
  - 「再來一局」應發送 REMATCH_VOTE
  - 「離開」應讓玩家離開座位
- **相關檔案:** `apps/client/src/components/game/GameResult.vue`

---

### BUG-007: 取消準備按鈕無效
- **狀態:** 🔴 Open
- **優先級:** High
- **描述:** 玩家按下「準備」後，點擊「取消準備」按鈕沒有反應
- **預期行為:** 點擊後應發送 UNREADY (OpCode 4) 並取消準備狀態
- **相關檔案:**
  - `apps/client/src/components/lobby/LobbyView.vue`
  - `packages/nakama/src/match/handlers/index.ts` (需確認是否有處理 UNREADY)

---

### BUG-006: FIFO 移除時機不符合規則
- **狀態:** 🔴 Open
- **優先級:** Medium
- **描述:** 目前 FIFO 機制是在放置新棋子時「同時」移除舊棋子，但正確的規則應該是：輪到該玩家時，如果盤面上已有三顆棋子，則先閃爍並移除最早的棋子，讓玩家可以選擇該格放置
- **預期行為:**
  1. 輪到玩家回合時
  2. 如果該玩家已有 3 顆棋子在盤面上
  3. 最早放置的棋子開始閃爍
  4. 閃爍後移除該棋子（格子變空）
  5. 玩家可以點擊任意空格（包含剛移除的格子）放置新棋子
- **目前行為:** 放新棋子時才移除舊棋子，玩家無法選擇放在被移除的位置
- **相關檔案:**
  - `packages/nakama/src/match/helpers.ts`
  - `apps/client/src/stores/game.store.ts`

---

## 已解決的問題

### BUG-004: 入座後仍顯示「你正在觀戰」
- **解決日期:** 2026-01-03
- **解決方案:** 使用 Nakama userId 判斷角色，修正 `nakama.store.ts` 和 `App.vue`

---

## 問題分類

| ID | 標題 | 優先級 | 狀態 |
|----|------|--------|------|
| BUG-001 | Player 無法離座 | High | 🔴 Open |
| BUG-002 | Rebuild 時活動會斷掉 | Medium | 🔴 Open |
| BUG-003 | 大頭貼與 Nickname 未顯示 | Medium | 🔴 Open |
| BUG-004 | 入座後仍顯示觀戰 | Low | 🟢 Resolved |
| BUG-005 | 結束畫面按鈕無反應 | High | 🔴 Open |
| BUG-006 | FIFO 移除時機不符合規則 | Medium | 🔴 Open |
| BUG-007 | 取消準備按鈕無效 | High | 🔴 Open |
