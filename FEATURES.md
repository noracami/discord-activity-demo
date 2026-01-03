# 功能需求

## 已完成

### FEAT-003: 連線恢復機制
- **狀態:** ✅ Completed
- **優先級:** Medium
- **相關 Bug:** BUG-002
- **完成日期:** 2025-01-03

#### 背景
目前玩家斷線（網路問題或伺服器重啟）會直接判定對手獲勝，無法恢復連線。

#### 實作內容

**Phase 1 - Client 重連**
- [x] Client 斷線偵測 (`ondisconnect`)
- [x] 自動重連邏輯（指數退避，最多 5 次）
- [x] UI 顯示「重新連線中...」overlay
- [x] 儲存連線參數供重連使用

**Phase 2 - 斷線寬限期**
- [x] 玩家斷線後標記為 `isDisconnected`，等待 30 秒
- [x] 對手看到「對手已斷線，等待重新連線中...」警告
- [x] 重連時恢復玩家 session，繼續遊戲
- [x] 超時才判定對手獲勝

**Phase 3 - State 持久化**
- [x] Match state 每 5 秒存入 Nakama Storage
- [x] Match 終止前儲存最終狀態
- [x] Server 重啟後可從 Storage 恢復進行中的對局
- [x] 狀態過期（1小時）自動清理

#### 新增檔案
- `packages/nakama/src/match/storage.ts` - Storage 助手函式

#### 協定擴充
```typescript
// 新增 OpCode
PLAYER_DISCONNECTED = 111  // Server → All: 玩家暫時斷線
PLAYER_RECONNECTED = 112   // Server → All: 玩家已重連
```

#### 資料結構變更
```typescript
interface MatchPlayer {
  // ... 現有欄位
  isDisconnected: boolean;
  disconnectedAtTick: number | null;
}
```

---

## 規劃中

---

### FEAT-002: 設定 Zeabur Watch Paths 優化部署
- **狀態:** 📝 Planned
- **優先級:** Low
- **描述:** 目前任何檔案變動都會觸發所有服務重新部署

#### 建議設定
| 服務 | Watch Paths |
|------|-------------|
| Client | `apps/client/**`, `packages/shared/**` |
| Nakama | `packages/nakama/**`, `packages/shared/**` |

#### 設定方式
Zeabur Dashboard → Service → Settings → Watch Paths

#### 參考文件
[Watch Paths - Zeabur](https://zeabur.com/docs/en-US/deploy/watch-paths)

---

### FEAT-001: 透過 curl 查詢伺服器端 log
- **狀態:** 📝 Planned
- **優先級:** Low
- **描述:** 目前只能透過 Zeabur Dashboard 查看 Nakama 伺服器 log

#### 目前狀態
已有 `query_logs` RPC 可查詢前端遠端 log

#### 需求
- [ ] 將伺服器端 `logger.info/warn/error` 也存入 Storage
- [ ] 或提供 API 代理 Zeabur/Nakama log 查詢

---

## 總覽

| ID | 標題 | 優先級 | 狀態 |
|----|------|--------|------|
| FEAT-001 | 透過 curl 查詢伺服器端 log | Low | 📝 Planned |
| FEAT-002 | 設定 Zeabur Watch Paths | Low | 📝 Planned |
| FEAT-003 | 連線恢復機制 | Medium | ✅ Completed |
