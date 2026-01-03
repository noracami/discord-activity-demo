/**
 * RPC to find or create a match for a Discord channel
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
  logger.info(`Searching with query: ${query}`);

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

  // Create new match
  const matchId = nk.matchCreate('infinite_tictactoe', { channel_id: channelId });
  logger.info(`Created new match: ${matchId}`);

  return JSON.stringify({ match_id: matchId });
};
