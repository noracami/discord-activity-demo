import { matchInit, matchJoinAttempt, matchJoin, matchLeave, matchLoop, matchTerminate, matchSignal } from './match/index';
import { findOrCreateMatchRpc } from './rpc/find-or-create-match';

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

  logger.info('Module initialized successfully');
}

// Export for Nakama runtime
!InitModule && InitModule.bind(null);
