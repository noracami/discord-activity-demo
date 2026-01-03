import { matchInit, matchJoinAttempt, matchJoin, matchLeave, matchLoop, matchTerminate, matchSignal } from './match/index';
import { findOrCreateMatchRpc, clearMatchRpc } from './rpc/find-or-create-match';
import { storeLogRpc, queryLogsRpc, clearLogsRpc } from './rpc/remote-log';

/**
 * Nakama server initialization
 */
function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) {
  logger.info('Initializing Infinite Tic-Tac-Toe module...');

  // Register Match Handler
  initializer.registerMatch('infinite_tictactoe', {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal,
  });

  // Register RPCs
  initializer.registerRpc('find_or_create_match', findOrCreateMatchRpc);
  initializer.registerRpc('clear_match', clearMatchRpc);
  initializer.registerRpc('store_log', storeLogRpc);
  initializer.registerRpc('query_logs', queryLogsRpc);
  initializer.registerRpc('clear_logs', clearLogsRpc);

  logger.info('Module initialized successfully');
}

// Export for Nakama runtime
!InitModule && InitModule.bind(null);
