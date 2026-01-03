/**
 * RPC to find or create a match for a Discord channel
 * Uses retry mechanism to handle race conditions when multiple players connect simultaneously
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

  // Search for existing match with this channel
  const query = `+label.channel_id:${channelId}`;

  // Try to find existing match with retries (to handle race conditions)
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 100;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    logger.info(`Search attempt ${attempt + 1}/${MAX_RETRIES} with query: ${query}`);

    const matches = nk.matchList(100, true, null, null, 100, query);
    logger.info(`Found ${matches.length} matches for channel ${channelId}`);

    if (matches.length > 0) {
      // Log all found matches for debugging
      for (const m of matches) {
        logger.info(`  Match: ${m.matchId}, size=${m.size}, label=${m.label}`);
      }
      const match = matches[0];
      logger.info(`Returning existing match: ${match.matchId}`);
      return JSON.stringify({ match_id: match.matchId });
    }

    // If this is the first attempt and no match found, try to create one
    if (attempt === 0) {
      // Use storage as a simple lock to prevent race conditions
      const LOCK_COLLECTION = 'match_locks';
      const lockKey = `channel_${channelId}`;

      try {
        // Try to acquire lock by writing to storage
        // This will fail if another process already created the lock
        const existingLocks = nk.storageRead([{
          collection: LOCK_COLLECTION,
          key: lockKey,
          userId: '00000000-0000-0000-0000-000000000000',
        }]);

        if (existingLocks.length > 0) {
          // Lock exists, another process is creating the match
          logger.info(`Lock exists, waiting for match to be created...`);
          // Small delay then retry search
          const start = Date.now();
          while (Date.now() - start < RETRY_DELAY_MS) {
            // Busy wait (Nakama JS runtime doesn't have sleep)
          }
          continue;
        }

        // No lock, try to create it
        nk.storageWrite([{
          collection: LOCK_COLLECTION,
          key: lockKey,
          userId: '00000000-0000-0000-0000-000000000000',
          value: { creating: true, timestamp: Date.now() },
          permissionRead: 0,
          permissionWrite: 0,
        }]);

        logger.info(`Acquired lock, creating new match`);

        // Create new match
        const matchId = nk.matchCreate('infinite_tictactoe', { channel_id: channelId });
        logger.info(`Created new match: ${matchId}`);

        // Delete lock after match is created
        nk.storageDelete([{
          collection: LOCK_COLLECTION,
          key: lockKey,
          userId: '00000000-0000-0000-0000-000000000000',
        }]);

        return JSON.stringify({ match_id: matchId });

      } catch (e: any) {
        logger.warn(`Lock operation failed: ${e?.message || e}, will retry search`);
        // Small delay then retry search
        const start = Date.now();
        while (Date.now() - start < RETRY_DELAY_MS) {
          // Busy wait
        }
        continue;
      }
    }

    // Small delay before retry
    const start = Date.now();
    while (Date.now() - start < RETRY_DELAY_MS) {
      // Busy wait
    }
  }

  // If all retries failed, create match anyway (fallback)
  logger.warn(`All retries failed, creating match as fallback`);
  const matchId = nk.matchCreate('infinite_tictactoe', { channel_id: channelId });
  logger.info(`Created fallback match: ${matchId}`);

  return JSON.stringify({ match_id: matchId });
};
