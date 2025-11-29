//#region node_modules/hono/dist/types/request/constants.d.ts
declare const GET_MATCH_RESULT: symbol;
//#endregion
//#region node_modules/hono/dist/types/router.d.ts

/**
 * Interface representing a router.
 *
 * @template T - The type of the handler.
 */
interface Router<T$1> {
  /**
   * The name of the router.
   */
  name: string;
  /**
   * Adds a route to the router.
   *
   * @param method - The HTTP method (e.g., 'get', 'post').
   * @param path - The path for the route.
   * @param handler - The handler for the route.
   */
  add(method: string, path: string, handler: T$1): void;
  /**
   * Matches a route based on the given method and path.
   *
   * @param method - The HTTP method (e.g., 'get', 'post').
   * @param path - The path to match.
   * @returns The result of the match.
   */
  match(method: string, path: string): Result$1<T$1>;
}
/**
 * Type representing a map of parameter indices.
 */
type ParamIndexMap = Record<string, number>;
/**
 * Type representing a stash of parameters.
 */
type ParamStash = string[];
/**
 * Type representing a map of parameters.
 */
type Params$1 = Record<string, string>;
/**
 * Type representing the result of a route match.
 *
 * The result can be in one of two formats:
 * 1. An array of handlers with their corresponding parameter index maps, followed by a parameter stash.
 * 2. An array of handlers with their corresponding parameter maps.
 *
 * Example:
 *
 * [[handler, paramIndexMap][], paramArray]
 * ```typescript
 * [
 *   [
 *     [middlewareA, {}],                     // '*'
 *     [funcA,       {'id': 0}],              // '/user/:id/*'
 *     [funcB,       {'id': 0, 'action': 1}], // '/user/:id/:action'
 *   ],
 *   ['123', 'abc']
 * ]
 * ```
 *
 * [[handler, params][]]
 * ```typescript
 * [
 *   [
 *     [middlewareA, {}],                             // '*'
 *     [funcA,       {'id': '123'}],                  // '/user/:id/*'
 *     [funcB,       {'id': '123', 'action': 'abc'}], // '/user/:id/:action'
 *   ]
 * ]
 * ```
 */
type Result$1<T$1> = [[T$1, ParamIndexMap][], ParamStash] | [[T$1, Params$1][]];
//#endregion
//#region node_modules/hono/dist/types/utils/headers.d.ts
/**
 * @module
 * HTTP Headers utility.
 */
type RequestHeader = "A-IM" | "Accept" | "Accept-Additions" | "Accept-CH" | "Accept-Charset" | "Accept-Datetime" | "Accept-Encoding" | "Accept-Features" | "Accept-Language" | "Accept-Patch" | "Accept-Post" | "Accept-Ranges" | "Accept-Signature" | "Access-Control" | "Access-Control-Allow-Credentials" | "Access-Control-Allow-Headers" | "Access-Control-Allow-Methods" | "Access-Control-Allow-Origin" | "Access-Control-Expose-Headers" | "Access-Control-Max-Age" | "Access-Control-Request-Headers" | "Access-Control-Request-Method" | "Age" | "Allow" | "ALPN" | "Alt-Svc" | "Alt-Used" | "Alternates" | "AMP-Cache-Transform" | "Apply-To-Redirect-Ref" | "Authentication-Control" | "Authentication-Info" | "Authorization" | "Available-Dictionary" | "C-Ext" | "C-Man" | "C-Opt" | "C-PEP" | "C-PEP-Info" | "Cache-Control" | "Cache-Status" | "Cal-Managed-ID" | "CalDAV-Timezones" | "Capsule-Protocol" | "CDN-Cache-Control" | "CDN-Loop" | "Cert-Not-After" | "Cert-Not-Before" | "Clear-Site-Data" | "Client-Cert" | "Client-Cert-Chain" | "Close" | "CMCD-Object" | "CMCD-Request" | "CMCD-Session" | "CMCD-Status" | "CMSD-Dynamic" | "CMSD-Static" | "Concealed-Auth-Export" | "Configuration-Context" | "Connection" | "Content-Base" | "Content-Digest" | "Content-Disposition" | "Content-Encoding" | "Content-ID" | "Content-Language" | "Content-Length" | "Content-Location" | "Content-MD5" | "Content-Range" | "Content-Script-Type" | "Content-Security-Policy" | "Content-Security-Policy-Report-Only" | "Content-Style-Type" | "Content-Type" | "Content-Version" | "Cookie" | "Cookie2" | "Cross-Origin-Embedder-Policy" | "Cross-Origin-Embedder-Policy-Report-Only" | "Cross-Origin-Opener-Policy" | "Cross-Origin-Opener-Policy-Report-Only" | "Cross-Origin-Resource-Policy" | "CTA-Common-Access-Token" | "DASL" | "Date" | "DAV" | "Default-Style" | "Delta-Base" | "Deprecation" | "Depth" | "Derived-From" | "Destination" | "Differential-ID" | "Dictionary-ID" | "Digest" | "DPoP" | "DPoP-Nonce" | "Early-Data" | "EDIINT-Features" | "ETag" | "Expect" | "Expect-CT" | "Expires" | "Ext" | "Forwarded" | "From" | "GetProfile" | "Hobareg" | "Host" | "HTTP2-Settings" | "If" | "If-Match" | "If-Modified-Since" | "If-None-Match" | "If-Range" | "If-Schedule-Tag-Match" | "If-Unmodified-Since" | "IM" | "Include-Referred-Token-Binding-ID" | "Isolation" | "Keep-Alive" | "Label" | "Last-Event-ID" | "Last-Modified" | "Link" | "Link-Template" | "Location" | "Lock-Token" | "Man" | "Max-Forwards" | "Memento-Datetime" | "Meter" | "Method-Check" | "Method-Check-Expires" | "MIME-Version" | "Negotiate" | "NEL" | "OData-EntityId" | "OData-Isolation" | "OData-MaxVersion" | "OData-Version" | "Opt" | "Optional-WWW-Authenticate" | "Ordering-Type" | "Origin" | "Origin-Agent-Cluster" | "OSCORE" | "OSLC-Core-Version" | "Overwrite" | "P3P" | "PEP" | "PEP-Info" | "Permissions-Policy" | "PICS-Label" | "Ping-From" | "Ping-To" | "Position" | "Pragma" | "Prefer" | "Preference-Applied" | "Priority" | "ProfileObject" | "Protocol" | "Protocol-Info" | "Protocol-Query" | "Protocol-Request" | "Proxy-Authenticate" | "Proxy-Authentication-Info" | "Proxy-Authorization" | "Proxy-Features" | "Proxy-Instruction" | "Proxy-Status" | "Public" | "Public-Key-Pins" | "Public-Key-Pins-Report-Only" | "Range" | "Redirect-Ref" | "Referer" | "Referer-Root" | "Referrer-Policy" | "Refresh" | "Repeatability-Client-ID" | "Repeatability-First-Sent" | "Repeatability-Request-ID" | "Repeatability-Result" | "Replay-Nonce" | "Reporting-Endpoints" | "Repr-Digest" | "Retry-After" | "Safe" | "Schedule-Reply" | "Schedule-Tag" | "Sec-GPC" | "Sec-Purpose" | "Sec-Token-Binding" | "Sec-WebSocket-Accept" | "Sec-WebSocket-Extensions" | "Sec-WebSocket-Key" | "Sec-WebSocket-Protocol" | "Sec-WebSocket-Version" | "Security-Scheme" | "Server" | "Server-Timing" | "Set-Cookie" | "Set-Cookie2" | "SetProfile" | "Signature" | "Signature-Input" | "SLUG" | "SoapAction" | "Status-URI" | "Strict-Transport-Security" | "Sunset" | "Surrogate-Capability" | "Surrogate-Control" | "TCN" | "TE" | "Timeout" | "Timing-Allow-Origin" | "Topic" | "Traceparent" | "Tracestate" | "Trailer" | "Transfer-Encoding" | "TTL" | "Upgrade" | "Urgency" | "URI" | "Use-As-Dictionary" | "User-Agent" | "Variant-Vary" | "Vary" | "Via" | "Want-Content-Digest" | "Want-Digest" | "Want-Repr-Digest" | "Warning" | "WWW-Authenticate" | "X-Content-Type-Options" | "X-Frame-Options";
type ResponseHeader = "Access-Control-Allow-Credentials" | "Access-Control-Allow-Headers" | "Access-Control-Allow-Methods" | "Access-Control-Allow-Origin" | "Access-Control-Expose-Headers" | "Access-Control-Max-Age" | "Age" | "Allow" | "Cache-Control" | "Clear-Site-Data" | "Content-Disposition" | "Content-Encoding" | "Content-Language" | "Content-Length" | "Content-Location" | "Content-Range" | "Content-Security-Policy" | "Content-Security-Policy-Report-Only" | "Content-Type" | "Cookie" | "Cross-Origin-Embedder-Policy" | "Cross-Origin-Opener-Policy" | "Cross-Origin-Resource-Policy" | "Date" | "ETag" | "Expires" | "Last-Modified" | "Location" | "Permissions-Policy" | "Pragma" | "Retry-After" | "Save-Data" | "Sec-CH-Prefers-Color-Scheme" | "Sec-CH-Prefers-Reduced-Motion" | "Sec-CH-UA" | "Sec-CH-UA-Arch" | "Sec-CH-UA-Bitness" | "Sec-CH-UA-Form-Factor" | "Sec-CH-UA-Full-Version" | "Sec-CH-UA-Full-Version-List" | "Sec-CH-UA-Mobile" | "Sec-CH-UA-Model" | "Sec-CH-UA-Platform" | "Sec-CH-UA-Platform-Version" | "Sec-CH-UA-WoW64" | "Sec-Fetch-Dest" | "Sec-Fetch-Mode" | "Sec-Fetch-Site" | "Sec-Fetch-User" | "Sec-GPC" | "Server" | "Server-Timing" | "Service-Worker-Navigation-Preload" | "Set-Cookie" | "Strict-Transport-Security" | "Timing-Allow-Origin" | "Trailer" | "Transfer-Encoding" | "Upgrade" | "Vary" | "WWW-Authenticate" | "Warning" | "X-Content-Type-Options" | "X-DNS-Prefetch-Control" | "X-Frame-Options" | "X-Permitted-Cross-Domain-Policies" | "X-Powered-By" | "X-Robots-Tag" | "X-XSS-Protection";
type CustomHeader = string & {};
//#endregion
//#region node_modules/hono/dist/types/utils/http-status.d.ts
/**
 * @module
 * HTTP Status utility.
 */
type InfoStatusCode = 100 | 101 | 102 | 103;
type SuccessStatusCode = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;
type DeprecatedStatusCode = 305 | 306;
type RedirectStatusCode = 300 | 301 | 302 | 303 | 304 | DeprecatedStatusCode | 307 | 308;
type ClientErrorStatusCode = 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 421 | 422 | 423 | 424 | 425 | 426 | 428 | 429 | 431 | 451;
type ServerErrorStatusCode = 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;
/**
 * `UnofficialStatusCode` can be used to specify an unofficial status code.
 * @example
 *
 * ```ts
 * app.get('/unknown', (c) => {
 *   return c.text("Unknown Error", 520 as UnofficialStatusCode)
 * })
 * ```
 */
type UnofficialStatusCode = -1;
/**
 * If you want to use an unofficial status, use `UnofficialStatusCode`.
 */
type StatusCode = InfoStatusCode | SuccessStatusCode | RedirectStatusCode | ClientErrorStatusCode | ServerErrorStatusCode | UnofficialStatusCode;
type ContentlessStatusCode = 101 | 204 | 205 | 304;
type ContentfulStatusCode = Exclude<StatusCode, ContentlessStatusCode>;
//#endregion
//#region node_modules/hono/dist/types/utils/types.d.ts
type UnionToIntersection<U$1> = (U$1 extends any ? (k: U$1) => void : never) extends ((k: infer I) => void) ? I : never;
type RemoveBlankRecord<T$1> = T$1 extends Record<infer K, unknown> ? K extends string ? T$1 : never : never;
type IfAnyThenEmptyObject<T$1> = 0 extends 1 & T$1 ? {} : T$1;
type JSONPrimitive = string | boolean | number | null;
type JSONArray = (JSONPrimitive | JSONObject | JSONArray)[];
type JSONObject = {
  [key: string]: JSONPrimitive | JSONArray | JSONObject | object | InvalidJSONValue;
};
type InvalidJSONValue = undefined | symbol | ((...args: unknown[]) => unknown);
type InvalidToNull<T$1> = T$1 extends InvalidJSONValue ? null : T$1;
type IsInvalid<T$1> = T$1 extends InvalidJSONValue ? true : false;
/**
 * symbol keys are omitted through `JSON.stringify`
 */
type OmitSymbolKeys<T$1> = { [K in keyof T$1 as K extends symbol ? never : K]: T$1[K] };
type JSONValue = JSONObject | JSONArray | JSONPrimitive;
/**
 * Convert a type to a JSON-compatible type.
 *
 * Non-JSON values such as `Date` implement `.toJSON()`,
 * so they can be transformed to a value assignable to `JSONObject`
 *
 * `JSON.stringify()` throws a `TypeError` when it encounters a `bigint` value,
 * unless a custom `replacer` function or `.toJSON()` method is provided.
 *
 * This behaviour can be controlled by the `TError` generic type parameter,
 * which defaults to `bigint | ReadonlyArray<bigint>`.
 * You can set it to `never` to disable this check.
 */
type JSONParsed<T$1, TError = bigint | ReadonlyArray<bigint>> = T$1 extends {
  toJSON(): infer J;
} ? (() => J) extends (() => JSONPrimitive) ? J : (() => J) extends (() => {
  toJSON(): unknown;
}) ? {} : JSONParsed<J, TError> : T$1 extends JSONPrimitive ? T$1 : T$1 extends InvalidJSONValue ? never : T$1 extends ReadonlyArray<unknown> ? { [K in keyof T$1]: JSONParsed<InvalidToNull<T$1[K]>, TError> } : T$1 extends Set<unknown> | Map<unknown, unknown> | Record<string, never> ? {} : T$1 extends object ? T$1[keyof T$1] extends TError ? never : { [K in keyof OmitSymbolKeys<T$1> as IsInvalid<T$1[K]> extends true ? never : K]: boolean extends IsInvalid<T$1[K]> ? JSONParsed<T$1[K], TError> | undefined : JSONParsed<T$1[K], TError> } : T$1 extends unknown ? T$1 extends TError ? never : JSONValue : never;
/**
 * Useful to flatten the type output to improve type hints shown in editors. And also to transform an interface into a type to aide with assignability.
 * @copyright from sindresorhus/type-fest
 */
type Simplify<T$1> = { [KeyType in keyof T$1]: T$1[KeyType] } & {};
type RequiredKeysOf<BaseType extends object> = Exclude<{ [Key in keyof BaseType]: BaseType extends Record<Key, BaseType[Key]> ? Key : never }[keyof BaseType], undefined>;
type HasRequiredKeys<BaseType extends object> = RequiredKeysOf<BaseType> extends never ? false : true;
type IsAny$1<T$1> = boolean extends (T$1 extends never ? true : false) ? true : false;
//#endregion
//#region node_modules/hono/dist/types/types.d.ts
type Bindings = object;
type Variables = object;
type BlankEnv = {};
type Env = {
  Bindings?: Bindings;
  Variables?: Variables;
};
type Next = () => Promise<void>;
type ExtractInput<I$1 extends Input | Input["in"]> = I$1 extends Input ? unknown extends I$1["in"] ? {} : I$1["in"] : I$1;
type Input = {
  in?: {};
  out?: {};
  outputFormat?: ResponseFormat;
};
type BlankSchema = {};
type BlankInput = {};
interface RouterRoute {
  basePath: string;
  path: string;
  method: string;
  handler: H;
}
type HandlerResponse<O$1> = Response | TypedResponse<O$1> | Promise<Response | TypedResponse<O$1>>;
type Handler<E$1 extends Env = any, P$1 extends string = any, I$1 extends Input = BlankInput, R$1 extends HandlerResponse<any> = any> = (c: Context<E$1, P$1, I$1>, next: Next) => R$1;
type MiddlewareHandler<E$1 extends Env = any, P$1 extends string = string, I$1 extends Input = {}, R$1 extends HandlerResponse<any> = Response> = (c: Context<E$1, P$1, I$1>, next: Next) => Promise<R$1 | void>;
type H<E$1 extends Env = any, P$1 extends string = any, I$1 extends Input = BlankInput, R$1 extends HandlerResponse<any> = any> = Handler<E$1, P$1, I$1, R$1> | MiddlewareHandler<E$1, P$1, I$1, R$1>;
type NotFoundHandler<E$1 extends Env = any> = (c: Context<E$1>) => Response | Promise<Response>;
interface HTTPResponseError extends Error {
  getResponse: () => Response;
}
type ErrorHandler<E$1 extends Env = any> = (err: Error | HTTPResponseError, c: Context<E$1>) => Response | Promise<Response>;
interface HandlerInterface<E$1 extends Env = Env, M$1 extends string = string, S$1 extends Schema = BlankSchema, BasePath extends string = "/"> {
  <P$1 extends string = (ExtractStringKey<S$1> extends never ? BasePath : ExtractStringKey<S$1>), I$1 extends Input = BlankInput, R$1 extends HandlerResponse<any> = any, E2 extends Env = E$1>(handler: H<E2, P$1, I$1, R$1>): Hono$1<IntersectNonAnyTypes<[E$1, E2]>, S$1 & ToSchema<M$1, P$1, I$1, MergeTypedResponse<R$1>>, BasePath>;
  <P$1 extends string = (ExtractStringKey<S$1> extends never ? BasePath : ExtractStringKey<S$1>), I$1 extends Input = BlankInput, I2 extends Input = I$1, R$1 extends HandlerResponse<any> = any, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, M1 extends H<E2, P$1, any> = H<E2, P$1, any>>(...handlers: [H<E2, P$1, I$1> & M1, H<E3, P$1, I2, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3]>, S$1 & ToSchema<M$1, P$1, I2, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1>>, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, E2 extends Env = E$1>(path: P$1, handler: H<E2, MergedPath, I$1, R$1>): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I$1, MergeTypedResponse<R$1>>, BasePath>;
  <P$1 extends string = (ExtractStringKey<S$1> extends never ? BasePath : ExtractStringKey<S$1>), R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, M1 extends H<E2, P$1, any> = H<E2, P$1, any>, M2 extends H<E3, P$1, any> = H<E3, P$1, any>>(...handlers: [H<E2, P$1, I$1> & M1, H<E3, P$1, I2> & M2, H<E4, P$1, I3, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4]>, S$1 & ToSchema<M$1, P$1, I3, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2>>, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, M1 extends H<E2, MergedPath, any> = H<E2, MergedPath, any>>(path: P$1, ...handlers: [H<E2, MergedPath, I$1> & M1, H<E3, MergedPath, I2, R$1>]): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I2, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1>>, BasePath>;
  <P$1 extends string = (ExtractStringKey<S$1> extends never ? BasePath : ExtractStringKey<S$1>), R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, M1 extends H<E2, P$1, any> = H<E2, P$1, any>, M2 extends H<E3, P$1, any> = H<E3, P$1, any>, M3 extends H<E4, P$1, any> = H<E4, P$1, any>>(...handlers: [H<E2, P$1, I$1> & M1, H<E3, P$1, I2> & M2, H<E4, P$1, I3> & M3, H<E5, P$1, I4, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, S$1 & ToSchema<M$1, P$1, I4, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3>>, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, M1 extends H<E2, MergedPath, any> = H<E2, MergedPath, any>, M2 extends H<E3, MergedPath, any> = H<E3, MergedPath, any>>(path: P$1, ...handlers: [H<E2, MergedPath, I$1> & M1, H<E3, MergedPath, I2> & M2, H<E4, MergedPath, I3, R$1>]): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I3, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2>>, BasePath>;
  <P$1 extends string = (ExtractStringKey<S$1> extends never ? BasePath : ExtractStringKey<S$1>), R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, M1 extends H<E2, P$1, any> = H<E2, P$1, any>, M2 extends H<E3, P$1, any> = H<E3, P$1, any>, M3 extends H<E4, P$1, any> = H<E4, P$1, any>, M4 extends H<E5, P$1, any> = H<E5, P$1, any>>(...handlers: [H<E2, P$1, I$1> & M1, H<E3, P$1, I2> & M2, H<E4, P$1, I3> & M3, H<E5, P$1, I4> & M4, H<E6, P$1, I5, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, S$1 & ToSchema<M$1, P$1, I5, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4>>, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, M1 extends H<E2, MergedPath, any> = H<E2, MergedPath, any>, M2 extends H<E3, MergedPath, any> = H<E3, MergedPath, any>, M3 extends H<E4, MergedPath, any> = H<E4, MergedPath, any>>(path: P$1, ...handlers: [H<E2, MergedPath, I$1> & M1, H<E3, MergedPath, I2> & M2, H<E4, MergedPath, I3> & M3, H<E5, MergedPath, I4, R$1>]): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I4, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3>>, BasePath>;
  <P$1 extends string = (ExtractStringKey<S$1> extends never ? BasePath : ExtractStringKey<S$1>), R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, M1 extends H<E2, P$1, any> = H<E2, P$1, any>, M2 extends H<E3, P$1, any> = H<E3, P$1, any>, M3 extends H<E4, P$1, any> = H<E4, P$1, any>, M4 extends H<E5, P$1, any> = H<E5, P$1, any>, M5 extends H<E6, P$1, any> = H<E6, P$1, any>>(...handlers: [H<E2, P$1, I$1> & M1, H<E3, P$1, I2> & M2, H<E4, P$1, I3> & M3, H<E5, P$1, I4> & M4, H<E6, P$1, I5> & M5, H<E7, P$1, I6, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, S$1 & ToSchema<M$1, P$1, I6, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5>>, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, M1 extends H<E2, MergedPath, any> = H<E2, MergedPath, any>, M2 extends H<E3, MergedPath, any> = H<E3, MergedPath, any>, M3 extends H<E4, MergedPath, any> = H<E4, MergedPath, any>, M4 extends H<E5, MergedPath, any> = H<E5, MergedPath, any>>(path: P$1, ...handlers: [H<E2, MergedPath, I$1> & M1, H<E3, MergedPath, I2> & M2, H<E4, MergedPath, I3> & M3, H<E5, MergedPath, I4> & M4, H<E6, MergedPath, I5, R$1>]): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I5, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4>>, BasePath>;
  <P$1 extends string = (ExtractStringKey<S$1> extends never ? BasePath : ExtractStringKey<S$1>), R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, M1 extends H<E2, P$1, any> = H<E2, P$1, any>, M2 extends H<E3, P$1, any> = H<E3, P$1, any>, M3 extends H<E4, P$1, any> = H<E4, P$1, any>, M4 extends H<E5, P$1, any> = H<E5, P$1, any>, M5 extends H<E6, P$1, any> = H<E6, P$1, any>, M6 extends H<E7, P$1, any> = H<E7, P$1, any>>(...handlers: [H<E2, P$1, I$1> & M1, H<E3, P$1, I2> & M2, H<E4, P$1, I3> & M3, H<E5, P$1, I4> & M4, H<E6, P$1, I5> & M5, H<E7, P$1, I6> & M6, H<E8, P$1, I7, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, S$1 & ToSchema<M$1, P$1, I7, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6>>, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, M1 extends H<E2, MergedPath, any> = H<E2, MergedPath, any>, M2 extends H<E3, MergedPath, any> = H<E3, MergedPath, any>, M3 extends H<E4, MergedPath, any> = H<E4, MergedPath, any>, M4 extends H<E5, MergedPath, any> = H<E5, MergedPath, any>, M5 extends H<E6, MergedPath, any> = H<E6, MergedPath, any>>(path: P$1, ...handlers: [H<E2, MergedPath, I$1> & M1, H<E3, MergedPath, I2> & M2, H<E4, MergedPath, I3> & M3, H<E5, MergedPath, I4> & M4, H<E6, MergedPath, I5> & M5, H<E7, MergedPath, I6, R$1>]): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I6, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5>>, BasePath>;
  <P$1 extends string = (ExtractStringKey<S$1> extends never ? BasePath : ExtractStringKey<S$1>), R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, M1 extends H<E2, P$1, any> = H<E2, P$1, any>, M2 extends H<E3, P$1, any> = H<E3, P$1, any>, M3 extends H<E4, P$1, any> = H<E4, P$1, any>, M4 extends H<E5, P$1, any> = H<E5, P$1, any>, M5 extends H<E6, P$1, any> = H<E6, P$1, any>, M6 extends H<E7, P$1, any> = H<E7, P$1, any>, M7 extends H<E8, P$1, any> = H<E8, P$1, any>>(...handlers: [H<E2, P$1, I$1> & M1, H<E3, P$1, I2> & M2, H<E4, P$1, I3> & M3, H<E5, P$1, I4> & M4, H<E6, P$1, I5> & M5, H<E7, P$1, I6> & M6, H<E8, P$1, I7> & M7, H<E9, P$1, I8, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, S$1 & ToSchema<M$1, P$1, I8, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7>>, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, M1 extends H<E2, MergedPath, any> = H<E2, MergedPath, any>, M2 extends H<E3, MergedPath, any> = H<E3, MergedPath, any>, M3 extends H<E4, MergedPath, any> = H<E4, MergedPath, any>, M4 extends H<E5, MergedPath, any> = H<E5, MergedPath, any>, M5 extends H<E6, MergedPath, any> = H<E6, MergedPath, any>, M6 extends H<E7, MergedPath, any> = H<E7, MergedPath, any>>(path: P$1, ...handlers: [H<E2, MergedPath, I$1> & M1, H<E3, MergedPath, I2> & M2, H<E4, MergedPath, I3> & M3, H<E5, MergedPath, I4> & M4, H<E6, MergedPath, I5> & M5, H<E7, MergedPath, I6> & M6, H<E8, MergedPath, I7, R$1>]): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I7, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6>>, BasePath>;
  <P$1 extends string = (ExtractStringKey<S$1> extends never ? BasePath : ExtractStringKey<S$1>), R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, M1 extends H<E2, P$1, any> = H<E2, P$1, any>, M2 extends H<E3, P$1, any> = H<E3, P$1, any>, M3 extends H<E4, P$1, any> = H<E4, P$1, any>, M4 extends H<E5, P$1, any> = H<E5, P$1, any>, M5 extends H<E6, P$1, any> = H<E6, P$1, any>, M6 extends H<E7, P$1, any> = H<E7, P$1, any>, M7 extends H<E8, P$1, any> = H<E8, P$1, any>, M8 extends H<E9, P$1, any> = H<E9, P$1, any>>(...handlers: [H<E2, P$1, I$1> & M1, H<E3, P$1, I2> & M2, H<E4, P$1, I3> & M3, H<E5, P$1, I4> & M4, H<E6, P$1, I5> & M5, H<E7, P$1, I6> & M6, H<E8, P$1, I7> & M7, H<E9, P$1, I8> & M8, H<E10, P$1, I9, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, S$1 & ToSchema<M$1, P$1, I9, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7> | MergeMiddlewareResponse<M8>>, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, M1 extends H<E2, MergedPath, any> = H<E2, MergedPath, any>, M2 extends H<E3, MergedPath, any> = H<E3, MergedPath, any>, M3 extends H<E4, MergedPath, any> = H<E4, MergedPath, any>, M4 extends H<E5, MergedPath, any> = H<E5, MergedPath, any>, M5 extends H<E6, MergedPath, any> = H<E6, MergedPath, any>, M6 extends H<E7, MergedPath, any> = H<E7, MergedPath, any>, M7 extends H<E8, MergedPath, any> = H<E8, MergedPath, any>>(path: P$1, ...handlers: [H<E2, MergedPath, I$1> & M1, H<E3, MergedPath, I2> & M2, H<E4, MergedPath, I3> & M3, H<E5, MergedPath, I4> & M4, H<E6, MergedPath, I5> & M5, H<E7, MergedPath, I6> & M6, H<E8, MergedPath, I7> & M7, H<E9, MergedPath, I8, R$1>]): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I8, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7>>, BasePath>;
  <P$1 extends string = (ExtractStringKey<S$1> extends never ? BasePath : ExtractStringKey<S$1>), R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8, I10 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, E11 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, M1 extends H<E2, P$1, any> = H<E2, P$1, any>, M2 extends H<E3, P$1, any> = H<E3, P$1, any>, M3 extends H<E4, P$1, any> = H<E4, P$1, any>, M4 extends H<E5, P$1, any> = H<E5, P$1, any>, M5 extends H<E6, P$1, any> = H<E6, P$1, any>, M6 extends H<E7, P$1, any> = H<E7, P$1, any>, M7 extends H<E8, P$1, any> = H<E8, P$1, any>, M8 extends H<E9, P$1, any> = H<E9, P$1, any>, M9 extends H<E10, P$1, any> = H<E10, P$1, any>>(...handlers: [H<E2, P$1, I$1> & M1, H<E3, P$1, I2> & M2, H<E4, P$1, I3> & M3, H<E5, P$1, I4> & M4, H<E6, P$1, I5> & M5, H<E7, P$1, I6> & M6, H<E8, P$1, I7> & M7, H<E9, P$1, I8> & M8, H<E10, P$1, I9> & M9, H<E11, P$1, I10, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>, S$1 & ToSchema<M$1, P$1, I10, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7> | MergeMiddlewareResponse<M8> | MergeMiddlewareResponse<M9>>, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, M1 extends H<E2, MergedPath, any> = H<E2, MergedPath, any>, M2 extends H<E3, MergedPath, any> = H<E3, MergedPath, any>, M3 extends H<E4, MergedPath, any> = H<E4, MergedPath, any>, M4 extends H<E5, MergedPath, any> = H<E5, MergedPath, any>, M5 extends H<E6, MergedPath, any> = H<E6, MergedPath, any>, M6 extends H<E7, MergedPath, any> = H<E7, MergedPath, any>, M7 extends H<E8, MergedPath, any> = H<E8, MergedPath, any>, M8 extends H<E9, MergedPath, any> = H<E9, MergedPath, any>>(path: P$1, ...handlers: [H<E2, MergedPath, I$1> & M1, H<E3, MergedPath, I2> & M2, H<E4, MergedPath, I3> & M3, H<E5, MergedPath, I4> & M4, H<E6, MergedPath, I5> & M5, H<E7, MergedPath, I6> & M6, H<E8, MergedPath, I7> & M7, H<E9, MergedPath, I8> & M8, H<E10, MergedPath, I9, R$1>]): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I9, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7> | MergeMiddlewareResponse<M8>>, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8, I10 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, E11 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, M1 extends H<E2, MergedPath, any> = H<E2, MergedPath, any>, M2 extends H<E3, MergedPath, any> = H<E3, MergedPath, any>, M3 extends H<E4, MergedPath, any> = H<E4, MergedPath, any>, M4 extends H<E5, MergedPath, any> = H<E5, MergedPath, any>, M5 extends H<E6, MergedPath, any> = H<E6, MergedPath, any>, M6 extends H<E7, MergedPath, any> = H<E7, MergedPath, any>, M7 extends H<E8, MergedPath, any> = H<E8, MergedPath, any>, M8 extends H<E9, MergedPath, any> = H<E9, MergedPath, any>, M9 extends H<E10, MergedPath, any> = H<E10, MergedPath, any>>(path: P$1, ...handlers: [H<E2, MergedPath, I$1> & M1, H<E3, MergedPath, I2> & M2, H<E4, MergedPath, I3> & M3, H<E5, MergedPath, I4> & M4, H<E6, MergedPath, I5> & M5, H<E7, MergedPath, I6> & M6, H<E8, MergedPath, I7> & M7, H<E9, MergedPath, I8> & M8, H<E10, MergedPath, I9> & M9, H<E11, MergedPath, I10, R$1>]): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I10, MergeTypedResponse<R$1> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7> | MergeMiddlewareResponse<M8> | MergeMiddlewareResponse<M9>>, BasePath>;
  <P$1 extends string = (ExtractStringKey<S$1> extends never ? BasePath : ExtractStringKey<S$1>), I$1 extends Input = BlankInput, R$1 extends HandlerResponse<any> = any>(...handlers: H<E$1, P$1, I$1, R$1>[]): Hono$1<E$1, S$1 & ToSchema<M$1, P$1, I$1, MergeTypedResponse<R$1>>, BasePath>;
  <P$1 extends string, I$1 extends Input = BlankInput, R$1 extends HandlerResponse<any> = any>(path: P$1, ...handlers: H<E$1, MergePath<BasePath, P$1>, I$1, R$1>[]): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I$1, MergeTypedResponse<R$1>>, BasePath>;
  <P$1 extends string, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput>(path: P$1): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I$1, MergeTypedResponse<R$1>>, BasePath>;
}
interface MiddlewareHandlerInterface<E$1 extends Env = Env, S$1 extends Schema = BlankSchema, BasePath extends string = "/"> {
  <E2 extends Env = E$1>(...handlers: MiddlewareHandler<E2, MergePath<BasePath, ExtractStringKey<S$1>>>[]): Hono$1<IntersectNonAnyTypes<[E$1, E2]>, S$1, BasePath>;
  <E2 extends Env = E$1>(handler: MiddlewareHandler<E2, MergePath<BasePath, ExtractStringKey<S$1>>>): Hono$1<IntersectNonAnyTypes<[E$1, E2]>, S$1, BasePath>;
  <E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, P$1 extends string = MergePath<BasePath, ExtractStringKey<S$1>>>(...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3]>, S$1, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, E2 extends Env = E$1>(path: P$1, handler: MiddlewareHandler<E2, MergedPath, any, any>): Hono$1<IntersectNonAnyTypes<[E$1, E2]>, ChangePathOfSchema<S$1, MergedPath>, BasePath>;
  <E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, P$1 extends string = MergePath<BasePath, ExtractStringKey<S$1>>>(...handlers: [MiddlewareHandler<E2, P$1, any, any>, MiddlewareHandler<E3, P$1, any, any>, MiddlewareHandler<E4, P$1, any, any>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4]>, S$1, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>>(path: P$1, ...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3]>, ChangePathOfSchema<S$1, MergedPath>, BasePath>;
  <E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, P$1 extends string = MergePath<BasePath, ExtractStringKey<S$1>>>(...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, S$1, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>>(path: P$1, ...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4]>, ChangePathOfSchema<S$1, MergedPath>, BasePath>;
  <E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, P$1 extends string = MergePath<BasePath, ExtractStringKey<S$1>>>(...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>, MiddlewareHandler<E6, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, S$1, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>>(path: P$1, ...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, ChangePathOfSchema<S$1, MergedPath>, BasePath>;
  <E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, P$1 extends string = MergePath<BasePath, ExtractStringKey<S$1>>>(...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>, MiddlewareHandler<E6, P$1>, MiddlewareHandler<E7, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, S$1, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>>(path: P$1, ...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>, MiddlewareHandler<E6, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, ChangePathOfSchema<S$1, MergedPath>, BasePath>;
  <E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, P$1 extends string = MergePath<BasePath, ExtractStringKey<S$1>>>(...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>, MiddlewareHandler<E6, P$1>, MiddlewareHandler<E7, P$1>, MiddlewareHandler<E8, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, S$1, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>>(path: P$1, ...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>, MiddlewareHandler<E6, P$1>, MiddlewareHandler<E7, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, ChangePathOfSchema<S$1, MergedPath>, BasePath>;
  <E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, P$1 extends string = MergePath<BasePath, ExtractStringKey<S$1>>>(...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>, MiddlewareHandler<E6, P$1>, MiddlewareHandler<E7, P$1>, MiddlewareHandler<E8, P$1>, MiddlewareHandler<E9, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, S$1, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>>(path: P$1, ...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>, MiddlewareHandler<E6, P$1>, MiddlewareHandler<E7, P$1>, MiddlewareHandler<E8, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, ChangePathOfSchema<S$1, MergedPath>, BasePath>;
  <E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, P$1 extends string = MergePath<BasePath, ExtractStringKey<S$1>>>(...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>, MiddlewareHandler<E6, P$1>, MiddlewareHandler<E7, P$1>, MiddlewareHandler<E8, P$1>, MiddlewareHandler<E9, P$1>, MiddlewareHandler<E10, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, S$1, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>>(path: P$1, ...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>, MiddlewareHandler<E6, P$1>, MiddlewareHandler<E7, P$1>, MiddlewareHandler<E8, P$1>, MiddlewareHandler<E9, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, ChangePathOfSchema<S$1, MergedPath>, BasePath>;
  <E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, E11 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, P$1 extends string = MergePath<BasePath, ExtractStringKey<S$1>>>(...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>, MiddlewareHandler<E6, P$1>, MiddlewareHandler<E7, P$1>, MiddlewareHandler<E8, P$1>, MiddlewareHandler<E9, P$1>, MiddlewareHandler<E10, P$1>, MiddlewareHandler<E11, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>, S$1, BasePath>;
  <P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>>(path: P$1, ...handlers: [MiddlewareHandler<E2, P$1>, MiddlewareHandler<E3, P$1>, MiddlewareHandler<E4, P$1>, MiddlewareHandler<E5, P$1>, MiddlewareHandler<E6, P$1>, MiddlewareHandler<E7, P$1>, MiddlewareHandler<E8, P$1>, MiddlewareHandler<E9, P$1>, MiddlewareHandler<E10, P$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, ChangePathOfSchema<S$1, MergedPath>, BasePath>;
  <P$1 extends string, E2 extends Env = E$1>(path: P$1, ...handlers: MiddlewareHandler<E2, MergePath<BasePath, P$1>>[]): Hono$1<E$1, S$1, BasePath>;
}
interface OnHandlerInterface<E$1 extends Env = Env, S$1 extends Schema = BlankSchema, BasePath extends string = "/"> {
  <M$1 extends string, P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, E2 extends Env = E$1>(method: M$1, path: P$1, handler: H<E2, MergedPath, I$1, R$1>): Hono$1<IntersectNonAnyTypes<[E$1, E2]>, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I$1, MergeTypedResponse<R$1>>, BasePath>;
  <M$1 extends string, P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>>(method: M$1, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3]>, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I2, MergeTypedResponse<R$1>>, BasePath>;
  <M$1 extends string, P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>>(method: M$1, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4]>, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I3, MergeTypedResponse<R$1>>, BasePath>;
  <M$1 extends string, P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>>(method: M$1, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I4, MergeTypedResponse<R$1>>, BasePath>;
  <M$1 extends string, P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>>(method: M$1, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I5, MergeTypedResponse<R$1>>, BasePath>;
  <M$1 extends string, P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>>(method: M$1, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5>, H<E7, MergedPath, I6, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I6, MergeTypedResponse<R$1>>, BasePath>;
  <M$1 extends string, P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>>(method: M$1, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5>, H<E7, MergedPath, I6>, H<E8, MergedPath, I7, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I7, MergeTypedResponse<R$1>>, BasePath>;
  <M$1 extends string, P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>>(method: M$1, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5>, H<E7, MergedPath, I6>, H<E8, MergedPath, I7>, H<E9, MergedPath, I8, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I8, MergeTypedResponse<R$1>>, BasePath>;
  <M$1 extends string, P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>>(method: M$1, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5>, H<E7, MergedPath, I6>, H<E8, MergedPath, I7>, H<E9, MergedPath, I8>, H<E10, MergedPath, I9, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I9, MergeTypedResponse<R$1>>, BasePath>;
  <M$1 extends string, P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8, I10 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, E11 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10]>>(method: M$1, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5>, H<E7, MergedPath, I6>, H<E8, MergedPath, I7>, H<E9, MergedPath, I8>, H<E10, MergedPath, I9>, H<E11, MergedPath, I10, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I10, MergeTypedResponse<HandlerResponse<any>>>, BasePath>;
  <M$1 extends string, P$1 extends string, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput>(method: M$1, path: P$1, ...handlers: H<E$1, MergePath<BasePath, P$1>, I$1, R$1>[]): Hono$1<E$1, S$1 & ToSchema<M$1, MergePath<BasePath, P$1>, I$1, MergeTypedResponse<R$1>>, BasePath>;
  <Ms extends string[], P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, E2 extends Env = E$1>(methods: Ms, path: P$1, handler: H<E2, MergedPath, I$1, R$1>): Hono$1<IntersectNonAnyTypes<[E$1, E2]>, S$1 & ToSchema<Ms[number], MergePath<BasePath, P$1>, I$1, MergeTypedResponse<R$1>>, BasePath>;
  <Ms extends string[], P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>>(methods: Ms, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3]>, S$1 & ToSchema<Ms[number], MergePath<BasePath, P$1>, I2, MergeTypedResponse<R$1>>, BasePath>;
  <Ms extends string[], P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>>(methods: Ms, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4]>, S$1 & ToSchema<Ms[number], MergePath<BasePath, P$1>, I3, MergeTypedResponse<R$1>>, BasePath>;
  <Ms extends string[], P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>>(methods: Ms, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, S$1 & ToSchema<Ms[number], MergePath<BasePath, P$1>, I4, MergeTypedResponse<R$1>>, BasePath>;
  <Ms extends string[], P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>>(methods: Ms, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, S$1 & ToSchema<Ms[number], MergePath<BasePath, P$1>, I5, MergeTypedResponse<R$1>>, BasePath>;
  <Ms extends string[], P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>>(methods: Ms, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5>, H<E7, MergedPath, I6, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, S$1 & ToSchema<Ms[number], MergePath<BasePath, P$1>, I6, MergeTypedResponse<R$1>>, BasePath>;
  <Ms extends string[], P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>>(methods: Ms, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5>, H<E7, MergedPath, I6>, H<E8, MergedPath, I7, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, S$1 & ToSchema<Ms[number], MergePath<BasePath, P$1>, I7, MergeTypedResponse<R$1>>, BasePath>;
  <Ms extends string[], P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>>(methods: Ms, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5>, H<E7, MergedPath, I6>, H<E8, MergedPath, I7>, H<E9, MergedPath, I8, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, S$1 & ToSchema<Ms[number], MergePath<BasePath, P$1>, I8, MergeTypedResponse<R$1>>, BasePath>;
  <Ms extends string[], P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>>(methods: Ms, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5>, H<E7, MergedPath, I6>, H<E8, MergedPath, I7>, H<E9, MergedPath, I8>, H<E10, MergedPath, I9, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, S$1 & ToSchema<Ms[number], MergePath<BasePath, P$1>, I9, MergeTypedResponse<HandlerResponse<any>>>, BasePath>;
  <Ms extends string[], P$1 extends string, MergedPath extends MergePath<BasePath, P$1>, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput, I2 extends Input = I$1, I3 extends Input = I$1 & I2, I4 extends Input = I$1 & I2 & I3, I5 extends Input = I$1 & I2 & I3 & I4, I6 extends Input = I$1 & I2 & I3 & I4 & I5, I7 extends Input = I$1 & I2 & I3 & I4 & I5 & I6, I8 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8, I10 extends Input = I$1 & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9, E2 extends Env = E$1, E3 extends Env = IntersectNonAnyTypes<[E$1, E2]>, E4 extends Env = IntersectNonAnyTypes<[E$1, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9]>, E11 extends Env = IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10]>>(methods: Ms, path: P$1, ...handlers: [H<E2, MergedPath, I$1>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3>, H<E5, MergedPath, I4>, H<E6, MergedPath, I5>, H<E7, MergedPath, I6>, H<E8, MergedPath, I7>, H<E9, MergedPath, I8>, H<E10, MergedPath, I9>, H<E11, MergedPath, I10, R$1>]): Hono$1<IntersectNonAnyTypes<[E$1, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>, S$1 & ToSchema<Ms[number], MergePath<BasePath, P$1>, I10, MergeTypedResponse<HandlerResponse<any>>>, BasePath>;
  <P$1 extends string, R$1 extends HandlerResponse<any> = any, I$1 extends Input = BlankInput>(methods: string[], path: P$1, ...handlers: H<E$1, MergePath<BasePath, P$1>, I$1, R$1>[]): Hono$1<E$1, S$1 & ToSchema<string, MergePath<BasePath, P$1>, I$1, MergeTypedResponse<R$1>>, BasePath>;
  <I$1 extends Input = BlankInput, R$1 extends HandlerResponse<any> = any, E2 extends Env = E$1>(methods: string | string[], paths: string[], ...handlers: H<E2, any, I$1, R$1>[]): Hono$1<E$1, S$1 & ToSchema<string, string, I$1, MergeTypedResponse<R$1>>, BasePath>;
}
type ExtractStringKey<S$1> = keyof S$1 & string;
type ToSchema<M$1 extends string, P$1 extends string, I$1 extends Input | Input["in"], RorO> = Simplify<{ [K in P$1]: { [K2 in M$1 as AddDollar<K2>]: Simplify<{
  input: AddParam<ExtractInput<I$1>, P$1>;
} & (IsAny$1<RorO> extends true ? {
  output: {};
  outputFormat: ResponseFormat;
  status: StatusCode;
} : RorO extends TypedResponse<infer T, infer U, infer F> ? {
  output: unknown extends T ? {} : T;
  outputFormat: I$1 extends {
    outputFormat: string;
  } ? I$1["outputFormat"] : F;
  status: U;
} : {
  output: unknown extends RorO ? {} : RorO;
  outputFormat: unknown extends RorO ? "json" : I$1 extends {
    outputFormat: string;
  } ? I$1["outputFormat"] : "json";
  status: StatusCode;
})> } }>;
type Schema = {
  [Path: string]: {
    [Method: `$${Lowercase<string>}`]: Endpoint;
  };
};
type ChangePathOfSchema<S$1 extends Schema, Path$1 extends string> = keyof S$1 extends never ? { [K in Path$1]: {} } : { [K in keyof S$1 as Path$1]: S$1[K] };
type Endpoint = {
  input: any;
  output: any;
  outputFormat: ResponseFormat;
  status: StatusCode;
};
type ExtractParams<Path$1 extends string> = string extends Path$1 ? Record<string, string> : Path$1 extends `${infer _Start}:${infer Param}/${infer Rest}` ? { [K in Param | keyof ExtractParams<`/${Rest}`>]: string } : Path$1 extends `${infer _Start}:${infer Param}` ? { [K in Param]: string } : never;
type FlattenIfIntersect<T$1> = T$1 extends infer O ? { [K in keyof O]: O[K] } : never;
type MergeSchemaPath<OrigSchema extends Schema, SubPath extends string> = { [P in keyof OrigSchema as MergePath<SubPath, P & string>]: [OrigSchema[P]] extends [Record<string, Endpoint>] ? { [M in keyof OrigSchema[P]]: MergeEndpointParamsWithPath<OrigSchema[P][M], SubPath> } : never };
type MergeEndpointParamsWithPath<T$1 extends Endpoint, SubPath extends string> = T$1 extends unknown ? {
  input: T$1["input"] extends {
    param: infer _;
  } ? ExtractParams<SubPath> extends never ? T$1["input"] : FlattenIfIntersect<T$1["input"] & {
    param: { [K in keyof ExtractParams<SubPath> as K extends `${infer Prefix}{${infer _}}` ? Prefix : K]: string };
  }> : RemoveBlankRecord<ExtractParams<SubPath>> extends never ? T$1["input"] : T$1["input"] & {
    param: { [K in keyof ExtractParams<SubPath> as K extends `${infer Prefix}{${infer _}}` ? Prefix : K]: string };
  };
  output: T$1["output"];
  outputFormat: T$1["outputFormat"];
  status: T$1["status"];
} : never;
type AddParam<I$1, P$1 extends string> = ParamKeys<P$1> extends never ? I$1 : I$1 extends {
  param: infer _;
} ? I$1 : I$1 & {
  param: UnionToIntersection<ParamKeyToRecord<ParamKeys<P$1>>>;
};
type AddDollar<T$1 extends string> = `$${Lowercase<T$1>}`;
type MergePath<A$1 extends string, B extends string> = B extends "" ? MergePath<A$1, "/"> : A$1 extends "" ? B : A$1 extends "/" ? B : A$1 extends `${infer P}/` ? B extends `/${infer Q}` ? `${P}/${Q}` : `${P}/${B}` : B extends `/${infer Q}` ? Q extends "" ? A$1 : `${A$1}/${Q}` : `${A$1}/${B}`;
type KnownResponseFormat = "json" | "text" | "redirect";
type ResponseFormat = KnownResponseFormat | string;
type TypedResponse<T$1 = unknown, U$1 extends StatusCode = StatusCode, F$1 extends ResponseFormat = (T$1 extends string ? "text" : T$1 extends JSONValue ? "json" : ResponseFormat)> = {
  _data: T$1;
  _status: U$1;
  _format: F$1;
};
type MergeTypedResponse<T$1> = T$1 extends Promise<infer T2> ? T2 extends TypedResponse ? T2 : TypedResponse : T$1 extends TypedResponse ? T$1 : TypedResponse;
type MergeTypedResponseStrict<T$1> = T$1 extends Promise<infer T2> ? T2 extends TypedResponse ? T2 : never : T$1 extends TypedResponse ? T$1 : never;
type MergeMiddlewareResponse<T$1> = MergeTypedResponseStrict<ExtractHandlerResponse<T$1>>;
type FormValue = string | Blob;
type ParsedFormValue = string | File;
type ValidationTargets<T$1 extends FormValue = ParsedFormValue, P$1 extends string = string> = {
  json: any;
  form: Record<string, T$1 | T$1[]>;
  query: Record<string, string | string[]>;
  param: Record<P$1, P$1 extends `${infer _}?` ? string | undefined : string>;
  header: Record<RequestHeader | CustomHeader, string>;
  cookie: Record<string, string>;
};
type ParamKey<Component$1> = Component$1 extends `:${infer NameWithPattern}` ? NameWithPattern extends `${infer Name}{${infer Rest}` ? Rest extends `${infer _Pattern}?` ? `${Name}?` : Name : NameWithPattern : never;
type ParamKeys<Path$1> = Path$1 extends `${infer Component}/${infer Rest}` ? ParamKey<Component> | ParamKeys<Rest> : ParamKey<Path$1>;
type ParamKeyToRecord<T$1 extends string> = T$1 extends `${infer R}?` ? Record<R, string | undefined> : { [K in T$1]: string };
type InputToDataByTarget<T$1 extends Input["out"], Target extends keyof ValidationTargets> = T$1 extends { [K in Target]: infer R } ? R : never;
type RemoveQuestion<T$1> = T$1 extends `${infer R}?` ? R : T$1;
type ExtractHandlerResponse<T$1> = T$1 extends ((c: any, next: any) => Promise<infer R>) ? Exclude<R, void> extends never ? never : Exclude<R, void> extends Response | TypedResponse<any, any, any> ? Exclude<R, void> : never : T$1 extends ((c: any, next: any) => infer R) ? R extends Response | TypedResponse<any, any, any> ? R : never : never;
type ProcessHead<T$1> = IfAnyThenEmptyObject<T$1 extends Env ? (Env extends T$1 ? {} : T$1) : T$1>;
type IntersectNonAnyTypes<T$1 extends any[]> = T$1 extends [infer Head, ...infer Rest] ? ProcessHead<Head> & IntersectNonAnyTypes<Rest> : {};
declare abstract class FetchEventLike {
  abstract readonly request: Request;
  abstract respondWith(promise: Response | Promise<Response>): void;
  abstract passThroughOnException(): void;
  abstract waitUntil(promise: Promise<void>): void;
}
//#endregion
//#region node_modules/hono/dist/types/utils/body.d.ts
type BodyDataValueDot = {
  [x: string]: string | File | BodyDataValueDot;
};
type BodyDataValueDotAll = {
  [x: string]: string | File | (string | File)[] | BodyDataValueDotAll;
};
type SimplifyBodyData<T$1> = { [K in keyof T$1]: string | File | (string | File)[] | BodyDataValueDotAll extends T$1[K] ? string | File | (string | File)[] | BodyDataValueDotAll : string | File | BodyDataValueDot extends T$1[K] ? string | File | BodyDataValueDot : string | File | (string | File)[] extends T$1[K] ? string | File | (string | File)[] : string | File } & {};
type BodyDataValueComponent<T$1> = string | File | (T$1 extends {
  all: false;
} ? never : T$1 extends {
  all: true;
} | {
  all: boolean;
} ? (string | File)[] : never);
type BodyDataValueObject<T$1> = {
  [key: string]: BodyDataValueComponent<T$1> | BodyDataValueObject<T$1>;
};
type BodyDataValue<T$1> = BodyDataValueComponent<T$1> | (T$1 extends {
  dot: false;
} ? never : T$1 extends {
  dot: true;
} | {
  dot: boolean;
} ? BodyDataValueObject<T$1> : never);
type BodyData<T$1 extends Partial<ParseBodyOptions> = {}> = SimplifyBodyData<Record<string, BodyDataValue<T$1>>>;
type ParseBodyOptions = {
  /**
   * Determines whether all fields with multiple values should be parsed as arrays.
   * @default false
   * @example
   * const data = new FormData()
   * data.append('file', 'aaa')
   * data.append('file', 'bbb')
   * data.append('message', 'hello')
   *
   * If all is false:
   * parseBody should return { file: 'bbb', message: 'hello' }
   *
   * If all is true:
   * parseBody should return { file: ['aaa', 'bbb'], message: 'hello' }
   */
  all: boolean;
  /**
   * Determines whether all fields with dot notation should be parsed as nested objects.
   * @default false
   * @example
   * const data = new FormData()
   * data.append('obj.key1', 'value1')
   * data.append('obj.key2', 'value2')
   *
   * If dot is false:
   * parseBody should return { 'obj.key1': 'value1', 'obj.key2': 'value2' }
   *
   * If dot is true:
   * parseBody should return { obj: { key1: 'value1', key2: 'value2' } }
   */
  dot: boolean;
};
//#endregion
//#region node_modules/hono/dist/types/request.d.ts
type Body = {
  json: any;
  text: string;
  arrayBuffer: ArrayBuffer;
  blob: Blob;
  formData: FormData;
};
type BodyCache = Partial<Body & {
  parsedBody: BodyData;
}>;
declare class HonoRequest$1<P$1 extends string = "/", I$1 extends Input["out"] = {}> {
  [GET_MATCH_RESULT]: Result$1<[unknown, RouterRoute]>;
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw: Request;
  routeIndex: number;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path: string;
  bodyCache: BodyCache;
  constructor(request: Request, path?: string, matchResult?: Result$1<[unknown, RouterRoute]>);
  /**
   * `.req.param()` gets the path parameters.
   *
   * @see {@link https://hono.dev/docs/api/routing#path-parameter}
   *
   * @example
   * ```ts
   * const name = c.req.param('name')
   * // or all parameters at once
   * const { id, comment_id } = c.req.param()
   * ```
   */
  param<P2 extends ParamKeys<P$1> = ParamKeys<P$1>>(key: P2 extends `${infer _}?` ? never : P2): string;
  param<P2 extends RemoveQuestion<ParamKeys<P$1>> = RemoveQuestion<ParamKeys<P$1>>>(key: P2): string | undefined;
  param(key: string): string | undefined;
  param<P2 extends string = P$1>(): Simplify<UnionToIntersection<ParamKeyToRecord<ParamKeys<P2>>>>;
  /**
   * `.query()` can get querystring parameters.
   *
   * @see {@link https://hono.dev/docs/api/request#query}
   *
   * @example
   * ```ts
   * // Query params
   * app.get('/search', (c) => {
   *   const query = c.req.query('q')
   * })
   *
   * // Get all params at once
   * app.get('/search', (c) => {
   *   const { q, limit, offset } = c.req.query()
   * })
   * ```
   */
  query(key: string): string | undefined;
  query(): Record<string, string>;
  /**
   * `.queries()` can get multiple querystring parameter values, e.g. /search?tags=A&tags=B
   *
   * @see {@link https://hono.dev/docs/api/request#queries}
   *
   * @example
   * ```ts
   * app.get('/search', (c) => {
   *   // tags will be string[]
   *   const tags = c.req.queries('tags')
   * })
   * ```
   */
  queries(key: string): string[] | undefined;
  queries(): Record<string, string[]>;
  /**
   * `.header()` can get the request header value.
   *
   * @see {@link https://hono.dev/docs/api/request#header}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const userAgent = c.req.header('User-Agent')
   * })
   * ```
   */
  header(name: RequestHeader): string | undefined;
  header(name: string): string | undefined;
  header(): Record<RequestHeader | (string & CustomHeader), string>;
  /**
   * `.parseBody()` can parse Request body of type `multipart/form-data` or `application/x-www-form-urlencoded`
   *
   * @see {@link https://hono.dev/docs/api/request#parsebody}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.parseBody()
   * })
   * ```
   */
  parseBody<Options extends Partial<ParseBodyOptions>, T$1 extends BodyData<Options>>(options?: Options): Promise<T$1>;
  parseBody<T$1 extends BodyData>(options?: Partial<ParseBodyOptions>): Promise<T$1>;
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json<T$1 = any>(): Promise<T$1>;
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text(): Promise<string>;
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer(): Promise<ArrayBuffer>;
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob(): Promise<Blob>;
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData(): Promise<FormData>;
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target: keyof ValidationTargets, data: {}): void;
  /**
   * Gets validated data from the request.
   *
   * @param target - The target of the validation.
   * @returns The validated data.
   *
   * @see https://hono.dev/docs/api/request#valid
   */
  valid<T$1 extends keyof I$1 & keyof ValidationTargets>(target: T$1): InputToDataByTarget<I$1, T$1>;
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url(): string;
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method(): string;
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes(): RouterRoute[];
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath(): string;
}
//#endregion
//#region node_modules/hono/dist/types/utils/mime.d.ts
/**
 * Union types for BaseMime
 */
type BaseMime = (typeof _baseMimes)[keyof typeof _baseMimes];
declare const _baseMimes: {
  readonly aac: "audio/aac";
  readonly avi: "video/x-msvideo";
  readonly avif: "image/avif";
  readonly av1: "video/av1";
  readonly bin: "application/octet-stream";
  readonly bmp: "image/bmp";
  readonly css: "text/css";
  readonly csv: "text/csv";
  readonly eot: "application/vnd.ms-fontobject";
  readonly epub: "application/epub+zip";
  readonly gif: "image/gif";
  readonly gz: "application/gzip";
  readonly htm: "text/html";
  readonly html: "text/html";
  readonly ico: "image/x-icon";
  readonly ics: "text/calendar";
  readonly jpeg: "image/jpeg";
  readonly jpg: "image/jpeg";
  readonly js: "text/javascript";
  readonly json: "application/json";
  readonly jsonld: "application/ld+json";
  readonly map: "application/json";
  readonly mid: "audio/x-midi";
  readonly midi: "audio/x-midi";
  readonly mjs: "text/javascript";
  readonly mp3: "audio/mpeg";
  readonly mp4: "video/mp4";
  readonly mpeg: "video/mpeg";
  readonly oga: "audio/ogg";
  readonly ogv: "video/ogg";
  readonly ogx: "application/ogg";
  readonly opus: "audio/opus";
  readonly otf: "font/otf";
  readonly pdf: "application/pdf";
  readonly png: "image/png";
  readonly rtf: "application/rtf";
  readonly svg: "image/svg+xml";
  readonly tif: "image/tiff";
  readonly tiff: "image/tiff";
  readonly ts: "video/mp2t";
  readonly ttf: "font/ttf";
  readonly txt: "text/plain";
  readonly wasm: "application/wasm";
  readonly webm: "video/webm";
  readonly weba: "audio/webm";
  readonly webmanifest: "application/manifest+json";
  readonly webp: "image/webp";
  readonly woff: "font/woff";
  readonly woff2: "font/woff2";
  readonly xhtml: "application/xhtml+xml";
  readonly xml: "application/xml";
  readonly zip: "application/zip";
  readonly "3gp": "video/3gpp";
  readonly "3g2": "video/3gpp2";
  readonly gltf: "model/gltf+json";
  readonly glb: "model/gltf-binary";
};
//#endregion
//#region node_modules/hono/dist/types/context.d.ts
type HeaderRecord = Record<"Content-Type", BaseMime> | Record<ResponseHeader, string | string[]> | Record<string, string | string[]>;
/**
 * Data type can be a string, ArrayBuffer, Uint8Array (buffer), or ReadableStream.
 */
type Data = string | ArrayBuffer | ReadableStream | Uint8Array<ArrayBuffer>;
/**
 * Interface for the execution context in a web worker or similar environment.
 */
interface ExecutionContext {
  /**
   * Extends the lifetime of the event callback until the promise is settled.
   *
   * @param promise - A promise to wait for.
   */
  waitUntil(promise: Promise<unknown>): void;
  /**
   * Allows the event to be passed through to subsequent event listeners.
   */
  passThroughOnException(): void;
  /**
   * For compatibility with Wrangler 4.x.
   */
  props: any;
}
/**
 * Interface for context variable mapping.
 */
interface ContextVariableMap {}
/**
 * Interface for context renderer.
 */
interface ContextRenderer {}
/**
 * Interface representing a renderer for content.
 *
 * @interface DefaultRenderer
 * @param {string | Promise<string>} content - The content to be rendered, which can be either a string or a Promise resolving to a string.
 * @returns {Response | Promise<Response>} - The response after rendering the content, which can be either a Response or a Promise resolving to a Response.
 */
interface DefaultRenderer {
  (content: string | Promise<string>): Response | Promise<Response>;
}
/**
 * Renderer type which can either be a ContextRenderer or DefaultRenderer.
 */
type Renderer = ContextRenderer extends Function ? ContextRenderer : DefaultRenderer;
/**
 * Extracts the props for the renderer.
 */
type PropsForRenderer = [...Required<Parameters<Renderer>>] extends [unknown, infer Props] ? Props : unknown;
type Layout<T$1 = Record<string, any>> = (props: T$1) => any;
/**
 * Interface for getting context variables.
 *
 * @template E - Environment type.
 */
interface Get<E$1 extends Env> {
  <Key$1 extends keyof E$1["Variables"]>(key: Key$1): E$1["Variables"][Key$1];
  <Key$1 extends keyof ContextVariableMap>(key: Key$1): ContextVariableMap[Key$1];
}
/**
 * Interface for setting context variables.
 *
 * @template E - Environment type.
 */
interface Set$1<E$1 extends Env> {
  <Key$1 extends keyof E$1["Variables"]>(key: Key$1, value: E$1["Variables"][Key$1]): void;
  <Key$1 extends keyof ContextVariableMap>(key: Key$1, value: ContextVariableMap[Key$1]): void;
}
/**
 * Interface for creating a new response.
 */
interface NewResponse {
  (data: Data | null, status?: StatusCode, headers?: HeaderRecord): Response;
  (data: Data | null, init?: ResponseOrInit): Response;
}
/**
 * Interface for responding with a body.
 */
interface BodyRespond {
  <T$1 extends Data, U$1 extends ContentfulStatusCode>(data: T$1, status?: U$1, headers?: HeaderRecord): Response & TypedResponse<T$1, U$1, "body">;
  <T$1 extends Data, U$1 extends ContentfulStatusCode>(data: T$1, init?: ResponseOrInit<U$1>): Response & TypedResponse<T$1, U$1, "body">;
  <T$1 extends null, U$1 extends StatusCode>(data: T$1, status?: U$1, headers?: HeaderRecord): Response & TypedResponse<null, U$1, "body">;
  <T$1 extends null, U$1 extends StatusCode>(data: T$1, init?: ResponseOrInit<U$1>): Response & TypedResponse<null, U$1, "body">;
}
/**
 * Interface for responding with text.
 *
 * @interface TextRespond
 * @template T - The type of the text content.
 * @template U - The type of the status code.
 *
 * @param {T} text - The text content to be included in the response.
 * @param {U} [status] - An optional status code for the response.
 * @param {HeaderRecord} [headers] - An optional record of headers to include in the response.
 *
 * @returns {Response & TypedResponse<T, U, 'text'>} - The response after rendering the text content, typed with the provided text and status code types.
 */
interface TextRespond {
  <T$1 extends string, U$1 extends ContentfulStatusCode = ContentfulStatusCode>(text: T$1, status?: U$1, headers?: HeaderRecord): Response & TypedResponse<T$1, U$1, "text">;
  <T$1 extends string, U$1 extends ContentfulStatusCode = ContentfulStatusCode>(text: T$1, init?: ResponseOrInit<U$1>): Response & TypedResponse<T$1, U$1, "text">;
}
/**
 * Interface for responding with JSON.
 *
 * @interface JSONRespond
 * @template T - The type of the JSON value or simplified unknown type.
 * @template U - The type of the status code.
 *
 * @param {T} object - The JSON object to be included in the response.
 * @param {U} [status] - An optional status code for the response.
 * @param {HeaderRecord} [headers] - An optional record of headers to include in the response.
 *
 * @returns {JSONRespondReturn<T, U>} - The response after rendering the JSON object, typed with the provided object and status code types.
 */
interface JSONRespond {
  <T$1 extends JSONValue | {} | InvalidJSONValue, U$1 extends ContentfulStatusCode = ContentfulStatusCode>(object: T$1, status?: U$1, headers?: HeaderRecord): JSONRespondReturn<T$1, U$1>;
  <T$1 extends JSONValue | {} | InvalidJSONValue, U$1 extends ContentfulStatusCode = ContentfulStatusCode>(object: T$1, init?: ResponseOrInit<U$1>): JSONRespondReturn<T$1, U$1>;
}
/**
 * @template T - The type of the JSON value or simplified unknown type.
 * @template U - The type of the status code.
 *
 * @returns {Response & TypedResponse<JSONParsed<T>, U, 'json'>} - The response after rendering the JSON object, typed with the provided object and status code types.
 */
type JSONRespondReturn<T$1 extends JSONValue | {} | InvalidJSONValue, U$1 extends ContentfulStatusCode> = Response & TypedResponse<JSONParsed<T$1>, U$1, "json">;
/**
 * Interface representing a function that responds with HTML content.
 *
 * @param html - The HTML content to respond with, which can be a string or a Promise that resolves to a string.
 * @param status - (Optional) The HTTP status code for the response.
 * @param headers - (Optional) A record of headers to include in the response.
 * @param init - (Optional) The response initialization object.
 *
 * @returns A Response object or a Promise that resolves to a Response object.
 */
interface HTMLRespond {
  <T$1 extends string | Promise<string>>(html: T$1, status?: ContentfulStatusCode, headers?: HeaderRecord): T$1 extends string ? Response : Promise<Response>;
  <T$1 extends string | Promise<string>>(html: T$1, init?: ResponseOrInit<ContentfulStatusCode>): T$1 extends string ? Response : Promise<Response>;
}
/**
 * Options for configuring the context.
 *
 * @template E - Environment type.
 */
type ContextOptions<E$1 extends Env> = {
  /**
   * Bindings for the environment.
   */
  env: E$1["Bindings"];
  /**
   * Execution context for the request.
   */
  executionCtx?: FetchEventLike | ExecutionContext | undefined;
  /**
   * Handler for not found responses.
   */
  notFoundHandler?: NotFoundHandler<E$1>;
  matchResult?: Result$1<[H, RouterRoute]>;
  path?: string;
};
interface SetHeadersOptions {
  append?: boolean;
}
interface SetHeaders {
  (name: "Content-Type", value?: BaseMime, options?: SetHeadersOptions): void;
  (name: ResponseHeader, value?: string, options?: SetHeadersOptions): void;
  (name: string, value?: string, options?: SetHeadersOptions): void;
}
type ResponseHeadersInit = [string, string][] | Record<"Content-Type", BaseMime> | Record<ResponseHeader, string> | Record<string, string> | Headers;
interface ResponseInit<T$1 extends StatusCode = StatusCode> {
  headers?: ResponseHeadersInit;
  status?: T$1;
  statusText?: string;
}
type ResponseOrInit<T$1 extends StatusCode = StatusCode> = ResponseInit<T$1> | Response;
declare class Context<E$1 extends Env = any, P$1 extends string = any, I$1 extends Input = {}> {
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env: E$1["Bindings"];
  finalized: boolean;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error: Error | undefined;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req: Request, options?: ContextOptions<E$1>);
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req(): HonoRequest$1<P$1, I$1["out"]>;
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event(): FetchEventLike;
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx(): ExecutionContext;
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res(): Response;
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res: Response | undefined);
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render: Renderer;
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout: (layout: Layout<PropsForRenderer & {
    Layout: Layout;
  }>) => Layout<PropsForRenderer & {
    Layout: Layout;
  }>;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout: () => Layout<PropsForRenderer & {
    Layout: Layout;
  }> | undefined;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer: (renderer: Renderer) => void;
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header: SetHeaders;
  status: (status: StatusCode) => void;
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set: Set$1<IsAny$1<E$1> extends true ? {
    Variables: ContextVariableMap & Record<string, any>;
  } : E$1>;
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get: Get<IsAny$1<E$1> extends true ? {
    Variables: ContextVariableMap & Record<string, any>;
  } : E$1>;
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  get var(): Readonly<ContextVariableMap & (IsAny$1<E$1["Variables"]> extends true ? Record<string, any> : E$1["Variables"])>;
  newResponse: NewResponse;
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body: BodyRespond;
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text: TextRespond;
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json: JSONRespond;
  html: HTMLRespond;
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect: <T$1 extends RedirectStatusCode = 302>(location: string | URL, status?: T$1) => Response & TypedResponse<undefined, T$1, "redirect">;
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound: () => Response | Promise<Response>;
}
//#endregion
//#region node_modules/hono/dist/types/hono-base.d.ts
type GetPath<E$1 extends Env> = (request: Request, options?: {
  env?: E$1["Bindings"];
}) => string;
type HonoOptions<E$1 extends Env> = {
  /**
   * `strict` option specifies whether to distinguish whether the last path is a directory or not.
   *
   * @see {@link https://hono.dev/docs/api/hono#strict-mode}
   *
   * @default true
   */
  strict?: boolean;
  /**
   * `router` option specifies which router to use.
   *
   * @see {@link https://hono.dev/docs/api/hono#router-option}
   *
   * @example
   * ```ts
   * const app = new Hono({ router: new RegExpRouter() })
   * ```
   */
  router?: Router<[H, RouterRoute]>;
  /**
   * `getPath` can handle the host header value.
   *
   * @see {@link https://hono.dev/docs/api/routing#routing-with-host-header-value}
   *
   * @example
   * ```ts
   * const app = new Hono({
   *  getPath: (req) =>
   *   '/' + req.headers.get('host') + req.url.replace(/^https?:\/\/[^/]+(\/[^?]*)/, '$1'),
   * })
   *
   * app.get('/www1.example.com/hello', () => c.text('hello www1'))
   *
   * // A following request will match the route:
   * // new Request('http://www1.example.com/hello', {
   * //  headers: { host: 'www1.example.com' },
   * // })
   * ```
   */
  getPath?: GetPath<E$1>;
};
type MountOptionHandler = (c: Context) => unknown;
type MountReplaceRequest = (originalRequest: Request) => Request;
type MountOptions = MountOptionHandler | {
  optionHandler?: MountOptionHandler;
  replaceRequest?: MountReplaceRequest | false;
};
declare class Hono$1<E$1 extends Env = Env, S$1 extends Schema = {}, BasePath extends string = "/"> {
  get: HandlerInterface<E$1, "get", S$1, BasePath>;
  post: HandlerInterface<E$1, "post", S$1, BasePath>;
  put: HandlerInterface<E$1, "put", S$1, BasePath>;
  delete: HandlerInterface<E$1, "delete", S$1, BasePath>;
  options: HandlerInterface<E$1, "options", S$1, BasePath>;
  patch: HandlerInterface<E$1, "patch", S$1, BasePath>;
  all: HandlerInterface<E$1, "all", S$1, BasePath>;
  on: OnHandlerInterface<E$1, S$1, BasePath>;
  use: MiddlewareHandlerInterface<E$1, S$1, BasePath>;
  router: Router<[H, RouterRoute]>;
  readonly getPath: GetPath<E$1>;
  routes: RouterRoute[];
  constructor(options?: HonoOptions<E$1>);
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route<SubPath extends string, SubEnv extends Env, SubSchema extends Schema, SubBasePath extends string>(path: SubPath, app: Hono$1<SubEnv, SubSchema, SubBasePath>): Hono$1<E$1, MergeSchemaPath<SubSchema, MergePath<BasePath, SubPath>> | S$1, BasePath>;
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath<SubPath extends string>(path: SubPath): Hono$1<E$1, S$1, MergePath<BasePath, SubPath>>;
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError: (handler: ErrorHandler<E$1>) => Hono$1<E$1, S$1, BasePath>;
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound: (handler: NotFoundHandler<E$1>) => Hono$1<E$1, S$1, BasePath>;
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path: string, applicationHandler: (request: Request, ...args: any) => Response | Promise<Response>, options?: MountOptions): Hono$1<E$1, S$1, BasePath>;
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch: (request: Request, Env?: E$1["Bindings"] | {}, executionCtx?: ExecutionContext) => Response | Promise<Response>;
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request: (input: RequestInfo | URL, requestInit?: RequestInit, Env?: E$1["Bindings"] | {}, executionCtx?: ExecutionContext) => Response | Promise<Response>;
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire: () => void;
}
//#endregion
//#region node_modules/hono/dist/types/hono.d.ts
/**
 * The Hono class extends the functionality of the HonoBase class.
 * It sets up routing and allows for custom options to be passed.
 *
 * @template E - The environment type.
 * @template S - The schema type.
 * @template BasePath - The base path type.
 */
declare class Hono<E$1 extends Env = BlankEnv, S$1 extends Schema = BlankSchema, BasePath extends string = "/"> extends Hono$1<E$1, S$1, BasePath> {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options?: HonoOptions<E$1>);
}
//#endregion
//#region node_modules/hono/dist/types/client/types.d.ts
type HonoRequest = (typeof Hono.prototype)["request"];
type ClientRequestOptions<T$1 = unknown> = {
  fetch?: typeof fetch | HonoRequest;
  webSocket?: (...args: ConstructorParameters<typeof WebSocket>) => WebSocket;
  /**
   * Standard `RequestInit`, caution that this take highest priority
   * and could be used to overwrite things that Hono sets for you, like `body | method | headers`.
   *
   * If you want to add some headers, use in `headers` instead of `init`
   */
  init?: RequestInit;
} & (keyof T$1 extends never ? {
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
} : {
  headers: T$1 | (() => T$1 | Promise<T$1>);
});
type ClientRequest<S$1 extends Schema> = { [M in keyof S$1]: S$1[M] extends Endpoint & {
  input: infer R;
} ? R extends object ? HasRequiredKeys<R> extends true ? (args: R, options?: ClientRequestOptions) => Promise<ClientResponseOfEndpoint<S$1[M]>> : (args?: R, options?: ClientRequestOptions) => Promise<ClientResponseOfEndpoint<S$1[M]>> : never : never } & {
  $url: (arg?: S$1[keyof S$1] extends {
    input: infer R;
  } ? R extends {
    param: infer P;
  } ? R extends {
    query: infer Q;
  } ? {
    param: P;
    query: Q;
  } : {
    param: P;
  } : R extends {
    query: infer Q;
  } ? {
    query: Q;
  } : {} : {}) => URL;
} & (S$1["$get"] extends {
  outputFormat: "ws";
} ? S$1["$get"] extends {
  input: infer I;
} ? {
  $ws: (args?: I) => WebSocket;
} : {} : {});
type ClientResponseOfEndpoint<T$1 extends Endpoint = Endpoint> = T$1 extends {
  output: infer O;
  outputFormat: infer F;
  status: infer S;
} ? ClientResponse<O, S extends number ? S : never, F extends ResponseFormat ? F : never> : never;
interface ClientResponse<T$1, U$1 extends number = StatusCode, F$1 extends ResponseFormat = ResponseFormat> extends globalThis.Response {
  readonly body: ReadableStream | null;
  readonly bodyUsed: boolean;
  ok: U$1 extends SuccessStatusCode ? true : U$1 extends Exclude<StatusCode, SuccessStatusCode> ? false : boolean;
  status: U$1;
  statusText: string;
  headers: Headers;
  url: string;
  redirect(url: string, status: number): Response$1;
  clone(): Response$1;
  json(): F$1 extends "text" ? Promise<never> : F$1 extends "json" ? Promise<T$1> : Promise<unknown>;
  text(): F$1 extends "text" ? (T$1 extends string ? Promise<T$1> : Promise<never>) : Promise<string>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  arrayBuffer(): Promise<ArrayBuffer>;
}
interface Response$1 extends ClientResponse<unknown> {}
type PathToChain<Path$1 extends string, E$1 extends Schema, Original extends string = Path$1> = Path$1 extends `/${infer P}` ? PathToChain<P, E$1, Path$1> : Path$1 extends `${infer P}/${infer R}` ? { [K in P]: PathToChain<R, E$1, Original> } : { [K in Path$1 extends "" ? "index" : Path$1]: ClientRequest<E$1 extends Record<string, unknown> ? E$1[Original] : never> };
type Client$1<T$1> = T$1 extends Hono$1<any, infer S, any> ? S extends Record<infer K, Schema> ? K extends string ? PathToChain<K, S> : never : never : never;
//#endregion
//#region node_modules/hono/dist/types/client/client.d.ts
declare const hc: <T$1 extends Hono<any, any, any>>(baseUrl: string, options?: ClientRequestOptions) => UnionToIntersection<Client$1<T$1>>;
//#endregion
//#region src/services/errors.d.ts
type ErrorDetail = {
  code: string;
  message: string;
  reason_code: string;
  instruction: string;
};
//#endregion
//#region src/services/monitoringService.d.ts
type ActionProcessingParams = {
  sessionId: string;
  commandId: string;
  action: string;
  playerId: string;
  durationMs: number;
  result: 'error' | 'success';
  version?: string;
  errorCode?: string;
};
type MutexWaitParams = {
  sessionId: string;
  waitMs: number;
};
type SseConnectionChangeParams = {
  sessionId: string;
  action: 'connect' | 'disconnect';
  connectionCount: number;
};
type TimerEventParams = {
  sessionId: string;
  action: 'clear' | 'register';
  deadline?: string;
  turn?: number;
};
type SystemTimeoutParams = {
  sessionId: string;
  turn: number;
  forcedPlayerId: string;
  cardTaken: number;
};
type ExportParams = {
  sessionId: string;
  format: 'csv' | 'json';
  entryCount: number;
};
type SessionEventParams = {
  sessionId: string;
  action: string;
  playerCount?: number;
};
type MonitoringService = {
  logActionProcessing: (params: ActionProcessingParams) => void;
  logMutexWait: (params: MutexWaitParams) => void;
  logSseConnectionChange: (params: SseConnectionChangeParams) => void;
  logTimerEvent: (params: TimerEventParams) => void;
  logSystemTimeout: (params: SystemTimeoutParams) => void;
  logExport: (params: ExportParams) => void;
  logSessionEvent: (params: SessionEventParams) => void;
};
//#endregion
//#region node_modules/openapi3-ts/dist/model/specification-extension.d.ts
type IExtensionName = `x-${string}`;
type IExtensionType = any;
type ISpecificationExtension = {
  [extensionName: IExtensionName]: IExtensionType;
};
//#endregion
//#region node_modules/openapi3-ts/dist/model/openapi30.d.ts
interface ExternalDocumentationObject$1 extends ISpecificationExtension {
  description?: string;
  url: string;
}
type ParameterLocation$1 = 'query' | 'header' | 'path' | 'cookie';
type ParameterStyle$1 = 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
interface BaseParameterObject$1 extends ISpecificationExtension {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: ParameterStyle$1;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: SchemaObject | ReferenceObject$1;
  examples?: {
    [param: string]: ExampleObject$1 | ReferenceObject$1;
  };
  example?: any;
  content?: ContentObject$1;
}
interface ParameterObject extends BaseParameterObject$1 {
  name: string;
  in: ParameterLocation$1;
}
interface ContentObject$1 {
  [mediatype: string]: MediaTypeObject$1;
}
interface MediaTypeObject$1 extends ISpecificationExtension {
  schema?: SchemaObject | ReferenceObject$1;
  examples?: ExamplesObject$1;
  example?: any;
  encoding?: EncodingObject$1;
}
interface EncodingObject$1 extends ISpecificationExtension {
  [property: string]: EncodingPropertyObject$1 | any;
}
interface EncodingPropertyObject$1 {
  contentType?: string;
  headers?: {
    [key: string]: HeaderObject$1 | ReferenceObject$1;
  };
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  [key: string]: any;
}
interface ExampleObject$1 {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
  [property: string]: any;
}
interface HeaderObject$1 extends BaseParameterObject$1 {
  $ref?: string;
}
interface ExamplesObject$1 {
  [name: string]: ExampleObject$1 | ReferenceObject$1;
}
interface ReferenceObject$1 {
  $ref: string;
}
type SchemaObjectType$1 = 'integer' | 'number' | 'string' | 'boolean' | 'object' | 'null' | 'array';
type SchemaObjectFormat = 'int32' | 'int64' | 'float' | 'double' | 'byte' | 'binary' | 'date' | 'date-time' | 'password' | string;
interface SchemaObject extends ISpecificationExtension {
  nullable?: boolean;
  discriminator?: DiscriminatorObject$1;
  readOnly?: boolean;
  writeOnly?: boolean;
  xml?: XmlObject$1;
  externalDocs?: ExternalDocumentationObject$1;
  example?: any;
  examples?: any[];
  deprecated?: boolean;
  type?: SchemaObjectType$1 | SchemaObjectType$1[];
  format?: SchemaObjectFormat;
  allOf?: (SchemaObject | ReferenceObject$1)[];
  oneOf?: (SchemaObject | ReferenceObject$1)[];
  anyOf?: (SchemaObject | ReferenceObject$1)[];
  not?: SchemaObject | ReferenceObject$1;
  items?: SchemaObject | ReferenceObject$1;
  properties?: {
    [propertyName: string]: SchemaObject | ReferenceObject$1;
  };
  additionalProperties?: SchemaObject | ReferenceObject$1 | boolean;
  description?: string;
  default?: any;
  title?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
}
interface DiscriminatorObject$1 {
  propertyName: string;
  mapping?: {
    [key: string]: string;
  };
}
interface XmlObject$1 extends ISpecificationExtension {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}
//#endregion
//#region node_modules/openapi3-ts/dist/model/openapi31.d.ts
interface ExternalDocumentationObject extends ISpecificationExtension {
  description?: string;
  url: string;
}
type ParameterLocation = 'query' | 'header' | 'path' | 'cookie';
type ParameterStyle = 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
interface BaseParameterObject extends ISpecificationExtension {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: ParameterStyle;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: SchemaObject$1 | ReferenceObject;
  examples?: {
    [param: string]: ExampleObject | ReferenceObject;
  };
  example?: any;
  content?: ContentObject;
}
interface ParameterObject$1 extends BaseParameterObject {
  name: string;
  in: ParameterLocation;
}
interface ContentObject {
  [mediatype: string]: MediaTypeObject;
}
interface MediaTypeObject extends ISpecificationExtension {
  schema?: SchemaObject$1 | ReferenceObject;
  examples?: ExamplesObject;
  example?: any;
  encoding?: EncodingObject;
}
interface EncodingObject extends ISpecificationExtension {
  [property: string]: EncodingPropertyObject | any;
}
interface EncodingPropertyObject {
  contentType?: string;
  headers?: {
    [key: string]: HeaderObject | ReferenceObject;
  };
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  [key: string]: any;
}
interface ExampleObject {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
  [property: string]: any;
}
interface HeaderObject extends BaseParameterObject {
  $ref?: string;
}
interface ExamplesObject {
  [name: string]: ExampleObject | ReferenceObject;
}
interface ReferenceObject {
  $ref: string;
  summary?: string;
  description?: string;
}
type SchemaObjectType = 'integer' | 'number' | 'string' | 'boolean' | 'object' | 'null' | 'array';
interface SchemaObject$1 extends ISpecificationExtension {
  $ref?: string;
  discriminator?: DiscriminatorObject;
  readOnly?: boolean;
  writeOnly?: boolean;
  xml?: XmlObject;
  externalDocs?: ExternalDocumentationObject;
  example?: any;
  examples?: any[];
  deprecated?: boolean;
  type?: SchemaObjectType | SchemaObjectType[];
  format?: 'int32' | 'int64' | 'float' | 'double' | 'byte' | 'binary' | 'date' | 'date-time' | 'password' | string;
  allOf?: (SchemaObject$1 | ReferenceObject)[];
  oneOf?: (SchemaObject$1 | ReferenceObject)[];
  anyOf?: (SchemaObject$1 | ReferenceObject)[];
  not?: SchemaObject$1 | ReferenceObject;
  items?: SchemaObject$1 | ReferenceObject;
  properties?: {
    [propertyName: string]: SchemaObject$1 | ReferenceObject;
  };
  additionalProperties?: SchemaObject$1 | ReferenceObject | boolean;
  propertyNames?: SchemaObject$1 | ReferenceObject;
  description?: string;
  default?: any;
  title?: string;
  multipleOf?: number;
  maximum?: number;
  const?: any;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
  prefixItems?: (SchemaObject$1 | ReferenceObject)[];
  contentMediaType?: string;
  contentEncoding?: string;
}
interface DiscriminatorObject {
  propertyName: string;
  mapping?: {
    [key: string]: string;
  };
}
interface XmlObject extends ISpecificationExtension {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}
//#endregion
//#region node_modules/zod/v4/core/standard-schema.d.cts
/** The Standard Schema interface. */
interface StandardSchemaV1<Input$1 = unknown, Output = Input$1> {
  /** The Standard Schema properties. */
  readonly "~standard": StandardSchemaV1.Props<Input$1, Output>;
}
declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  interface Props<Input$1 = unknown, Output = Input$1> {
    /** The version number of the standard. */
    readonly version: 1;
    /** The vendor name of the schema library. */
    readonly vendor: string;
    /** Validates unknown input values. */
    readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>;
    /** Inferred types associated with the schema. */
    readonly types?: Types<Input$1, Output> | undefined;
  }
  /** The result interface of the validate function. */
  type Result<Output> = SuccessResult<Output> | FailureResult;
  /** The result interface if validation succeeds. */
  interface SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output;
    /** The non-existent issues. */
    readonly issues?: undefined;
  }
  /** The result interface if validation fails. */
  interface FailureResult {
    /** The issues of failed validation. */
    readonly issues: ReadonlyArray<Issue>;
  }
  /** The issue interface of the failure output. */
  interface Issue {
    /** The error message of the issue. */
    readonly message: string;
    /** The path of the issue, if any. */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }
  /** The path segment interface of the issue. */
  interface PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey;
  }
  /** The Standard Schema types interface. */
  interface Types<Input$1 = unknown, Output = Input$1> {
    /** The input type of the schema. */
    readonly input: Input$1;
    /** The output type of the schema. */
    readonly output: Output;
  }
  /** Infers the input type of a Standard Schema. */
  type InferInput<Schema$1 extends StandardSchemaV1> = NonNullable<Schema$1["~standard"]["types"]>["input"];
  /** Infers the output type of a Standard Schema. */
  type InferOutput<Schema$1 extends StandardSchemaV1> = NonNullable<Schema$1["~standard"]["types"]>["output"];
}
//#endregion
//#region node_modules/zod/v4/core/util.d.cts
type JWTAlgorithm = "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512" | "PS256" | "PS384" | "PS512" | "EdDSA" | (string & {});
type IsAny<T$1> = 0 extends 1 & T$1 ? true : false;
type Omit$1<T$1, K$1 extends keyof T$1> = Pick<T$1, Exclude<keyof T$1, K$1>>;
type MakePartial<T$1, K$1 extends keyof T$1> = Omit$1<T$1, K$1> & InexactPartial<Pick<T$1, K$1>>;
type NoUndefined<T$1> = T$1 extends undefined ? never : T$1;
type LoosePartial<T$1 extends object> = InexactPartial<T$1> & {
  [k: string]: unknown;
};
type Mask<Keys extends PropertyKey> = { [K in Keys]?: true };
type InexactPartial<T$1> = { [P in keyof T$1]?: T$1[P] | undefined };
type BuiltIn = (((...args: any[]) => any) | (new (...args: any[]) => any)) | {
  readonly [Symbol.toStringTag]: string;
} | Date | Error | Generator | Promise<unknown> | RegExp;
type MakeReadonly<T$1> = T$1 extends Map<infer K, infer V> ? ReadonlyMap<K, V> : T$1 extends Set<infer V> ? ReadonlySet<V> : T$1 extends [infer Head, ...infer Tail] ? readonly [Head, ...Tail] : T$1 extends Array<infer V> ? ReadonlyArray<V> : T$1 extends BuiltIn ? T$1 : Readonly<T$1>;
type SomeObject = Record<PropertyKey, any>;
type Identity<T$1> = T$1;
type Flatten<T$1> = Identity<{ [k in keyof T$1]: T$1[k] }>;
type Prettify<T$1> = { [K in keyof T$1]: T$1[K] } & {};
type Extend<A$1 extends SomeObject, B extends SomeObject> = Flatten<keyof A$1 & keyof B extends never ? A$1 & B : { [K in keyof A$1 as K extends keyof B ? never : K]: A$1[K] } & { [K in keyof B]: B[K] }>;
type AnyFunc = (...args: any[]) => any;
type MaybeAsync<T$1> = T$1 | Promise<T$1>;
type EnumValue = string | number;
type EnumLike = Readonly<Record<string, EnumValue>>;
type ToEnum<T$1 extends EnumValue> = Flatten<{ [k in T$1]: k }>;
type Literal = string | number | bigint | boolean | null | undefined;
type Primitive = string | number | symbol | bigint | boolean | null | undefined;
type HasLength = {
  length: number;
};
type Numeric = number | bigint | Date;
type PropValues = Record<string, Set<Primitive>>;
type PrimitiveSet = Set<Primitive>;
type EmptyToNever<T$1> = keyof T$1 extends never ? never : T$1;
declare abstract class Class {
  constructor(..._args: any[]);
}
//#endregion
//#region node_modules/zod/v4/core/versions.d.cts
declare const version: {
  readonly major: 4;
  readonly minor: 1;
  readonly patch: number;
};
//#endregion
//#region node_modules/zod/v4/core/schemas.d.cts
interface ParseContext<T$1 extends $ZodIssueBase = never> {
  /** Customize error messages. */
  readonly error?: $ZodErrorMap<T$1>;
  /** Include the `input` field in issue objects. Default `false`. */
  readonly reportInput?: boolean;
  /** Skip eval-based fast path. Default `false`. */
  readonly jitless?: boolean;
}
/** @internal */
interface ParseContextInternal<T$1 extends $ZodIssueBase = never> extends ParseContext<T$1> {
  readonly async?: boolean | undefined;
  readonly direction?: "forward" | "backward";
  readonly skipChecks?: boolean;
}
interface ParsePayload<T$1 = unknown> {
  value: T$1;
  issues: $ZodRawIssue[];
  /** A may to mark a whole payload as aborted. Used in codecs/pipes. */
  aborted?: boolean;
}
type CheckFn<T$1> = (input: ParsePayload<T$1>) => MaybeAsync<void>;
interface $ZodTypeDef {
  type: "string" | "number" | "int" | "boolean" | "bigint" | "symbol" | "null" | "undefined" | "void" | "never" | "any" | "unknown" | "date" | "object" | "record" | "file" | "array" | "tuple" | "union" | "intersection" | "map" | "set" | "enum" | "literal" | "nullable" | "optional" | "nonoptional" | "success" | "transform" | "default" | "prefault" | "catch" | "nan" | "pipe" | "readonly" | "template_literal" | "promise" | "lazy" | "function" | "custom";
  error?: $ZodErrorMap<never> | undefined;
  checks?: $ZodCheck<never>[];
}
interface _$ZodTypeInternals {
  /** The `@zod/core` version of this schema */
  version: typeof version;
  /** Schema definition. */
  def: $ZodTypeDef;
  /** @internal Randomly generated ID for this schema. */
  /** @internal List of deferred initializers. */
  deferred: AnyFunc[] | undefined;
  /** @internal Parses input and runs all checks (refinements). */
  run(payload: ParsePayload<any>, ctx: ParseContextInternal): MaybeAsync<ParsePayload>;
  /** @internal Parses input, doesn't run checks. */
  parse(payload: ParsePayload<any>, ctx: ParseContextInternal): MaybeAsync<ParsePayload>;
  /** @internal  Stores identifiers for the set of traits implemented by this schema. */
  traits: Set<string>;
  /** @internal Indicates that a schema output type should be considered optional inside objects.
   * @default Required
   */
  /** @internal */
  optin?: "optional" | undefined;
  /** @internal */
  optout?: "optional" | undefined;
  /** @internal The set of literal values that will pass validation. Must be an exhaustive set. Used to determine optionality in z.record().
   *
   * Defined on: enum, const, literal, null, undefined
   * Passthrough: optional, nullable, branded, default, catch, pipe
   * Todo: unions?
   */
  values?: PrimitiveSet | undefined;
  /** Default value bubbled up from  */
  /** @internal A set of literal discriminators used for the fast path in discriminated unions. */
  propValues?: PropValues | undefined;
  /** @internal This flag indicates that a schema validation can be represented with a regular expression. Used to determine allowable schemas in z.templateLiteral(). */
  pattern: RegExp | undefined;
  /** @internal The constructor function of this schema. */
  constr: new (def: any) => $ZodType;
  /** @internal A catchall object for bag metadata related to this schema. Commonly modified by checks using `onattach`. */
  bag: Record<string, unknown>;
  /** @internal The set of issues this schema might throw during type checking. */
  isst: $ZodIssueBase;
  /** An optional method used to override `toJSONSchema` logic. */
  toJSONSchema?: () => unknown;
  /** @internal The parent of this schema. Only set during certain clone operations. */
  parent?: $ZodType | undefined;
}
/** @internal */
interface $ZodTypeInternals<out O$1 = unknown, out I$1 = unknown> extends _$ZodTypeInternals {
  /** @internal The inferred output type */
  output: O$1;
  /** @internal The inferred input type */
  input: I$1;
}
type $ZodStandardSchema<T$1> = StandardSchemaV1.Props<input<T$1>, output<T$1>>;
type SomeType = {
  _zod: _$ZodTypeInternals;
};
interface $ZodType<O$1 = unknown, I$1 = unknown, Internals extends $ZodTypeInternals<O$1, I$1> = $ZodTypeInternals<O$1, I$1>> {
  _zod: Internals;
  "~standard": $ZodStandardSchema<this>;
}
declare const $ZodType: $constructor<$ZodType>;
interface $ZodStringDef extends $ZodTypeDef {
  type: "string";
  coerce?: boolean;
  checks?: $ZodCheck<string>[];
}
interface $ZodStringInternals<Input$1> extends $ZodTypeInternals<string, Input$1> {
  def: $ZodStringDef;
  /** @deprecated Internal API, use with caution (not deprecated) */
  pattern: RegExp;
  /** @deprecated Internal API, use with caution (not deprecated) */
  isst: $ZodIssueInvalidType;
  bag: LoosePartial<{
    minimum: number;
    maximum: number;
    patterns: Set<RegExp>;
    format: string;
    contentEncoding: string;
  }>;
}
interface $ZodStringFormatDef<Format extends string = string> extends $ZodStringDef, $ZodCheckStringFormatDef<Format> {}
interface $ZodStringFormatInternals<Format extends string = string> extends $ZodStringInternals<string>, $ZodCheckStringFormatInternals {
  def: $ZodStringFormatDef<Format>;
}
interface $ZodStringFormat<Format extends string = string> extends $ZodType {
  _zod: $ZodStringFormatInternals<Format>;
}
declare const $ZodStringFormat: $constructor<$ZodStringFormat>;
interface $ZodGUIDInternals extends $ZodStringFormatInternals<"guid"> {}
interface $ZodGUID extends $ZodType {
  _zod: $ZodGUIDInternals;
}
declare const $ZodGUID: $constructor<$ZodGUID>;
interface $ZodUUIDDef extends $ZodStringFormatDef<"uuid"> {
  version?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8";
}
interface $ZodUUIDInternals extends $ZodStringFormatInternals<"uuid"> {
  def: $ZodUUIDDef;
}
interface $ZodUUID extends $ZodType {
  _zod: $ZodUUIDInternals;
}
declare const $ZodUUID: $constructor<$ZodUUID>;
interface $ZodEmailInternals extends $ZodStringFormatInternals<"email"> {}
interface $ZodEmail extends $ZodType {
  _zod: $ZodEmailInternals;
}
declare const $ZodEmail: $constructor<$ZodEmail>;
interface $ZodURLDef extends $ZodStringFormatDef<"url"> {
  hostname?: RegExp | undefined;
  protocol?: RegExp | undefined;
  normalize?: boolean | undefined;
}
interface $ZodURLInternals extends $ZodStringFormatInternals<"url"> {
  def: $ZodURLDef;
}
interface $ZodURL extends $ZodType {
  _zod: $ZodURLInternals;
}
declare const $ZodURL: $constructor<$ZodURL>;
interface $ZodEmojiInternals extends $ZodStringFormatInternals<"emoji"> {}
interface $ZodEmoji extends $ZodType {
  _zod: $ZodEmojiInternals;
}
declare const $ZodEmoji: $constructor<$ZodEmoji>;
interface $ZodNanoIDInternals extends $ZodStringFormatInternals<"nanoid"> {}
interface $ZodNanoID extends $ZodType {
  _zod: $ZodNanoIDInternals;
}
declare const $ZodNanoID: $constructor<$ZodNanoID>;
interface $ZodCUIDInternals extends $ZodStringFormatInternals<"cuid"> {}
interface $ZodCUID extends $ZodType {
  _zod: $ZodCUIDInternals;
}
declare const $ZodCUID: $constructor<$ZodCUID>;
interface $ZodCUID2Internals extends $ZodStringFormatInternals<"cuid2"> {}
interface $ZodCUID2 extends $ZodType {
  _zod: $ZodCUID2Internals;
}
declare const $ZodCUID2: $constructor<$ZodCUID2>;
interface $ZodULIDInternals extends $ZodStringFormatInternals<"ulid"> {}
interface $ZodULID extends $ZodType {
  _zod: $ZodULIDInternals;
}
declare const $ZodULID: $constructor<$ZodULID>;
interface $ZodXIDInternals extends $ZodStringFormatInternals<"xid"> {}
interface $ZodXID extends $ZodType {
  _zod: $ZodXIDInternals;
}
declare const $ZodXID: $constructor<$ZodXID>;
interface $ZodKSUIDInternals extends $ZodStringFormatInternals<"ksuid"> {}
interface $ZodKSUID extends $ZodType {
  _zod: $ZodKSUIDInternals;
}
declare const $ZodKSUID: $constructor<$ZodKSUID>;
interface $ZodISODateTimeDef extends $ZodStringFormatDef<"datetime"> {
  precision: number | null;
  offset: boolean;
  local: boolean;
}
interface $ZodISODateTimeInternals extends $ZodStringFormatInternals {
  def: $ZodISODateTimeDef;
}
interface $ZodISODateTime extends $ZodType {
  _zod: $ZodISODateTimeInternals;
}
declare const $ZodISODateTime: $constructor<$ZodISODateTime>;
interface $ZodISODateInternals extends $ZodStringFormatInternals<"date"> {}
interface $ZodISODate extends $ZodType {
  _zod: $ZodISODateInternals;
}
declare const $ZodISODate: $constructor<$ZodISODate>;
interface $ZodISOTimeDef extends $ZodStringFormatDef<"time"> {
  precision?: number | null;
}
interface $ZodISOTimeInternals extends $ZodStringFormatInternals<"time"> {
  def: $ZodISOTimeDef;
}
interface $ZodISOTime extends $ZodType {
  _zod: $ZodISOTimeInternals;
}
declare const $ZodISOTime: $constructor<$ZodISOTime>;
interface $ZodISODurationInternals extends $ZodStringFormatInternals<"duration"> {}
interface $ZodISODuration extends $ZodType {
  _zod: $ZodISODurationInternals;
}
declare const $ZodISODuration: $constructor<$ZodISODuration>;
interface $ZodIPv4Def extends $ZodStringFormatDef<"ipv4"> {
  version?: "v4";
}
interface $ZodIPv4Internals extends $ZodStringFormatInternals<"ipv4"> {
  def: $ZodIPv4Def;
}
interface $ZodIPv4 extends $ZodType {
  _zod: $ZodIPv4Internals;
}
declare const $ZodIPv4: $constructor<$ZodIPv4>;
interface $ZodIPv6Def extends $ZodStringFormatDef<"ipv6"> {
  version?: "v6";
}
interface $ZodIPv6Internals extends $ZodStringFormatInternals<"ipv6"> {
  def: $ZodIPv6Def;
}
interface $ZodIPv6 extends $ZodType {
  _zod: $ZodIPv6Internals;
}
declare const $ZodIPv6: $constructor<$ZodIPv6>;
interface $ZodCIDRv4Def extends $ZodStringFormatDef<"cidrv4"> {
  version?: "v4";
}
interface $ZodCIDRv4Internals extends $ZodStringFormatInternals<"cidrv4"> {
  def: $ZodCIDRv4Def;
}
interface $ZodCIDRv4 extends $ZodType {
  _zod: $ZodCIDRv4Internals;
}
declare const $ZodCIDRv4: $constructor<$ZodCIDRv4>;
interface $ZodCIDRv6Def extends $ZodStringFormatDef<"cidrv6"> {
  version?: "v6";
}
interface $ZodCIDRv6Internals extends $ZodStringFormatInternals<"cidrv6"> {
  def: $ZodCIDRv6Def;
}
interface $ZodCIDRv6 extends $ZodType {
  _zod: $ZodCIDRv6Internals;
}
declare const $ZodCIDRv6: $constructor<$ZodCIDRv6>;
interface $ZodBase64Internals extends $ZodStringFormatInternals<"base64"> {}
interface $ZodBase64 extends $ZodType {
  _zod: $ZodBase64Internals;
}
declare const $ZodBase64: $constructor<$ZodBase64>;
interface $ZodBase64URLInternals extends $ZodStringFormatInternals<"base64url"> {}
interface $ZodBase64URL extends $ZodType {
  _zod: $ZodBase64URLInternals;
}
declare const $ZodBase64URL: $constructor<$ZodBase64URL>;
interface $ZodE164Internals extends $ZodStringFormatInternals<"e164"> {}
interface $ZodE164 extends $ZodType {
  _zod: $ZodE164Internals;
}
declare const $ZodE164: $constructor<$ZodE164>;
interface $ZodJWTDef extends $ZodStringFormatDef<"jwt"> {
  alg?: JWTAlgorithm | undefined;
}
interface $ZodJWTInternals extends $ZodStringFormatInternals<"jwt"> {
  def: $ZodJWTDef;
}
interface $ZodJWT extends $ZodType {
  _zod: $ZodJWTInternals;
}
declare const $ZodJWT: $constructor<$ZodJWT>;
interface $ZodNumberDef extends $ZodTypeDef {
  type: "number";
  coerce?: boolean;
}
interface $ZodNumberInternals<Input$1 = unknown> extends $ZodTypeInternals<number, Input$1> {
  def: $ZodNumberDef;
  /** @deprecated Internal API, use with caution (not deprecated) */
  pattern: RegExp;
  /** @deprecated Internal API, use with caution (not deprecated) */
  isst: $ZodIssueInvalidType;
  bag: LoosePartial<{
    minimum: number;
    maximum: number;
    exclusiveMinimum: number;
    exclusiveMaximum: number;
    format: string;
    pattern: RegExp;
  }>;
}
interface $ZodBooleanDef extends $ZodTypeDef {
  type: "boolean";
  coerce?: boolean;
  checks?: $ZodCheck<boolean>[];
}
interface $ZodBooleanInternals<T$1 = unknown> extends $ZodTypeInternals<boolean, T$1> {
  pattern: RegExp;
  def: $ZodBooleanDef;
  isst: $ZodIssueInvalidType;
}
interface $ZodArrayDef<T$1 extends SomeType = $ZodType> extends $ZodTypeDef {
  type: "array";
  element: T$1;
}
interface $ZodArrayInternals<T$1 extends SomeType = $ZodType> extends _$ZodTypeInternals {
  def: $ZodArrayDef<T$1>;
  isst: $ZodIssueInvalidType;
  output: output<T$1>[];
  input: input<T$1>[];
}
interface $ZodArray<T$1 extends SomeType = $ZodType> extends $ZodType<any, any, $ZodArrayInternals<T$1>> {}
declare const $ZodArray: $constructor<$ZodArray>;
type OptionalOutSchema = {
  _zod: {
    optout: "optional";
  };
};
type OptionalInSchema = {
  _zod: {
    optin: "optional";
  };
};
type $InferObjectOutput<T$1 extends $ZodLooseShape, Extra extends Record<string, unknown>> = string extends keyof T$1 ? IsAny<T$1[keyof T$1]> extends true ? Record<string, unknown> : Record<string, output<T$1[keyof T$1]>> : keyof (T$1 & Extra) extends never ? Record<string, never> : Prettify<{ -readonly [k in keyof T$1 as T$1[k] extends OptionalOutSchema ? never : k]: T$1[k]["_zod"]["output"] } & { -readonly [k in keyof T$1 as T$1[k] extends OptionalOutSchema ? k : never]?: T$1[k]["_zod"]["output"] } & Extra>;
type $InferObjectInput<T$1 extends $ZodLooseShape, Extra extends Record<string, unknown>> = string extends keyof T$1 ? IsAny<T$1[keyof T$1]> extends true ? Record<string, unknown> : Record<string, input<T$1[keyof T$1]>> : keyof (T$1 & Extra) extends never ? Record<string, never> : Prettify<{ -readonly [k in keyof T$1 as T$1[k] extends OptionalInSchema ? never : k]: T$1[k]["_zod"]["input"] } & { -readonly [k in keyof T$1 as T$1[k] extends OptionalInSchema ? k : never]?: T$1[k]["_zod"]["input"] } & Extra>;
type $ZodObjectConfig = {
  out: Record<string, unknown>;
  in: Record<string, unknown>;
};
type $loose = {
  out: Record<string, unknown>;
  in: Record<string, unknown>;
};
type $strict = {
  out: {};
  in: {};
};
type $strip = {
  out: {};
  in: {};
};
type $catchall<T$1 extends SomeType> = {
  out: {
    [k: string]: output<T$1>;
  };
  in: {
    [k: string]: input<T$1>;
  };
};
type $ZodShape = Readonly<{
  [k: string]: $ZodType;
}>;
interface $ZodObjectDef<Shape extends $ZodShape = $ZodShape> extends $ZodTypeDef {
  type: "object";
  shape: Shape;
  catchall?: $ZodType | undefined;
}
interface $ZodObjectInternals< /** @ts-ignore Cast variance */
out Shape extends $ZodShape = $ZodShape, out Config extends $ZodObjectConfig = $ZodObjectConfig> extends _$ZodTypeInternals {
  def: $ZodObjectDef<Shape>;
  config: Config;
  isst: $ZodIssueInvalidType | $ZodIssueUnrecognizedKeys;
  propValues: PropValues;
  output: $InferObjectOutput<Shape, Config["out"]>;
  input: $InferObjectInput<Shape, Config["in"]>;
  optin?: "optional" | undefined;
  optout?: "optional" | undefined;
}
type $ZodLooseShape = Record<string, any>;
interface $ZodObject< /** @ts-ignore Cast variance */
out Shape extends Readonly<$ZodShape> = Readonly<$ZodShape>, out Params$2 extends $ZodObjectConfig = $ZodObjectConfig> extends $ZodType<any, any, $ZodObjectInternals<Shape, Params$2>> {
  "~standard": $ZodStandardSchema<this>;
}
declare const $ZodObject: $constructor<$ZodObject>;
type $InferUnionOutput<T$1 extends SomeType> = T$1 extends any ? output<T$1> : never;
type $InferUnionInput<T$1 extends SomeType> = T$1 extends any ? input<T$1> : never;
interface $ZodUnionDef<Options extends readonly SomeType[] = readonly $ZodType[]> extends $ZodTypeDef {
  type: "union";
  options: Options;
}
type IsOptionalIn<T$1 extends SomeType> = T$1 extends OptionalInSchema ? true : false;
type IsOptionalOut<T$1 extends SomeType> = T$1 extends OptionalOutSchema ? true : false;
interface $ZodUnionInternals<T$1 extends readonly SomeType[] = readonly $ZodType[]> extends _$ZodTypeInternals {
  def: $ZodUnionDef<T$1>;
  isst: $ZodIssueInvalidUnion;
  pattern: T$1[number]["_zod"]["pattern"];
  values: T$1[number]["_zod"]["values"];
  output: $InferUnionOutput<T$1[number]>;
  input: $InferUnionInput<T$1[number]>;
  optin: IsOptionalIn<T$1[number]> extends false ? "optional" | undefined : "optional";
  optout: IsOptionalOut<T$1[number]> extends false ? "optional" | undefined : "optional";
}
interface $ZodUnion<T$1 extends readonly SomeType[] = readonly $ZodType[]> extends $ZodType<any, any, $ZodUnionInternals<T$1>> {
  _zod: $ZodUnionInternals<T$1>;
}
declare const $ZodUnion: $constructor<$ZodUnion>;
interface $ZodIntersectionDef<Left extends SomeType = $ZodType, Right extends SomeType = $ZodType> extends $ZodTypeDef {
  type: "intersection";
  left: Left;
  right: Right;
}
interface $ZodIntersectionInternals<A$1 extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _$ZodTypeInternals {
  def: $ZodIntersectionDef<A$1, B>;
  isst: never;
  optin: A$1["_zod"]["optin"] | B["_zod"]["optin"];
  optout: A$1["_zod"]["optout"] | B["_zod"]["optout"];
  output: output<A$1> & output<B>;
  input: input<A$1> & input<B>;
}
interface $ZodIntersection<A$1 extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodIntersectionInternals<A$1, B>;
}
declare const $ZodIntersection: $constructor<$ZodIntersection>;
type $ZodRecordKey = $ZodType<string | number | symbol, string | number | symbol>;
interface $ZodRecordDef<Key$1 extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodTypeDef {
  type: "record";
  keyType: Key$1;
  valueType: Value;
}
type $InferZodRecordOutput<Key$1 extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> = Key$1 extends $partial ? Partial<Record<output<Key$1>, output<Value>>> : Record<output<Key$1>, output<Value>>;
type $InferZodRecordInput<Key$1 extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> = Key$1 extends $partial ? Partial<Record<input<Key$1>, input<Value>>> : Record<input<Key$1>, input<Value>>;
interface $ZodRecordInternals<Key$1 extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodTypeInternals<$InferZodRecordOutput<Key$1, Value>, $InferZodRecordInput<Key$1, Value>> {
  def: $ZodRecordDef<Key$1, Value>;
  isst: $ZodIssueInvalidType | $ZodIssueInvalidKey<Record<PropertyKey, unknown>>;
  optin?: "optional" | undefined;
  optout?: "optional" | undefined;
}
type $partial = {
  "~~partial": true;
};
interface $ZodRecord<Key$1 extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodRecordInternals<Key$1, Value>;
}
declare const $ZodRecord: $constructor<$ZodRecord>;
type $InferEnumOutput<T$1 extends EnumLike> = T$1[keyof T$1] & {};
type $InferEnumInput<T$1 extends EnumLike> = T$1[keyof T$1] & {};
interface $ZodEnumDef<T$1 extends EnumLike = EnumLike> extends $ZodTypeDef {
  type: "enum";
  entries: T$1;
}
interface $ZodEnumInternals< /** @ts-ignore Cast variance */
out T$1 extends EnumLike = EnumLike> extends $ZodTypeInternals<$InferEnumOutput<T$1>, $InferEnumInput<T$1>> {
  def: $ZodEnumDef<T$1>;
  /** @deprecated Internal API, use with caution (not deprecated) */
  values: PrimitiveSet;
  /** @deprecated Internal API, use with caution (not deprecated) */
  pattern: RegExp;
  isst: $ZodIssueInvalidValue;
}
interface $ZodEnum<T$1 extends EnumLike = EnumLike> extends $ZodType {
  _zod: $ZodEnumInternals<T$1>;
}
declare const $ZodEnum: $constructor<$ZodEnum>;
interface $ZodLiteralDef<T$1 extends Literal> extends $ZodTypeDef {
  type: "literal";
  values: T$1[];
}
interface $ZodLiteralInternals<T$1 extends Literal = Literal> extends $ZodTypeInternals<T$1, T$1> {
  def: $ZodLiteralDef<T$1>;
  values: Set<T$1>;
  pattern: RegExp;
  isst: $ZodIssueInvalidValue;
}
interface $ZodLiteral<T$1 extends Literal = Literal> extends $ZodType {
  _zod: $ZodLiteralInternals<T$1>;
}
declare const $ZodLiteral: $constructor<$ZodLiteral>;
interface $ZodTransformDef extends $ZodTypeDef {
  type: "transform";
  transform: (input: unknown, payload: ParsePayload<unknown>) => MaybeAsync<unknown>;
}
interface $ZodTransformInternals<O$1 = unknown, I$1 = unknown> extends $ZodTypeInternals<O$1, I$1> {
  def: $ZodTransformDef;
  isst: never;
}
interface $ZodTransform<O$1 = unknown, I$1 = unknown> extends $ZodType {
  _zod: $ZodTransformInternals<O$1, I$1>;
}
declare const $ZodTransform: $constructor<$ZodTransform>;
interface $ZodOptionalDef<T$1 extends SomeType = $ZodType> extends $ZodTypeDef {
  type: "optional";
  innerType: T$1;
}
interface $ZodOptionalInternals<T$1 extends SomeType = $ZodType> extends $ZodTypeInternals<output<T$1> | undefined, input<T$1> | undefined> {
  def: $ZodOptionalDef<T$1>;
  optin: "optional";
  optout: "optional";
  isst: never;
  values: T$1["_zod"]["values"];
  pattern: T$1["_zod"]["pattern"];
}
interface $ZodOptional<T$1 extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodOptionalInternals<T$1>;
}
declare const $ZodOptional: $constructor<$ZodOptional>;
interface $ZodNullableDef<T$1 extends SomeType = $ZodType> extends $ZodTypeDef {
  type: "nullable";
  innerType: T$1;
}
interface $ZodNullableInternals<T$1 extends SomeType = $ZodType> extends $ZodTypeInternals<output<T$1> | null, input<T$1> | null> {
  def: $ZodNullableDef<T$1>;
  optin: T$1["_zod"]["optin"];
  optout: T$1["_zod"]["optout"];
  isst: never;
  values: T$1["_zod"]["values"];
  pattern: T$1["_zod"]["pattern"];
}
interface $ZodNullable<T$1 extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodNullableInternals<T$1>;
}
declare const $ZodNullable: $constructor<$ZodNullable>;
interface $ZodDefaultDef<T$1 extends SomeType = $ZodType> extends $ZodTypeDef {
  type: "default";
  innerType: T$1;
  /** The default value. May be a getter. */
  defaultValue: NoUndefined<output<T$1>>;
}
interface $ZodDefaultInternals<T$1 extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T$1>>, input<T$1> | undefined> {
  def: $ZodDefaultDef<T$1>;
  optin: "optional";
  optout?: "optional" | undefined;
  isst: never;
  values: T$1["_zod"]["values"];
}
interface $ZodDefault<T$1 extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodDefaultInternals<T$1>;
}
declare const $ZodDefault: $constructor<$ZodDefault>;
interface $ZodPrefaultDef<T$1 extends SomeType = $ZodType> extends $ZodTypeDef {
  type: "prefault";
  innerType: T$1;
  /** The default value. May be a getter. */
  defaultValue: input<T$1>;
}
interface $ZodPrefaultInternals<T$1 extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T$1>>, input<T$1> | undefined> {
  def: $ZodPrefaultDef<T$1>;
  optin: "optional";
  optout?: "optional" | undefined;
  isst: never;
  values: T$1["_zod"]["values"];
}
interface $ZodPrefault<T$1 extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodPrefaultInternals<T$1>;
}
declare const $ZodPrefault: $constructor<$ZodPrefault>;
interface $ZodNonOptionalDef<T$1 extends SomeType = $ZodType> extends $ZodTypeDef {
  type: "nonoptional";
  innerType: T$1;
}
interface $ZodNonOptionalInternals<T$1 extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T$1>>, NoUndefined<input<T$1>>> {
  def: $ZodNonOptionalDef<T$1>;
  isst: $ZodIssueInvalidType;
  values: T$1["_zod"]["values"];
  optin: "optional" | undefined;
  optout: "optional" | undefined;
}
interface $ZodNonOptional<T$1 extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodNonOptionalInternals<T$1>;
}
declare const $ZodNonOptional: $constructor<$ZodNonOptional>;
interface $ZodCatchCtx extends ParsePayload {
  /** @deprecated Use `ctx.issues` */
  error: {
    issues: $ZodIssue[];
  };
  /** @deprecated Use `ctx.value` */
  input: unknown;
}
interface $ZodCatchDef<T$1 extends SomeType = $ZodType> extends $ZodTypeDef {
  type: "catch";
  innerType: T$1;
  catchValue: (ctx: $ZodCatchCtx) => unknown;
}
interface $ZodCatchInternals<T$1 extends SomeType = $ZodType> extends $ZodTypeInternals<output<T$1>, input<T$1>> {
  def: $ZodCatchDef<T$1>;
  optin: T$1["_zod"]["optin"];
  optout: T$1["_zod"]["optout"];
  isst: never;
  values: T$1["_zod"]["values"];
}
interface $ZodCatch<T$1 extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodCatchInternals<T$1>;
}
declare const $ZodCatch: $constructor<$ZodCatch>;
interface $ZodPipeDef<A$1 extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodTypeDef {
  type: "pipe";
  in: A$1;
  out: B;
  /** Only defined inside $ZodCodec instances. */
  transform?: (value: output<A$1>, payload: ParsePayload<output<A$1>>) => MaybeAsync<input<B>>;
  /** Only defined inside $ZodCodec instances. */
  reverseTransform?: (value: input<B>, payload: ParsePayload<input<B>>) => MaybeAsync<output<A$1>>;
}
interface $ZodPipeInternals<A$1 extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodTypeInternals<output<B>, input<A$1>> {
  def: $ZodPipeDef<A$1, B>;
  isst: never;
  values: A$1["_zod"]["values"];
  optin: A$1["_zod"]["optin"];
  optout: B["_zod"]["optout"];
  propValues: A$1["_zod"]["propValues"];
}
interface $ZodPipe<A$1 extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodPipeInternals<A$1, B>;
}
declare const $ZodPipe: $constructor<$ZodPipe>;
interface $ZodReadonlyDef<T$1 extends SomeType = $ZodType> extends $ZodTypeDef {
  type: "readonly";
  innerType: T$1;
}
interface $ZodReadonlyInternals<T$1 extends SomeType = $ZodType> extends $ZodTypeInternals<MakeReadonly<output<T$1>>, MakeReadonly<input<T$1>>> {
  def: $ZodReadonlyDef<T$1>;
  optin: T$1["_zod"]["optin"];
  optout: T$1["_zod"]["optout"];
  isst: never;
  propValues: T$1["_zod"]["propValues"];
  values: T$1["_zod"]["values"];
}
interface $ZodReadonly<T$1 extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodReadonlyInternals<T$1>;
}
declare const $ZodReadonly: $constructor<$ZodReadonly>;
interface $ZodCustomDef<O$1 = unknown> extends $ZodTypeDef, $ZodCheckDef {
  type: "custom";
  check: "custom";
  path?: PropertyKey[] | undefined;
  error?: $ZodErrorMap | undefined;
  params?: Record<string, any> | undefined;
  fn: (arg: O$1) => unknown;
}
interface $ZodCustomInternals<O$1 = unknown, I$1 = unknown> extends $ZodTypeInternals<O$1, I$1>, $ZodCheckInternals<O$1> {
  def: $ZodCustomDef;
  issc: $ZodIssue;
  isst: never;
  bag: LoosePartial<{
    Class: typeof Class;
  }>;
}
interface $ZodCustom<O$1 = unknown, I$1 = unknown> extends $ZodType {
  _zod: $ZodCustomInternals<O$1, I$1>;
}
declare const $ZodCustom: $constructor<$ZodCustom>;
//#endregion
//#region node_modules/zod/v4/core/checks.d.cts
interface $ZodCheckDef {
  check: string;
  error?: $ZodErrorMap<never> | undefined;
  /** If true, no later checks will be executed if this check fails. Default `false`. */
  abort?: boolean | undefined;
  /** If provided, this check will only be executed if the function returns `true`. Defaults to `payload => z.util.isAborted(payload)`. */
  when?: ((payload: ParsePayload) => boolean) | undefined;
}
interface $ZodCheckInternals<T$1> {
  def: $ZodCheckDef;
  /** The set of issues this check might throw. */
  issc?: $ZodIssueBase;
  check(payload: ParsePayload<T$1>): MaybeAsync<void>;
  onattach: ((schema: $ZodType) => void)[];
}
interface $ZodCheck<in T$1 = never> {
  _zod: $ZodCheckInternals<T$1>;
}
declare const $ZodCheck: $constructor<$ZodCheck<any>>;
interface $ZodCheckLessThanDef extends $ZodCheckDef {
  check: "less_than";
  value: Numeric;
  inclusive: boolean;
}
interface $ZodCheckLessThanInternals<T$1 extends Numeric = Numeric> extends $ZodCheckInternals<T$1> {
  def: $ZodCheckLessThanDef;
  issc: $ZodIssueTooBig<T$1>;
}
interface $ZodCheckLessThan<T$1 extends Numeric = Numeric> extends $ZodCheck<T$1> {
  _zod: $ZodCheckLessThanInternals<T$1>;
}
declare const $ZodCheckLessThan: $constructor<$ZodCheckLessThan>;
interface $ZodCheckGreaterThanDef extends $ZodCheckDef {
  check: "greater_than";
  value: Numeric;
  inclusive: boolean;
}
interface $ZodCheckGreaterThanInternals<T$1 extends Numeric = Numeric> extends $ZodCheckInternals<T$1> {
  def: $ZodCheckGreaterThanDef;
  issc: $ZodIssueTooSmall<T$1>;
}
interface $ZodCheckGreaterThan<T$1 extends Numeric = Numeric> extends $ZodCheck<T$1> {
  _zod: $ZodCheckGreaterThanInternals<T$1>;
}
declare const $ZodCheckGreaterThan: $constructor<$ZodCheckGreaterThan>;
interface $ZodCheckMultipleOfDef<T$1 extends number | bigint = number | bigint> extends $ZodCheckDef {
  check: "multiple_of";
  value: T$1;
}
interface $ZodCheckMultipleOfInternals<T$1 extends number | bigint = number | bigint> extends $ZodCheckInternals<T$1> {
  def: $ZodCheckMultipleOfDef<T$1>;
  issc: $ZodIssueNotMultipleOf;
}
interface $ZodCheckMultipleOf<T$1 extends number | bigint = number | bigint> extends $ZodCheck<T$1> {
  _zod: $ZodCheckMultipleOfInternals<T$1>;
}
declare const $ZodCheckMultipleOf: $constructor<$ZodCheckMultipleOf<number | bigint>>;
type $ZodNumberFormats = "int32" | "uint32" | "float32" | "float64" | "safeint";
interface $ZodCheckNumberFormatDef extends $ZodCheckDef {
  check: "number_format";
  format: $ZodNumberFormats;
}
interface $ZodCheckNumberFormatInternals extends $ZodCheckInternals<number> {
  def: $ZodCheckNumberFormatDef;
  issc: $ZodIssueInvalidType | $ZodIssueTooBig<"number"> | $ZodIssueTooSmall<"number">;
}
interface $ZodCheckNumberFormat extends $ZodCheck<number> {
  _zod: $ZodCheckNumberFormatInternals;
}
declare const $ZodCheckNumberFormat: $constructor<$ZodCheckNumberFormat>;
interface $ZodCheckMaxLengthDef extends $ZodCheckDef {
  check: "max_length";
  maximum: number;
}
interface $ZodCheckMaxLengthInternals<T$1 extends HasLength = HasLength> extends $ZodCheckInternals<T$1> {
  def: $ZodCheckMaxLengthDef;
  issc: $ZodIssueTooBig<T$1>;
}
interface $ZodCheckMaxLength<T$1 extends HasLength = HasLength> extends $ZodCheck<T$1> {
  _zod: $ZodCheckMaxLengthInternals<T$1>;
}
declare const $ZodCheckMaxLength: $constructor<$ZodCheckMaxLength>;
interface $ZodCheckMinLengthDef extends $ZodCheckDef {
  check: "min_length";
  minimum: number;
}
interface $ZodCheckMinLengthInternals<T$1 extends HasLength = HasLength> extends $ZodCheckInternals<T$1> {
  def: $ZodCheckMinLengthDef;
  issc: $ZodIssueTooSmall<T$1>;
}
interface $ZodCheckMinLength<T$1 extends HasLength = HasLength> extends $ZodCheck<T$1> {
  _zod: $ZodCheckMinLengthInternals<T$1>;
}
declare const $ZodCheckMinLength: $constructor<$ZodCheckMinLength>;
interface $ZodCheckLengthEqualsDef extends $ZodCheckDef {
  check: "length_equals";
  length: number;
}
interface $ZodCheckLengthEqualsInternals<T$1 extends HasLength = HasLength> extends $ZodCheckInternals<T$1> {
  def: $ZodCheckLengthEqualsDef;
  issc: $ZodIssueTooBig<T$1> | $ZodIssueTooSmall<T$1>;
}
interface $ZodCheckLengthEquals<T$1 extends HasLength = HasLength> extends $ZodCheck<T$1> {
  _zod: $ZodCheckLengthEqualsInternals<T$1>;
}
declare const $ZodCheckLengthEquals: $constructor<$ZodCheckLengthEquals>;
type $ZodStringFormats = "email" | "url" | "emoji" | "uuid" | "guid" | "nanoid" | "cuid" | "cuid2" | "ulid" | "xid" | "ksuid" | "datetime" | "date" | "time" | "duration" | "ipv4" | "ipv6" | "cidrv4" | "cidrv6" | "base64" | "base64url" | "json_string" | "e164" | "lowercase" | "uppercase" | "regex" | "jwt" | "starts_with" | "ends_with" | "includes";
interface $ZodCheckStringFormatDef<Format extends string = string> extends $ZodCheckDef {
  check: "string_format";
  format: Format;
  pattern?: RegExp | undefined;
}
interface $ZodCheckStringFormatInternals extends $ZodCheckInternals<string> {
  def: $ZodCheckStringFormatDef;
  issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckRegexDef extends $ZodCheckStringFormatDef {
  format: "regex";
  pattern: RegExp;
}
interface $ZodCheckRegexInternals extends $ZodCheckInternals<string> {
  def: $ZodCheckRegexDef;
  issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckRegex extends $ZodCheck<string> {
  _zod: $ZodCheckRegexInternals;
}
declare const $ZodCheckRegex: $constructor<$ZodCheckRegex>;
interface $ZodCheckLowerCaseDef extends $ZodCheckStringFormatDef<"lowercase"> {}
interface $ZodCheckLowerCaseInternals extends $ZodCheckInternals<string> {
  def: $ZodCheckLowerCaseDef;
  issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckLowerCase extends $ZodCheck<string> {
  _zod: $ZodCheckLowerCaseInternals;
}
declare const $ZodCheckLowerCase: $constructor<$ZodCheckLowerCase>;
interface $ZodCheckUpperCaseDef extends $ZodCheckStringFormatDef<"uppercase"> {}
interface $ZodCheckUpperCaseInternals extends $ZodCheckInternals<string> {
  def: $ZodCheckUpperCaseDef;
  issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckUpperCase extends $ZodCheck<string> {
  _zod: $ZodCheckUpperCaseInternals;
}
declare const $ZodCheckUpperCase: $constructor<$ZodCheckUpperCase>;
interface $ZodCheckIncludesDef extends $ZodCheckStringFormatDef<"includes"> {
  includes: string;
  position?: number | undefined;
}
interface $ZodCheckIncludesInternals extends $ZodCheckInternals<string> {
  def: $ZodCheckIncludesDef;
  issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckIncludes extends $ZodCheck<string> {
  _zod: $ZodCheckIncludesInternals;
}
declare const $ZodCheckIncludes: $constructor<$ZodCheckIncludes>;
interface $ZodCheckStartsWithDef extends $ZodCheckStringFormatDef<"starts_with"> {
  prefix: string;
}
interface $ZodCheckStartsWithInternals extends $ZodCheckInternals<string> {
  def: $ZodCheckStartsWithDef;
  issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckStartsWith extends $ZodCheck<string> {
  _zod: $ZodCheckStartsWithInternals;
}
declare const $ZodCheckStartsWith: $constructor<$ZodCheckStartsWith>;
interface $ZodCheckEndsWithDef extends $ZodCheckStringFormatDef<"ends_with"> {
  suffix: string;
}
interface $ZodCheckEndsWithInternals extends $ZodCheckInternals<string> {
  def: $ZodCheckEndsWithDef;
  issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckEndsWith extends $ZodCheckInternals<string> {
  _zod: $ZodCheckEndsWithInternals;
}
declare const $ZodCheckEndsWith: $constructor<$ZodCheckEndsWith>;
//#endregion
//#region node_modules/zod/v4/core/errors.d.cts
interface $ZodIssueBase {
  readonly code?: string;
  readonly input?: unknown;
  readonly path: PropertyKey[];
  readonly message: string;
}
interface $ZodIssueInvalidType<Input$1 = unknown> extends $ZodIssueBase {
  readonly code: "invalid_type";
  readonly expected: $ZodType["_zod"]["def"]["type"];
  readonly input?: Input$1;
}
interface $ZodIssueTooBig<Input$1 = unknown> extends $ZodIssueBase {
  readonly code: "too_big";
  readonly origin: "number" | "int" | "bigint" | "date" | "string" | "array" | "set" | "file" | (string & {});
  readonly maximum: number | bigint;
  readonly inclusive?: boolean;
  readonly exact?: boolean;
  readonly input?: Input$1;
}
interface $ZodIssueTooSmall<Input$1 = unknown> extends $ZodIssueBase {
  readonly code: "too_small";
  readonly origin: "number" | "int" | "bigint" | "date" | "string" | "array" | "set" | "file" | (string & {});
  readonly minimum: number | bigint;
  /** True if the allowable range includes the minimum */
  readonly inclusive?: boolean;
  /** True if the allowed value is fixed (e.g.` z.length(5)`), not a range (`z.minLength(5)`) */
  readonly exact?: boolean;
  readonly input?: Input$1;
}
interface $ZodIssueInvalidStringFormat extends $ZodIssueBase {
  readonly code: "invalid_format";
  readonly format: $ZodStringFormats | (string & {});
  readonly pattern?: string;
  readonly input?: string;
}
interface $ZodIssueNotMultipleOf<Input$1 extends number | bigint = number | bigint> extends $ZodIssueBase {
  readonly code: "not_multiple_of";
  readonly divisor: number;
  readonly input?: Input$1;
}
interface $ZodIssueUnrecognizedKeys extends $ZodIssueBase {
  readonly code: "unrecognized_keys";
  readonly keys: string[];
  readonly input?: Record<string, unknown>;
}
interface $ZodIssueInvalidUnion extends $ZodIssueBase {
  readonly code: "invalid_union";
  readonly errors: $ZodIssue[][];
  readonly input?: unknown;
  readonly discriminator?: string | undefined;
}
interface $ZodIssueInvalidKey<Input$1 = unknown> extends $ZodIssueBase {
  readonly code: "invalid_key";
  readonly origin: "map" | "record";
  readonly issues: $ZodIssue[];
  readonly input?: Input$1;
}
interface $ZodIssueInvalidElement<Input$1 = unknown> extends $ZodIssueBase {
  readonly code: "invalid_element";
  readonly origin: "map" | "set";
  readonly key: unknown;
  readonly issues: $ZodIssue[];
  readonly input?: Input$1;
}
interface $ZodIssueInvalidValue<Input$1 = unknown> extends $ZodIssueBase {
  readonly code: "invalid_value";
  readonly values: Primitive[];
  readonly input?: Input$1;
}
interface $ZodIssueCustom extends $ZodIssueBase {
  readonly code: "custom";
  readonly params?: Record<string, any> | undefined;
  readonly input?: unknown;
}
type $ZodIssue = $ZodIssueInvalidType | $ZodIssueTooBig | $ZodIssueTooSmall | $ZodIssueInvalidStringFormat | $ZodIssueNotMultipleOf | $ZodIssueUnrecognizedKeys | $ZodIssueInvalidUnion | $ZodIssueInvalidKey | $ZodIssueInvalidElement | $ZodIssueInvalidValue | $ZodIssueCustom;
type $ZodInternalIssue<T$1 extends $ZodIssueBase = $ZodIssue> = T$1 extends any ? RawIssue$1<T$1> : never;
type RawIssue$1<T$1 extends $ZodIssueBase> = T$1 extends any ? Flatten<MakePartial<T$1, "message" | "path"> & {
  /** The input data */
  readonly input: unknown;
  /** The schema or check that originated this issue. */
  readonly inst?: $ZodType | $ZodCheck;
  /** If `true`, Zod will continue executing checks/refinements after this issue. */
  readonly continue?: boolean | undefined;
} & Record<string, unknown>> : never;
type $ZodRawIssue<T$1 extends $ZodIssueBase = $ZodIssue> = $ZodInternalIssue<T$1>;
interface $ZodErrorMap<T$1 extends $ZodIssueBase = $ZodIssue> {
  (issue: $ZodRawIssue<T$1>): {
    message: string;
  } | string | undefined | null;
}
interface $ZodError<T$1 = unknown> extends Error {
  type: T$1;
  issues: $ZodIssue[];
  _zod: {
    output: T$1;
    def: $ZodIssue[];
  };
  stack?: string;
  name: string;
}
declare const $ZodError: $constructor<$ZodError>;
type $ZodFlattenedError<T$1, U$1 = string> = _FlattenedError<T$1, U$1>;
type _FlattenedError<T$1, U$1 = string> = {
  formErrors: U$1[];
  fieldErrors: { [P in keyof T$1]?: U$1[] };
};
type _ZodFormattedError<T$1, U$1 = string> = T$1 extends [any, ...any[]] ? { [K in keyof T$1]?: $ZodFormattedError<T$1[K], U$1> } : T$1 extends any[] ? {
  [k: number]: $ZodFormattedError<T$1[number], U$1>;
} : T$1 extends object ? Flatten<{ [K in keyof T$1]?: $ZodFormattedError<T$1[K], U$1> }> : any;
type $ZodFormattedError<T$1, U$1 = string> = {
  _errors: U$1[];
} & Flatten<_ZodFormattedError<T$1, U$1>>;
//#endregion
//#region node_modules/zod/v4/core/core.d.cts
type ZodTrait = {
  _zod: {
    def: any;
    [k: string]: any;
  };
};
interface $constructor<T$1 extends ZodTrait, D = T$1["_zod"]["def"]> {
  new (def: D): T$1;
  init(inst: T$1, def: D): asserts inst is T$1;
}
declare function $constructor<T$1 extends ZodTrait, D = T$1["_zod"]["def"]>(name: string, initializer: (inst: T$1, def: D) => void, params?: {
  Parent?: typeof Class;
}): $constructor<T$1, D>;
declare const $brand: unique symbol;
type $brand<T$1 extends string | number | symbol = string | number | symbol> = {
  [$brand]: { [k in T$1]: true };
};
type $ZodBranded<T$1 extends SomeType, Brand extends string | number | symbol> = T$1 & Record<"_zod", Record<"output", output<T$1> & $brand<Brand>>>;
type input<T$1> = T$1 extends {
  _zod: {
    input: any;
  };
} ? T$1["_zod"]["input"] : unknown;
type output<T$1> = T$1 extends {
  _zod: {
    output: any;
  };
} ? T$1["_zod"]["output"] : unknown;
//#endregion
//#region node_modules/zod/v4/core/registries.d.cts
declare const $output: unique symbol;
type $output = typeof $output;
declare const $input: unique symbol;
type $input = typeof $input;
type $replace<Meta, S$1 extends $ZodType> = Meta extends $output ? output<S$1> : Meta extends $input ? input<S$1> : Meta extends (infer M)[] ? $replace<M, S$1>[] : Meta extends ((...args: infer P) => infer R) ? (...args: { [K in keyof P]: $replace<P[K], S$1> }) => $replace<R, S$1> : Meta extends object ? { [K in keyof Meta]: $replace<Meta[K], S$1> } : Meta;
type MetadataType = object | undefined;
declare class $ZodRegistry<Meta extends MetadataType = MetadataType, Schema$1 extends $ZodType = $ZodType> {
  _meta: Meta;
  _schema: Schema$1;
  _map: WeakMap<Schema$1, $replace<Meta, Schema$1>>;
  _idmap: Map<string, Schema$1>;
  add<S$1 extends Schema$1>(schema: S$1, ..._meta: undefined extends Meta ? [$replace<Meta, S$1>?] : [$replace<Meta, S$1>]): this;
  clear(): this;
  remove(schema: Schema$1): this;
  get<S$1 extends Schema$1>(schema: S$1): $replace<Meta, S$1> | undefined;
  has(schema: Schema$1): boolean;
}
interface JSONSchemaMeta {
  id?: string | undefined;
  title?: string | undefined;
  description?: string | undefined;
  deprecated?: boolean | undefined;
  [k: string]: unknown;
}
interface GlobalMeta extends JSONSchemaMeta {}
//#endregion
//#region node_modules/zod/v4/core/api.d.cts
type Params<T$1 extends $ZodType | $ZodCheck, IssueTypes extends $ZodIssueBase, OmitKeys extends keyof T$1["_zod"]["def"] = never> = Flatten<Partial<EmptyToNever<Omit<T$1["_zod"]["def"], OmitKeys> & ([IssueTypes] extends [never] ? {} : {
  error?: string | $ZodErrorMap<IssueTypes> | undefined;
  /** @deprecated This parameter is deprecated. Use `error` instead. */
  message?: string | undefined;
})>>>;
type TypeParams<T$1 extends $ZodType = $ZodType & {
  _isst: never;
}, AlsoOmit extends Exclude<keyof T$1["_zod"]["def"], "type" | "checks" | "error"> = never> = Params<T$1, NonNullable<T$1["_zod"]["isst"]>, "type" | "checks" | "error" | AlsoOmit>;
type CheckParams<T$1 extends $ZodCheck = $ZodCheck,
// & { _issc: never },
AlsoOmit extends Exclude<keyof T$1["_zod"]["def"], "check" | "error"> = never> = Params<T$1, NonNullable<T$1["_zod"]["issc"]>, "check" | "error" | AlsoOmit>;
type CheckStringFormatParams<T$1 extends $ZodStringFormat = $ZodStringFormat, AlsoOmit extends Exclude<keyof T$1["_zod"]["def"], "type" | "coerce" | "checks" | "error" | "check" | "format"> = never> = Params<T$1, NonNullable<T$1["_zod"]["issc"]>, "type" | "coerce" | "checks" | "error" | "check" | "format" | AlsoOmit>;
type CheckTypeParams<T$1 extends $ZodType & $ZodCheck = $ZodType & $ZodCheck, AlsoOmit extends Exclude<keyof T$1["_zod"]["def"], "type" | "checks" | "error" | "check"> = never> = Params<T$1, NonNullable<T$1["_zod"]["isst"] | T$1["_zod"]["issc"]>, "type" | "checks" | "error" | "check" | AlsoOmit>;
type $ZodCheckEmailParams = CheckStringFormatParams<$ZodEmail, "when">;
type $ZodCheckGUIDParams = CheckStringFormatParams<$ZodGUID, "pattern" | "when">;
type $ZodCheckUUIDParams = CheckStringFormatParams<$ZodUUID, "pattern" | "when">;
type $ZodCheckURLParams = CheckStringFormatParams<$ZodURL, "when">;
type $ZodCheckEmojiParams = CheckStringFormatParams<$ZodEmoji, "when">;
type $ZodCheckNanoIDParams = CheckStringFormatParams<$ZodNanoID, "when">;
type $ZodCheckCUIDParams = CheckStringFormatParams<$ZodCUID, "when">;
type $ZodCheckCUID2Params = CheckStringFormatParams<$ZodCUID2, "when">;
type $ZodCheckULIDParams = CheckStringFormatParams<$ZodULID, "when">;
type $ZodCheckXIDParams = CheckStringFormatParams<$ZodXID, "when">;
type $ZodCheckKSUIDParams = CheckStringFormatParams<$ZodKSUID, "when">;
type $ZodCheckIPv4Params = CheckStringFormatParams<$ZodIPv4, "pattern" | "when" | "version">;
type $ZodCheckIPv6Params = CheckStringFormatParams<$ZodIPv6, "pattern" | "when" | "version">;
type $ZodCheckCIDRv4Params = CheckStringFormatParams<$ZodCIDRv4, "pattern" | "when">;
type $ZodCheckCIDRv6Params = CheckStringFormatParams<$ZodCIDRv6, "pattern" | "when">;
type $ZodCheckBase64Params = CheckStringFormatParams<$ZodBase64, "pattern" | "when">;
type $ZodCheckBase64URLParams = CheckStringFormatParams<$ZodBase64URL, "pattern" | "when">;
type $ZodCheckE164Params = CheckStringFormatParams<$ZodE164, "when">;
type $ZodCheckJWTParams = CheckStringFormatParams<$ZodJWT, "pattern" | "when">;
type $ZodCheckISODateTimeParams = CheckStringFormatParams<$ZodISODateTime, "pattern" | "when">;
type $ZodCheckISODateParams = CheckStringFormatParams<$ZodISODate, "pattern" | "when">;
type $ZodCheckISOTimeParams = CheckStringFormatParams<$ZodISOTime, "pattern" | "when">;
type $ZodCheckISODurationParams = CheckStringFormatParams<$ZodISODuration, "when">;
type $ZodCheckNumberFormatParams = CheckParams<$ZodCheckNumberFormat, "format" | "when">;
type $ZodCheckLessThanParams = CheckParams<$ZodCheckLessThan, "inclusive" | "value" | "when">;
type $ZodCheckGreaterThanParams = CheckParams<$ZodCheckGreaterThan, "inclusive" | "value" | "when">;
type $ZodCheckMultipleOfParams = CheckParams<$ZodCheckMultipleOf, "value" | "when">;
type $ZodCheckMaxLengthParams = CheckParams<$ZodCheckMaxLength, "maximum" | "when">;
type $ZodCheckMinLengthParams = CheckParams<$ZodCheckMinLength, "minimum" | "when">;
type $ZodCheckLengthEqualsParams = CheckParams<$ZodCheckLengthEquals, "length" | "when">;
type $ZodCheckRegexParams = CheckParams<$ZodCheckRegex, "format" | "pattern" | "when">;
type $ZodCheckLowerCaseParams = CheckParams<$ZodCheckLowerCase, "format" | "when">;
type $ZodCheckUpperCaseParams = CheckParams<$ZodCheckUpperCase, "format" | "when">;
type $ZodCheckIncludesParams = CheckParams<$ZodCheckIncludes, "includes" | "format" | "when" | "pattern">;
type $ZodCheckStartsWithParams = CheckParams<$ZodCheckStartsWith, "prefix" | "format" | "when" | "pattern">;
type $ZodCheckEndsWithParams = CheckParams<$ZodCheckEndsWith, "suffix" | "format" | "pattern" | "when">;
type $ZodEnumParams = TypeParams<$ZodEnum, "entries">;
type $ZodNonOptionalParams = TypeParams<$ZodNonOptional, "innerType">;
type $ZodCustomParams = CheckTypeParams<$ZodCustom, "fn">;
type $ZodSuperRefineIssue<T$1 extends $ZodIssueBase = $ZodIssue> = T$1 extends any ? RawIssue<T$1> : never;
type RawIssue<T$1 extends $ZodIssueBase> = T$1 extends any ? Flatten<MakePartial<T$1, "message" | "path"> & {
  /** The schema or check that originated this issue. */
  readonly inst?: $ZodType | $ZodCheck;
  /** If `true`, Zod will execute subsequent checks/refinements instead of immediately aborting */
  readonly continue?: boolean | undefined;
} & Record<string, unknown>> : never;
interface $RefinementCtx<T$1 = unknown> extends ParsePayload<T$1> {
  addIssue(arg: string | $ZodSuperRefineIssue): void;
}
//#endregion
//#region node_modules/zod/v4/classic/errors.d.cts
/** An Error-like class used to store Zod validation issues.  */
interface ZodError<T$1 = unknown> extends $ZodError<T$1> {
  /** @deprecated Use the `z.treeifyError(err)` function instead. */
  format(): $ZodFormattedError<T$1>;
  format<U$1>(mapper: (issue: $ZodIssue) => U$1): $ZodFormattedError<T$1, U$1>;
  /** @deprecated Use the `z.treeifyError(err)` function instead. */
  flatten(): $ZodFlattenedError<T$1>;
  flatten<U$1>(mapper: (issue: $ZodIssue) => U$1): $ZodFlattenedError<T$1, U$1>;
  /** @deprecated Push directly to `.issues` instead. */
  addIssue(issue: $ZodIssue): void;
  /** @deprecated Push directly to `.issues` instead. */
  addIssues(issues: $ZodIssue[]): void;
  /** @deprecated Check `err.issues.length === 0` instead. */
  isEmpty: boolean;
}
declare const ZodError: $constructor<ZodError>;
//#endregion
//#region node_modules/zod/v4/classic/parse.d.cts
type ZodSafeParseResult<T$1> = ZodSafeParseSuccess<T$1> | ZodSafeParseError<T$1>;
type ZodSafeParseSuccess<T$1> = {
  success: true;
  data: T$1;
  error?: never;
};
type ZodSafeParseError<T$1> = {
  success: false;
  data?: never;
  error: ZodError<T$1>;
};
//#endregion
//#region node_modules/zod/v4/classic/schemas.d.cts
interface ZodType<out Output = unknown, out Input$1 = unknown, out Internals extends $ZodTypeInternals<Output, Input$1> = $ZodTypeInternals<Output, Input$1>> extends $ZodType<Output, Input$1, Internals> {
  def: Internals["def"];
  type: Internals["def"]["type"];
  /** @deprecated Use `.def` instead. */
  _def: Internals["def"];
  /** @deprecated Use `z.output<typeof schema>` instead. */
  _output: Internals["output"];
  /** @deprecated Use `z.input<typeof schema>` instead. */
  _input: Internals["input"];
  check(...checks: (CheckFn<output<this>> | $ZodCheck<output<this>>)[]): this;
  clone(def?: Internals["def"], params?: {
    parent: boolean;
  }): this;
  register<R$1 extends $ZodRegistry>(registry: R$1, ...meta: this extends R$1["_schema"] ? undefined extends R$1["_meta"] ? [$replace<R$1["_meta"], this>?] : [$replace<R$1["_meta"], this>] : ["Incompatible schema"]): this;
  brand<T$1 extends PropertyKey = PropertyKey>(value?: T$1): PropertyKey extends T$1 ? this : $ZodBranded<this, T$1>;
  parse(data: unknown, params?: ParseContext<$ZodIssue>): output<this>;
  safeParse(data: unknown, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<output<this>>;
  parseAsync(data: unknown, params?: ParseContext<$ZodIssue>): Promise<output<this>>;
  safeParseAsync(data: unknown, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<output<this>>>;
  spa: (data: unknown, params?: ParseContext<$ZodIssue>) => Promise<ZodSafeParseResult<output<this>>>;
  encode(data: output<this>, params?: ParseContext<$ZodIssue>): input<this>;
  decode(data: input<this>, params?: ParseContext<$ZodIssue>): output<this>;
  encodeAsync(data: output<this>, params?: ParseContext<$ZodIssue>): Promise<input<this>>;
  decodeAsync(data: input<this>, params?: ParseContext<$ZodIssue>): Promise<output<this>>;
  safeEncode(data: output<this>, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<input<this>>;
  safeDecode(data: input<this>, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<output<this>>;
  safeEncodeAsync(data: output<this>, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<input<this>>>;
  safeDecodeAsync(data: input<this>, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<output<this>>>;
  refine(check: (arg: output<this>) => unknown | Promise<unknown>, params?: string | $ZodCustomParams): this;
  superRefine(refinement: (arg: output<this>, ctx: $RefinementCtx<output<this>>) => void | Promise<void>): this;
  overwrite(fn: (x: output<this>) => output<this>): this;
  optional(): ZodOptional<this>;
  nonoptional(params?: string | $ZodNonOptionalParams): ZodNonOptional<this>;
  nullable(): ZodNullable<this>;
  nullish(): ZodOptional<ZodNullable<this>>;
  default(def: NoUndefined<output<this>>): ZodDefault<this>;
  default(def: () => NoUndefined<output<this>>): ZodDefault<this>;
  prefault(def: () => input<this>): ZodPrefault<this>;
  prefault(def: input<this>): ZodPrefault<this>;
  array(): ZodArray<this>;
  or<T$1 extends SomeType>(option: T$1): ZodUnion<[this, T$1]>;
  and<T$1 extends SomeType>(incoming: T$1): ZodIntersection<this, T$1>;
  transform<NewOut>(transform: (arg: output<this>, ctx: $RefinementCtx<output<this>>) => NewOut | Promise<NewOut>): ZodPipe<this, ZodTransform<Awaited<NewOut>, output<this>>>;
  catch(def: output<this>): ZodCatch<this>;
  catch(def: (ctx: $ZodCatchCtx) => output<this>): ZodCatch<this>;
  pipe<T$1 extends $ZodType<any, output<this>>>(target: T$1 | $ZodType<any, output<this>>): ZodPipe<this, T$1>;
  readonly(): ZodReadonly<this>;
  /** Returns a new instance that has been registered in `z.globalRegistry` with the specified description */
  describe(description: string): this;
  description?: string;
  /** Returns the metadata associated with this instance in `z.globalRegistry` */
  meta(): $replace<GlobalMeta, this> | undefined;
  /** Returns a new instance that has been registered in `z.globalRegistry` with the specified metadata */
  meta(data: $replace<GlobalMeta, this>): this;
  /** @deprecated Try safe-parsing `undefined` (this is what `isOptional` does internally):
   *
   * ```ts
   * const schema = z.string().optional();
   * const isOptional = schema.safeParse(undefined).success; // true
   * ```
   */
  isOptional(): boolean;
  /**
   * @deprecated Try safe-parsing `null` (this is what `isNullable` does internally):
   *
   * ```ts
   * const schema = z.string().nullable();
   * const isNullable = schema.safeParse(null).success; // true
   * ```
   */
  isNullable(): boolean;
}
interface _ZodType<out Internals extends $ZodTypeInternals = $ZodTypeInternals> extends ZodType<any, any, Internals> {}
declare const ZodType: $constructor<ZodType>;
interface _ZodString<T$1 extends $ZodStringInternals<unknown> = $ZodStringInternals<unknown>> extends _ZodType<T$1> {
  format: string | null;
  minLength: number | null;
  maxLength: number | null;
  regex(regex: RegExp, params?: string | $ZodCheckRegexParams): this;
  includes(value: string, params?: $ZodCheckIncludesParams): this;
  startsWith(value: string, params?: string | $ZodCheckStartsWithParams): this;
  endsWith(value: string, params?: string | $ZodCheckEndsWithParams): this;
  min(minLength: number, params?: string | $ZodCheckMinLengthParams): this;
  max(maxLength: number, params?: string | $ZodCheckMaxLengthParams): this;
  length(len: number, params?: string | $ZodCheckLengthEqualsParams): this;
  nonempty(params?: string | $ZodCheckMinLengthParams): this;
  lowercase(params?: string | $ZodCheckLowerCaseParams): this;
  uppercase(params?: string | $ZodCheckUpperCaseParams): this;
  trim(): this;
  normalize(form?: "NFC" | "NFD" | "NFKC" | "NFKD" | (string & {})): this;
  toLowerCase(): this;
  toUpperCase(): this;
}
/** @internal */
declare const _ZodString: $constructor<_ZodString>;
interface ZodString extends _ZodString<$ZodStringInternals<string>> {
  /** @deprecated Use `z.email()` instead. */
  email(params?: string | $ZodCheckEmailParams): this;
  /** @deprecated Use `z.url()` instead. */
  url(params?: string | $ZodCheckURLParams): this;
  /** @deprecated Use `z.jwt()` instead. */
  jwt(params?: string | $ZodCheckJWTParams): this;
  /** @deprecated Use `z.emoji()` instead. */
  emoji(params?: string | $ZodCheckEmojiParams): this;
  /** @deprecated Use `z.guid()` instead. */
  guid(params?: string | $ZodCheckGUIDParams): this;
  /** @deprecated Use `z.uuid()` instead. */
  uuid(params?: string | $ZodCheckUUIDParams): this;
  /** @deprecated Use `z.uuid()` instead. */
  uuidv4(params?: string | $ZodCheckUUIDParams): this;
  /** @deprecated Use `z.uuid()` instead. */
  uuidv6(params?: string | $ZodCheckUUIDParams): this;
  /** @deprecated Use `z.uuid()` instead. */
  uuidv7(params?: string | $ZodCheckUUIDParams): this;
  /** @deprecated Use `z.nanoid()` instead. */
  nanoid(params?: string | $ZodCheckNanoIDParams): this;
  /** @deprecated Use `z.guid()` instead. */
  guid(params?: string | $ZodCheckGUIDParams): this;
  /** @deprecated Use `z.cuid()` instead. */
  cuid(params?: string | $ZodCheckCUIDParams): this;
  /** @deprecated Use `z.cuid2()` instead. */
  cuid2(params?: string | $ZodCheckCUID2Params): this;
  /** @deprecated Use `z.ulid()` instead. */
  ulid(params?: string | $ZodCheckULIDParams): this;
  /** @deprecated Use `z.base64()` instead. */
  base64(params?: string | $ZodCheckBase64Params): this;
  /** @deprecated Use `z.base64url()` instead. */
  base64url(params?: string | $ZodCheckBase64URLParams): this;
  /** @deprecated Use `z.xid()` instead. */
  xid(params?: string | $ZodCheckXIDParams): this;
  /** @deprecated Use `z.ksuid()` instead. */
  ksuid(params?: string | $ZodCheckKSUIDParams): this;
  /** @deprecated Use `z.ipv4()` instead. */
  ipv4(params?: string | $ZodCheckIPv4Params): this;
  /** @deprecated Use `z.ipv6()` instead. */
  ipv6(params?: string | $ZodCheckIPv6Params): this;
  /** @deprecated Use `z.cidrv4()` instead. */
  cidrv4(params?: string | $ZodCheckCIDRv4Params): this;
  /** @deprecated Use `z.cidrv6()` instead. */
  cidrv6(params?: string | $ZodCheckCIDRv6Params): this;
  /** @deprecated Use `z.e164()` instead. */
  e164(params?: string | $ZodCheckE164Params): this;
  /** @deprecated Use `z.iso.datetime()` instead. */
  datetime(params?: string | $ZodCheckISODateTimeParams): this;
  /** @deprecated Use `z.iso.date()` instead. */
  date(params?: string | $ZodCheckISODateParams): this;
  /** @deprecated Use `z.iso.time()` instead. */
  time(params?: string | $ZodCheckISOTimeParams): this;
  /** @deprecated Use `z.iso.duration()` instead. */
  duration(params?: string | $ZodCheckISODurationParams): this;
}
declare const ZodString: $constructor<ZodString>;
interface _ZodNumber<Internals extends $ZodNumberInternals = $ZodNumberInternals> extends _ZodType<Internals> {
  gt(value: number, params?: string | $ZodCheckGreaterThanParams): this;
  /** Identical to .min() */
  gte(value: number, params?: string | $ZodCheckGreaterThanParams): this;
  min(value: number, params?: string | $ZodCheckGreaterThanParams): this;
  lt(value: number, params?: string | $ZodCheckLessThanParams): this;
  /** Identical to .max() */
  lte(value: number, params?: string | $ZodCheckLessThanParams): this;
  max(value: number, params?: string | $ZodCheckLessThanParams): this;
  /** Consider `z.int()` instead. This API is considered *legacy*; it will never be removed but a better alternative exists. */
  int(params?: string | $ZodCheckNumberFormatParams): this;
  /** @deprecated This is now identical to `.int()`. Only numbers in the safe integer range are accepted. */
  safe(params?: string | $ZodCheckNumberFormatParams): this;
  positive(params?: string | $ZodCheckGreaterThanParams): this;
  nonnegative(params?: string | $ZodCheckGreaterThanParams): this;
  negative(params?: string | $ZodCheckLessThanParams): this;
  nonpositive(params?: string | $ZodCheckLessThanParams): this;
  multipleOf(value: number, params?: string | $ZodCheckMultipleOfParams): this;
  /** @deprecated Use `.multipleOf()` instead. */
  step(value: number, params?: string | $ZodCheckMultipleOfParams): this;
  /** @deprecated In v4 and later, z.number() does not allow infinite values by default. This is a no-op. */
  finite(params?: unknown): this;
  minValue: number | null;
  maxValue: number | null;
  /** @deprecated Check the `format` property instead.  */
  isInt: boolean;
  /** @deprecated Number schemas no longer accept infinite values, so this always returns `true`. */
  isFinite: boolean;
  format: string | null;
}
interface ZodNumber extends _ZodNumber<$ZodNumberInternals<number>> {}
declare const ZodNumber: $constructor<ZodNumber>;
interface _ZodBoolean<T$1 extends $ZodBooleanInternals = $ZodBooleanInternals> extends _ZodType<T$1> {}
interface ZodBoolean extends _ZodBoolean<$ZodBooleanInternals<boolean>> {}
declare const ZodBoolean: $constructor<ZodBoolean>;
interface ZodArray<T$1 extends SomeType = $ZodType> extends _ZodType<$ZodArrayInternals<T$1>>, $ZodArray<T$1> {
  element: T$1;
  min(minLength: number, params?: string | $ZodCheckMinLengthParams): this;
  nonempty(params?: string | $ZodCheckMinLengthParams): this;
  max(maxLength: number, params?: string | $ZodCheckMaxLengthParams): this;
  length(len: number, params?: string | $ZodCheckLengthEqualsParams): this;
  unwrap(): T$1;
}
declare const ZodArray: $constructor<ZodArray>;
type SafeExtendShape<Base extends $ZodShape, Ext extends $ZodLooseShape> = { [K in keyof Ext]: K extends keyof Base ? output<Ext[K]> extends output<Base[K]> ? input<Ext[K]> extends input<Base[K]> ? Ext[K] : never : never : Ext[K] };
interface ZodObject< /** @ts-ignore Cast variance */
out Shape extends $ZodShape = $ZodLooseShape, out Config extends $ZodObjectConfig = $strip> extends _ZodType<$ZodObjectInternals<Shape, Config>>, $ZodObject<Shape, Config> {
  shape: Shape;
  keyof(): ZodEnum<ToEnum<keyof Shape & string>>;
  /** Define a schema to validate all unrecognized keys. This overrides the existing strict/loose behavior. */
  catchall<T$1 extends SomeType>(schema: T$1): ZodObject<Shape, $catchall<T$1>>;
  /** @deprecated Use `z.looseObject()` or `.loose()` instead. */
  passthrough(): ZodObject<Shape, $loose>;
  /** Consider `z.looseObject(A.shape)` instead */
  loose(): ZodObject<Shape, $loose>;
  /** Consider `z.strictObject(A.shape)` instead */
  strict(): ZodObject<Shape, $strict>;
  /** This is the default behavior. This method call is likely unnecessary. */
  strip(): ZodObject<Shape, $strip>;
  extend<U$1 extends $ZodLooseShape>(shape: U$1): ZodObject<Extend<Shape, U$1>, Config>;
  safeExtend<U$1 extends $ZodLooseShape>(shape: SafeExtendShape<Shape, U$1> & Partial<Record<keyof Shape, SomeType>>): ZodObject<Extend<Shape, U$1>, Config>;
  /**
   * @deprecated Use [`A.extend(B.shape)`](https://zod.dev/api?id=extend) instead.
   */
  merge<U$1 extends ZodObject>(other: U$1): ZodObject<Extend<Shape, U$1["shape"]>, U$1["_zod"]["config"]>;
  pick<M$1 extends Mask<keyof Shape>>(mask: M$1): ZodObject<Flatten<Pick<Shape, Extract<keyof Shape, keyof M$1>>>, Config>;
  omit<M$1 extends Mask<keyof Shape>>(mask: M$1): ZodObject<Flatten<Omit<Shape, Extract<keyof Shape, keyof M$1>>>, Config>;
  partial(): ZodObject<{ [k in keyof Shape]: ZodOptional<Shape[k]> }, Config>;
  partial<M$1 extends Mask<keyof Shape>>(mask: M$1): ZodObject<{ [k in keyof Shape]: k extends keyof M$1 ? ZodOptional<Shape[k]> : Shape[k] }, Config>;
  required(): ZodObject<{ [k in keyof Shape]: ZodNonOptional<Shape[k]> }, Config>;
  required<M$1 extends Mask<keyof Shape>>(mask: M$1): ZodObject<{ [k in keyof Shape]: k extends keyof M$1 ? ZodNonOptional<Shape[k]> : Shape[k] }, Config>;
}
declare const ZodObject: $constructor<ZodObject>;
interface ZodUnion<T$1 extends readonly SomeType[] = readonly $ZodType[]> extends _ZodType<$ZodUnionInternals<T$1>>, $ZodUnion<T$1> {
  options: T$1;
}
declare const ZodUnion: $constructor<ZodUnion>;
interface ZodIntersection<A$1 extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _ZodType<$ZodIntersectionInternals<A$1, B>>, $ZodIntersection<A$1, B> {}
declare const ZodIntersection: $constructor<ZodIntersection>;
interface ZodRecord<Key$1 extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends _ZodType<$ZodRecordInternals<Key$1, Value>>, $ZodRecord<Key$1, Value> {
  keyType: Key$1;
  valueType: Value;
}
declare const ZodRecord: $constructor<ZodRecord>;
interface ZodEnum< /** @ts-ignore Cast variance */
out T$1 extends EnumLike = EnumLike> extends _ZodType<$ZodEnumInternals<T$1>>, $ZodEnum<T$1> {
  enum: T$1;
  options: Array<T$1[keyof T$1]>;
  extract<const U$1 extends readonly (keyof T$1)[]>(values: U$1, params?: string | $ZodEnumParams): ZodEnum<Flatten<Pick<T$1, U$1[number]>>>;
  exclude<const U$1 extends readonly (keyof T$1)[]>(values: U$1, params?: string | $ZodEnumParams): ZodEnum<Flatten<Omit<T$1, U$1[number]>>>;
}
declare const ZodEnum: $constructor<ZodEnum>;
interface ZodLiteral<T$1 extends Literal = Literal> extends _ZodType<$ZodLiteralInternals<T$1>>, $ZodLiteral<T$1> {
  values: Set<T$1>;
  /** @legacy Use `.values` instead. Accessing this property will throw an error if the literal accepts multiple values. */
  value: T$1;
}
declare const ZodLiteral: $constructor<ZodLiteral>;
interface ZodTransform<O$1 = unknown, I$1 = unknown> extends _ZodType<$ZodTransformInternals<O$1, I$1>>, $ZodTransform<O$1, I$1> {}
declare const ZodTransform: $constructor<ZodTransform>;
interface ZodOptional<T$1 extends SomeType = $ZodType> extends _ZodType<$ZodOptionalInternals<T$1>>, $ZodOptional<T$1> {
  unwrap(): T$1;
}
declare const ZodOptional: $constructor<ZodOptional>;
interface ZodNullable<T$1 extends SomeType = $ZodType> extends _ZodType<$ZodNullableInternals<T$1>>, $ZodNullable<T$1> {
  unwrap(): T$1;
}
declare const ZodNullable: $constructor<ZodNullable>;
interface ZodDefault<T$1 extends SomeType = $ZodType> extends _ZodType<$ZodDefaultInternals<T$1>>, $ZodDefault<T$1> {
  unwrap(): T$1;
  /** @deprecated Use `.unwrap()` instead. */
  removeDefault(): T$1;
}
declare const ZodDefault: $constructor<ZodDefault>;
interface ZodPrefault<T$1 extends SomeType = $ZodType> extends _ZodType<$ZodPrefaultInternals<T$1>>, $ZodPrefault<T$1> {
  unwrap(): T$1;
}
declare const ZodPrefault: $constructor<ZodPrefault>;
interface ZodNonOptional<T$1 extends SomeType = $ZodType> extends _ZodType<$ZodNonOptionalInternals<T$1>>, $ZodNonOptional<T$1> {
  unwrap(): T$1;
}
declare const ZodNonOptional: $constructor<ZodNonOptional>;
interface ZodCatch<T$1 extends SomeType = $ZodType> extends _ZodType<$ZodCatchInternals<T$1>>, $ZodCatch<T$1> {
  unwrap(): T$1;
  /** @deprecated Use `.unwrap()` instead. */
  removeCatch(): T$1;
}
declare const ZodCatch: $constructor<ZodCatch>;
interface ZodPipe<A$1 extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _ZodType<$ZodPipeInternals<A$1, B>>, $ZodPipe<A$1, B> {
  in: A$1;
  out: B;
}
declare const ZodPipe: $constructor<ZodPipe>;
interface ZodReadonly<T$1 extends SomeType = $ZodType> extends _ZodType<$ZodReadonlyInternals<T$1>>, $ZodReadonly<T$1> {
  unwrap(): T$1;
}
declare const ZodReadonly: $constructor<ZodReadonly>;
//#endregion
//#region node_modules/@asteasolutions/zod-to-openapi/dist/zod-extensions.d.ts
type ExampleValue<T$1> = T$1 extends Date ? string : T$1;
type ParameterObject$2 = ParameterObject | ParameterObject$1;
type SchemaObject$2 = SchemaObject | SchemaObject$1;
type UnionPreferredType = 'oneOf' | 'anyOf';
type ZodOpenAPIMetadata<T$1 = any, E$1 = ExampleValue<T$1>> = Omit<SchemaObject$2, 'example' | 'examples' | 'default'> & {
  param?: Partial<ParameterObject$2> & {
    example?: E$1;
  };
  example?: E$1;
  examples?: E$1[];
  default?: T$1;
  _internal?: never;
};
interface OpenApiOptions {
  unionPreferredType?: UnionPreferredType;
}
/**
 *
 * Since this commit https://github.com/colinhacks/zod/commit/6707ebb14c885b1c577ce64a240475e26e3ff182
 * zod started preserving metadata from functions. Since the ZodObject type contains some function types
 * that also have generics this leads to a too deep type instantiation. We only use this type internally
 * so I've opted to type the _internal metadata in the registry as any. However the Metadata.getInternalMetadata
 * method has an explicit return type of ZodOpenAPIInternalMetadata.
 */

declare module 'zod' {
  interface ZodType<out Output = unknown, out Input$1 = unknown, out Internals extends $ZodTypeInternals<Output, Input$1> = $ZodTypeInternals<Output, Input$1>> extends $ZodType<Output, Input$1, Internals> {
    openapi(metadata: Partial<ZodOpenAPIMetadata<Input$1>>, options?: OpenApiOptions): this;
    openapi(refId: string, metadata?: Partial<ZodOpenAPIMetadata<Input$1>>, options?: OpenApiOptions): this;
  }
}
//#endregion
//#region src/schema/game.d.ts
declare const gamePhaseSchema: ZodEnum<{
  waiting: "waiting";
  setup: "setup";
  running: "running";
  completed: "completed";
}>;
declare const snapshotSchema: ZodObject<{
  sessionId: ZodString;
  phase: ZodEnum<{
    waiting: "waiting";
    setup: "setup";
    running: "running";
    completed: "completed";
  }>;
  deck: ZodArray<ZodNumber>;
  discardHidden: ZodArray<ZodNumber>;
  playerOrder: ZodArray<ZodString>;
  rngSeed: ZodString;
  players: ZodArray<ZodObject<{
    id: ZodString;
    displayName: ZodString;
  }, $strip>>;
  chips: ZodRecord<ZodString, ZodNumber>;
  hands: ZodRecord<ZodString, ZodArray<ZodNumber>>;
  centralPot: ZodNumber;
  turnState: ZodObject<{
    turn: ZodNumber;
    currentPlayerId: ZodString;
    currentPlayerIndex: ZodNumber;
    cardInCenter: ZodNullable<ZodNumber>;
    awaitingAction: ZodBoolean;
    deadline: ZodOptional<ZodNullable<ZodString>>;
  }, $strip>;
  createdAt: ZodString;
  updatedAt: ZodString;
  finalResults: ZodNullable<ZodObject<{
    placements: ZodArray<ZodObject<{
      rank: ZodNumber;
      playerId: ZodString;
      score: ZodNumber;
      chipsRemaining: ZodNumber;
      cards: ZodArray<ZodNumber>;
      cardSets: ZodArray<ZodArray<ZodNumber>>;
    }, $strip>>;
    tieBreak: ZodNullable<ZodObject<{
      reason: ZodLiteral<"chipCount">;
      tiedScore: ZodNumber;
      contenders: ZodArray<ZodString>;
      winner: ZodNullable<ZodString>;
    }, $strip>>;
  }, $strip>>;
  maxPlayers: ZodNumber;
}, $strip>;
//#endregion
//#region src/states/inMemoryGameStore.d.ts
type TimerHandle = ReturnType<typeof setTimeout>;
type GamePhase = output<typeof gamePhaseSchema>;
type GameSnapshot = output<typeof snapshotSchema>;
type EventLogEntry = {
  id: string;
  turn: number;
  actor: string;
  action: string;
  timestamp: string;
  chipsDelta?: number;
  details?: Record<string, unknown>;
};
type Mutex = {
  runExclusive: <T$1>(task: () => Promise<T$1> | T$1) => Promise<T$1>;
};
type SessionEnvelope = {
  version: string;
  snapshot: GameSnapshot;
  eventLog: EventLogEntry[];
  processedCommands: Set<string>;
  mutex: Mutex;
  deadlineHandle?: TimerHandle;
  deadlineAt?: number;
};
type SessionSummary = {
  sessionId: string;
  phase: GamePhase;
  version: string;
  updatedAt: string;
};
type InMemoryGameStore = {
  saveSnapshot: (snapshot: GameSnapshot) => SessionEnvelope;
  getSnapshot: (sessionId: string) => GameSnapshot | undefined;
  getEnvelope: (sessionId: string) => SessionEnvelope | undefined;
  appendEventLog: (sessionId: string, entries: readonly EventLogEntry[]) => EventLogEntry[];
  listEventLogAfter: (sessionId: string, afterId?: string) => EventLogEntry[];
  hasProcessedCommand: (sessionId: string, commandId: string) => boolean;
  markCommandProcessed: (sessionId: string, commandId: string) => void;
  listSessions: () => SessionSummary[];
  /**
   * 指定した日時より前に更新されたセッションを削除する。
   * @param olderThan この日時より前のセッションを削除。
   * @returns 削除されたセッションIDのリスト。
   */
  pruneSessionsOlderThan: (olderThan: Date) => string[];
};
//#endregion
//#region src/services/ruleHintService.d.ts
type RuleHintEmphasis = 'info' | 'warning';
type RuleHint = {
  text: string;
  emphasis: RuleHintEmphasis;
  turn: number;
  generatedAt: string;
};
type StoredRuleHint = {
  sessionId: string;
  stateVersion: string;
  hint: RuleHint;
};
type RuleHintService = {
  refreshHint: (snapshot: GameSnapshot, version: string) => StoredRuleHint;
  getLatestHint: (sessionId: string) => StoredRuleHint | null;
};
//#endregion
//#region src/services/sseBroadcastGateway.d.ts
type SseEventPayload = {
  id: string;
  event: string;
  data: string;
};
type ConnectOptions = {
  sessionId: string;
  lastEventId?: string;
  send: (event: SseEventPayload) => void;
};
type SseBroadcastGateway = {
  connect: (options: ConnectOptions) => {
    disconnect: () => void;
  };
  publishStateDelta: (sessionId: string, snapshot: GameSnapshot, version: string) => void;
  publishStateFinal: (sessionId: string, snapshot: GameSnapshot, version: string) => void;
  publishSystemError: (sessionId: string, payload: ErrorDetail) => void;
  publishEventLog: (sessionId: string, entry: EventLogEntry) => void;
  publishRuleHint: (sessionId: string, payload: {
    stateVersion: string;
    hint: RuleHint;
  }) => void;
};
//#endregion
//#region src/services/eventLogService.d.ts
type RecordActionInput = {
  sessionId: string;
  turn: number;
  actor: string;
  targetPlayer?: string;
  action: string;
  card: number | null;
  centralPotBefore: number;
  centralPotAfter: number;
  chipsBefore: number;
  chipsAfter: number;
  timestamp: string;
};
type RecordSystemEventInput = {
  sessionId: string;
  turn: number;
  actor: string;
  action: string;
  timestamp: string;
  details?: Record<string, unknown>;
  chipsDelta?: number;
};
type ReplayEntriesInput = {
  sessionId: string;
  lastEventId?: string;
  send: (entry: EventLogEntry) => Promise<void> | void;
};
type EventLogService = {
  recordAction: (input: RecordActionInput) => EventLogEntry;
  recordSystemEvent: (input: RecordSystemEventInput) => EventLogEntry;
  replayEntries: (input: ReplayEntriesInput) => Promise<void>;
  isEventLogId: (value: string | null) => boolean;
};
//#endregion
//#region src/services/timerSupervisor.d.ts
type TimerSupervisor = {
  register: (sessionId: string, deadlineIso: string | null | undefined) => void;
  clear: (sessionId: string) => void;
  restore: () => void;
};
//#endregion
//#region src/services/chipLedger.d.ts
type ChipLedgerAction = 'placeChip' | 'takeCard';
//#endregion
//#region src/services/turnDecision.d.ts
type TurnDecisionAction = ChipLedgerAction;
type TurnCommandInput = {
  sessionId: string;
  commandId: string;
  expectedVersion: string;
  playerId: string;
  action: TurnDecisionAction;
};
type TurnDecisionResult = {
  snapshot: GameSnapshot;
  version: string;
};
type TurnDecisionService = {
  applyCommand: (input: TurnCommandInput) => Promise<TurnDecisionResult>;
};
//#endregion
//#region src/routes/sessions/types.d.ts
type SessionRouteDependencies = {
  store: InMemoryGameStore;
  now: () => string;
  generateSessionId: () => string;
  turnService: TurnDecisionService;
  timerSupervisor: TimerSupervisor;
  turnTimeoutMs: number;
  sseGateway: SseBroadcastGateway;
  eventLogService: EventLogService;
  ruleHintService: RuleHintService;
  monitoring?: MonitoringService;
};
/**
 * 依存を c.var に注入するミドルウェアの環境型。
 */
type SessionEnv = {
  Variables: {
    deps: SessionRouteDependencies;
  };
};
//#endregion
//#region src/app.d.ts
type CreateAppOptions = {
  store?: InMemoryGameStore;
  now?: () => string;
  generateSessionId?: () => string;
  timerSupervisor?: TimerSupervisor;
  turnTimeoutMs?: number;
  sseGateway?: SseBroadcastGateway;
  eventLogService?: EventLogService;
  ruleHintService?: RuleHintService;
  monitoring?: MonitoringService;
};
/**
 * 共通ミドルウェアやドキュメント、ルートをまとめた API アプリケーションを構築する。
 * @param options ストアやクロック、ID 生成器などを差し替えるためのオプション。
 */
declare const createApp: (options?: CreateAppOptions) => Hono$1<SessionEnv, MergeSchemaPath<{
  "/sessions/:sessionId/logs/export.json": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {};
      outputFormat: string;
      status: 200;
    };
  };
}, "/"> & MergeSchemaPath<{
  "/sessions/:sessionId/logs/export.csv": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {};
      outputFormat: string;
      status: 200;
    };
  };
}, "/"> & MergeSchemaPath<{
  "/sessions/:sessionId/start": {
    $post: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 422;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        session_id: string;
        state_version: string;
        state: {
          sessionId: string;
          phase: "waiting" | "setup" | "running" | "completed";
          deck: number[];
          discardHidden: number[];
          playerOrder: string[];
          rngSeed: string;
          players: {
            id: string;
            displayName: string;
          }[];
          chips: {
            [x: string]: number;
          };
          hands: {
            [x: string]: number[];
          };
          centralPot: number;
          turnState: {
            turn: number;
            currentPlayerId: string;
            currentPlayerIndex: number;
            cardInCenter: number | null;
            awaitingAction: boolean;
            deadline?: string | null | undefined;
          };
          createdAt: string;
          updatedAt: string;
          finalResults: {
            placements: {
              rank: number;
              playerId: string;
              score: number;
              chipsRemaining: number;
              cards: number[];
              cardSets: number[][];
            }[];
            tieBreak: {
              reason: "chipCount";
              tiedScore: number;
              contenders: string[];
              winner: string | null;
            } | null;
          } | null;
          maxPlayers: number;
        };
      };
      outputFormat: "json";
      status: 200;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    };
  };
}, "/"> & MergeSchemaPath<{
  "/sessions/:sessionId/join": {
    $post: {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          player_id: string;
          display_name: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 422;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          player_id: string;
          display_name: string;
        };
      };
      output: {
        session_id: string;
        state_version: string;
        state: {
          sessionId: string;
          phase: "waiting" | "setup" | "running" | "completed";
          deck: number[];
          discardHidden: number[];
          playerOrder: string[];
          rngSeed: string;
          players: {
            id: string;
            displayName: string;
          }[];
          chips: {
            [x: string]: number;
          };
          hands: {
            [x: string]: number[];
          };
          centralPot: number;
          turnState: {
            turn: number;
            currentPlayerId: string;
            currentPlayerIndex: number;
            cardInCenter: number | null;
            awaitingAction: boolean;
            deadline?: string | null | undefined;
          };
          createdAt: string;
          updatedAt: string;
          finalResults: {
            placements: {
              rank: number;
              playerId: string;
              score: number;
              chipsRemaining: number;
              cards: number[];
              cardSets: number[][];
            }[];
            tieBreak: {
              reason: "chipCount";
              tiedScore: number;
              contenders: string[];
              winner: string | null;
            } | null;
          } | null;
          maxPlayers: number;
        };
      };
      outputFormat: "json";
      status: 200;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          player_id: string;
          display_name: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          player_id: string;
          display_name: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 409;
    };
  };
}, "/"> & MergeSchemaPath<{
  "/sessions/:sessionId/results": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 409;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        session_id: string;
        final_results: {
          placements: {
            rank: number;
            playerId: string;
            score: number;
            chipsRemaining: number;
            cards: number[];
            cardSets: number[][];
          }[];
          tieBreak: {
            reason: "chipCount";
            tiedScore: number;
            contenders: string[];
            winner: string | null;
          } | null;
        };
        event_log: {
          id: string;
          turn: number;
          actor: string;
          action: string;
          timestamp: string;
          chipsDelta?: number | undefined;
          details?: {
            [x: string]: JSONValue;
          } | undefined;
        }[];
      };
      outputFormat: "json";
      status: 200;
    };
  };
}, "/"> & MergeSchemaPath<{
  "/sessions/:sessionId/actions": {
    $post: {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          command_id: string;
          state_version: string;
          player_id: string;
          action: "placeChip" | "takeCard";
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 422;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          command_id: string;
          state_version: string;
          player_id: string;
          action: "placeChip" | "takeCard";
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          command_id: string;
          state_version: string;
          player_id: string;
          action: "placeChip" | "takeCard";
        };
      };
      output: {
        session_id: string;
        state_version: string;
        state: {
          sessionId: string;
          phase: "waiting" | "setup" | "running" | "completed";
          deck: number[];
          discardHidden: number[];
          playerOrder: string[];
          rngSeed: string;
          players: {
            id: string;
            displayName: string;
          }[];
          chips: {
            [x: string]: number;
          };
          hands: {
            [x: string]: number[];
          };
          centralPot: number;
          turnState: {
            turn: number;
            currentPlayerId: string;
            currentPlayerIndex: number;
            cardInCenter: number | null;
            awaitingAction: boolean;
            deadline?: string | null | undefined;
          };
          createdAt: string;
          updatedAt: string;
          finalResults: {
            placements: {
              rank: number;
              playerId: string;
              score: number;
              chipsRemaining: number;
              cards: number[];
              cardSets: number[][];
            }[];
            tieBreak: {
              reason: "chipCount";
              tiedScore: number;
              contenders: string[];
              winner: string | null;
            } | null;
          } | null;
          maxPlayers: number;
        };
        turn_context: {
          turn: number;
          current_player_id: string;
          card_in_center: number | null;
          awaiting_action: boolean;
          central_pot: number;
          chips: {
            [x: string]: number;
          };
        };
      };
      outputFormat: "json";
      status: 200;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          command_id: string;
          state_version: string;
          player_id: string;
          action: "placeChip" | "takeCard";
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 409;
    };
  };
}, "/"> & MergeSchemaPath<{
  "/sessions/:sessionId/stream": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {};
      outputFormat: string;
      status: 200;
    };
  };
}, "/"> & MergeSchemaPath<{
  "/sessions/:sessionId/hint": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        session_id: string;
        state_version: string;
        generated_from_version: string;
        hint: {
          text: string;
          emphasis: "info" | "warning";
          turn: number;
          generated_at: string;
        };
      };
      outputFormat: "json";
      status: 200;
    };
  };
}, "/"> & MergeSchemaPath<{
  "/sessions/:sessionId/state": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        session_id: string;
        state_version: string;
        state: {
          sessionId: string;
          phase: "waiting" | "setup" | "running" | "completed";
          deck: number[];
          discardHidden: number[];
          playerOrder: string[];
          rngSeed: string;
          players: {
            id: string;
            displayName: string;
          }[];
          chips: {
            [x: string]: number;
          };
          hands: {
            [x: string]: number[];
          };
          centralPot: number;
          turnState: {
            turn: number;
            currentPlayerId: string;
            currentPlayerIndex: number;
            cardInCenter: number | null;
            awaitingAction: boolean;
            deadline?: string | null | undefined;
          };
          createdAt: string;
          updatedAt: string;
          finalResults: {
            placements: {
              rank: number;
              playerId: string;
              score: number;
              chipsRemaining: number;
              cards: number[];
              cardSets: number[][];
            }[];
            tieBreak: {
              reason: "chipCount";
              tiedScore: number;
              contenders: string[];
              winner: string | null;
            } | null;
          } | null;
          maxPlayers: number;
        };
      };
      outputFormat: "json";
      status: 200;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {};
      outputFormat: string;
      status: 304;
    };
  };
}, "/"> & MergeSchemaPath<{
  "/sessions/:sessionId": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        session_id: string;
        state_version: string;
        state: {
          sessionId: string;
          phase: "waiting" | "setup" | "running" | "completed";
          deck: number[];
          discardHidden: number[];
          playerOrder: string[];
          rngSeed: string;
          players: {
            id: string;
            displayName: string;
          }[];
          chips: {
            [x: string]: number;
          };
          hands: {
            [x: string]: number[];
          };
          centralPot: number;
          turnState: {
            turn: number;
            currentPlayerId: string;
            currentPlayerIndex: number;
            cardInCenter: number | null;
            awaitingAction: boolean;
            deadline?: string | null | undefined;
          };
          createdAt: string;
          updatedAt: string;
          finalResults: {
            placements: {
              rank: number;
              playerId: string;
              score: number;
              chipsRemaining: number;
              cards: number[];
              cardSets: number[][];
            }[];
            tieBreak: {
              reason: "chipCount";
              tiedScore: number;
              contenders: string[];
              winner: string | null;
            } | null;
          } | null;
          maxPlayers: number;
        };
      };
      outputFormat: "json";
      status: 200;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    };
  };
}, "/"> & MergeSchemaPath<{
  "/sessions": {
    $get: {
      input: {};
      output: {
        sessions: {
          sessionId: string;
          playerCount: number;
          maxPlayers: number;
          phase: "waiting" | "setup" | "running" | "completed";
          createdAt: string;
        }[];
      };
      outputFormat: "json";
      status: 200;
    };
  };
}, "/"> & MergeSchemaPath<{
  "/sessions": {
    $post: {
      input: {
        json: {
          max_players: number;
          seed?: string | undefined;
        };
      };
      output: {
        session_id: string;
        state_version: string;
        state: {
          sessionId: string;
          phase: "waiting" | "setup" | "running" | "completed";
          deck: number[];
          discardHidden: number[];
          playerOrder: string[];
          rngSeed: string;
          players: {
            id: string;
            displayName: string;
          }[];
          chips: {
            [x: string]: number;
          };
          hands: {
            [x: string]: number[];
          };
          centralPot: number;
          turnState: {
            turn: number;
            currentPlayerId: string;
            currentPlayerIndex: number;
            cardInCenter: number | null;
            awaitingAction: boolean;
            deadline?: string | null | undefined;
          };
          createdAt: string;
          updatedAt: string;
          finalResults: {
            placements: {
              rank: number;
              playerId: string;
              score: number;
              chipsRemaining: number;
              cards: number[];
              cardSets: number[][];
            }[];
            tieBreak: {
              reason: "chipCount";
              tiedScore: number;
              contenders: string[];
              winner: string | null;
            } | null;
          } | null;
          maxPlayers: number;
        };
      };
      outputFormat: "json";
      status: 201;
    } | {
      input: {
        json: {
          max_players: number;
          seed?: string | undefined;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 422;
    };
  };
}, "/"> & {
  "/doc": {
    $get: {
      input: {};
      output: {};
      outputFormat: "json";
      status: StatusCode;
    };
  };
} & {
  "/scalar": {
    $get: {
      input: {};
      output: {};
      outputFormat: string;
      status: StatusCode;
    };
  };
}, "/">;
type AppType = ReturnType<typeof createApp>;
//#endregion
//#region src/client.d.ts
type Client = ReturnType<typeof hc<AppType>>;
declare const hcWithType: (...args: Parameters<typeof hc>) => Client;
//#endregion
export { Client, hcWithType };