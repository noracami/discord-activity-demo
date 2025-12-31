/**
 * Nakama Runtime type definitions
 * Based on https://heroiclabs.com/docs/nakama/server-framework/typescript-runtime/
 */
declare namespace nkruntime {
  export interface Context {
    env: { [key: string]: string };
    executionMode: string;
    node: string;
    version: string;
    headers: { [key: string]: string[] };
    queryParams: { [key: string]: string[] };
    userId: string;
    username: string;
    vars: { [key: string]: string };
    userSessionExp: number;
    sessionId: string;
    clientIp: string;
    clientPort: string;
    lang: string;
  }

  export interface Logger {
    debug(format: string, ...args: any[]): void;
    info(format: string, ...args: any[]): void;
    warn(format: string, ...args: any[]): void;
    error(format: string, ...args: any[]): void;
  }

  export interface Nakama {
    binaryToString(data: ArrayBuffer): string;
    stringToBinary(str: string): ArrayBuffer;
    matchCreate(module: string, params?: { [key: string]: any }): string;
    matchGet(id: string): Match | null;
    matchList(limit: number, authoritative: boolean | null, label: string | null, minSize: number | null, maxSize: number | null, query: string | null): Match[];
    matchSignal(id: string, data: string): string;
  }

  export interface Match {
    matchId: string;
    authoritative: boolean;
    label: string;
    size: number;
    tickRate: number;
    handlerName: string;
    presences: Presence[];
  }

  export interface Presence {
    userId: string;
    sessionId: string;
    username: string;
    node: string;
    status?: string;
    reason?: number;
  }

  export interface MatchDispatcher {
    broadcastMessage(
      opCode: number,
      data: string | null,
      presences?: Presence[] | null,
      sender?: Presence | null,
      reliable?: boolean
    ): void;
    broadcastMessageDeferred(
      opCode: number,
      data: string | null,
      presences?: Presence[] | null,
      sender?: Presence | null,
      reliable?: boolean
    ): void;
    matchKick(presences: Presence[]): void;
    matchLabelUpdate(label: string): void;
  }

  export interface MatchMessage {
    sender: Presence;
    opCode: number;
    data: ArrayBuffer;
    reliable: boolean;
    receiveTime: number;
  }

  export interface Initializer {
    registerRpc(id: string, fn: RpcFunction): void;
    registerMatch(name: string, handlers: MatchHandlers<any>): void;
    registerBeforeRt(id: string, fn: BeforeRtFunction): void;
    registerAfterRt(id: string, fn: AfterRtFunction): void;
  }

  export interface MatchHandlers<T> {
    matchInit: MatchInitFunction<T>;
    matchJoinAttempt: MatchJoinAttemptFunction<T>;
    matchJoin: MatchJoinFunction<T>;
    matchLeave: MatchLeaveFunction<T>;
    matchLoop: MatchLoopFunction<T>;
    matchTerminate: MatchTerminateFunction<T>;
    matchSignal: MatchSignalFunction<T>;
  }

  export type RpcFunction = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    payload: string
  ) => string | void;

  export type BeforeRtFunction = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    envelope: any
  ) => any;

  export type AfterRtFunction = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    envelope: any
  ) => void;

  export type MatchInitFunction<T> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    params: { [key: string]: string }
  ) => { state: T; tickRate: number; label: string };

  export type MatchJoinAttemptFunction<T> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: T,
    presence: Presence,
    metadata: { [key: string]: any }
  ) => { state: T; accept: boolean; rejectMessage?: string } | null;

  export type MatchJoinFunction<T> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: T,
    presences: Presence[]
  ) => { state: T } | null;

  export type MatchLeaveFunction<T> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: T,
    presences: Presence[]
  ) => { state: T } | null;

  export type MatchLoopFunction<T> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: T,
    messages: MatchMessage[]
  ) => { state: T } | null;

  export type MatchTerminateFunction<T> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: T,
    graceSeconds: number
  ) => { state: T } | null;

  export type MatchSignalFunction<T> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: T,
    data: string
  ) => { state: T; data?: string } | null;
}
