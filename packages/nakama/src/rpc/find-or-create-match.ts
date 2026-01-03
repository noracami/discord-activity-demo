const MATCH_REGISTRY_COLLECTION = 'match_registry';
const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';

/**
 * RPC to find or create a match for a Discord channel
 *
 * Simple strategy:
 * 1. Read registry → if exists, return matchId (trust it)
 * 2. No registry → try to claim with version: "*"
 * 3. Claim success → create match, register it
 * 4. Claim fail → someone else claimed, re-read and return
 *
 * If joinMatch fails later (match doesn't exist), client should call clear_match RPC
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

  logger.info(`findOrCreateMatch: channel=${channelId}, user=${ctx.userId}`);

  const registryKey = `channel_${channelId}`;

  // Step 1: Check if registry exists
  const existingRegistry = nk.storageRead([{
    collection: MATCH_REGISTRY_COLLECTION,
    key: registryKey,
    userId: SYSTEM_USER,
  }]);

  if (existingRegistry.length > 0) {
    const matchId = existingRegistry[0].value.matchId as string;
    logger.info(`Found existing registry: ${matchId}`);
    return JSON.stringify({ match_id: matchId });
  }

  // Step 2: No registry, try to claim
  logger.info(`No registry, attempting to claim...`);

  try {
    // Create match first
    const matchId = nk.matchCreate('infinite_tictactoe', { channel_id: channelId });
    logger.info(`Created match: ${matchId}`);

    // Try to register with version: "*" (only succeeds if key doesn't exist)
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
      version: '*',
    }]);

    logger.info(`Registered match: ${matchId}`);
    return JSON.stringify({ match_id: matchId });
  } catch (e) {
    // Someone else registered first, read and return theirs
    logger.info(`Claim failed, reading existing registry...`);

    const confirmedRegistry = nk.storageRead([{
      collection: MATCH_REGISTRY_COLLECTION,
      key: registryKey,
      userId: SYSTEM_USER,
    }]);

    if (confirmedRegistry.length > 0) {
      const matchId = confirmedRegistry[0].value.matchId as string;
      logger.info(`Using existing match: ${matchId}`);
      return JSON.stringify({ match_id: matchId });
    }

    // This shouldn't happen
    throw new Error('Failed to find or create match');
  }
};

/**
 * RPC to clear the match registry for a channel
 * Used when a user is stuck in a wrong/stale match
 */
export const clearMatchRpc: nkruntime.RpcFunction = function (
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

  logger.info(`clearMatch: channel=${channelId}, user=${ctx.userId}`);

  const registryKey = `channel_${channelId}`;

  try {
    nk.storageDelete([{
      collection: MATCH_REGISTRY_COLLECTION,
      key: registryKey,
      userId: SYSTEM_USER,
    }]);
    logger.info(`Cleared registry for channel: ${channelId}`);
    return JSON.stringify({ success: true });
  } catch (e) {
    logger.error(`Failed to clear registry: ${e}`);
    return JSON.stringify({ success: false, error: String(e) });
  }
};
