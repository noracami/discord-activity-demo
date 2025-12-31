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

  logger.info(`Finding or creating match for channel: ${channelId}`);

  // Search for existing match with this channel
  const query = `+label.channel_id:${channelId}`;
  const matches = nk.matchList(1, true, null, null, 1, query);

  if (matches.length > 0) {
    const match = matches[0];
    logger.info(`Found existing match: ${match.matchId}`);
    return JSON.stringify({ match_id: match.matchId });
  }

  // Create new match
  const matchId = nk.matchCreate('infinite_tictactoe', { channel_id: channelId });
  logger.info(`Created new match: ${matchId}`);

  return JSON.stringify({ match_id: matchId });
};
