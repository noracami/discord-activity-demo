# Claude Code 專案指引

## 專案概覽

Discord Activity 遊戲 - 無盡圈圈叉叉 (Infinite Tic-Tac-Toe)

### 技術架構

```
apps/
├── client/          # Vue 3 + Vite 前端
└── server/          # Express OAuth2 代理

packages/
├── nakama/          # Nakama 遊戲伺服器邏輯
└── shared/          # 共用型別和常數
```

### 關鍵技術

- **前端**: Vue 3, Pinia, TypeScript
- **遊戲伺服器**: Nakama (goja runtime - ES5.1)
- **通訊**: WebSocket (Nakama realtime)
- **部署**: Zeabur

---

## 開發規範

### Commit 訊息格式

```
類型: 簡短描述

- feat: 新功能
- fix: 修正 bug
- style: 樣式調整
- docs: 文件更新
- refactor: 重構
```

### 重要提醒

#### ⚠️ 部署前必須更新版本號

每次部署前，更新 `package.json` 的 `version`：

```json
{
  "version": "1.0.1"
}
```

原因：Client 和 Server 會比對版本號，版本不符時舊 Client 自動 reload。

---

## 關鍵檔案

| 檔案 | 用途 |
|------|------|
| `packages/nakama/src/match/index.ts` | Match 生命週期 (init, join, leave, loop) |
| `packages/nakama/src/match/handlers/index.ts` | 遊戲邏輯處理器 |
| `packages/nakama/src/rpc/find-or-create-match.ts` | Match 建立/查找邏輯 |
| `apps/client/src/stores/game.store.ts` | 遊戲狀態管理 |
| `apps/client/src/stores/nakama.store.ts` | Nakama 連線管理 |
| `packages/shared/src/opcodes.ts` | Client-Server 通訊 OpCode |

---

## 常見任務

### 新增 OpCode

1. `packages/shared/src/opcodes.ts` - 新增 enum
2. `packages/nakama/src/match/constants.ts` - 同步新增
3. Server handler 處理新 OpCode
4. Client store 處理新 OpCode

### 修改遊戲邏輯

1. `packages/nakama/src/match/handlers/index.ts` - 主要邏輯
2. `packages/nakama/src/match/helpers.ts` - 輔助函數
3. 記得 Nakama 用 goja (ES5.1)，不支援某些 ES6+ 語法

### Debug 連線問題

1. Zeabur Dashboard → Nakama 服務 → Logs
2. Client console 查看 `Match data received`
3. 檢查 `STATE_SYNC` 內容

---

## 已知限制

### Nakama Runtime (goja)

- ES5.1 JavaScript runtime
- `message.data.length` 返回 `undefined`，要用 `nk.binaryToString()` 後再取 length
- 某些 ES6 語法不支援

### Discord Activity

- WebSocket/fetch 需要透過 Discord proxy (`.proxy/nakama/`)
- `nakama.service.ts` 有 URL rewriting 邏輯

---

## 文件參考

- `DEPLOY.md` - 部署流程
- `BUGS.md` - Bug 追蹤和解決記錄
- `FEATURES.md` - 功能實作記錄
- `PLAN.md` - 專案規劃
