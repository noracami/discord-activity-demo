/**
 * OpCodes for client-server communication
 */
export enum OpCode {
  // Client -> Server
  JOIN_GAME = 1,        // Request to join as a player (from spectator)
  LEAVE_GAME = 2,       // Leave player slot (become spectator)
  READY = 3,            // Mark as ready
  UNREADY = 4,          // Cancel ready state
  MOVE = 5,             // Place a piece
  KICK_PLAYER = 6,      // Kick unready player (after timeout)
  REMATCH_VOTE = 7,     // Vote for rematch

  // Server -> Client
  STATE_SYNC = 100,     // Full state synchronization
  PLAYER_JOINED = 101,  // A player joined the game
  PLAYER_LEFT = 102,    // A player left the game
  READY_UPDATE = 103,   // Ready state changed
  GAME_START = 104,     // Game started
  MOVE_MADE = 105,      // A move was made
  PIECE_REMOVED = 106,  // A piece was removed (FIFO)
  TURN_CHANGE = 107,    // Turn changed
  GAME_END = 108,       // Game ended
  REMATCH_UPDATE = 109, // Rematch vote update
  PLAYER_KICKED = 110,  // A player was kicked
  PLAYER_DISCONNECTED = 111, // A player temporarily disconnected
  PLAYER_RECONNECTED = 112,  // A player reconnected
  VERSION_CHECK = 113,       // Client version check
  ERROR = 199,          // Error message
}
