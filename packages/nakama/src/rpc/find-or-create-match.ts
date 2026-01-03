const MATCH_REGISTRY_COLLECTION = 'match_registry';
const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';
const MAX_RETRIES = 3;

/**
 * RPC to find or create a match for a Discord channel
 *
 * Uses optimistic locking with Storage version to prevent race conditions:
 * - version: "*" = only write if key doesn't exist
 * - If write fails, another player created the match first, use theirs
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
    // Step 1: Check if registry exists
    const existingRegistry = nk.storageRead([{
      collection: MATCH_REGISTRY_COLLECTION,
      key: registryKey,
      userId: SYSTEM_USER,
    }]);

    if (existingRegistry.length > 0) {
      const registeredMatchId = existingRegistry[0].value.matchId as string;
      const registryVersion = existingRegistry[0].version;
      logger.info(`Found registered match: ${registeredMatchId}, version: ${registryVersion}`);

      // Verify match still exists
      const query = `+label.channel_id:${channelId}`;
      const matches = nk.matchList(10, true, null, null, 10, query);
      const matchExists = matches.some(m => m.matchId === registeredMatchId);

      if (matchExists) {
        logger.info(`Match ${registeredMatchId} exists, returning it`);
        return JSON.stringify({ match_id: registeredMatchId });
      }

      // Match doesn't exist, delete stale registry with version check
      logger.info(`Match ${registeredMatchId} no longer exists, deleting stale registry`);
      try {
        nk.storageDelete([{
          collection: MATCH_REGISTRY_COLLECTION,
          key: registryKey,
          userId: SYSTEM_USER,
          version: registryVersion,
        }]);
      } catch (e) {
        // Someone else already deleted/updated it, retry
        logger.info(`Failed to delete stale registry, retrying...`);
        continue;
      }
    }

    // Step 2: Create new match
    const matchId = nk.matchCreate('infinite_tictactoe', { channel_id: channelId });
    logger.info(`Created new match: ${matchId}`);

    // Step 3: Try to register with version "*" (only if doesn't exist)
    try {
      nk.storageWrite([{
        collection: MATCH_REGISTRY_COLLECTION,
        key: registryKey,
        userId: SYSTEM_USER,
        value: {
          matchId: matchId,
          channelId: channelId,
          createdAt: Date.now(),
        },
        permissionRead: 0,
        permissionWrite: 0,
        version: '*', // Only write if key doesn't exist
      }]);

      logger.info(`Successfully registered match: ${matchId}`);
      return JSON.stringify({ match_id: matchId });
    } catch (e) {
      // Another player registered first, read and use theirs
      logger.info(`Registry write failed (another player was faster), reading existing...`);

      const confirmedRegistry = nk.storageRead([{
        collection: MATCH_REGISTRY_COLLECTION,
        key: registryKey,
        userId: SYSTEM_USER,
      }]);

      if (confirmedRegistry.length > 0) {
        const confirmedMatchId = confirmedRegistry[0].value.matchId as string;

        // Verify this match exists
        const query2 = `+label.channel_id:${channelId}`;
        const matches2 = nk.matchList(10, true, null, null, 10, query2);
        const exists2 = matches2.some(m => m.matchId === confirmedMatchId);

        if (exists2) {
          logger.info(`Using other player's match: ${confirmedMatchId}`);
          return JSON.stringify({ match_id: confirmedMatchId });
        }

        // That match doesn't exist either, retry the whole process
        logger.info(`Other player's match doesn't exist, retrying...`);
        continue;
      }

      // Registry disappeared, retry
      continue;
    }
  }

  throw new Error(`Failed to find or create match after ${MAX_RETRIES} attempts`);
};
