# 功能需求

## 規劃中

### FEAT-003: 連線恢復機制
- **狀態:** 📝 Planning
- **優先級:** Medium
- **相關 Bug:** BUG-002

#### 背景
目前玩家斷線（網路問題或伺服器重啟）會直接判定對手獲勝，無法恢復連線。

#### 實作範圍

**Phase 1 - Client 重連（最小可行）**
- [ ] Client 斷線偵測 (`onclose`, `onerror`)
- [ ] 自動重連邏輯（指數退避）
- [ ] UI 顯示「重新連線中...」
- [ ] Server 短暫保留 match state

**Phase 2 - 斷線寬限期**
- [ ] 玩家斷線後不立即判輸，等待 N 秒
- [ ] 對手看到「等待玩家重連...」
- [ ] 超時才判定勝負

**Phase 3 - State 持久化**
- [ ] Match state 存入 Nakama Storage
- [ ] Server 重啟後可恢復進行中的對局

#### 協定擴充
```typescript
// 新增 OpCode
RECONNECT_REQUEST   // Client → Server: 請求重連
RECONNECT_SUCCESS   // Server → Client: 重連成功
RECONNECT_FAILED    // Server → Client: 重連失敗
PLAYER_DISCONNECTED // Server → All: 玩家暫時斷線
PLAYER_RECONNECTED  // Server → All: 玩家已重連
```

#### 資料結構變更
```typescript
interface MatchPlayer {
  // ... 現有欄位
  isDisconnected: boolean;
  disconnectedAt: number | null;
}
```

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
| FEAT-003 | 連線恢復機制 | Medium | 📝 Planning |
