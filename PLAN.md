# Discord Activity「無盡圈圈叉叉」實作計畫

---
## 📍 目前進度 (2026-01-02)

**已完成:** Phase 1 ~ Phase 4 (大廳 UI)、Zeabur 部署、Discord Activity 連接測試
**下一步:** Phase 5 核心遊戲 (棋盤 UI)

### POC 驗證狀態

| 功能 | 狀態 | 備註 |
|------|------|------|
| Discord OAuth2 認證 | ✅ 完成 | Token 交換正常 |
| Discord Activity 載入 | ✅ 完成 | 透過 URL Mappings 代理 |
| Nakama 連接 | ✅ 完成 | WebSocket 透過 Discord 代理 |
| 大廳 UI | ✅ 完成 | 玩家卡片、VS 分隔、觀戰狀態 |
| 玩家加入/離開 | 🔄 待驗證 | 需兩人測試 |
| 準備機制 | 🔄 待驗證 | 需兩人測試 |
| 遊戲棋盤 | ❌ 未開發 | Phase 5 |
| FIFO 機制 | ❌ 未開發 | Phase 5 |
| 勝負判定 | ❌ 未開發 | Phase 5 |
| 結算畫面 | ❌ 未開發 | Phase 6 |
| 重賽機制 | ❌ 未開發 | Phase 6 |

### 待辦事項
- [ ] 實作遊戲棋盤 UI (GameBoard, GameCell, GamePiece)
- [ ] 實作計時器 UI (TurnTimer)
- [ ] 實作結算畫面 (GameResult)
- [ ] Phase 完成後設定 CI/CD (GitHub Actions + Zeabur)

### DevOps 待辦
- [ ] 設定 Zeabur 只在對應服務有更動時才 rebuild（目前改一次三個服務都會 rebuild）
- [ ] 設定部署完成通知

### 環境變數待設定
- `apps/server/.env` → DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
- `apps/client/.env` → VITE_DISCORD_CLIENT_ID

### 部署資訊 (Zeabur)

| 服務 | Domain | 說明 |
|------|--------|------|
| Client | `ouroboros.zeabur.app` | Vue 3 前端 |
| Server | `ouroboros-api.zeabur.app` | Express OAuth2 代理 |
| Nakama | `ouroboros-nakama.zeabur.app` | 遊戲伺服器 |
| PostgreSQL | (內部連接) | Nakama 資料庫 |

### Discord URL Mappings

| Prefix | Target |
|--------|--------|
| `/` | `https://ouroboros.zeabur.app` |
| `/api` | `https://ouroboros-api.zeabur.app/api` |
| `/nakama` | `https://ouroboros-nakama.zeabur.app` |

### 已知限制

| 限制 | 說明 | 解決方案 |
|------|------|----------|
| 伺服器人數限制 | 未認證的 Application 只能在成員 ≤ 25 人的伺服器使用 Activity | 申請 Discord Application 認證 |

---

## 1. Monorepo 資料夾結構

```
discord-activity-demo/
├── package.json
├── pnpm-workspace.yaml
├── project-spec.md
├── .env.example
├── .gitignore
│
├── apps/
│   ├── client/                    # Vue 3 前端應用
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── game/          # GameBoard, GameCell, GamePiece, TurnTimer, GameResult
│   │   │   │   ├── lobby/         # LobbyView, PlayerSlot, JoinButton
│   │   │   │   └── ui/            # LoadingSpinner, CountdownTimer, AvatarBadge
│   │   │   ├── composables/       # useDiscord, useNakama, useMatch, useGameState
│   │   │   ├── stores/            # discord.store, nakama.store, game.store (Pinia)
│   │   │   ├── services/          # discord.service, nakama.service
│   │   │   └── types/
│   │   └── ...
│   │
│   └── server/                    # Express 後端 (OAuth2 token 交換)
│       └── src/
│           ├── index.ts
│           └── routes/auth.ts
│
├── packages/
│   ├── shared/                    # 共用型別與 OpCodes
│   │   └── src/
│   │       ├── opcodes.ts
│   │       ├── game-types.ts
│   │       └── constants.ts
│   │
│   └── nakama/                    # Nakama Match Handler
│       └── src/
│           ├── main.ts
│           ├── rpc/create-match.ts
│           └── match/
│               ├── index.ts       # matchInit, matchJoin, matchLoop, matchLeave
│               ├── state.ts
│               ├── handlers/      # move, ready, kick, rematch handlers
│               └── logic/         # board, win-checker, fifo-queue
│
└── docker/
    ├── docker-compose.yml         # Nakama + PostgreSQL
    └── nakama/local.yml
```

## 2. 開發階段

### Phase 1: 基礎建設 ✅
- [x] 設定 pnpm workspace 與 TypeScript 專案參照
- [x] 建立 `packages/shared` (OpCodes、型別定義)
- [x] 設定 Docker Compose (Nakama + PostgreSQL)
- [x] 建立 `.gitignore` 與 `.env.example`

### Phase 2: Discord 整合 ✅
- [x] 建立 `apps/server` Express 伺服器
- [x] 實作 Discord OAuth2 token 交換 endpoint
- [x] 建立 `apps/client` Vue 3 + Vite 專案
- [x] 實作 Discord SDK 初始化與認證流程
- [x] 取得頻道 ID 與使用者資訊

### Phase 3: Nakama 整合 ✅
- [x] 建立 `packages/nakama` 專案結構
- [x] 實作基礎 Match Handler (init, join, leave, loop)
- [x] 實作 RPC: `find_or_create_match`
- [x] 前端 Nakama Client 連接與訊息監聯
- [x] 實作訊息處理 (JOIN_GAME, READY, MOVE, KICK, REMATCH)
- [x] 實作回合超時自動落子邏輯

### Phase 4: 大廳與準備階段 🔄 (進行中)
- [x] 實作大廳 UI (LobbyView, PlayerSlot)
- [x] 實作準備計時器 UI (ReadyTimer)
- [x] 實作加入遊戲功能 (JOIN_GAME)
- [x] 實作玩家/觀戰者狀態切換
- [x] 實作準備機制 (READY/UNREADY)
- [x] 實作 30 秒準備超時與踢出功能

### Phase 5: 核心遊戲
- [ ] 實作棋盤狀態管理與落子驗證
- [ ] 實作 FIFO 機制 (最多 3 顆棋)
- [ ] 實作勝負判定
- [ ] 實作 30 秒回合超時與自動隨機落子
- [ ] 建立遊戲 UI 元件 (棋盤、棋子、計時器)
- [ ] 實作棋子視覺效果 (大頭貼 + ○/✕、即將消失閃爍)

### Phase 6: 結算與重賽
- [ ] 實作遊戲結束流程與勝利畫面
- [ ] 實作重賽投票機制
- [ ] 實作狀態重置

## 3. 關鍵技術決策

### OpCodes 定義
```
客戶端 → 伺服器: JOIN_GAME, LEAVE_GAME, READY, MOVE, KICK_PLAYER, REMATCH_VOTE
伺服器 → 客戶端: STATE_SYNC, PLAYER_JOINED, PLAYER_LEFT, GAME_START, MOVE_MADE, TURN_CHANGE, GAME_END, REMATCH_UPDATE
```

### 狀態管理
- **Pinia Stores**: discord.store (使用者/頻道)、nakama.store (連線)、game.store (遊戲狀態)
- **後端 Match State**: phase, players, board, queues (FIFO), turn info, ready status, rematch votes

### FIFO 機制
- 每位玩家維護一個落子佇列 (最多 3 個)
- 放第 4 顆時移除佇列最前端的棋子
- 佇列最前端的棋子標記為「即將消失」(閃爍效果)

## 4. 開發環境

### 啟動指令
```bash
# 終端 1: Nakama + PostgreSQL
pnpm docker:up

# 終端 2: Nakama 模組監聽
pnpm dev:nakama

# 終端 3: 後端代理
pnpm dev:server

# 終端 4: 前端
pnpm dev:client

# 終端 5: Cloudflared Tunnel
pnpm tunnel
```

### Discord 設定
1. 建立 Discord Application
2. 設定 OAuth2 redirect URI
3. 啟用 Activity 並設定 URL Mapping

## 5. 關鍵檔案

| 檔案 | 用途 |
|------|------|
| `packages/shared/src/opcodes.ts` | 前後端通訊協定定義 |
| `packages/nakama/src/match/index.ts` | Nakama Match Handler 核心 |
| `packages/nakama/src/match/logic/board.ts` | FIFO 與棋盤邏輯 |
| `apps/client/src/services/discord.service.ts` | Discord SDK 認證 |
| `apps/client/src/stores/game.store.ts` | 前端遊戲狀態 |
