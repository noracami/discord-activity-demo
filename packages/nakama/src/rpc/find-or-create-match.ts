const MATCH_REGISTRY_COLLECTION = 'match_registry';
const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 100;

/**
 * RPC to find or create a match for a Discord channel
 *
 * Strategy: Only ONE player creates the match, others wait and read
 * 1. Try to claim the channelId by writing a "pending" state
 * 2. Winner creates match and updates registry with matchId
 * 3. Others wait for registry to have matchId, then return it
 */
export const findOrCreateMatchRpc: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  let channelId: string;

  try {
    const data = JSON.parse(payload);
    channelId = data.channel_id;
  } catch (e) {
    throw new Error('Invalid payload: expected { channel_id: string }');
  }

  if (!channelId) {
    throw new Error('Missing channel_id');
  }

  logger.info(`Finding or creating match for channel: ${channelId}, user: ${ctx.userId}`);

  const registryKey = `channel_${channelId}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Step 1: Read current registry
    const existingRegistry = nk.storageRead([{
      collection: MATCH_REGISTRY_COLLECTION,
      key: registryKey,
      userId: SYSTEM_USER,
    }]);

    if (existingRegistry.length > 0) {
      const registry = existingRegistry[0].value as {
        matchId?: string;
        status: 'pending' | 'ready';
        channelId: string;
        createdAt: number;
      };
      const version = existingRegistry[0].version;

      // If registry has matchId and status is ready, verify and return
      if (registry.status === 'ready' && registry.matchId) {
        // Verify match exists
        const query = `+label.channel_id:${channelId}`;
        const matches = nk.matchList(10, true, null, null, 10, query);
        const matchExists = matches.some(m => m.matchId === registry.matchId);

        if (matchExists) {
          logger.info(`Found existing match: ${registry.matchId}`);
          return JSON.stringify({ match_id: registry.matchId });
        }

        // Match doesn't exist (server restarted), try to delete and recreate
        logger.info(`Match ${registry.matchId} no longer exists, attempting to recreate`);
        try {
          nk.storageDelete([{
            collection: MATCH_REGISTRY_COLLECTION,
            key: registryKey,
            userId: SYSTEM_USER,
            version: version,
          }]);
        } catch (e) {
          // Someone else deleted it, retry
          logger.info(`Failed to delete stale registry, retrying...`);
          continue;
        }
        // Continue to create new match
      } else if (registry.status === 'pending') {
        // Someone else is creating the match, wait and retry
        logger.info(`Match creation in progress, waiting...`);
        busyWait(RETRY_DELAY_MS);
        continue;
      }
    }

    // Step 2: Try to claim the channelId by writing "pending" state
    try {
      nk.storageWrite([{
        collection: MATCH_REGISTRY_COLLECTION,
        key: registryKey,
        userId: SYSTEM_USER,
        value: {
          status: 'pending',
          channelId: channelId,
          createdAt: Date.now(),
        },
        permissionRead: 0,
        permissionWrite: 0,
        version: '*', // Only write if doesn't exist
      }]);
      logger.info(`Claimed channelId, creating match...`);
    } catch (e) {
      // Someone else claimed it, wait and retry
      logger.info(`Failed to claim channelId (another player was faster), retrying...`);
      busyWait(RETRY_DELAY_MS);
      continue;
    }

    // Step 3: We won the claim, create the match
    const matchId = nk.matchCreate('infinite_tictactoe', { channel_id: channelId });
    logger.info(`Created match: ${matchId}`);

    // Step 4: Update registry with matchId and "ready" status
    try {
      // Read current version
      const currentRegistry = nk.storageRead([{
        collection: MATCH_REGISTRY_COLLECTION,
        key: registryKey,
        userId: SYSTEM_USER,
      }]);

      if (currentRegistry.length === 0) {
        // Registry disappeared? This shouldn't happen
        logger.error(`Registry disappeared after creating match!`);
        throw new Error('Registry disappeared');
      }

      nk.storageWrite([{
        collection: MATCH_REGISTRY_COLLECTION,
        key: registryKey,
        userId: SYSTEM_USER,
        value: {
          status: 'ready',
          matchId: matchId,
          channelId: channelId,
          createdAt: Date.now(),
        },
        permissionRead: 0,
        permissionWrite: 0,
        version: currentRegistry[0].version,
      }]);

      logger.info(`Registered match: ${matchId}`);
      return JSON.stringify({ match_id: matchId });
    } catch (e) {
      // Failed to update registry, the match is orphaned
      logger.error(`Failed to register match ${matchId}: ${e}`);
      // Continue retry loop, the orphaned match will be cleaned up by Nakama
      continue;
    }
  }

  throw new Error(`Failed to find or create match after ${MAX_RETRIES} attempts`);
};

function busyWait(ms: number): void {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // busy wait
  }
}
