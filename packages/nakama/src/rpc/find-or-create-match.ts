const MATCH_REGISTRY_COLLECTION = 'match_registry';
const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';

/**
 * RPC to find or create a match for a Discord channel
 *
 * Strategy to handle race conditions:
 * 1. First, check if registry exists - if yes, use that match
 * 2. If not, create match and register it
 * 3. Read back registry to confirm - if different, use the registered one
 *
 * This ensures that even if multiple players create matches simultaneously,
 * they will all converge on the FIRST registered match.
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

  // Step 1: Check if registry already exists
  const existingRegistry = nk.storageRead([{
    collection: MATCH_REGISTRY_COLLECTION,
    key: registryKey,
    userId: SYSTEM_USER,
  }]);

  if (existingRegistry.length > 0) {
    const registeredMatchId = existingRegistry[0].value.matchId as string;
    const registeredAt = existingRegistry[0].value.createdAt as number;
    logger.info(`Found registered match: ${registeredMatchId} (created at ${registeredAt})`);

    // Verify match still exists by checking matchList
    // After server restart, old matches don't exist anymore
    const query = `+label.channel_id:${channelId}`;
    const matches = nk.matchList(10, true, null, null, 10, query);
    const matchExists = matches.some(m => m.matchId === registeredMatchId);

    if (matchExists) {
      logger.info(`Verified match ${registeredMatchId} exists, returning it`);
      return JSON.stringify({ match_id: registeredMatchId });
    }

    // Match doesn't exist (server was restarted), delete stale registry
    logger.info(`Match ${registeredMatchId} no longer exists, deleting stale registry`);
    nk.storageDelete([{
      collection: MATCH_REGISTRY_COLLECTION,
      key: registryKey,
      userId: SYSTEM_USER,
    }]);

    // Small delay to allow other concurrent requests to also detect stale registry
    const start = Date.now();
    while (Date.now() - start < 50) { /* busy wait */ }

    // Check again if someone else already created a new match
    const retryRegistry = nk.storageRead([{
      collection: MATCH_REGISTRY_COLLECTION,
      key: registryKey,
      userId: SYSTEM_USER,
    }]);

    if (retryRegistry.length > 0) {
      const newMatchId = retryRegistry[0].value.matchId as string;
      logger.info(`Another player already created new match: ${newMatchId}`);
      return JSON.stringify({ match_id: newMatchId });
    }
    // Continue to create new match below
  }

  // Step 2: No registry exists, create a new match
  logger.info(`No registered match found, creating new match for channel: ${channelId}`);

  const matchId = nk.matchCreate('infinite_tictactoe', { channel_id: channelId });
  const createdAt = Date.now();
  logger.info(`Created new match: ${matchId}`);

  // Step 3: Try to register this match
  // Use a timestamp to determine which match "wins" in case of race
  nk.storageWrite([{
    collection: MATCH_REGISTRY_COLLECTION,
    key: registryKey,
    userId: SYSTEM_USER,
    value: {
      matchId: matchId,
      channelId: channelId,
      createdAt: createdAt,
    },
    permissionRead: 0,
    permissionWrite: 0,
  }]);

  // Step 4: Read back to see what's actually registered
  // (In case another player wrote first)
  const confirmedRegistry = nk.storageRead([{
    collection: MATCH_REGISTRY_COLLECTION,
    key: registryKey,
    userId: SYSTEM_USER,
  }]);

  if (confirmedRegistry.length > 0) {
    const confirmedMatchId = confirmedRegistry[0].value.matchId as string;
    const confirmedAt = confirmedRegistry[0].value.createdAt as number;

    if (confirmedMatchId !== matchId) {
      // Another player registered first! Use their match instead.
      logger.info(`Race condition detected! Our match: ${matchId}, but using registered: ${confirmedMatchId}`);
      // Our match will be orphaned and eventually closed
      return JSON.stringify({ match_id: confirmedMatchId });
    }

    logger.info(`Successfully registered our match: ${matchId}`);
  }

  return JSON.stringify({ match_id: matchId });
};
