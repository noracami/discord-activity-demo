# Zeabur 部署指南

## 架構概覽

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Client    │     │    Server    │     │    Nakama    │
│   (nginx)    │     │  (Node.js)   │     │  (遊戲伺服器) │
│   Port: 80   │     │  Port: 3001  │     │  Port: 7350  │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
                            └──────────┬──────────┘
                                       │
                            ┌──────────▼───────────┐
                            │     PostgreSQL       │
                            │    (Zeabur 服務)      │
                            └──────────────────────┘
```

## 部署步驟

### 1. 建立 Zeabur 專案

1. 登入 [Zeabur Dashboard](https://dash.zeabur.com)
2. 建立新專案
3. 選擇部署區域（建議選擇離目標用戶最近的區域）

### 2. 部署 PostgreSQL

1. 在專案中點擊「新增服務」
2. 選擇「Marketplace」→「PostgreSQL」
3. 等待部署完成
4. 記下連線資訊（稍後 Nakama 會用到）

### 3. 部署 Nakama（遊戲伺服器）

1. 點擊「新增服務」→「Git」
2. 選擇此 Repository
3. **重要**：設定 Root Directory 為 `packages/nakama`
4. 設定環境變數：

| 變數名稱 | 值 | 說明 |
|---------|-----|------|
| `DATABASE_URL` | `postgres:PASSWORD@HOST:5432/DATABASE` | PostgreSQL 連線字串 |

> 連線字串格式：`使用者:密碼@主機:5432/資料庫名稱`
> 可從 PostgreSQL 服務的「連線」頁面取得

5. 等待部署完成
6. 綁定網域（例如：`nakama.yourdomain.com`）
7. 記下網域，稍後 Client 需要使用

### 4. 部署 Server（OAuth2 代理）

1. 點擊「新增服務」→「Git」
2. 選擇此 Repository
3. **重要**：設定 Root Directory 為 `apps/server`
4. 設定環境變數：

| 變數名稱 | 值 | 說明 |
|---------|-----|------|
| `DISCORD_CLIENT_ID` | `你的 Client ID` | Discord Application |
| `DISCORD_CLIENT_SECRET` | `你的 Client Secret` | Discord Application |
| `PORT` | `3001` | 服務埠號 |

5. 綁定網域（例如：`api.yourdomain.com`）

### 5. 部署 Client（前端）

1. 點擊「新增服務」→「Git」
2. 選擇此 Repository
3. **重要**：設定 Root Directory 為 `apps/client`
4. 設定環境變數（Build 階段）：

| 變數名稱 | 值 | 說明 |
|---------|-----|------|
| `VITE_DISCORD_CLIENT_ID` | `你的 Client ID` | Discord Application |
| `VITE_NAKAMA_HOST` | `nakama.yourdomain.com` | Nakama 網域 |
| `VITE_NAKAMA_PORT` | `443` | HTTPS 埠號 |
| `VITE_NAKAMA_USE_SSL` | `true` | 啟用 SSL |
| `VITE_SERVER_URL` | `https://api.yourdomain.com` | Server 網域 |

5. 綁定網域（例如：`game.yourdomain.com`）

---

## Discord Application 設定

### URL Mappings (Activity)

在 Discord Developer Portal 設定 URL Mappings：

| Prefix | Target |
|--------|--------|
| `/` | `https://game.yourdomain.com` |

### OAuth2 Redirect URIs

新增以下 Redirect URI：
```
https://game.yourdomain.com
```

---

## 環境變數總覽

### Client (Build Time)
```env
VITE_DISCORD_CLIENT_ID=你的_client_id
VITE_NAKAMA_HOST=nakama.yourdomain.com
VITE_NAKAMA_PORT=443
VITE_NAKAMA_USE_SSL=true
VITE_SERVER_URL=https://api.yourdomain.com
```

### Server
```env
DISCORD_CLIENT_ID=你的_client_id
DISCORD_CLIENT_SECRET=你的_client_secret
PORT=3001
```

### Nakama
```env
DATABASE_URL=postgres:password@host:5432/dbname
```

---

## 驗證部署

1. **PostgreSQL**：在 Zeabur Console 確認服務正常運行
2. **Nakama**：訪問 `https://nakama.yourdomain.com/healthcheck`
3. **Server**：訪問 `https://api.yourdomain.com/health`
4. **Client**：訪問 `https://game.yourdomain.com`

### Nakama Console（管理介面）

- URL：`https://nakama.yourdomain.com:7351`
- 預設帳號：`admin`
- 預設密碼：`admin`（建議透過環境變數修改）

---

## 疑難排解

### 常見問題

1. **Nakama 無法連線 PostgreSQL**
   - 確認 DATABASE_URL 格式正確
   - 確認 PostgreSQL 服務已啟動

2. **Client 無法連線 Nakama**
   - 確認 VITE_NAKAMA_HOST 設定正確
   - 確認 Nakama 服務已啟動且綁定網域

3. **Discord OAuth2 失敗**
   - 確認 DISCORD_CLIENT_ID 和 SECRET 正確
   - 確認 Redirect URI 已設定

### 查看日誌

在 Zeabur Dashboard 中，點擊各服務可查看即時日誌。
