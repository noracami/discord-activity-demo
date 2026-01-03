/**
 * RPC to receive and store logs from clients
 */

interface LogEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  args?: any[];
  timestamp: number;
  sessionId?: string;
  userId?: string;
  matchId?: string;
}

interface LogQueryParams {
  userId?: string;
  sessionId?: string;
  level?: string;
  limit?: number;
  cursor?: string;
  since?: number;      // Timestamp: only logs after this time
  until?: number;      // Timestamp: only logs before this time
  matchId?: string;    // Filter by match ID
  all?: boolean;       // Admin: query all users' logs
}

const LOG_COLLECTION = 'client_logs';
const MAX_LOGS_PER_USER = 100;

/**
 * Store a log entry from client
 */
export const storeLogRpc: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  let logEntry: LogEntry;

  try {
    logEntry = JSON.parse(payload);
  } catch (e) {
    throw new Error('Invalid payload: expected LogEntry object');
  }

  const userId = ctx.userId || 'anonymous';
  const sessionId = ctx.sessionId || 'unknown';

  // Add context to log entry
  logEntry.userId = userId;
  logEntry.sessionId = sessionId;
  logEntry.timestamp = logEntry.timestamp || Date.now();

  // Generate a unique key based on timestamp
  const key = `${logEntry.timestamp}_${Math.random().toString(36).substr(2, 9)}`;

  // Store in Nakama storage
  const writeOps: nkruntime.StorageWriteRequest[] = [
    {
      collection: LOG_COLLECTION,
      key: key,
      userId: userId,
      value: logEntry,
      permissionRead: 2, // Owner and server can read
      permissionWrite: 0, // Only server can write
    },
  ];

  try {
    nk.storageWrite(writeOps);
  } catch (e) {
    logger.error(`Failed to store log: ${e}`);
    throw new Error('Failed to store log');
  }

  return JSON.stringify({ success: true, key });
};

/**
 * Query logs from storage
 *
 * Parameters:
 * - limit: max number of logs (default 50, max 100)
 * - level: filter by log level (log, warn, error, info, debug)
 * - since: only logs after this timestamp (ms)
 * - until: only logs before this timestamp (ms)
 * - matchId: filter by match ID
 * - userId: specific user's logs (admin only)
 * - all: query all users' logs (admin only, via http_key)
 */
export const queryLogsRpc: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  let params: LogQueryParams = {};

  logger.info(`queryLogsRpc: raw payload = ${payload}, type = ${typeof payload}`);

  try {
    if (payload) {
      // Handle case where payload might be double-encoded or already parsed
      const parsed = JSON.parse(payload);
      if (typeof parsed === 'string') {
        // Double-encoded JSON string
        params = JSON.parse(parsed);
      } else {
        params = parsed;
      }
    }
  } catch (e) {
    logger.warn(`queryLogsRpc: parse error = ${e}`);
    // Use default params
  }

  logger.info(`queryLogsRpc: params = ${JSON.stringify(params)}`);

  const limit = Math.min(params.limit || 50, 100);
  let allLogs: LogEntry[] = [];

  // If 'all' flag is set (admin query via http_key), query all users
  if (params.all) {
    try {
      // Use SQL query to get logs from all users
      const queryResult = nk.sqlQuery(`
        SELECT value FROM storage
        WHERE collection = $1
        ORDER BY create_time DESC
        LIMIT $2
      `, [LOG_COLLECTION, limit]);

      allLogs = queryResult.map((row: any) => {
        try {
          // Handle different formats: string, object, or byte array
          if (typeof row.value === 'string') {
            return JSON.parse(row.value);
          } else if (Array.isArray(row.value)) {
            // Byte array - decode to string then parse
            const str = String.fromCharCode(...row.value);
            return JSON.parse(str);
          } else if (typeof row.value === 'object') {
            return row.value;
          }
          return row.value;
        } catch {
          return row.value;
        }
      });
      logger.info(`queryLogsRpc: found ${allLogs.length} logs via SQL`);
    } catch (e) {
      logger.warn(`Failed to query all logs via SQL: ${e}`);
      // Return empty result instead of failing
      return JSON.stringify({ logs: [], count: 0, error: String(e) });
    }
  } else {
    // Query specific user's logs
    const userId = params.userId || ctx.userId;

    if (!userId) {
      throw new Error('userId is required (or use all=true for admin query)');
    }

    const result = nk.storageList(userId, LOG_COLLECTION, limit, params.cursor);
    allLogs = result.objects?.map((obj) => obj.value as LogEntry) || [];
  }

  // Apply filters
  let filteredLogs = allLogs;

  // Filter by level
  if (params.level) {
    filteredLogs = filteredLogs.filter((log) => log.level === params.level);
  }

  // Filter by time range
  if (params.since) {
    filteredLogs = filteredLogs.filter((log) => log.timestamp >= params.since!);
  }
  if (params.until) {
    filteredLogs = filteredLogs.filter((log) => log.timestamp <= params.until!);
  }

  // Filter by matchId
  if (params.matchId) {
    filteredLogs = filteredLogs.filter((log) => log.matchId === params.matchId);
  }

  // Sort by timestamp descending (newest first)
  filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

  // Apply limit after filtering
  filteredLogs = filteredLogs.slice(0, limit);

  return JSON.stringify({
    logs: filteredLogs,
    count: filteredLogs.length,
    query: {
      limit,
      level: params.level,
      since: params.since,
      until: params.until,
      matchId: params.matchId,
    },
  });
};

/**
 * Clear logs for a user
 */
export const clearLogsRpc: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  const userId = ctx.userId;

  if (!userId) {
    throw new Error('Must be authenticated');
  }

  // List all logs for user
  const result = nk.storageList(userId, LOG_COLLECTION, 100, '');

  if (result.objects && result.objects.length > 0) {
    const deleteOps: nkruntime.StorageDeleteRequest[] = result.objects.map((obj) => ({
      collection: LOG_COLLECTION,
      key: obj.key,
      userId: userId,
    }));

    nk.storageDelete(deleteOps);
  }

  return JSON.stringify({ success: true, deleted: result.objects?.length || 0 });
};
