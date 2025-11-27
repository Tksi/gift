import { createServer } from "http";
import { Http2ServerRequest } from "http2";
import { Readable } from "stream";
import crypto$1 from "crypto";
import { createHash, randomBytes, randomUUID } from "node:crypto";

//#region rolldown:runtime
var __defProp = Object.defineProperty;
var __export = (all, symbols) => {
	let target = {};
	for (var name in all) {
		__defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	}
	if (symbols) {
		__defProp(target, Symbol.toStringTag, { value: "Module" });
	}
	return target;
};

//#endregion
//#region node_modules/@hono/node-server/dist/index.mjs
var RequestError = class extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = "RequestError";
	}
};
var toRequestError = (e) => {
	if (e instanceof RequestError) return e;
	return new RequestError(e.message, { cause: e });
};
var GlobalRequest = global.Request;
var Request$1 = class extends GlobalRequest {
	constructor(input, options) {
		if (typeof input === "object" && getRequestCache in input) input = input[getRequestCache]();
		if (typeof options?.body?.getReader !== "undefined") options.duplex ??= "half";
		super(input, options);
	}
};
var newHeadersFromIncoming = (incoming) => {
	const headerRecord = [];
	const rawHeaders = incoming.rawHeaders;
	for (let i = 0; i < rawHeaders.length; i += 2) {
		const { [i]: key, [i + 1]: value } = rawHeaders;
		if (key.charCodeAt(0) !== 58) headerRecord.push([key, value]);
	}
	return new Headers(headerRecord);
};
var wrapBodyStream = Symbol("wrapBodyStream");
var newRequestFromIncoming = (method, url$1, headers, incoming, abortController) => {
	const init = {
		method,
		headers,
		signal: abortController.signal
	};
	if (method === "TRACE") {
		init.method = "GET";
		const req = new Request$1(url$1, init);
		Object.defineProperty(req, "method", { get() {
			return "TRACE";
		} });
		return req;
	}
	if (!(method === "GET" || method === "HEAD")) if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) init.body = new ReadableStream({ start(controller) {
		controller.enqueue(incoming.rawBody);
		controller.close();
	} });
	else if (incoming[wrapBodyStream]) {
		let reader;
		init.body = new ReadableStream({ async pull(controller) {
			try {
				reader ||= Readable.toWeb(incoming).getReader();
				const { done, value } = await reader.read();
				if (done) controller.close();
				else controller.enqueue(value);
			} catch (error$45) {
				controller.error(error$45);
			}
		} });
	} else init.body = Readable.toWeb(incoming);
	return new Request$1(url$1, init);
};
var getRequestCache = Symbol("getRequestCache");
var requestCache = Symbol("requestCache");
var incomingKey = Symbol("incomingKey");
var urlKey = Symbol("urlKey");
var headersKey = Symbol("headersKey");
var abortControllerKey = Symbol("abortControllerKey");
var requestPrototype = {
	get method() {
		return this[incomingKey].method || "GET";
	},
	get url() {
		return this[urlKey];
	},
	get headers() {
		return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
	},
	[Symbol("getAbortController")]() {
		this[getRequestCache]();
		return this[abortControllerKey];
	},
	[getRequestCache]() {
		this[abortControllerKey] ||= new AbortController();
		return this[requestCache] ||= newRequestFromIncoming(this.method, this[urlKey], this.headers, this[incomingKey], this[abortControllerKey]);
	}
};
[
	"body",
	"bodyUsed",
	"cache",
	"credentials",
	"destination",
	"integrity",
	"mode",
	"redirect",
	"referrer",
	"referrerPolicy",
	"signal",
	"keepalive"
].forEach((k) => {
	Object.defineProperty(requestPrototype, k, { get() {
		return this[getRequestCache]()[k];
	} });
});
[
	"arrayBuffer",
	"blob",
	"clone",
	"formData",
	"json",
	"text"
].forEach((k) => {
	Object.defineProperty(requestPrototype, k, { value: function() {
		return this[getRequestCache]()[k]();
	} });
});
Object.setPrototypeOf(requestPrototype, Request$1.prototype);
var newRequest = (incoming, defaultHostname) => {
	const req = Object.create(requestPrototype);
	req[incomingKey] = incoming;
	const incomingUrl = incoming.url || "";
	if (incomingUrl[0] !== "/" && (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
		if (incoming instanceof Http2ServerRequest) throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
		try {
			req[urlKey] = new URL(incomingUrl).href;
		} catch (e) {
			throw new RequestError("Invalid absolute URL", { cause: e });
		}
		return req;
	}
	const host = (incoming instanceof Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
	if (!host) throw new RequestError("Missing host header");
	let scheme;
	if (incoming instanceof Http2ServerRequest) {
		scheme = incoming.scheme;
		if (!(scheme === "http" || scheme === "https")) throw new RequestError("Unsupported scheme");
	} else scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
	const url$1 = new URL(`${scheme}://${host}${incomingUrl}`);
	if (url$1.hostname.length !== host.length && url$1.hostname !== host.replace(/:\d+$/, "")) throw new RequestError("Invalid host header");
	req[urlKey] = url$1.href;
	return req;
};
var responseCache = Symbol("responseCache");
var getResponseCache = Symbol("getResponseCache");
var cacheKey = Symbol("cache");
var GlobalResponse = global.Response;
var Response2 = class _Response {
	#body;
	#init;
	[getResponseCache]() {
		delete this[cacheKey];
		return this[responseCache] ||= new GlobalResponse(this.#body, this.#init);
	}
	constructor(body, init) {
		let headers;
		this.#body = body;
		if (init instanceof _Response) {
			const cachedGlobalResponse = init[responseCache];
			if (cachedGlobalResponse) {
				this.#init = cachedGlobalResponse;
				this[getResponseCache]();
				return;
			} else {
				this.#init = init.#init;
				headers = new Headers(init.#init.headers);
			}
		} else this.#init = init;
		if (typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) {
			headers ||= init?.headers || { "content-type": "text/plain; charset=UTF-8" };
			this[cacheKey] = [
				init?.status || 200,
				body,
				headers
			];
		}
	}
	get headers() {
		const cache = this[cacheKey];
		if (cache) {
			if (!(cache[2] instanceof Headers)) cache[2] = new Headers(cache[2]);
			return cache[2];
		}
		return this[getResponseCache]().headers;
	}
	get status() {
		return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
	}
	get ok() {
		const status = this.status;
		return status >= 200 && status < 300;
	}
};
[
	"body",
	"bodyUsed",
	"redirected",
	"statusText",
	"trailers",
	"type",
	"url"
].forEach((k) => {
	Object.defineProperty(Response2.prototype, k, { get() {
		return this[getResponseCache]()[k];
	} });
});
[
	"arrayBuffer",
	"blob",
	"clone",
	"formData",
	"json",
	"text"
].forEach((k) => {
	Object.defineProperty(Response2.prototype, k, { value: function() {
		return this[getResponseCache]()[k]();
	} });
});
Object.setPrototypeOf(Response2, GlobalResponse);
Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
async function readWithoutBlocking(readPromise) {
	return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
	const cancel = (error$45) => {
		reader.cancel(error$45).catch(() => {});
	};
	writable.on("close", cancel);
	writable.on("error", cancel);
	(currentReadPromise ?? reader.read()).then(flow, handleStreamError);
	return reader.closed.finally(() => {
		writable.off("close", cancel);
		writable.off("error", cancel);
	});
	function handleStreamError(error$45) {
		if (error$45) writable.destroy(error$45);
	}
	function onDrain() {
		reader.read().then(flow, handleStreamError);
	}
	function flow({ done, value }) {
		try {
			if (done) writable.end();
			else if (!writable.write(value)) writable.once("drain", onDrain);
			else return reader.read().then(flow, handleStreamError);
		} catch (e) {
			handleStreamError(e);
		}
	}
}
function writeFromReadableStream(stream, writable) {
	if (stream.locked) throw new TypeError("ReadableStream is locked.");
	else if (writable.destroyed) return;
	return writeFromReadableStreamDefaultReader(stream.getReader(), writable);
}
var buildOutgoingHttpHeaders = (headers) => {
	const res = {};
	if (!(headers instanceof Headers)) headers = new Headers(headers ?? void 0);
	const cookies = [];
	for (const [k, v] of headers) if (k === "set-cookie") cookies.push(v);
	else res[k] = v;
	if (cookies.length > 0) res["set-cookie"] = cookies;
	res["content-type"] ??= "text/plain; charset=UTF-8";
	return res;
};
var X_ALREADY_SENT = "x-hono-already-sent";
var webFetch = global.fetch;
if (typeof global.crypto === "undefined") global.crypto = crypto$1;
global.fetch = (info, init) => {
	init = {
		compress: false,
		...init
	};
	return webFetch(info, init);
};
var outgoingEnded = Symbol("outgoingEnded");
var handleRequestError = () => new Response(null, { status: 400 });
var handleFetchError = (e) => new Response(null, { status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500 });
var handleResponseError = (e, outgoing) => {
	const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
	if (err.code === "ERR_STREAM_PREMATURE_CLOSE") console.info("The user aborted a request.");
	else {
		console.error(e);
		if (!outgoing.headersSent) outgoing.writeHead(500, { "Content-Type": "text/plain" });
		outgoing.end(`Error: ${err.message}`);
		outgoing.destroy(err);
	}
};
var flushHeaders = (outgoing) => {
	if ("flushHeaders" in outgoing && outgoing.writable) outgoing.flushHeaders();
};
var responseViaCache = async (res, outgoing) => {
	let [status, body, header] = res[cacheKey];
	if (header instanceof Headers) header = buildOutgoingHttpHeaders(header);
	if (typeof body === "string") header["Content-Length"] = Buffer.byteLength(body);
	else if (body instanceof Uint8Array) header["Content-Length"] = body.byteLength;
	else if (body instanceof Blob) header["Content-Length"] = body.size;
	outgoing.writeHead(status, header);
	if (typeof body === "string" || body instanceof Uint8Array) outgoing.end(body);
	else if (body instanceof Blob) outgoing.end(new Uint8Array(await body.arrayBuffer()));
	else {
		flushHeaders(outgoing);
		await writeFromReadableStream(body, outgoing)?.catch((e) => handleResponseError(e, outgoing));
	}
	outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
	if (isPromise(res)) if (options.errorHandler) try {
		res = await res;
	} catch (err) {
		const errRes = await options.errorHandler(err);
		if (!errRes) return;
		res = errRes;
	}
	else res = await res.catch(handleFetchError);
	if (cacheKey in res) return responseViaCache(res, outgoing);
	const resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
	if (res.body) {
		const reader = res.body.getReader();
		const values = [];
		let done = false;
		let currentReadPromise = void 0;
		if (resHeaderRecord["transfer-encoding"] !== "chunked") {
			let maxReadCount = 2;
			for (let i = 0; i < maxReadCount; i++) {
				currentReadPromise ||= reader.read();
				const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
					console.error(e);
					done = true;
				});
				if (!chunk) {
					if (i === 1) {
						await new Promise((resolve) => setTimeout(resolve));
						maxReadCount = 3;
						continue;
					}
					break;
				}
				currentReadPromise = void 0;
				if (chunk.value) values.push(chunk.value);
				if (chunk.done) {
					done = true;
					break;
				}
			}
			if (done && !("content-length" in resHeaderRecord)) resHeaderRecord["content-length"] = values.reduce((acc, value) => acc + value.length, 0);
		}
		outgoing.writeHead(res.status, resHeaderRecord);
		values.forEach((value) => {
			outgoing.write(value);
		});
		if (done) outgoing.end();
		else {
			if (values.length === 0) flushHeaders(outgoing);
			await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
		}
	} else if (resHeaderRecord[X_ALREADY_SENT]) {} else {
		outgoing.writeHead(res.status, resHeaderRecord);
		outgoing.end();
	}
	outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
	const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
	if (options.overrideGlobalObjects !== false && global.Request !== Request$1) {
		Object.defineProperty(global, "Request", { value: Request$1 });
		Object.defineProperty(global, "Response", { value: Response2 });
	}
	return async (incoming, outgoing) => {
		let res, req;
		try {
			req = newRequest(incoming, options.hostname);
			let incomingEnded = !autoCleanupIncoming || incoming.method === "GET" || incoming.method === "HEAD";
			if (!incomingEnded) {
				incoming[wrapBodyStream] = true;
				incoming.on("end", () => {
					incomingEnded = true;
				});
				if (incoming instanceof Http2ServerRequest) outgoing[outgoingEnded] = () => {
					if (!incomingEnded) setTimeout(() => {
						if (!incomingEnded) setTimeout(() => {
							incoming.destroy();
							outgoing.destroy();
						});
					});
				};
			}
			outgoing.on("close", () => {
				if (req[abortControllerKey]) {
					if (incoming.errored) req[abortControllerKey].abort(incoming.errored.toString());
					else if (!outgoing.writableFinished) req[abortControllerKey].abort("Client connection prematurely closed.");
				}
				if (!incomingEnded) setTimeout(() => {
					if (!incomingEnded) setTimeout(() => {
						incoming.destroy();
					});
				});
			});
			res = fetchCallback(req, {
				incoming,
				outgoing
			});
			if (cacheKey in res) return responseViaCache(res, outgoing);
		} catch (e) {
			if (!res) if (options.errorHandler) {
				res = await options.errorHandler(req ? e : toRequestError(e));
				if (!res) return;
			} else if (!req) res = handleRequestError();
			else res = handleFetchError(e);
			else return handleResponseError(e, outgoing);
		}
		try {
			return await responseViaResponseObject(res, outgoing, options);
		} catch (e) {
			return handleResponseError(e, outgoing);
		}
	};
};
var createAdaptorServer = (options) => {
	const fetchCallback = options.fetch;
	const requestListener = getRequestListener(fetchCallback, {
		hostname: options.hostname,
		overrideGlobalObjects: options.overrideGlobalObjects,
		autoCleanupIncoming: options.autoCleanupIncoming
	});
	return (options.createServer || createServer)(options.serverOptions || {}, requestListener);
};
var serve = (options, listeningListener) => {
	const server = createAdaptorServer(options);
	server.listen(options?.port ?? 3e3, options.hostname, () => {
		const serverInfo = server.address();
		listeningListener && listeningListener(serverInfo);
	});
	return server;
};

//#endregion
//#region node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
	const paths = path.split("/");
	if (paths[0] === "") paths.shift();
	return paths;
};
var splitRoutingPath = (routePath) => {
	const { groups, path } = extractGroupsFromPath(routePath);
	return replaceGroupMarks(splitPath(path), groups);
};
var extractGroupsFromPath = (path) => {
	const groups = [];
	path = path.replace(/\{[^}]+\}/g, (match$1, index) => {
		const mark = `@${index}`;
		groups.push([mark, match$1]);
		return mark;
	});
	return {
		groups,
		path
	};
};
var replaceGroupMarks = (paths, groups) => {
	for (let i = groups.length - 1; i >= 0; i--) {
		const [mark] = groups[i];
		for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
			paths[j] = paths[j].replace(mark, groups[i][1]);
			break;
		}
	}
	return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
	if (label === "*") return "*";
	const match$1 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
	if (match$1) {
		const cacheKey$1 = `${label}#${next}`;
		if (!patternCache[cacheKey$1]) if (match$1[2]) patternCache[cacheKey$1] = next && next[0] !== ":" && next[0] !== "*" ? [
			cacheKey$1,
			match$1[1],
			/* @__PURE__ */ new RegExp(`^${match$1[2]}(?=/${next})`)
		] : [
			label,
			match$1[1],
			/* @__PURE__ */ new RegExp(`^${match$1[2]}$`)
		];
		else patternCache[cacheKey$1] = [
			label,
			match$1[1],
			true
		];
		return patternCache[cacheKey$1];
	}
	return null;
};
var tryDecode = (str, decoder) => {
	try {
		return decoder(str);
	} catch {
		return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match$1) => {
			try {
				return decoder(match$1);
			} catch {
				return match$1;
			}
		});
	}
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
	const url$1 = request.url;
	const start = url$1.indexOf("/", url$1.indexOf(":") + 4);
	let i = start;
	for (; i < url$1.length; i++) {
		const charCode = url$1.charCodeAt(i);
		if (charCode === 37) {
			const queryIndex = url$1.indexOf("?", i);
			const path = url$1.slice(start, queryIndex === -1 ? void 0 : queryIndex);
			return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
		} else if (charCode === 63) break;
	}
	return url$1.slice(start, i);
};
var getPathNoStrict = (request) => {
	const result = getPath(request);
	return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
	if (rest.length) sub = mergePath(sub, ...rest);
	return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
	if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
	const segments = path.split("/");
	const results = [];
	let basePath = "";
	segments.forEach((segment) => {
		if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
		else if (/\:/.test(segment)) if (/\?/.test(segment)) {
			if (results.length === 0 && basePath === "") results.push("/");
			else results.push(basePath);
			const optionalSegment = segment.replace("?", "");
			basePath += "/" + optionalSegment;
			results.push(basePath);
		} else basePath += "/" + segment;
	});
	return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
	if (!/[%+]/.test(value)) return value;
	if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
	return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url$1, key, multiple) => {
	let encoded;
	if (!multiple && key && !/[%+]/.test(key)) {
		let keyIndex2 = url$1.indexOf(`?${key}`, 8);
		if (keyIndex2 === -1) keyIndex2 = url$1.indexOf(`&${key}`, 8);
		while (keyIndex2 !== -1) {
			const trailingKeyCode = url$1.charCodeAt(keyIndex2 + key.length + 1);
			if (trailingKeyCode === 61) {
				const valueIndex = keyIndex2 + key.length + 2;
				const endIndex = url$1.indexOf("&", valueIndex);
				return _decodeURI(url$1.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
			} else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) return "";
			keyIndex2 = url$1.indexOf(`&${key}`, keyIndex2 + 1);
		}
		encoded = /[%+]/.test(url$1);
		if (!encoded) return;
	}
	const results = {};
	encoded ??= /[%+]/.test(url$1);
	let keyIndex = url$1.indexOf("?", 8);
	while (keyIndex !== -1) {
		const nextKeyIndex = url$1.indexOf("&", keyIndex + 1);
		let valueIndex = url$1.indexOf("=", keyIndex);
		if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
		let name = url$1.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
		if (encoded) name = _decodeURI(name);
		keyIndex = nextKeyIndex;
		if (name === "") continue;
		let value;
		if (valueIndex === -1) value = "";
		else {
			value = url$1.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
			if (encoded) value = _decodeURI(value);
		}
		if (multiple) {
			if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
			results[name].push(value);
		} else results[name] ??= value;
	}
	return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url$1, key) => {
	return _getQueryParam(url$1, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

//#endregion
//#region node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse$2 = (cookie, name) => {
	if (name && cookie.indexOf(name) === -1) return {};
	const pairs = cookie.trim().split(";");
	const parsedCookie = {};
	for (let pairStr of pairs) {
		pairStr = pairStr.trim();
		const valueStartPos = pairStr.indexOf("=");
		if (valueStartPos === -1) continue;
		const cookieName = pairStr.substring(0, valueStartPos).trim();
		if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName)) continue;
		let cookieValue = pairStr.substring(valueStartPos + 1).trim();
		if (cookieValue.startsWith("\"") && cookieValue.endsWith("\"")) cookieValue = cookieValue.slice(1, -1);
		if (validCookieValueRegEx.test(cookieValue)) {
			parsedCookie[cookieName] = cookieValue.indexOf("%") !== -1 ? tryDecode(cookieValue, decodeURIComponent_) : cookieValue;
			if (name) break;
		}
	}
	return parsedCookie;
};
var _serialize = (name, value, opt = {}) => {
	let cookie = `${name}=${value}`;
	if (name.startsWith("__Secure-") && !opt.secure) throw new Error("__Secure- Cookie must have Secure attributes");
	if (name.startsWith("__Host-")) {
		if (!opt.secure) throw new Error("__Host- Cookie must have Secure attributes");
		if (opt.path !== "/") throw new Error("__Host- Cookie must have Path attributes with \"/\"");
		if (opt.domain) throw new Error("__Host- Cookie must not have Domain attributes");
	}
	if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
		if (opt.maxAge > 3456e4) throw new Error("Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.");
		cookie += `; Max-Age=${opt.maxAge | 0}`;
	}
	if (opt.domain && opt.prefix !== "host") cookie += `; Domain=${opt.domain}`;
	if (opt.path) cookie += `; Path=${opt.path}`;
	if (opt.expires) {
		if (opt.expires.getTime() - Date.now() > 3456e7) throw new Error("Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.");
		cookie += `; Expires=${opt.expires.toUTCString()}`;
	}
	if (opt.httpOnly) cookie += "; HttpOnly";
	if (opt.secure) cookie += "; Secure";
	if (opt.sameSite) cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
	if (opt.priority) cookie += `; Priority=${opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1)}`;
	if (opt.partitioned) {
		if (!opt.secure) throw new Error("Partitioned Cookie must have Secure attributes");
		cookie += "; Partitioned";
	}
	return cookie;
};
var serialize = (name, value, opt) => {
	value = encodeURIComponent(value);
	return _serialize(name, value, opt);
};

//#endregion
//#region node_modules/hono/dist/client/utils.js
var mergePath$1 = (base, path) => {
	base = base.replace(/\/+$/, "");
	base = base + "/";
	path = path.replace(/^\/+/, "");
	return base + path;
};
var replaceUrlParam = (urlString, params) => {
	for (const [k, v] of Object.entries(params)) {
		const reg = /* @__PURE__ */ new RegExp("/:" + k + "(?:{[^/]+})?\\??");
		urlString = urlString.replace(reg, v ? `/${v}` : "");
	}
	return urlString;
};
var buildSearchParams = (query) => {
	const searchParams = new URLSearchParams();
	for (const [k, v] of Object.entries(query)) {
		if (v === void 0) continue;
		if (Array.isArray(v)) for (const v2 of v) searchParams.append(k, v2);
		else searchParams.set(k, v);
	}
	return searchParams;
};
var replaceUrlProtocol = (urlString, protocol) => {
	switch (protocol) {
		case "ws": return urlString.replace(/^http/, "ws");
		case "http": return urlString.replace(/^ws/, "http");
	}
};
var removeIndexString = (urlString) => {
	if (/^https?:\/\/[^\/]+?\/index(?=\?|$)/.test(urlString)) return urlString.replace(/\/index(?=\?|$)/, "/");
	return urlString.replace(/\/index(?=\?|$)/, "");
};
function isObject$2(item) {
	return typeof item === "object" && item !== null && !Array.isArray(item);
}
function deepMerge(target, source) {
	if (!isObject$2(target) && !isObject$2(source)) return source;
	const merged = { ...target };
	for (const key in source) {
		const value = source[key];
		if (isObject$2(merged[key]) && isObject$2(value)) merged[key] = deepMerge(merged[key], value);
		else merged[key] = value;
	}
	return merged;
}

//#endregion
//#region node_modules/hono/dist/client/client.js
var createProxy = (callback, path) => {
	return new Proxy(() => {}, {
		get(_obj, key) {
			if (typeof key !== "string" || key === "then") return;
			return createProxy(callback, [...path, key]);
		},
		apply(_1, _2, args) {
			return callback({
				path,
				args
			});
		}
	});
};
var ClientRequestImpl = class {
	url;
	method;
	queryParams = void 0;
	pathParams = {};
	rBody;
	cType = void 0;
	constructor(url$1, method) {
		this.url = url$1;
		this.method = method;
	}
	fetch = async (args, opt) => {
		if (args) {
			if (args.query) this.queryParams = buildSearchParams(args.query);
			if (args.form) {
				const form = new FormData();
				for (const [k, v] of Object.entries(args.form)) if (Array.isArray(v)) for (const v2 of v) form.append(k, v2);
				else form.append(k, v);
				this.rBody = form;
			}
			if (args.json) {
				this.rBody = JSON.stringify(args.json);
				this.cType = "application/json";
			}
			if (args.param) this.pathParams = args.param;
		}
		let methodUpperCase = this.method.toUpperCase();
		const headerValues = {
			...args?.header,
			...typeof opt?.headers === "function" ? await opt.headers() : opt?.headers
		};
		if (args?.cookie) {
			const cookies = [];
			for (const [key, value] of Object.entries(args.cookie)) cookies.push(serialize(key, value, { path: "/" }));
			headerValues["Cookie"] = cookies.join(",");
		}
		if (this.cType) headerValues["Content-Type"] = this.cType;
		const headers = new Headers(headerValues ?? void 0);
		let url$1 = this.url;
		url$1 = removeIndexString(url$1);
		url$1 = replaceUrlParam(url$1, this.pathParams);
		if (this.queryParams) url$1 = url$1 + "?" + this.queryParams.toString();
		methodUpperCase = this.method.toUpperCase();
		const setBody = !(methodUpperCase === "GET" || methodUpperCase === "HEAD");
		return (opt?.fetch || fetch)(url$1, {
			body: setBody ? this.rBody : void 0,
			method: methodUpperCase,
			headers,
			...opt?.init
		});
	};
};
var hc = (baseUrl, options) => createProxy(function proxyCallback(opts) {
	const parts = [...opts.path];
	const lastParts = parts.slice(-3).reverse();
	if (lastParts[0] === "toString") {
		if (lastParts[1] === "name") return lastParts[2] || "";
		return proxyCallback.toString();
	}
	if (lastParts[0] === "valueOf") {
		if (lastParts[1] === "name") return lastParts[2] || "";
		return proxyCallback;
	}
	let method = "";
	if (/^\$/.test(lastParts[0])) {
		const last = parts.pop();
		if (last) method = last.replace(/^\$/, "");
	}
	const url$1 = mergePath$1(baseUrl, parts.join("/"));
	if (method === "url") {
		let result = url$1;
		if (opts.args[0]) {
			if (opts.args[0].param) result = replaceUrlParam(url$1, opts.args[0].param);
			if (opts.args[0].query) result = result + "?" + buildSearchParams(opts.args[0].query).toString();
		}
		result = removeIndexString(result);
		return new URL(result);
	}
	if (method === "ws") {
		const webSocketUrl = replaceUrlProtocol(opts.args[0] && opts.args[0].param ? replaceUrlParam(url$1, opts.args[0].param) : url$1, "ws");
		const targetUrl = new URL(webSocketUrl);
		const queryParams = opts.args[0]?.query;
		if (queryParams) Object.entries(queryParams).forEach(([key, value]) => {
			if (Array.isArray(value)) value.forEach((item) => targetUrl.searchParams.append(key, item));
			else targetUrl.searchParams.set(key, value);
		});
		const establishWebSocket = (...args) => {
			if (options?.webSocket !== void 0 && typeof options.webSocket === "function") return options.webSocket(...args);
			return new WebSocket(...args);
		};
		return establishWebSocket(targetUrl.toString());
	}
	const req = new ClientRequestImpl(url$1, method);
	if (method) {
		options ??= {};
		const args = deepMerge(options, { ...opts.args[1] });
		return req.fetch(opts.args[0], args);
	}
	return req;
}, []);

//#endregion
//#region node_modules/@asteasolutions/zod-to-openapi/dist/index.mjs
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
function __rest(s, e) {
	var t = {};
	for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
	if (s != null && typeof Object.getOwnPropertySymbols === "function") {
		for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
	}
	return t;
}
const ZodTypeKeys = {
	ZodAny: "any",
	ZodArray: "array",
	ZodBigInt: "bigint",
	ZodBoolean: "boolean",
	ZodDefault: "default",
	ZodTransform: "transform",
	ZodEnum: "enum",
	ZodIntersection: "intersection",
	ZodLiteral: "literal",
	ZodNever: "never",
	ZodNull: "null",
	ZodNullable: "nullable",
	ZodNumber: "number",
	ZodNonOptional: "nonoptional",
	ZodObject: "object",
	ZodOptional: "optional",
	ZodPipe: "pipe",
	ZodReadonly: "readonly",
	ZodRecord: "record",
	ZodString: "string",
	ZodTuple: "tuple",
	ZodType: "type",
	ZodUnion: "union",
	ZodDiscriminatedUnion: "union",
	ZodUnknown: "unknown",
	ZodVoid: "void",
	ZodDate: "date"
};
function isZodType(schema, typeNames) {
	return (Array.isArray(typeNames) ? typeNames : [typeNames]).some((typeName) => {
		var _a;
		const typeNameMatch = ((_a = schema === null || schema === void 0 ? void 0 : schema.def) === null || _a === void 0 ? void 0 : _a.type) === ZodTypeKeys[typeName];
		if (typeName === "ZodDiscriminatedUnion") return typeNameMatch && "discriminator" in schema.def;
		return typeNameMatch;
	});
}
function isAnyZodType(schema) {
	return "def" in schema;
}
/**
* The schema.isNullable() is deprecated. This is the suggested replacement
* as this was how isNullable operated beforehand.
*/
function isNullableSchema(schema) {
	return schema.safeParse(null).success;
}
/**
* The schema.isOptional() is deprecated. This is the suggested replacement
* as this was how isOptional operated beforehand.
*/
function isOptionalSchema(schema) {
	return schema.safeParse(void 0).success;
}
var $ZodRegistry$1 = class {
	constructor() {
		this._map = /* @__PURE__ */ new Map();
		this._idmap = /* @__PURE__ */ new Map();
	}
	add(schema, ..._meta) {
		const meta = _meta[0];
		this._map.set(schema, meta);
		if (meta && typeof meta === "object" && "id" in meta) {
			if (this._idmap.has(meta.id)) throw new Error(`ID ${meta.id} already exists in the registry`);
			this._idmap.set(meta.id, schema);
		}
		return this;
	}
	clear() {
		this._map = /* @__PURE__ */ new Map();
		this._idmap = /* @__PURE__ */ new Map();
		return this;
	}
	remove(schema) {
		const meta = this._map.get(schema);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
		this._map.delete(schema);
		return this;
	}
	get(schema) {
		const p = schema._zod.parent;
		if (p) {
			const pm = { ...this.get(p) ?? {} };
			delete pm.id;
			return {
				...pm,
				...this._map.get(schema)
			};
		}
		return this._map.get(schema);
	}
	has(schema) {
		return this._map.has(schema);
	}
};
function registry$1() {
	return new $ZodRegistry$1();
}
function isEqual(x, y) {
	if (x === null || x === void 0 || y === null || y === void 0) return x === y;
	if (x === y || x.valueOf() === y.valueOf()) return true;
	if (Array.isArray(x)) {
		if (!Array.isArray(y)) return false;
		if (x.length !== y.length) return false;
	}
	if (!(x instanceof Object) || !(y instanceof Object)) return false;
	const keysX = Object.keys(x);
	return Object.keys(y).every((keyY) => keysX.indexOf(keyY) !== -1) && keysX.every((key) => isEqual(x[key], y[key]));
}
var ObjectSet = class {
	constructor() {
		this.buckets = /* @__PURE__ */ new Map();
	}
	put(value) {
		const hashCode = this.hashCodeOf(value);
		const itemsByCode = this.buckets.get(hashCode);
		if (!itemsByCode) {
			this.buckets.set(hashCode, [value]);
			return;
		}
		if (!itemsByCode.some((_) => isEqual(_, value))) itemsByCode.push(value);
	}
	contains(value) {
		const hashCode = this.hashCodeOf(value);
		const itemsByCode = this.buckets.get(hashCode);
		if (!itemsByCode) return false;
		return itemsByCode.some((_) => isEqual(_, value));
	}
	values() {
		return [...this.buckets.values()].flat();
	}
	stats() {
		let totalBuckets = 0;
		let totalValues = 0;
		let collisions = 0;
		for (const bucket of this.buckets.values()) {
			totalBuckets += 1;
			totalValues += bucket.length;
			if (bucket.length > 1) collisions += 1;
		}
		const hashEffectiveness = totalBuckets / totalValues;
		return {
			totalBuckets,
			collisions,
			totalValues,
			hashEffectiveness
		};
	}
	hashCodeOf(object$1) {
		let hashCode = 0;
		if (Array.isArray(object$1)) {
			for (let i = 0; i < object$1.length; i++) hashCode ^= this.hashCodeOf(object$1[i]) * i;
			return hashCode;
		}
		if (typeof object$1 === "string") {
			for (let i = 0; i < object$1.length; i++) hashCode ^= object$1.charCodeAt(i) * i;
			return hashCode;
		}
		if (typeof object$1 === "number") return object$1;
		if (typeof object$1 === "object") for (const [key, value] of Object.entries(object$1)) hashCode ^= this.hashCodeOf(key) + this.hashCodeOf(value !== null && value !== void 0 ? value : "");
		return hashCode;
	}
};
function isUndefined(value) {
	return value === void 0;
}
function mapValues(object$1, mapper) {
	const result = {};
	Object.entries(object$1).forEach(([key, value]) => {
		result[key] = mapper(value);
	});
	return result;
}
function omit$1(object$1, keys) {
	const result = {};
	Object.entries(object$1).forEach(([key, value]) => {
		if (!keys.some((keyToOmit) => keyToOmit === key)) result[key] = value;
	});
	return result;
}
function omitBy(object$1, predicate) {
	const result = {};
	Object.entries(object$1).forEach(([key, value]) => {
		if (!predicate(value, key)) result[key] = value;
	});
	return result;
}
function compact(arr) {
	return arr.filter((elem) => !isUndefined(elem));
}
const objectEquals = isEqual;
function uniq(values) {
	const set$1 = new ObjectSet();
	values.forEach((value) => set$1.put(value));
	return [...set$1.values()];
}
function isString(val) {
	return typeof val === "string";
}
function sortObjectByKeys(obj) {
	return Object.fromEntries(Object.entries(obj).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)));
}
/**
* @deprecated This is not really deprecated but this should always be used with
* caution. Using it may alter the behavior of the library and the generated schemas.
*/
const zodToOpenAPIRegistry = registry$1();
var Metadata = class {
	static collectMetadata(schema, metadata) {
		const currentMetadata = this.getMetadataFromRegistry(schema);
		const _internal = Object.assign(Object.assign({}, currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata._internal), metadata === null || metadata === void 0 ? void 0 : metadata._internal);
		const param = Object.assign(Object.assign({}, currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param), metadata === null || metadata === void 0 ? void 0 : metadata.param);
		const totalMetadata = Object.assign(Object.assign(Object.assign(Object.assign({}, Object.keys(_internal).length > 0 ? { _internal } : {}), currentMetadata), metadata), Object.keys(param).length > 0 ? { param } : {});
		if (isZodType(schema, [
			"ZodOptional",
			"ZodNullable",
			"ZodDefault",
			"ZodReadonly",
			"ZodNonOptional"
		]) && isAnyZodType(schema._zod.def.innerType)) return this.collectMetadata(schema._zod.def.innerType, totalMetadata);
		if (isZodType(schema, "ZodPipe")) {
			const inSchema = schema._zod.def.in;
			const outSchema = schema._zod.def.out;
			if (isZodType(inSchema, "ZodTransform") && isAnyZodType(outSchema)) return this.collectMetadata(outSchema, totalMetadata);
			if (isAnyZodType(inSchema)) return this.collectMetadata(inSchema, totalMetadata);
		}
		return totalMetadata;
	}
	/**
	* @deprecated Use one of `getOpenApiMetadata` or `getInternalMetadata` instead
	*/
	static getMetadata(zodSchema) {
		return this.collectMetadata(zodSchema);
	}
	static getOpenApiMetadata(zodSchema) {
		const metadata = this.collectMetadata(zodSchema);
		return __rest(metadata !== null && metadata !== void 0 ? metadata : {}, ["_internal"]);
	}
	static getInternalMetadata(zodSchema) {
		var _a;
		return (_a = this.collectMetadata(zodSchema)) === null || _a === void 0 ? void 0 : _a._internal;
	}
	static getParamMetadata(zodSchema) {
		const metadata = this.collectMetadata(zodSchema);
		return Object.assign(Object.assign({}, metadata), { param: Object.assign(Object.assign({}, (metadata === null || metadata === void 0 ? void 0 : metadata.description) ? { description: metadata.description } : {}), metadata === null || metadata === void 0 ? void 0 : metadata.param) });
	}
	/**
	* A method that omits all custom keys added to the regular OpenAPI
	* metadata properties
	*/
	static buildSchemaMetadata(metadata) {
		return omitBy(omit$1(metadata, ["param", "_internal"]), isUndefined);
	}
	static buildParameterMetadata(metadata) {
		return omitBy(metadata, isUndefined);
	}
	static applySchemaMetadata(initialData, metadata) {
		return omitBy(Object.assign(Object.assign({}, initialData), this.buildSchemaMetadata(metadata)), isUndefined);
	}
	static getRefId(zodSchema) {
		var _a;
		return (_a = this.getInternalMetadata(zodSchema)) === null || _a === void 0 ? void 0 : _a.refId;
	}
	static unwrapChained(schema) {
		return this.unwrapUntil(schema);
	}
	static getDefaultValue(zodSchema) {
		const unwrapped = this.unwrapUntil(zodSchema, "ZodDefault");
		return unwrapped === null || unwrapped === void 0 ? void 0 : unwrapped._zod.def.defaultValue;
	}
	static unwrapUntil(schema, typeName) {
		if (typeName && isZodType(schema, typeName)) return schema;
		if (isZodType(schema, [
			"ZodOptional",
			"ZodNullable",
			"ZodDefault",
			"ZodReadonly",
			"ZodNonOptional"
		]) && isAnyZodType(schema._zod.def.innerType)) return this.unwrapUntil(schema._zod.def.innerType, typeName);
		if (isZodType(schema, "ZodPipe")) {
			const inSchema = schema._zod.def.in;
			const outSchema = schema._zod.def.out;
			if (isZodType(inSchema, "ZodTransform") && isAnyZodType(outSchema)) return this.unwrapUntil(outSchema, typeName);
			if (isAnyZodType(inSchema)) return this.unwrapUntil(inSchema, typeName);
		}
		return typeName ? void 0 : schema;
	}
	static getMetadataFromInternalRegistry(zodSchema) {
		return zodToOpenAPIRegistry.get(zodSchema);
	}
	static getMetadataFromRegistry(zodSchema) {
		const internal = this.getMetadataFromInternalRegistry(zodSchema);
		const general = zodSchema.meta();
		if (!internal) return general;
		const { _internal } = internal, rest = __rest(internal, ["_internal"]);
		const _a = general !== null && general !== void 0 ? general : {}, { id, title } = _a, restGeneral = __rest(_a, ["id", "title"]);
		return Object.assign(Object.assign(Object.assign({ _internal: Object.assign(Object.assign({}, id ? { refId: id } : {}), _internal) }, rest), title ? { description: title } : {}), restGeneral);
	}
	static setMetadataInRegistry(zodSchema, metadata) {
		zodToOpenAPIRegistry.add(zodSchema, metadata);
	}
};
function preserveMetadataFromModifier(zodSchema, modifier) {
	const zodModifier = zodSchema[modifier];
	if (typeof zodModifier !== "function") return;
	zodSchema[modifier] = function(...args) {
		const result = zodModifier.apply(this, args);
		const meta = Metadata.getMetadataFromRegistry(this);
		if (meta) Metadata.setMetadataInRegistry(result, meta);
		return result;
	};
}
function extendZodWithOpenApi(zod) {
	if (typeof zod.ZodType.prototype.openapi !== "undefined") return;
	zod.ZodType.prototype.openapi = function(...args) {
		const { refId, metadata, options } = getOpenApiConfiguration(...args);
		const _a = metadata !== null && metadata !== void 0 ? metadata : {}, { param } = _a, restOfOpenApi = __rest(_a, ["param"]);
		const allMetadata = Metadata.getMetadataFromRegistry(this);
		const _b = allMetadata !== null && allMetadata !== void 0 ? allMetadata : {}, { _internal: internalMetadata } = _b, currentMetadata = __rest(_b, ["_internal"]);
		const _internal = Object.assign(Object.assign(Object.assign({}, internalMetadata), options), refId ? { refId } : void 0);
		const resultMetadata = Object.assign(Object.assign(Object.assign({}, currentMetadata), restOfOpenApi), (currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param) || param ? { param: Object.assign(Object.assign({}, currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param), param) } : void 0);
		const result = new this.constructor(this._def);
		Metadata.setMetadataInRegistry(result, Object.assign(Object.assign({}, Object.keys(_internal).length > 0 ? { _internal } : void 0), resultMetadata));
		if (isZodType(result, "ZodObject")) {
			const currentMetadata$1 = Metadata.getMetadataFromRegistry(result);
			const originalExtend = result.extend;
			result.extend = function(...args$1) {
				const extendedResult = originalExtend.apply(result, args$1);
				const _a$1 = currentMetadata$1 !== null && currentMetadata$1 !== void 0 ? currentMetadata$1 : {}, { _internal: _internal$1 } = _a$1, rest = __rest(_a$1, ["_internal"]);
				Metadata.setMetadataInRegistry(extendedResult, { _internal: { extendedFrom: (_internal$1 === null || _internal$1 === void 0 ? void 0 : _internal$1.refId) ? {
					refId: _internal$1.refId,
					schema: result
				} : _internal$1 === null || _internal$1 === void 0 ? void 0 : _internal$1.extendedFrom } });
				return extendedResult.openapi(rest);
			};
			preserveMetadataFromModifier(result, "catchall");
		}
		preserveMetadataFromModifier(result, "optional");
		preserveMetadataFromModifier(result, "nullable");
		preserveMetadataFromModifier(result, "default");
		preserveMetadataFromModifier(result, "transform");
		preserveMetadataFromModifier(result, "refine");
		preserveMetadataFromModifier(result, "length");
		preserveMetadataFromModifier(result, "min");
		preserveMetadataFromModifier(result, "max");
		const originalMeta = result.meta;
		result.meta = function(...args$1) {
			const result$1 = originalMeta.apply(this, args$1);
			if (args$1[0]) {
				const meta = Metadata.getMetadataFromInternalRegistry(this);
				if (meta) Metadata.setMetadataInRegistry(result$1, Object.assign(Object.assign({}, meta), args$1[0]));
			}
			return result$1;
		};
		return result;
	};
}
function getOpenApiConfiguration(refOrOpenapi, metadataOrOptions, options) {
	if (typeof refOrOpenapi === "string") return {
		refId: refOrOpenapi,
		metadata: metadataOrOptions,
		options
	};
	return {
		refId: void 0,
		metadata: refOrOpenapi,
		options: metadataOrOptions
	};
}
function getOpenApiMetadata(zodSchema) {
	var _a;
	return omitBy((_a = Metadata.getOpenApiMetadata(zodSchema)) !== null && _a !== void 0 ? _a : {}, isUndefined);
}
var OpenAPIRegistry = class {
	constructor(parents) {
		this.parents = parents;
		this._definitions = [];
	}
	get definitions() {
		var _a, _b;
		return [...(_b = (_a = this.parents) === null || _a === void 0 ? void 0 : _a.flatMap((par) => par._definitions)) !== null && _b !== void 0 ? _b : [], ...this._definitions];
	}
	/**
	* Registers a new component schema under /components/schemas/${name}
	*/
	register(refId, zodSchema) {
		const schemaWithRefId = this.schemaWithRefId(refId, zodSchema);
		this._definitions.push({
			type: "schema",
			schema: schemaWithRefId
		});
		return schemaWithRefId;
	}
	/**
	* Registers a new parameter schema under /components/parameters/${name}
	*/
	registerParameter(refId, zodSchema) {
		var _a, _b, _c;
		const schemaWithRefId = this.schemaWithRefId(refId, zodSchema);
		const currentMetadata = (_a = Metadata.getOpenApiMetadata(schemaWithRefId)) !== null && _a !== void 0 ? _a : {};
		const schemaWithMetadata = schemaWithRefId.openapi(Object.assign(Object.assign({}, currentMetadata), { param: Object.assign(Object.assign({}, currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param), { name: (_c = (_b = currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : refId }) }));
		this._definitions.push({
			type: "parameter",
			schema: schemaWithMetadata
		});
		return schemaWithMetadata;
	}
	/**
	* Registers a new path that would be generated under paths:
	*/
	registerPath(route) {
		this._definitions.push({
			type: "route",
			route
		});
	}
	/**
	* Registers a new webhook that would be generated under webhooks:
	*/
	registerWebhook(webhook) {
		this._definitions.push({
			type: "webhook",
			webhook
		});
	}
	/**
	* Registers a raw OpenAPI component. Use this if you have a simple object instead of a Zod schema.
	*
	* @param type The component type, e.g. `schemas`, `responses`, `securitySchemes`, etc.
	* @param name The name of the object, it is the key under the component
	*             type in the resulting OpenAPI document
	* @param component The actual object to put there
	*/
	registerComponent(type, name, component) {
		this._definitions.push({
			type: "component",
			componentType: type,
			name,
			component
		});
		return {
			name,
			ref: { $ref: `#/components/${type}/${name}` }
		};
	}
	schemaWithRefId(refId, zodSchema) {
		return zodSchema.openapi(refId);
	}
};
var ZodToOpenAPIError = class {
	constructor(message) {
		this.message = message;
	}
};
var ConflictError = class extends ZodToOpenAPIError {
	constructor(message, data) {
		super(message);
		this.data = data;
	}
};
var MissingParameterDataError = class extends ZodToOpenAPIError {
	constructor(data) {
		super(`Missing parameter data, please specify \`${data.missingField}\` and other OpenAPI parameter props using the \`param\` field of \`schema.openapi\``);
		this.data = data;
	}
};
function enhanceMissingParametersError(action, paramsToAdd) {
	try {
		return action();
	} catch (error$45) {
		if (error$45 instanceof MissingParameterDataError) throw new MissingParameterDataError(Object.assign(Object.assign({}, error$45.data), paramsToAdd));
		throw error$45;
	}
}
var UnknownZodTypeError = class extends ZodToOpenAPIError {
	constructor(data) {
		super(`Unknown zod object type, please specify \`type\` and other OpenAPI props using \`schema.openapi\`.`);
		this.data = data;
	}
};
var ArrayTransformer = class {
	transform(zodSchema, mapNullableType, mapItems) {
		var _a, _b, _c, _d;
		const itemType = zodSchema.def.element;
		const minItems = (_b = (_a = zodSchema.def.checks) === null || _a === void 0 ? void 0 : _a.find((check$1) => check$1._zod.def.check === "min_length")) === null || _b === void 0 ? void 0 : _b._zod.def.minimum;
		const maxItems = (_d = (_c = zodSchema.def.checks) === null || _c === void 0 ? void 0 : _c.find((check$1) => check$1._zod.def.check === "max_length")) === null || _d === void 0 ? void 0 : _d._zod.def.maximum;
		return Object.assign(Object.assign({}, mapNullableType("array")), {
			items: isAnyZodType(itemType) ? mapItems(itemType) : {},
			minItems,
			maxItems
		});
	}
};
var BigIntTransformer = class {
	transform(mapNullableType) {
		return Object.assign(Object.assign({}, mapNullableType("string")), { pattern: `^\d+$` });
	}
};
var DiscriminatedUnionTransformer = class {
	transform(zodSchema, isNullable, mapNullableOfArray, mapItem, generateSchemaRef) {
		const options = [...zodSchema.def.options];
		const optionSchema = options.map(mapItem);
		if (isNullable) return { oneOf: mapNullableOfArray(optionSchema, isNullable) };
		const discriminator = zodSchema._zod.def.discriminator;
		if (!discriminator) {
			console.error("No discriminator found for discriminated union", zodSchema);
			return { oneOf: optionSchema };
		}
		return {
			oneOf: optionSchema,
			discriminator: this.mapDiscriminator(options, discriminator, generateSchemaRef)
		};
	}
	mapDiscriminator(zodObjects, discriminator, generateSchemaRef) {
		if (zodObjects.some((obj) => Metadata.getRefId(obj) === void 0)) return;
		const mapping = {};
		zodObjects.forEach((obj) => {
			var _a;
			const refId = Metadata.getRefId(obj);
			const value = (_a = obj.def.shape) === null || _a === void 0 ? void 0 : _a[discriminator];
			if (isZodType(value, "ZodEnum")) {
				Object.values(value._zod.def.entries).filter(isString).forEach((enumValue) => {
					mapping[enumValue] = generateSchemaRef(refId);
				});
				return;
			}
			const literalValue = value === null || value === void 0 ? void 0 : value.def.values[0];
			if (typeof literalValue !== "string") throw new Error(`Discriminator ${discriminator} could not be found in one of the values of a discriminated union`);
			mapping[literalValue] = generateSchemaRef(refId);
		});
		return {
			propertyName: discriminator,
			mapping
		};
	}
};
/**
* Numeric enums have a reverse mapping https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings
* whereas string ones don't.
*
* This function checks if an enum is fully numeric - i.e all values are numbers or not.
* And filters out only the actual enum values when a reverse mapping is apparent.
*/
function enumInfo(enumObject) {
	const values = Object.keys(enumObject).filter((key) => typeof enumObject[enumObject[key]] !== "number").map((key) => enumObject[key]);
	const numericCount = values.filter((_) => typeof _ === "number").length;
	return {
		values,
		type: numericCount === 0 ? "string" : numericCount === values.length ? "numeric" : "mixed"
	};
}
var EnumTransformer = class {
	transform(zodSchema, mapNullableType) {
		const { type, values } = enumInfo(zodSchema._zod.def.entries);
		if (type === "mixed") throw new ZodToOpenAPIError("Enum has mixed string and number values, please specify the OpenAPI type manually");
		return Object.assign(Object.assign({}, mapNullableType(type === "numeric" ? "integer" : "string")), { enum: values });
	}
};
var IntersectionTransformer = class {
	transform(zodSchema, isNullable, mapNullableOfArray, mapItem) {
		const allOfSchema = { allOf: this.flattenIntersectionTypes(zodSchema).map(mapItem) };
		if (isNullable) return { anyOf: mapNullableOfArray([allOfSchema], isNullable) };
		return allOfSchema;
	}
	flattenIntersectionTypes(schema) {
		if (!isZodType(schema, "ZodIntersection")) return [schema];
		const leftSubTypes = isAnyZodType(schema._zod.def.left) ? this.flattenIntersectionTypes(schema._zod.def.left) : [];
		const rightSubTypes = isAnyZodType(schema._zod.def.right) ? this.flattenIntersectionTypes(schema._zod.def.right) : [];
		return [...leftSubTypes, ...rightSubTypes];
	}
};
var LiteralTransformer = class {
	constructor() {
		this.bigIntTransformer = new BigIntTransformer();
	}
	transform(zodSchema, mapNullableType) {
		const type = typeof zodSchema.def.values[0];
		if (type === "boolean" || type === "number" || type === "string" || type === "object") return Object.assign(Object.assign({}, mapNullableType(type)), { enum: [zodSchema.def.values[0]] });
		if (type === "bigint") return this.bigIntTransformer.transform(mapNullableType);
		return mapNullableType("null");
	}
};
var NumberTransformer = class {
	transform(zodSchema, mapNullableType, getNumberChecks) {
		var _a;
		return Object.assign(Object.assign(Object.assign({}, mapNullableType("number")), mapNullableType(zodSchema.format === "safeint" ? "integer" : "number")), getNumberChecks((_a = zodSchema.def.checks) !== null && _a !== void 0 ? _a : []));
	}
};
var ObjectTransformer = class {
	transform(zodSchema, defaultValue, mapNullableType, mapItem) {
		var _a;
		const extendedFrom = (_a = Metadata.getInternalMetadata(zodSchema)) === null || _a === void 0 ? void 0 : _a.extendedFrom;
		const required$1 = this.requiredKeysOf(zodSchema);
		const properties = mapValues(zodSchema.def.shape, mapItem);
		if (!extendedFrom) return Object.assign(Object.assign(Object.assign(Object.assign({}, mapNullableType("object")), {
			properties,
			default: defaultValue
		}), required$1.length > 0 ? { required: required$1 } : {}), this.generateAdditionalProperties(zodSchema, mapItem));
		const parent = extendedFrom.schema;
		mapItem(parent);
		const keysRequiredByParent = this.requiredKeysOf(parent);
		const propsOfParent = mapValues(parent === null || parent === void 0 ? void 0 : parent.def.shape, mapItem);
		const propertiesToAdd = Object.fromEntries(Object.entries(properties).filter(([key, type]) => {
			return !objectEquals(propsOfParent[key], type);
		}));
		const additionallyRequired = required$1.filter((prop) => !keysRequiredByParent.includes(prop));
		const objectData = Object.assign(Object.assign(Object.assign(Object.assign({}, mapNullableType("object")), {
			default: defaultValue,
			properties: propertiesToAdd
		}), additionallyRequired.length > 0 ? { required: additionallyRequired } : {}), this.generateAdditionalProperties(zodSchema, mapItem));
		return { allOf: [{ $ref: `#/components/schemas/${extendedFrom.refId}` }, objectData] };
	}
	generateAdditionalProperties(zodSchema, mapItem) {
		const catchallSchema = zodSchema.def.catchall;
		if (!catchallSchema) return {};
		if (isZodType(catchallSchema, "ZodNever")) return { additionalProperties: false };
		if (isAnyZodType(catchallSchema)) return { additionalProperties: mapItem(catchallSchema) };
		return {};
	}
	requiredKeysOf(objectSchema) {
		return Object.entries(objectSchema.def.shape).filter(([_key, type]) => !isOptionalSchema(type)).map(([key, _type]) => key);
	}
};
var RecordTransformer = class {
	transform(zodSchema, mapNullableType, mapItem) {
		const propertiesType = zodSchema.valueType;
		const keyType = zodSchema.keyType;
		const propertiesSchema = isAnyZodType(propertiesType) ? mapItem(propertiesType) : {};
		if (isZodType(keyType, "ZodEnum")) {
			const properties = Object.values(keyType._zod.def.entries).filter(isString).reduce((acc, curr) => Object.assign(Object.assign({}, acc), { [curr]: propertiesSchema }), {});
			return Object.assign(Object.assign({}, mapNullableType("object")), { properties });
		}
		return Object.assign(Object.assign({}, mapNullableType("object")), { additionalProperties: propertiesSchema });
	}
};
function isZodCheckLengthEquals(check$1) {
	return check$1._zod.def.check === "length_equals";
}
function isZodCheckRegex(check$1) {
	return check$1._zod.def.check === "string_format" && check$1._zod.def.format === "regex";
}
var StringTransformer = class {
	transform(zodSchema, mapNullableType) {
		var _a, _b, _c, _d;
		const regexCheck = (_a = zodSchema.def.checks) === null || _a === void 0 ? void 0 : _a.find(isZodCheckRegex);
		const pattern = regexCheck === null || regexCheck === void 0 ? void 0 : regexCheck._zod.def.pattern.toString().replace(/^\/|\/$/g, "");
		const check$1 = (_b = zodSchema.def.checks) === null || _b === void 0 ? void 0 : _b.find(isZodCheckLengthEquals);
		const length = check$1 === null || check$1 === void 0 ? void 0 : check$1._zod.def.length;
		const maxLength = Number.isFinite(zodSchema.minLength) ? (_c = zodSchema.minLength) !== null && _c !== void 0 ? _c : void 0 : void 0;
		const minLength = Number.isFinite(zodSchema.maxLength) ? (_d = zodSchema.maxLength) !== null && _d !== void 0 ? _d : void 0 : void 0;
		return Object.assign(Object.assign({}, mapNullableType("string")), {
			minLength: length !== null && length !== void 0 ? length : maxLength,
			maxLength: length !== null && length !== void 0 ? length : minLength,
			format: this.mapStringFormat(zodSchema),
			pattern
		});
	}
	/**
	* Attempts to map Zod strings to known formats
	* https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
	*/
	mapStringFormat(zodString) {
		if (zodString.format === "uuid") return "uuid";
		if (zodString.format === "email") return "email";
		if (zodString.format === "url") return "uri";
		if (zodString.format === "date") return "date";
		if (zodString.format === "datetime") return "date-time";
		if (zodString.format === "cuid") return "cuid";
		if (zodString.format === "cuid2") return "cuid2";
		if (zodString.format === "ulid") return "ulid";
		if (zodString.format === "ipv4") return "ip";
		if (zodString.format === "ipv6") return "ip";
		if (zodString.format === "emoji") return "emoji";
	}
};
var TupleTransformer = class {
	constructor(versionSpecifics) {
		this.versionSpecifics = versionSpecifics;
	}
	transform(zodSchema, mapNullableType, mapItem) {
		const schemas = zodSchema._zod.def.items.map((item) => isAnyZodType(item) ? mapItem(item) : {});
		return Object.assign(Object.assign({}, mapNullableType("array")), this.versionSpecifics.mapTupleItems(schemas));
	}
};
var UnionTransformer = class {
	constructor(options) {
		this.options = options;
	}
	transform(zodSchema, mapNullableOfArray, mapItem) {
		var _a, _b, _c;
		const internalMetadata = Metadata.getInternalMetadata(zodSchema);
		const preferredType = (_c = (_a = internalMetadata === null || internalMetadata === void 0 ? void 0 : internalMetadata.unionPreferredType) !== null && _a !== void 0 ? _a : (_b = this.options) === null || _b === void 0 ? void 0 : _b.unionPreferredType) !== null && _c !== void 0 ? _c : "anyOf";
		const schemas = this.flattenUnionTypes(zodSchema).map((schema) => {
			return mapItem(this.unwrapNullable(schema));
		});
		return { [preferredType]: mapNullableOfArray(schemas) };
	}
	flattenUnionTypes(schema) {
		if (!isZodType(schema, "ZodUnion")) return [schema];
		return schema.def.options.flatMap((option) => isAnyZodType(option) ? this.flattenUnionTypes(option) : []);
	}
	unwrapNullable(schema) {
		if (isZodType(schema, "ZodNullable")) {
			const unwrapped = schema.unwrap();
			if (isAnyZodType(unwrapped)) return this.unwrapNullable(unwrapped);
		}
		return schema;
	}
};
var DateTransformer = class {
	transform(mapNullableType) {
		return Object.assign(Object.assign({}, mapNullableType("string")), { format: "date" });
	}
};
var OpenApiTransformer = class {
	constructor(versionSpecifics, options) {
		this.versionSpecifics = versionSpecifics;
		this.objectTransformer = new ObjectTransformer();
		this.stringTransformer = new StringTransformer();
		this.numberTransformer = new NumberTransformer();
		this.bigIntTransformer = new BigIntTransformer();
		this.dateTransformer = new DateTransformer();
		this.literalTransformer = new LiteralTransformer();
		this.enumTransformer = new EnumTransformer();
		this.arrayTransformer = new ArrayTransformer();
		this.discriminatedUnionTransformer = new DiscriminatedUnionTransformer();
		this.intersectionTransformer = new IntersectionTransformer();
		this.recordTransformer = new RecordTransformer();
		this.tupleTransformer = new TupleTransformer(versionSpecifics);
		this.unionTransformer = new UnionTransformer(options);
	}
	transform(zodSchema, isNullable, mapItem, generateSchemaRef, defaultValue) {
		if (isZodType(zodSchema, "ZodNull")) return this.versionSpecifics.nullType;
		if (isZodType(zodSchema, "ZodUnknown") || isZodType(zodSchema, "ZodAny")) return this.versionSpecifics.mapNullableType(void 0, isNullable);
		if (isZodType(zodSchema, "ZodObject")) return this.objectTransformer.transform(zodSchema, defaultValue, (_) => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
		const schema = this.transformSchemaWithoutDefault(zodSchema, isNullable, mapItem, generateSchemaRef);
		return Object.assign(Object.assign({}, schema), { default: defaultValue });
	}
	transformSchemaWithoutDefault(zodSchema, isNullable, mapItem, generateSchemaRef) {
		if (isZodType(zodSchema, "ZodUnknown") || isZodType(zodSchema, "ZodAny")) return this.versionSpecifics.mapNullableType(void 0, isNullable);
		if (isZodType(zodSchema, "ZodString")) return this.stringTransformer.transform(zodSchema, (schema) => this.versionSpecifics.mapNullableType(schema, isNullable));
		if (isZodType(zodSchema, "ZodNumber")) return this.numberTransformer.transform(zodSchema, (schema) => this.versionSpecifics.mapNullableType(schema, isNullable), (_) => this.versionSpecifics.getNumberChecks(_));
		if (isZodType(zodSchema, "ZodBigInt")) return this.bigIntTransformer.transform((schema) => this.versionSpecifics.mapNullableType(schema, isNullable));
		if (isZodType(zodSchema, "ZodBoolean")) return this.versionSpecifics.mapNullableType("boolean", isNullable);
		if (isZodType(zodSchema, "ZodLiteral")) return this.literalTransformer.transform(zodSchema, (schema) => this.versionSpecifics.mapNullableType(schema, isNullable));
		if (isZodType(zodSchema, "ZodEnum")) return this.enumTransformer.transform(zodSchema, (schema) => this.versionSpecifics.mapNullableType(schema, isNullable));
		if (isZodType(zodSchema, "ZodArray")) return this.arrayTransformer.transform(zodSchema, (_) => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
		if (isZodType(zodSchema, "ZodTuple")) return this.tupleTransformer.transform(zodSchema, (_) => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
		if (isZodType(zodSchema, "ZodDiscriminatedUnion")) return this.discriminatedUnionTransformer.transform(zodSchema, isNullable, (_) => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem, generateSchemaRef);
		if (isZodType(zodSchema, "ZodUnion")) return this.unionTransformer.transform(zodSchema, (_) => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem);
		if (isZodType(zodSchema, "ZodIntersection")) return this.intersectionTransformer.transform(zodSchema, isNullable, (_) => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem);
		if (isZodType(zodSchema, "ZodRecord")) return this.recordTransformer.transform(zodSchema, (_) => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
		if (isZodType(zodSchema, "ZodDate")) return this.dateTransformer.transform((_) => this.versionSpecifics.mapNullableType(_, isNullable));
		const refId = Metadata.getRefId(zodSchema);
		throw new UnknownZodTypeError({
			currentSchema: zodSchema.def,
			schemaName: refId
		});
	}
};
var OpenAPIGenerator = class {
	constructor(definitions, versionSpecifics, options) {
		this.definitions = definitions;
		this.versionSpecifics = versionSpecifics;
		this.options = options;
		this.schemaRefs = {};
		this.paramRefs = {};
		this.pathRefs = {};
		this.rawComponents = [];
		this.openApiTransformer = new OpenApiTransformer(versionSpecifics, options);
		this.sortDefinitions();
	}
	generateDocumentData() {
		this.definitions.forEach((definition) => this.generateSingle(definition));
		return {
			components: this.buildComponents(),
			paths: this.pathRefs
		};
	}
	generateComponents() {
		this.definitions.forEach((definition) => this.generateSingle(definition));
		return { components: this.buildComponents() };
	}
	buildComponents() {
		var _a, _b, _c, _d;
		const rawComponents = {};
		this.rawComponents.forEach(({ componentType, name, component }) => {
			var _a$1;
			(_a$1 = rawComponents[componentType]) !== null && _a$1 !== void 0 || (rawComponents[componentType] = {});
			rawComponents[componentType][name] = component;
		});
		const allSchemas = Object.assign(Object.assign({}, (_a = rawComponents.schemas) !== null && _a !== void 0 ? _a : {}), this.schemaRefs);
		const schemas = ((_b = this.options) === null || _b === void 0 ? void 0 : _b.sortComponents) === "alphabetically" ? sortObjectByKeys(allSchemas) : allSchemas;
		const allParameters = Object.assign(Object.assign({}, (_c = rawComponents.parameters) !== null && _c !== void 0 ? _c : {}), this.paramRefs);
		const parameters = ((_d = this.options) === null || _d === void 0 ? void 0 : _d.sortComponents) === "alphabetically" ? sortObjectByKeys(allParameters) : allParameters;
		return Object.assign(Object.assign({}, rawComponents), {
			schemas,
			parameters
		});
	}
	sortObjectKeys(object$1) {}
	sortDefinitions() {
		const generationOrder = [
			"schema",
			"parameter",
			"component",
			"route"
		];
		this.definitions.sort((left, right) => {
			if (!("type" in left)) {
				if (!("type" in right)) return 0;
				return -1;
			}
			if (!("type" in right)) return 1;
			return generationOrder.findIndex((type) => type === left.type) - generationOrder.findIndex((type) => type === right.type);
		});
	}
	generateSingle(definition) {
		if (!("type" in definition)) {
			this.generateSchemaWithRef(definition);
			return;
		}
		switch (definition.type) {
			case "parameter":
				this.generateParameterDefinition(definition.schema);
				return;
			case "schema":
				this.generateSchemaWithRef(definition.schema);
				return;
			case "route":
				this.generateSingleRoute(definition.route);
				return;
			case "component":
				this.rawComponents.push(definition);
				return;
		}
	}
	generateParameterDefinition(zodSchema) {
		const refId = Metadata.getRefId(zodSchema);
		const result = this.generateParameter(zodSchema);
		if (refId) this.paramRefs[refId] = result;
		return result;
	}
	getParameterRef(schema, external) {
		const metadata = Metadata.getOpenApiMetadata(schema);
		const internalMetadata = Metadata.getInternalMetadata(schema);
		const parameterMetadata = metadata === null || metadata === void 0 ? void 0 : metadata.param;
		const existingRef = (internalMetadata === null || internalMetadata === void 0 ? void 0 : internalMetadata.refId) ? this.paramRefs[internalMetadata.refId] : void 0;
		if (!(internalMetadata === null || internalMetadata === void 0 ? void 0 : internalMetadata.refId) || !existingRef) return;
		if (parameterMetadata && existingRef.in !== parameterMetadata.in || (external === null || external === void 0 ? void 0 : external.in) && existingRef.in !== external.in) throw new ConflictError(`Conflicting location for parameter ${existingRef.name}`, {
			key: "in",
			values: compact([
				existingRef.in,
				external === null || external === void 0 ? void 0 : external.in,
				parameterMetadata === null || parameterMetadata === void 0 ? void 0 : parameterMetadata.in
			])
		});
		if (parameterMetadata && existingRef.name !== parameterMetadata.name || (external === null || external === void 0 ? void 0 : external.name) && existingRef.name !== (external === null || external === void 0 ? void 0 : external.name)) throw new ConflictError(`Conflicting names for parameter`, {
			key: "name",
			values: compact([
				existingRef.name,
				external === null || external === void 0 ? void 0 : external.name,
				parameterMetadata === null || parameterMetadata === void 0 ? void 0 : parameterMetadata.name
			])
		});
		return { $ref: `#/components/parameters/${internalMetadata.refId}` };
	}
	generateInlineParameters(zodSchema, location) {
		const metadata = Metadata.getOpenApiMetadata(zodSchema);
		const parameterMetadata = metadata === null || metadata === void 0 ? void 0 : metadata.param;
		const referencedSchema = this.getParameterRef(zodSchema, { in: location });
		if (referencedSchema) return [referencedSchema];
		if (isZodType(zodSchema, "ZodObject")) {
			const propTypes = zodSchema.def.shape;
			return Object.entries(propTypes).map(([key, schema]) => {
				var _a;
				const innerMetadata = Metadata.getOpenApiMetadata(schema);
				const referencedSchema$1 = this.getParameterRef(schema, {
					in: location,
					name: key
				});
				if (referencedSchema$1) return referencedSchema$1;
				const innerParameterMetadata = innerMetadata === null || innerMetadata === void 0 ? void 0 : innerMetadata.param;
				if ((innerParameterMetadata === null || innerParameterMetadata === void 0 ? void 0 : innerParameterMetadata.name) && innerParameterMetadata.name !== key) throw new ConflictError(`Conflicting names for parameter`, {
					key: "name",
					values: [key, innerParameterMetadata.name]
				});
				if ((innerParameterMetadata === null || innerParameterMetadata === void 0 ? void 0 : innerParameterMetadata.in) && innerParameterMetadata.in !== location) throw new ConflictError(`Conflicting location for parameter ${(_a = innerParameterMetadata.name) !== null && _a !== void 0 ? _a : key}`, {
					key: "in",
					values: [location, innerParameterMetadata.in]
				});
				return this.generateParameter(schema.openapi({ param: {
					name: key,
					in: location
				} }));
			});
		}
		if ((parameterMetadata === null || parameterMetadata === void 0 ? void 0 : parameterMetadata.in) && parameterMetadata.in !== location) throw new ConflictError(`Conflicting location for parameter ${parameterMetadata.name}`, {
			key: "in",
			values: [location, parameterMetadata.in]
		});
		return [this.generateParameter(zodSchema.openapi({ param: { in: location } }))];
	}
	generateSimpleParameter(zodSchema) {
		const metadata = Metadata.getParamMetadata(zodSchema);
		const paramMetadata = metadata === null || metadata === void 0 ? void 0 : metadata.param;
		const required$1 = !isOptionalSchema(zodSchema) && !isNullableSchema(zodSchema);
		const schema = this.generateSchemaWithRef(zodSchema);
		return Object.assign({
			schema,
			required: required$1
		}, paramMetadata ? Metadata.buildParameterMetadata(paramMetadata) : {});
	}
	generateParameter(zodSchema) {
		const metadata = Metadata.getOpenApiMetadata(zodSchema);
		const paramMetadata = metadata === null || metadata === void 0 ? void 0 : metadata.param;
		const paramName = paramMetadata === null || paramMetadata === void 0 ? void 0 : paramMetadata.name;
		const paramLocation = paramMetadata === null || paramMetadata === void 0 ? void 0 : paramMetadata.in;
		if (!paramName) throw new MissingParameterDataError({ missingField: "name" });
		if (!paramLocation) throw new MissingParameterDataError({
			missingField: "in",
			paramName
		});
		const baseParameter = this.generateSimpleParameter(zodSchema);
		return Object.assign(Object.assign({}, baseParameter), {
			in: paramLocation,
			name: paramName
		});
	}
	generateSchemaWithMetadata(zodSchema) {
		const innerSchema = Metadata.unwrapChained(zodSchema);
		const metadata = Metadata.getOpenApiMetadata(zodSchema);
		const defaultValue = Metadata.getDefaultValue(zodSchema);
		const result = (metadata === null || metadata === void 0 ? void 0 : metadata.type) ? { type: metadata.type } : this.toOpenAPISchema(innerSchema, isNullableSchema(zodSchema), defaultValue);
		return metadata ? Metadata.applySchemaMetadata(result, metadata) : omitBy(result, isUndefined);
	}
	/**
	* Same as above but applies nullable
	*/
	constructReferencedOpenAPISchema(zodSchema) {
		const metadata = Metadata.getOpenApiMetadata(zodSchema);
		const innerSchema = Metadata.unwrapChained(zodSchema);
		const defaultValue = Metadata.getDefaultValue(zodSchema);
		const isNullable = isNullableSchema(zodSchema);
		if (metadata === null || metadata === void 0 ? void 0 : metadata.type) return this.versionSpecifics.mapNullableType(metadata.type, isNullable);
		return this.toOpenAPISchema(innerSchema, isNullable, defaultValue);
	}
	/**
	* Generates an OpenAPI SchemaObject or a ReferenceObject with all the provided metadata applied
	*/
	generateSimpleSchema(zodSchema) {
		const metadata = Metadata.getOpenApiMetadata(zodSchema);
		const refId = Metadata.getRefId(zodSchema);
		if (!refId || !this.schemaRefs[refId]) return this.generateSchemaWithMetadata(zodSchema);
		const schemaRef = this.schemaRefs[refId];
		const referenceObject = { $ref: this.generateSchemaRef(refId) };
		const newMetadata = omitBy(Metadata.buildSchemaMetadata(metadata !== null && metadata !== void 0 ? metadata : {}), (value, key) => value === void 0 || objectEquals(value, schemaRef[key]));
		if (newMetadata.type) return { allOf: [referenceObject, newMetadata] };
		const newSchemaMetadata = omitBy(this.constructReferencedOpenAPISchema(zodSchema), (value, key) => value === void 0 || objectEquals(value, schemaRef[key]));
		const appliedMetadata = Metadata.applySchemaMetadata(newSchemaMetadata, newMetadata);
		if (Object.keys(appliedMetadata).length > 0) return { allOf: [referenceObject, appliedMetadata] };
		return referenceObject;
	}
	/**
	* Same as `generateSchema` but if the new schema is added into the
	* referenced schemas, it would return a ReferenceObject and not the
	* whole result.
	*
	* Should be used for nested objects, arrays, etc.
	*/
	generateSchemaWithRef(zodSchema) {
		const refId = Metadata.getRefId(zodSchema);
		const result = this.generateSimpleSchema(zodSchema);
		if (refId && this.schemaRefs[refId] === void 0) {
			this.schemaRefs[refId] = result;
			return { $ref: this.generateSchemaRef(refId) };
		}
		return result;
	}
	generateSchemaRef(refId) {
		return `#/components/schemas/${refId}`;
	}
	getRequestBody(requestBody) {
		if (!requestBody) return;
		const { content } = requestBody, rest = __rest(requestBody, ["content"]);
		const requestBodyContent = this.getBodyContent(content);
		return Object.assign(Object.assign({}, rest), { content: requestBodyContent });
	}
	getParameters(request) {
		if (!request) return [];
		const { headers } = request;
		const query = this.cleanParameter(request.query);
		const params = this.cleanParameter(request.params);
		const cookies = this.cleanParameter(request.cookies);
		const queryParameters = enhanceMissingParametersError(() => query ? this.generateInlineParameters(query, "query") : [], { location: "query" });
		const pathParameters = enhanceMissingParametersError(() => params ? this.generateInlineParameters(params, "path") : [], { location: "path" });
		const cookieParameters = enhanceMissingParametersError(() => cookies ? this.generateInlineParameters(cookies, "cookie") : [], { location: "cookie" });
		const headerParameters = enhanceMissingParametersError(() => {
			if (Array.isArray(headers)) return headers.flatMap((header) => this.generateInlineParameters(header, "header"));
			const cleanHeaders = this.cleanParameter(headers);
			return cleanHeaders ? this.generateInlineParameters(cleanHeaders, "header") : [];
		}, { location: "header" });
		return [
			...pathParameters,
			...queryParameters,
			...headerParameters,
			...cookieParameters
		];
	}
	cleanParameter(schema) {
		if (!schema) return;
		if (isZodType(schema, "ZodPipe")) {
			const inSchema = schema._zod.def.in;
			const outSchema = schema._zod.def.out;
			if (isZodType(inSchema, "ZodObject")) return this.cleanParameter(inSchema);
			if (isZodType(outSchema, "ZodObject")) return this.cleanParameter(outSchema);
			return;
		}
		return schema;
	}
	generatePath(route) {
		const { method, path, request, responses } = route, pathItemConfig = __rest(route, [
			"method",
			"path",
			"request",
			"responses"
		]);
		const generatedResponses = mapValues(responses, (response) => {
			return this.getResponse(response);
		});
		const parameters = enhanceMissingParametersError(() => this.getParameters(request), { route: `${method} ${path}` });
		const requestBody = this.getRequestBody(request === null || request === void 0 ? void 0 : request.body);
		return { [method]: Object.assign(Object.assign(Object.assign(Object.assign({}, pathItemConfig), parameters.length > 0 ? { parameters: [...pathItemConfig.parameters || [], ...parameters] } : {}), requestBody ? { requestBody } : {}), { responses: generatedResponses }) };
	}
	generateSingleRoute(route) {
		const routeDoc = this.generatePath(route);
		this.pathRefs[route.path] = Object.assign(Object.assign({}, this.pathRefs[route.path]), routeDoc);
		return routeDoc;
	}
	getResponse(response) {
		if (this.isReferenceObject(response)) return response;
		const { content, headers } = response, rest = __rest(response, ["content", "headers"]);
		const responseContent = content ? { content: this.getBodyContent(content) } : {};
		if (!headers) return Object.assign(Object.assign({}, rest), responseContent);
		const responseHeaders = isZodType(headers, "ZodObject") ? this.getResponseHeaders(headers) : headers;
		return Object.assign(Object.assign(Object.assign({}, rest), { headers: responseHeaders }), responseContent);
	}
	isReferenceObject(schema) {
		return "$ref" in schema;
	}
	getResponseHeaders(headers) {
		const schemaShape = headers.def.shape;
		return mapValues(schemaShape, (_) => this.generateSimpleParameter(_));
	}
	getBodyContent(content) {
		return mapValues(content, (config$1) => {
			if (!config$1 || !isAnyZodType(config$1.schema)) return config$1;
			const { schema: configSchema } = config$1, rest = __rest(config$1, ["schema"]);
			const schema = this.generateSchemaWithRef(configSchema);
			return Object.assign({ schema }, rest);
		});
	}
	toOpenAPISchema(zodSchema, isNullable, defaultValue) {
		return this.openApiTransformer.transform(zodSchema, isNullable, (_) => this.generateSchemaWithRef(_), (_) => this.generateSchemaRef(_), defaultValue);
	}
};
var OpenApiGeneratorV30Specifics = class {
	get nullType() {
		return { nullable: true };
	}
	mapNullableOfArray(objects, isNullable) {
		if (isNullable) return [...objects, this.nullType];
		return objects;
	}
	mapNullableType(type, isNullable) {
		return Object.assign(Object.assign({}, type ? { type } : void 0), isNullable ? this.nullType : void 0);
	}
	mapTupleItems(schemas) {
		const uniqueSchemas = uniq(schemas);
		return {
			items: uniqueSchemas.length === 1 ? uniqueSchemas[0] : { anyOf: uniqueSchemas },
			minItems: schemas.length,
			maxItems: schemas.length
		};
	}
	getNumberChecks(checks) {
		return Object.assign({}, ...checks.map((check$1) => {
			switch (check$1._zod.def.check) {
				case "greater_than": {
					const greaterThanCheck = check$1;
					return greaterThanCheck._zod.def.inclusive ? { minimum: Number(greaterThanCheck._zod.def.value) } : {
						minimum: Number(greaterThanCheck._zod.def.value),
						exclusiveMinimum: true
					};
				}
				case "less_than": {
					const lessThanCheck = check$1;
					return lessThanCheck._zod.def.inclusive ? { maximum: Number(lessThanCheck._zod.def.value) } : {
						maximum: Number(lessThanCheck._zod.def.value),
						exclusiveMaximum: !lessThanCheck._zod.def.inclusive
					};
				}
				default: return {};
			}
		}));
	}
};
var OpenApiGeneratorV3 = class {
	constructor(definitions, options) {
		this.generator = new OpenAPIGenerator(definitions, new OpenApiGeneratorV30Specifics(), options);
	}
	generateDocument(config$1) {
		const baseData = this.generator.generateDocumentData();
		return Object.assign(Object.assign({}, config$1), baseData);
	}
	generateComponents() {
		return this.generator.generateComponents();
	}
};
var OpenApiGeneratorV31Specifics = class {
	get nullType() {
		return { type: "null" };
	}
	mapNullableOfArray(objects, isNullable) {
		if (isNullable) return [...objects, this.nullType];
		return objects;
	}
	mapNullableType(type, isNullable) {
		if (!type) return {};
		if (isNullable) return { type: Array.isArray(type) ? [...type, "null"] : [type, "null"] };
		return { type };
	}
	mapTupleItems(schemas) {
		return { prefixItems: schemas };
	}
	getNumberChecks(checks) {
		return Object.assign({}, ...checks.map((check$1) => {
			switch (check$1._zod.def.check) {
				case "greater_than": {
					const greaterThanCheck = check$1;
					return greaterThanCheck._zod.def.inclusive ? { minimum: Number(greaterThanCheck._zod.def.value) } : { exclusiveMinimum: Number(greaterThanCheck._zod.def.value) };
				}
				case "less_than": {
					const lessThanCheck = check$1;
					return lessThanCheck._zod.def.inclusive ? { maximum: Number(lessThanCheck._zod.def.value) } : { exclusiveMaximum: Number(lessThanCheck._zod.def.value) };
				}
				default: return {};
			}
		}));
	}
};
function isWebhookDefinition(definition) {
	return "type" in definition && definition.type === "webhook";
}
var OpenApiGeneratorV31 = class {
	constructor(definitions, options) {
		this.definitions = definitions;
		this.webhookRefs = {};
		const specifics = new OpenApiGeneratorV31Specifics();
		this.generator = new OpenAPIGenerator(this.definitions, specifics, options);
	}
	generateDocument(config$1) {
		const baseDocument = this.generator.generateDocumentData();
		this.definitions.filter(isWebhookDefinition).forEach((definition) => this.generateSingleWebhook(definition.webhook));
		return Object.assign(Object.assign(Object.assign({}, config$1), baseDocument), { webhooks: this.webhookRefs });
	}
	generateComponents() {
		return this.generator.generateComponents();
	}
	generateSingleWebhook(route) {
		const routeDoc = this.generator.generatePath(route);
		this.webhookRefs[route.path] = Object.assign(Object.assign({}, this.webhookRefs[route.path]), routeDoc);
		return routeDoc;
	}
};

//#endregion
//#region node_modules/hono/dist/helper/cookie/index.js
var getCookie = (c, key, prefix) => {
	const cookie = c.req.raw.headers.get("Cookie");
	if (typeof key === "string") {
		if (!cookie) return;
		let finalKey = key;
		if (prefix === "secure") finalKey = "__Secure-" + key;
		else if (prefix === "host") finalKey = "__Host-" + key;
		return parse$2(cookie, finalKey)[finalKey];
	}
	if (!cookie) return {};
	return parse$2(cookie);
};

//#endregion
//#region node_modules/hono/dist/http-exception.js
var HTTPException = class extends Error {
	res;
	status;
	constructor(status = 500, options) {
		super(options?.message, { cause: options?.cause });
		this.res = options?.res;
		this.status = status;
	}
	getResponse() {
		if (this.res) return new Response(this.res.body, {
			status: this.status,
			headers: this.res.headers
		});
		return new Response(this.message, { status: this.status });
	}
};

//#endregion
//#region node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
	return new Response(arrayBuffer, { headers: { "Content-Type": contentType } }).formData();
};

//#endregion
//#region node_modules/hono/dist/validator/validator.js
var jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/;
var multipartRegex = /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/;
var urlencodedRegex = /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/;
var validator = (target, validationFunc) => {
	return async (c, next) => {
		let value = {};
		const contentType = c.req.header("Content-Type");
		switch (target) {
			case "json":
				if (!contentType || !jsonRegex.test(contentType)) break;
				try {
					value = await c.req.json();
				} catch {
					throw new HTTPException(400, { message: "Malformed JSON in request body" });
				}
				break;
			case "form": {
				if (!contentType || !(multipartRegex.test(contentType) || urlencodedRegex.test(contentType))) break;
				let formData;
				if (c.req.bodyCache.formData) formData = await c.req.bodyCache.formData;
				else try {
					formData = await bufferToFormData(await c.req.arrayBuffer(), contentType);
					c.req.bodyCache.formData = formData;
				} catch (e) {
					let message = "Malformed FormData request.";
					message += e instanceof Error ? ` ${e.message}` : ` ${String(e)}`;
					throw new HTTPException(400, { message });
				}
				const form = {};
				formData.forEach((value2, key) => {
					if (key.endsWith("[]")) (form[key] ??= []).push(value2);
					else if (Array.isArray(form[key])) form[key].push(value2);
					else if (key in form) form[key] = [form[key], value2];
					else form[key] = value2;
				});
				value = form;
				break;
			}
			case "query":
				value = Object.fromEntries(Object.entries(c.req.queries()).map(([k, v]) => {
					return v.length === 1 ? [k, v[0]] : [k, v];
				}));
				break;
			case "param":
				value = c.req.param();
				break;
			case "header":
				value = c.req.header();
				break;
			case "cookie":
				value = getCookie(c);
				break;
		}
		const res = await validationFunc(value, c);
		if (res instanceof Response) return res;
		c.req.addValidatedData(target, res);
		return await next();
	};
};

//#endregion
//#region node_modules/@hono/zod-validator/dist/index.js
var zValidator = (target, schema, hook, options) => validator(target, async (value, c) => {
	let validatorValue = value;
	if (target === "header" && "_def" in schema || target === "header" && "_zod" in schema) {
		const schemaKeys = Object.keys("in" in schema ? schema.in.shape : schema.shape);
		const caseInsensitiveKeymap = Object.fromEntries(schemaKeys.map((key) => [key.toLowerCase(), key]));
		validatorValue = Object.fromEntries(Object.entries(value).map(([key, value2]) => [caseInsensitiveKeymap[key] || key, value2]));
	}
	const result = options && options.validationFunction ? await options.validationFunction(schema, validatorValue) : await schema.safeParseAsync(validatorValue);
	if (hook) {
		const hookResult = await hook({
			data: validatorValue,
			...result,
			target
		}, c);
		if (hookResult) {
			if (hookResult instanceof Response) return hookResult;
			if ("response" in hookResult) return hookResult.response;
		}
	}
	if (!result.success) return c.json(result, 400);
	return result.data;
});

//#endregion
//#region node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
	return (context, next) => {
		let index = -1;
		return dispatch(0);
		async function dispatch(i) {
			if (i <= index) throw new Error("next() called multiple times");
			index = i;
			let res;
			let isError = false;
			let handler;
			if (middleware[i]) {
				handler = middleware[i][0][0];
				context.req.routeIndex = i;
			} else handler = i === middleware.length && next || void 0;
			if (handler) try {
				res = await handler(context, () => dispatch(i + 1));
			} catch (err) {
				if (err instanceof Error && onError) {
					context.error = err;
					res = await onError(err, context);
					isError = true;
				} else throw err;
			}
			else if (context.finalized === false && onNotFound) res = await onNotFound(context);
			if (res && (context.finalized === false || isError)) context.res = res;
			return context;
		}
	};
};

//#endregion
//#region node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();

//#endregion
//#region node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
	const { all = false, dot = false } = options;
	const contentType = (request instanceof HonoRequest ? request.raw.headers : request.headers).get("Content-Type");
	if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) return parseFormData(request, {
		all,
		dot
	});
	return {};
};
async function parseFormData(request, options) {
	const formData = await request.formData();
	if (formData) return convertFormDataToBodyData(formData, options);
	return {};
}
function convertFormDataToBodyData(formData, options) {
	const form = /* @__PURE__ */ Object.create(null);
	formData.forEach((value, key) => {
		if (!(options.all || key.endsWith("[]"))) form[key] = value;
		else handleParsingAllValues(form, key, value);
	});
	if (options.dot) Object.entries(form).forEach(([key, value]) => {
		if (key.includes(".")) {
			handleParsingNestedValues(form, key, value);
			delete form[key];
		}
	});
	return form;
}
var handleParsingAllValues = (form, key, value) => {
	if (form[key] !== void 0) if (Array.isArray(form[key])) form[key].push(value);
	else form[key] = [form[key], value];
	else if (!key.endsWith("[]")) form[key] = value;
	else form[key] = [value];
};
var handleParsingNestedValues = (form, key, value) => {
	let nestedForm = form;
	const keys = key.split(".");
	keys.forEach((key2, index) => {
		if (index === keys.length - 1) nestedForm[key2] = value;
		else {
			if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) nestedForm[key2] = /* @__PURE__ */ Object.create(null);
			nestedForm = nestedForm[key2];
		}
	});
};

//#endregion
//#region node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
	raw;
	#validatedData;
	#matchResult;
	routeIndex = 0;
	path;
	bodyCache = {};
	constructor(request, path = "/", matchResult = [[]]) {
		this.raw = request;
		this.path = path;
		this.#matchResult = matchResult;
		this.#validatedData = {};
	}
	param(key) {
		return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
	}
	#getDecodedParam(key) {
		const paramKey = this.#matchResult[0][this.routeIndex][1][key];
		const param = this.#getParamValue(paramKey);
		return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
	}
	#getAllDecodedParams() {
		const decoded = {};
		const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
		for (const key of keys) {
			const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
			if (value !== void 0) decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
		}
		return decoded;
	}
	#getParamValue(paramKey) {
		return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
	}
	query(key) {
		return getQueryParam(this.url, key);
	}
	queries(key) {
		return getQueryParams(this.url, key);
	}
	header(name) {
		if (name) return this.raw.headers.get(name) ?? void 0;
		const headerData = {};
		this.raw.headers.forEach((value, key) => {
			headerData[key] = value;
		});
		return headerData;
	}
	async parseBody(options) {
		return this.bodyCache.parsedBody ??= await parseBody(this, options);
	}
	#cachedBody = (key) => {
		const { bodyCache, raw: raw$1 } = this;
		const cachedBody = bodyCache[key];
		if (cachedBody) return cachedBody;
		const anyCachedKey = Object.keys(bodyCache)[0];
		if (anyCachedKey) return bodyCache[anyCachedKey].then((body) => {
			if (anyCachedKey === "json") body = JSON.stringify(body);
			return new Response(body)[key]();
		});
		return bodyCache[key] = raw$1[key]();
	};
	json() {
		return this.#cachedBody("text").then((text) => JSON.parse(text));
	}
	text() {
		return this.#cachedBody("text");
	}
	arrayBuffer() {
		return this.#cachedBody("arrayBuffer");
	}
	blob() {
		return this.#cachedBody("blob");
	}
	formData() {
		return this.#cachedBody("formData");
	}
	addValidatedData(target, data) {
		this.#validatedData[target] = data;
	}
	valid(target) {
		return this.#validatedData[target];
	}
	get url() {
		return this.raw.url;
	}
	get method() {
		return this.raw.method;
	}
	get [GET_MATCH_RESULT]() {
		return this.#matchResult;
	}
	get matchedRoutes() {
		return this.#matchResult[0].map(([[, route]]) => route);
	}
	get routePath() {
		return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
	}
};

//#endregion
//#region node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
	Stringify: 1,
	BeforeStream: 2,
	Stream: 3
};
var raw = (value, callbacks) => {
	const escapedString = new String(value);
	escapedString.isEscaped = true;
	escapedString.callbacks = callbacks;
	return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
	if (typeof str === "object" && !(str instanceof String)) {
		if (!(str instanceof Promise)) str = str.toString();
		if (str instanceof Promise) str = await str;
	}
	const callbacks = str.callbacks;
	if (!callbacks?.length) return Promise.resolve(str);
	if (buffer) buffer[0] += str;
	else buffer = [str];
	const resStr = Promise.all(callbacks.map((c) => c({
		phase,
		buffer,
		context
	}))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
	if (preserveCallbacks) return raw(await resStr, callbacks);
	else return resStr;
};

//#endregion
//#region node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
	return {
		"Content-Type": contentType,
		...headers
	};
};
var Context = class {
	#rawRequest;
	#req;
	env = {};
	#var;
	finalized = false;
	error;
	#status;
	#executionCtx;
	#res;
	#layout;
	#renderer;
	#notFoundHandler;
	#preparedHeaders;
	#matchResult;
	#path;
	constructor(req, options) {
		this.#rawRequest = req;
		if (options) {
			this.#executionCtx = options.executionCtx;
			this.env = options.env;
			this.#notFoundHandler = options.notFoundHandler;
			this.#path = options.path;
			this.#matchResult = options.matchResult;
		}
	}
	get req() {
		this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
		return this.#req;
	}
	get event() {
		if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
		else throw Error("This context has no FetchEvent");
	}
	get executionCtx() {
		if (this.#executionCtx) return this.#executionCtx;
		else throw Error("This context has no ExecutionContext");
	}
	get res() {
		return this.#res ||= new Response(null, { headers: this.#preparedHeaders ??= new Headers() });
	}
	set res(_res) {
		if (this.#res && _res) {
			_res = new Response(_res.body, _res);
			for (const [k, v] of this.#res.headers.entries()) {
				if (k === "content-type") continue;
				if (k === "set-cookie") {
					const cookies = this.#res.headers.getSetCookie();
					_res.headers.delete("set-cookie");
					for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
				} else _res.headers.set(k, v);
			}
		}
		this.#res = _res;
		this.finalized = true;
	}
	render = (...args) => {
		this.#renderer ??= (content) => this.html(content);
		return this.#renderer(...args);
	};
	setLayout = (layout) => this.#layout = layout;
	getLayout = () => this.#layout;
	setRenderer = (renderer) => {
		this.#renderer = renderer;
	};
	header = (name, value, options) => {
		if (this.finalized) this.#res = new Response(this.#res.body, this.#res);
		const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
		if (value === void 0) headers.delete(name);
		else if (options?.append) headers.append(name, value);
		else headers.set(name, value);
	};
	status = (status) => {
		this.#status = status;
	};
	set = (key, value) => {
		this.#var ??= /* @__PURE__ */ new Map();
		this.#var.set(key, value);
	};
	get = (key) => {
		return this.#var ? this.#var.get(key) : void 0;
	};
	get var() {
		if (!this.#var) return {};
		return Object.fromEntries(this.#var);
	}
	#newResponse(data, arg, headers) {
		const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
		if (typeof arg === "object" && "headers" in arg) {
			const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
			for (const [key, value] of argHeaders) if (key.toLowerCase() === "set-cookie") responseHeaders.append(key, value);
			else responseHeaders.set(key, value);
		}
		if (headers) for (const [k, v] of Object.entries(headers)) if (typeof v === "string") responseHeaders.set(k, v);
		else {
			responseHeaders.delete(k);
			for (const v2 of v) responseHeaders.append(k, v2);
		}
		const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
		return new Response(data, {
			status,
			headers: responseHeaders
		});
	}
	newResponse = (...args) => this.#newResponse(...args);
	body = (data, arg, headers) => this.#newResponse(data, arg, headers);
	text = (text, arg, headers) => {
		return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
	};
	json = (object$1, arg, headers) => {
		return this.#newResponse(JSON.stringify(object$1), arg, setDefaultContentType("application/json", headers));
	};
	html = (html, arg, headers) => {
		const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
		return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
	};
	redirect = (location, status) => {
		const locationString = String(location);
		this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
		return this.newResponse(null, status ?? 302);
	};
	notFound = () => {
		this.#notFoundHandler ??= () => new Response();
		return this.#notFoundHandler(this);
	};
};

//#endregion
//#region node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = [
	"get",
	"post",
	"put",
	"delete",
	"options",
	"patch"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {};

//#endregion
//#region node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

//#endregion
//#region node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
	return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
	if ("getResponse" in err) {
		const res = err.getResponse();
		return c.newResponse(res.body, res);
	}
	console.error(err);
	return c.text("Internal Server Error", 500);
};
var Hono$1 = class {
	get;
	post;
	put;
	delete;
	options;
	patch;
	all;
	on;
	use;
	router;
	getPath;
	_basePath = "/";
	#path = "/";
	routes = [];
	constructor(options = {}) {
		[...METHODS, METHOD_NAME_ALL_LOWERCASE].forEach((method) => {
			this[method] = (args1, ...args) => {
				if (typeof args1 === "string") this.#path = args1;
				else this.#addRoute(method, this.#path, args1);
				args.forEach((handler) => {
					this.#addRoute(method, this.#path, handler);
				});
				return this;
			};
		});
		this.on = (method, path, ...handlers) => {
			for (const p of [path].flat()) {
				this.#path = p;
				for (const m of [method].flat()) handlers.map((handler) => {
					this.#addRoute(m.toUpperCase(), this.#path, handler);
				});
			}
			return this;
		};
		this.use = (arg1, ...handlers) => {
			if (typeof arg1 === "string") this.#path = arg1;
			else {
				this.#path = "*";
				handlers.unshift(arg1);
			}
			handlers.forEach((handler) => {
				this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
			});
			return this;
		};
		const { strict, ...optionsWithoutStrict } = options;
		Object.assign(this, optionsWithoutStrict);
		this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
	}
	#clone() {
		const clone$1 = new Hono$1({
			router: this.router,
			getPath: this.getPath
		});
		clone$1.errorHandler = this.errorHandler;
		clone$1.#notFoundHandler = this.#notFoundHandler;
		clone$1.routes = this.routes;
		return clone$1;
	}
	#notFoundHandler = notFoundHandler;
	errorHandler = errorHandler;
	route(path, app$1) {
		const subApp = this.basePath(path);
		app$1.routes.map((r) => {
			let handler;
			if (app$1.errorHandler === errorHandler) handler = r.handler;
			else {
				handler = async (c, next) => (await compose([], app$1.errorHandler)(c, () => r.handler(c, next))).res;
				handler[COMPOSED_HANDLER] = r.handler;
			}
			subApp.#addRoute(r.method, r.path, handler);
		});
		return this;
	}
	basePath(path) {
		const subApp = this.#clone();
		subApp._basePath = mergePath(this._basePath, path);
		return subApp;
	}
	onError = (handler) => {
		this.errorHandler = handler;
		return this;
	};
	notFound = (handler) => {
		this.#notFoundHandler = handler;
		return this;
	};
	mount(path, applicationHandler, options) {
		let replaceRequest;
		let optionHandler;
		if (options) if (typeof options === "function") optionHandler = options;
		else {
			optionHandler = options.optionHandler;
			if (options.replaceRequest === false) replaceRequest = (request) => request;
			else replaceRequest = options.replaceRequest;
		}
		const getOptions = optionHandler ? (c) => {
			const options2 = optionHandler(c);
			return Array.isArray(options2) ? options2 : [options2];
		} : (c) => {
			let executionContext = void 0;
			try {
				executionContext = c.executionCtx;
			} catch {}
			return [c.env, executionContext];
		};
		replaceRequest ||= (() => {
			const mergedPath = mergePath(this._basePath, path);
			const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
			return (request) => {
				const url$1 = new URL(request.url);
				url$1.pathname = url$1.pathname.slice(pathPrefixLength) || "/";
				return new Request(url$1, request);
			};
		})();
		const handler = async (c, next) => {
			const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
			if (res) return res;
			await next();
		};
		this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
		return this;
	}
	#addRoute(method, path, handler) {
		method = method.toUpperCase();
		path = mergePath(this._basePath, path);
		const r = {
			basePath: this._basePath,
			path,
			method,
			handler
		};
		this.router.add(method, path, [handler, r]);
		this.routes.push(r);
	}
	#handleError(err, c) {
		if (err instanceof Error) return this.errorHandler(err, c);
		throw err;
	}
	#dispatch(request, executionCtx, env, method) {
		if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
		const path = this.getPath(request, { env });
		const matchResult = this.router.match(method, path);
		const c = new Context(request, {
			path,
			matchResult,
			env,
			executionCtx,
			notFoundHandler: this.#notFoundHandler
		});
		if (matchResult[0].length === 1) {
			let res;
			try {
				res = matchResult[0][0][0][0](c, async () => {
					c.res = await this.#notFoundHandler(c);
				});
			} catch (err) {
				return this.#handleError(err, c);
			}
			return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
		}
		const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
		return (async () => {
			try {
				const context = await composed(c);
				if (!context.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
				return context.res;
			} catch (err) {
				return this.#handleError(err, c);
			}
		})();
	}
	fetch = (request, ...rest) => {
		return this.#dispatch(request, rest[1], rest[0], request.method);
	};
	request = (input, requestInit, Env, executionCtx) => {
		if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
		input = input.toString();
		return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
	};
	fire = () => {
		addEventListener("fetch", (event) => {
			event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
		});
	};
};

//#endregion
//#region node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
	const matchers = this.buildAllMatchers();
	const match2 = (method2, path2) => {
		const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
		const staticMatch = matcher[2][path2];
		if (staticMatch) return staticMatch;
		const match3 = path2.match(matcher[0]);
		if (!match3) return [[], emptyParam];
		const index = match3.indexOf("", 1);
		return [matcher[1][index], match3];
	};
	this.match = match2;
	return match2(method, path);
}

//#endregion
//#region node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b) {
	if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
	if (b.length === 1) return 1;
	if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) return 1;
	else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) return -1;
	if (a === LABEL_REG_EXP_STR) return 1;
	else if (b === LABEL_REG_EXP_STR) return -1;
	return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node$1 = class {
	#index;
	#varIndex;
	#children = /* @__PURE__ */ Object.create(null);
	insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
		if (tokens.length === 0) {
			if (this.#index !== void 0) throw PATH_ERROR;
			if (pathErrorCheckOnly) return;
			this.#index = index;
			return;
		}
		const [token, ...restTokens] = tokens;
		const pattern = token === "*" ? restTokens.length === 0 ? [
			"",
			"",
			ONLY_WILDCARD_REG_EXP_STR
		] : [
			"",
			"",
			LABEL_REG_EXP_STR
		] : token === "/*" ? [
			"",
			"",
			TAIL_WILDCARD_REG_EXP_STR
		] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
		let node;
		if (pattern) {
			const name = pattern[1];
			let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
			if (name && pattern[2]) {
				if (regexpStr === ".*") throw PATH_ERROR;
				regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
				if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
			}
			node = this.#children[regexpStr];
			if (!node) {
				if (Object.keys(this.#children).some((k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR)) throw PATH_ERROR;
				if (pathErrorCheckOnly) return;
				node = this.#children[regexpStr] = new Node$1();
				if (name !== "") node.#varIndex = context.varIndex++;
			}
			if (!pathErrorCheckOnly && name !== "") paramMap.push([name, node.#varIndex]);
		} else {
			node = this.#children[token];
			if (!node) {
				if (Object.keys(this.#children).some((k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR)) throw PATH_ERROR;
				if (pathErrorCheckOnly) return;
				node = this.#children[token] = new Node$1();
			}
		}
		node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
	}
	buildRegExpStr() {
		const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
			const c = this.#children[k];
			return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
		});
		if (typeof this.#index === "number") strList.unshift(`#${this.#index}`);
		if (strList.length === 0) return "";
		if (strList.length === 1) return strList[0];
		return "(?:" + strList.join("|") + ")";
	}
};

//#endregion
//#region node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
	#context = { varIndex: 0 };
	#root = new Node$1();
	insert(path, index, pathErrorCheckOnly) {
		const paramAssoc = [];
		const groups = [];
		for (let i = 0;;) {
			let replaced = false;
			path = path.replace(/\{[^}]+\}/g, (m) => {
				const mark = `@\\${i}`;
				groups[i] = [mark, m];
				i++;
				replaced = true;
				return mark;
			});
			if (!replaced) break;
		}
		const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
		for (let i = groups.length - 1; i >= 0; i--) {
			const [mark] = groups[i];
			for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
				tokens[j] = tokens[j].replace(mark, groups[i][1]);
				break;
			}
		}
		this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
		return paramAssoc;
	}
	buildRegExp() {
		let regexp = this.#root.buildRegExpStr();
		if (regexp === "") return [
			/^$/,
			[],
			[]
		];
		let captureIndex = 0;
		const indexReplacementMap = [];
		const paramReplacementMap = [];
		regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
			if (handlerIndex !== void 0) {
				indexReplacementMap[++captureIndex] = Number(handlerIndex);
				return "$()";
			}
			if (paramIndex !== void 0) {
				paramReplacementMap[Number(paramIndex)] = ++captureIndex;
				return "";
			}
			return "";
		});
		return [
			/* @__PURE__ */ new RegExp(`^${regexp}`),
			indexReplacementMap,
			paramReplacementMap
		];
	}
};

//#endregion
//#region node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [
	/^$/,
	[],
	/* @__PURE__ */ Object.create(null)
];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
	return wildcardRegExpCache[path] ??= /* @__PURE__ */ new RegExp(path === "*" ? "" : `^${path.replace(/\/\*$|([.\\+*[^\]$()])/g, (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)")}$`);
}
function clearWildcardRegExpCache() {
	wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
	const trie = new Trie();
	const handlerData = [];
	if (routes.length === 0) return nullMatcher;
	const routesWithStaticPathFlag = routes.map((route) => [!/\*|\/:/.test(route[0]), ...route]).sort(([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length);
	const staticMap = /* @__PURE__ */ Object.create(null);
	for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
		const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
		if (pathErrorCheckOnly) staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
		else j++;
		let paramAssoc;
		try {
			paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
		} catch (e) {
			throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
		}
		if (pathErrorCheckOnly) continue;
		handlerData[j] = handlers.map(([h, paramCount]) => {
			const paramIndexMap = /* @__PURE__ */ Object.create(null);
			paramCount -= 1;
			for (; paramCount >= 0; paramCount--) {
				const [key, value] = paramAssoc[paramCount];
				paramIndexMap[key] = value;
			}
			return [h, paramIndexMap];
		});
	}
	const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
	for (let i = 0, len = handlerData.length; i < len; i++) for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
		const map$1 = handlerData[i][j]?.[1];
		if (!map$1) continue;
		const keys = Object.keys(map$1);
		for (let k = 0, len3 = keys.length; k < len3; k++) map$1[keys[k]] = paramReplacementMap[map$1[keys[k]]];
	}
	const handlerMap = [];
	for (const i in indexReplacementMap) handlerMap[i] = handlerData[indexReplacementMap[i]];
	return [
		regexp,
		handlerMap,
		staticMap
	];
}
function findMiddleware(middleware, path) {
	if (!middleware) return;
	for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) if (buildWildcardRegExp(k).test(path)) return [...middleware[k]];
}
var RegExpRouter = class {
	name = "RegExpRouter";
	#middleware;
	#routes;
	constructor() {
		this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
		this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
	}
	add(method, path, handler) {
		const middleware = this.#middleware;
		const routes = this.#routes;
		if (!middleware || !routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
		if (!middleware[method]) [middleware, routes].forEach((handlerMap) => {
			handlerMap[method] = /* @__PURE__ */ Object.create(null);
			Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
				handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
			});
		});
		if (path === "/*") path = "*";
		const paramCount = (path.match(/\/:/g) || []).length;
		if (/\*$/.test(path)) {
			const re = buildWildcardRegExp(path);
			if (method === METHOD_NAME_ALL) Object.keys(middleware).forEach((m) => {
				middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
			});
			else middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
			Object.keys(middleware).forEach((m) => {
				if (method === METHOD_NAME_ALL || method === m) Object.keys(middleware[m]).forEach((p) => {
					re.test(p) && middleware[m][p].push([handler, paramCount]);
				});
			});
			Object.keys(routes).forEach((m) => {
				if (method === METHOD_NAME_ALL || method === m) Object.keys(routes[m]).forEach((p) => re.test(p) && routes[m][p].push([handler, paramCount]));
			});
			return;
		}
		const paths = checkOptionalParameter(path) || [path];
		for (let i = 0, len = paths.length; i < len; i++) {
			const path2 = paths[i];
			Object.keys(routes).forEach((m) => {
				if (method === METHOD_NAME_ALL || method === m) {
					routes[m][path2] ||= [...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []];
					routes[m][path2].push([handler, paramCount - len + i + 1]);
				}
			});
		}
	}
	match = match;
	buildAllMatchers() {
		const matchers = /* @__PURE__ */ Object.create(null);
		Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
			matchers[method] ||= this.#buildMatcher(method);
		});
		this.#middleware = this.#routes = void 0;
		clearWildcardRegExpCache();
		return matchers;
	}
	#buildMatcher(method) {
		const routes = [];
		let hasOwnRoute = method === METHOD_NAME_ALL;
		[this.#middleware, this.#routes].forEach((r) => {
			const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
			if (ownRoute.length !== 0) {
				hasOwnRoute ||= true;
				routes.push(...ownRoute);
			} else if (method !== METHOD_NAME_ALL) routes.push(...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]]));
		});
		if (!hasOwnRoute) return null;
		else return buildMatcherFromPreprocessedRoutes(routes);
	}
};

//#endregion
//#region node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
	name = "SmartRouter";
	#routers = [];
	#routes = [];
	constructor(init) {
		this.#routers = init.routers;
	}
	add(method, path, handler) {
		if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
		this.#routes.push([
			method,
			path,
			handler
		]);
	}
	match(method, path) {
		if (!this.#routes) throw new Error("Fatal error");
		const routers = this.#routers;
		const routes = this.#routes;
		const len = routers.length;
		let i = 0;
		let res;
		for (; i < len; i++) {
			const router = routers[i];
			try {
				for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
				res = router.match(method, path);
			} catch (e) {
				if (e instanceof UnsupportedPathError) continue;
				throw e;
			}
			this.match = router.match.bind(router);
			this.#routers = [router];
			this.#routes = void 0;
			break;
		}
		if (i === len) throw new Error("Fatal error");
		this.name = `SmartRouter + ${this.activeRouter.name}`;
		return res;
	}
	get activeRouter() {
		if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
		return this.#routers[0];
	}
};

//#endregion
//#region node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node = class {
	#methods;
	#children;
	#patterns;
	#order = 0;
	#params = emptyParams;
	constructor(method, handler, children) {
		this.#children = children || /* @__PURE__ */ Object.create(null);
		this.#methods = [];
		if (method && handler) {
			const m = /* @__PURE__ */ Object.create(null);
			m[method] = {
				handler,
				possibleKeys: [],
				score: 0
			};
			this.#methods = [m];
		}
		this.#patterns = [];
	}
	insert(method, path, handler) {
		this.#order = ++this.#order;
		let curNode = this;
		const parts = splitRoutingPath(path);
		const possibleKeys = [];
		for (let i = 0, len = parts.length; i < len; i++) {
			const p = parts[i];
			const nextP = parts[i + 1];
			const pattern = getPattern(p, nextP);
			const key = Array.isArray(pattern) ? pattern[0] : p;
			if (key in curNode.#children) {
				curNode = curNode.#children[key];
				if (pattern) possibleKeys.push(pattern[1]);
				continue;
			}
			curNode.#children[key] = new Node();
			if (pattern) {
				curNode.#patterns.push(pattern);
				possibleKeys.push(pattern[1]);
			}
			curNode = curNode.#children[key];
		}
		curNode.#methods.push({ [method]: {
			handler,
			possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
			score: this.#order
		} });
		return curNode;
	}
	#getHandlerSets(node, method, nodeParams, params) {
		const handlerSets = [];
		for (let i = 0, len = node.#methods.length; i < len; i++) {
			const m = node.#methods[i];
			const handlerSet = m[method] || m[METHOD_NAME_ALL];
			const processedSet = {};
			if (handlerSet !== void 0) {
				handlerSet.params = /* @__PURE__ */ Object.create(null);
				handlerSets.push(handlerSet);
				if (nodeParams !== emptyParams || params && params !== emptyParams) for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
					const key = handlerSet.possibleKeys[i2];
					const processed = processedSet[handlerSet.score];
					handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
					processedSet[handlerSet.score] = true;
				}
			}
		}
		return handlerSets;
	}
	search(method, path) {
		const handlerSets = [];
		this.#params = emptyParams;
		let curNodes = [this];
		const parts = splitPath(path);
		const curNodesQueue = [];
		for (let i = 0, len = parts.length; i < len; i++) {
			const part = parts[i];
			const isLast = i === len - 1;
			const tempNodes = [];
			for (let j = 0, len2 = curNodes.length; j < len2; j++) {
				const node = curNodes[j];
				const nextNode = node.#children[part];
				if (nextNode) {
					nextNode.#params = node.#params;
					if (isLast) {
						if (nextNode.#children["*"]) handlerSets.push(...this.#getHandlerSets(nextNode.#children["*"], method, node.#params));
						handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
					} else tempNodes.push(nextNode);
				}
				for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
					const pattern = node.#patterns[k];
					const params = node.#params === emptyParams ? {} : { ...node.#params };
					if (pattern === "*") {
						const astNode = node.#children["*"];
						if (astNode) {
							handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
							astNode.#params = params;
							tempNodes.push(astNode);
						}
						continue;
					}
					const [key, name, matcher] = pattern;
					if (!part && !(matcher instanceof RegExp)) continue;
					const child = node.#children[key];
					const restPathString = parts.slice(i).join("/");
					if (matcher instanceof RegExp) {
						const m = matcher.exec(restPathString);
						if (m) {
							params[name] = m[0];
							handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
							if (Object.keys(child.#children).length) {
								child.#params = params;
								const componentCount = m[0].match(/\//)?.length ?? 0;
								(curNodesQueue[componentCount] ||= []).push(child);
							}
							continue;
						}
					}
					if (matcher === true || matcher.test(part)) {
						params[name] = part;
						if (isLast) {
							handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
							if (child.#children["*"]) handlerSets.push(...this.#getHandlerSets(child.#children["*"], method, params, node.#params));
						} else {
							child.#params = params;
							tempNodes.push(child);
						}
					}
				}
			}
			curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
		}
		if (handlerSets.length > 1) handlerSets.sort((a, b) => {
			return a.score - b.score;
		});
		return [handlerSets.map(({ handler, params }) => [handler, params])];
	}
};

//#endregion
//#region node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
	name = "TrieRouter";
	#node;
	constructor() {
		this.#node = new Node();
	}
	add(method, path, handler) {
		const results = checkOptionalParameter(path);
		if (results) {
			for (let i = 0, len = results.length; i < len; i++) this.#node.insert(method, results[i], handler);
			return;
		}
		this.#node.insert(method, path, handler);
	}
	match(method, path) {
		return this.#node.search(method, path);
	}
};

//#endregion
//#region node_modules/hono/dist/hono.js
var Hono = class extends Hono$1 {
	constructor(options = {}) {
		super(options);
		this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
	}
};

//#endregion
//#region node_modules/zod/v4/core/core.js
/** A special constant with type `never` */
const NEVER = Object.freeze({ status: "aborted" });
function $constructor(name, initializer$2, params) {
	function init(inst, def) {
		var _a;
		Object.defineProperty(inst, "_zod", {
			value: inst._zod ?? {},
			enumerable: false
		});
		(_a = inst._zod).traits ?? (_a.traits = /* @__PURE__ */ new Set());
		inst._zod.traits.add(name);
		initializer$2(inst, def);
		for (const k in _.prototype) if (!(k in inst)) Object.defineProperty(inst, k, { value: _.prototype[k].bind(inst) });
		inst._zod.constr = _;
		inst._zod.def = def;
	}
	const Parent = params?.Parent ?? Object;
	class Definition extends Parent {}
	Object.defineProperty(Definition, "name", { value: name });
	function _(def) {
		var _a;
		const inst = params?.Parent ? new Definition() : this;
		init(inst, def);
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		for (const fn of inst._zod.deferred) fn();
		return inst;
	}
	Object.defineProperty(_, "init", { value: init });
	Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
		if (params?.Parent && inst instanceof params.Parent) return true;
		return inst?._zod?.traits?.has(name);
	} });
	Object.defineProperty(_, "name", { value: name });
	return _;
}
const $brand = Symbol("zod_brand");
var $ZodAsyncError = class extends Error {
	constructor() {
		super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
	}
};
var $ZodEncodeError = class extends Error {
	constructor(name) {
		super(`Encountered unidirectional transform during encode: ${name}`);
		this.name = "ZodEncodeError";
	}
};
const globalConfig = {};
function config(newConfig) {
	if (newConfig) Object.assign(globalConfig, newConfig);
	return globalConfig;
}

//#endregion
//#region node_modules/zod/v4/core/util.js
var util_exports = /* @__PURE__ */ __export({
	BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES,
	Class: () => Class,
	NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
	aborted: () => aborted,
	allowsEval: () => allowsEval,
	assert: () => assert,
	assertEqual: () => assertEqual,
	assertIs: () => assertIs,
	assertNever: () => assertNever,
	assertNotEqual: () => assertNotEqual,
	assignProp: () => assignProp,
	base64ToUint8Array: () => base64ToUint8Array,
	base64urlToUint8Array: () => base64urlToUint8Array,
	cached: () => cached,
	captureStackTrace: () => captureStackTrace,
	cleanEnum: () => cleanEnum,
	cleanRegex: () => cleanRegex,
	clone: () => clone,
	cloneDef: () => cloneDef,
	createTransparentProxy: () => createTransparentProxy,
	defineLazy: () => defineLazy,
	esc: () => esc,
	escapeRegex: () => escapeRegex,
	extend: () => extend,
	finalizeIssue: () => finalizeIssue,
	floatSafeRemainder: () => floatSafeRemainder,
	getElementAtPath: () => getElementAtPath,
	getEnumValues: () => getEnumValues,
	getLengthableOrigin: () => getLengthableOrigin,
	getParsedType: () => getParsedType,
	getSizableOrigin: () => getSizableOrigin,
	hexToUint8Array: () => hexToUint8Array,
	isObject: () => isObject$1,
	isPlainObject: () => isPlainObject,
	issue: () => issue,
	joinValues: () => joinValues,
	jsonStringifyReplacer: () => jsonStringifyReplacer,
	merge: () => merge,
	mergeDefs: () => mergeDefs,
	normalizeParams: () => normalizeParams,
	nullish: () => nullish$1,
	numKeys: () => numKeys,
	objectClone: () => objectClone,
	omit: () => omit,
	optionalKeys: () => optionalKeys,
	partial: () => partial,
	pick: () => pick,
	prefixIssues: () => prefixIssues,
	primitiveTypes: () => primitiveTypes,
	promiseAllObject: () => promiseAllObject,
	propertyKeyTypes: () => propertyKeyTypes,
	randomString: () => randomString,
	required: () => required,
	safeExtend: () => safeExtend,
	shallowClone: () => shallowClone,
	stringifyPrimitive: () => stringifyPrimitive,
	uint8ArrayToBase64: () => uint8ArrayToBase64,
	uint8ArrayToBase64url: () => uint8ArrayToBase64url,
	uint8ArrayToHex: () => uint8ArrayToHex,
	unwrapMessage: () => unwrapMessage
});
function assertEqual(val) {
	return val;
}
function assertNotEqual(val) {
	return val;
}
function assertIs(_arg) {}
function assertNever(_x) {
	throw new Error();
}
function assert(_) {}
function getEnumValues(entries) {
	const numericValues = Object.values(entries).filter((v) => typeof v === "number");
	return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
}
function joinValues(array$1, separator = "|") {
	return array$1.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
	if (typeof value === "bigint") return value.toString();
	return value;
}
function cached(getter) {
	return { get value() {
		{
			const value = getter();
			Object.defineProperty(this, "value", { value });
			return value;
		}
		throw new Error("cached value already set");
	} };
}
function nullish$1(input) {
	return input === null || input === void 0;
}
function cleanRegex(source) {
	const start = source.startsWith("^") ? 1 : 0;
	const end = source.endsWith("$") ? source.length - 1 : source.length;
	return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
	const valDecCount = (val.toString().split(".")[1] || "").length;
	const stepString = step.toString();
	let stepDecCount = (stepString.split(".")[1] || "").length;
	if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
		const match$1 = stepString.match(/\d?e-(\d?)/);
		if (match$1?.[1]) stepDecCount = Number.parseInt(match$1[1]);
	}
	const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
	return Number.parseInt(val.toFixed(decCount).replace(".", "")) % Number.parseInt(step.toFixed(decCount).replace(".", "")) / 10 ** decCount;
}
const EVALUATING = Symbol("evaluating");
function defineLazy(object$1, key, getter) {
	let value = void 0;
	Object.defineProperty(object$1, key, {
		get() {
			if (value === EVALUATING) return;
			if (value === void 0) {
				value = EVALUATING;
				value = getter();
			}
			return value;
		},
		set(v) {
			Object.defineProperty(object$1, key, { value: v });
		},
		configurable: true
	});
}
function objectClone(obj) {
	return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
	Object.defineProperty(target, prop, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
}
function mergeDefs(...defs) {
	const mergedDescriptors = {};
	for (const def of defs) {
		const descriptors = Object.getOwnPropertyDescriptors(def);
		Object.assign(mergedDescriptors, descriptors);
	}
	return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
	return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
	if (!path) return obj;
	return path.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
	const keys = Object.keys(promisesObj);
	const promises = keys.map((key) => promisesObj[key]);
	return Promise.all(promises).then((results) => {
		const resolvedObj = {};
		for (let i = 0; i < keys.length; i++) resolvedObj[keys[i]] = results[i];
		return resolvedObj;
	});
}
function randomString(length = 10) {
	const chars = "abcdefghijklmnopqrstuvwxyz";
	let str = "";
	for (let i = 0; i < length; i++) str += chars[Math.floor(Math.random() * 26)];
	return str;
}
function esc(str) {
	return JSON.stringify(str);
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject$1(data) {
	return typeof data === "object" && data !== null && !Array.isArray(data);
}
const allowsEval = cached(() => {
	if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
	try {
		new Function("");
		return true;
	} catch (_) {
		return false;
	}
});
function isPlainObject(o) {
	if (isObject$1(o) === false) return false;
	const ctor = o.constructor;
	if (ctor === void 0) return true;
	const prot = ctor.prototype;
	if (isObject$1(prot) === false) return false;
	if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
	return true;
}
function shallowClone(o) {
	if (isPlainObject(o)) return { ...o };
	if (Array.isArray(o)) return [...o];
	return o;
}
function numKeys(data) {
	let keyCount = 0;
	for (const key in data) if (Object.prototype.hasOwnProperty.call(data, key)) keyCount++;
	return keyCount;
}
const getParsedType = (data) => {
	const t = typeof data;
	switch (t) {
		case "undefined": return "undefined";
		case "string": return "string";
		case "number": return Number.isNaN(data) ? "nan" : "number";
		case "boolean": return "boolean";
		case "function": return "function";
		case "bigint": return "bigint";
		case "symbol": return "symbol";
		case "object":
			if (Array.isArray(data)) return "array";
			if (data === null) return "null";
			if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") return "promise";
			if (typeof Map !== "undefined" && data instanceof Map) return "map";
			if (typeof Set !== "undefined" && data instanceof Set) return "set";
			if (typeof Date !== "undefined" && data instanceof Date) return "date";
			if (typeof File !== "undefined" && data instanceof File) return "file";
			return "object";
		default: throw new Error(`Unknown data type: ${t}`);
	}
};
const propertyKeyTypes = new Set([
	"string",
	"number",
	"symbol"
]);
const primitiveTypes = new Set([
	"string",
	"number",
	"bigint",
	"boolean",
	"symbol",
	"undefined"
]);
function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
	const cl = new inst._zod.constr(def ?? inst._zod.def);
	if (!def || params?.parent) cl._zod.parent = inst;
	return cl;
}
function normalizeParams(_params) {
	const params = _params;
	if (!params) return {};
	if (typeof params === "string") return { error: () => params };
	if (params?.message !== void 0) {
		if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
		params.error = params.message;
	}
	delete params.message;
	if (typeof params.error === "string") return {
		...params,
		error: () => params.error
	};
	return params;
}
function createTransparentProxy(getter) {
	let target;
	return new Proxy({}, {
		get(_, prop, receiver) {
			target ?? (target = getter());
			return Reflect.get(target, prop, receiver);
		},
		set(_, prop, value, receiver) {
			target ?? (target = getter());
			return Reflect.set(target, prop, value, receiver);
		},
		has(_, prop) {
			target ?? (target = getter());
			return Reflect.has(target, prop);
		},
		deleteProperty(_, prop) {
			target ?? (target = getter());
			return Reflect.deleteProperty(target, prop);
		},
		ownKeys(_) {
			target ?? (target = getter());
			return Reflect.ownKeys(target);
		},
		getOwnPropertyDescriptor(_, prop) {
			target ?? (target = getter());
			return Reflect.getOwnPropertyDescriptor(target, prop);
		},
		defineProperty(_, prop, descriptor) {
			target ?? (target = getter());
			return Reflect.defineProperty(target, prop, descriptor);
		}
	});
}
function stringifyPrimitive(value) {
	if (typeof value === "bigint") return value.toString() + "n";
	if (typeof value === "string") return `"${value}"`;
	return `${value}`;
}
function optionalKeys(shape) {
	return Object.keys(shape).filter((k) => {
		return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
	});
}
const NUMBER_FORMAT_RANGES = {
	safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
const BIGINT_FORMAT_RANGES = {
	int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
	uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
};
function pick(schema, mask) {
	const currDef = schema._zod.def;
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = {};
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				newShape[key] = currDef.shape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	}));
}
function omit(schema, mask) {
	const currDef = schema._zod.def;
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = { ...schema._zod.def.shape };
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				delete newShape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	}));
}
function extend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) throw new Error("Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const _shape = {
				...schema._zod.def.shape,
				...shape
			};
			assignProp(this, "shape", _shape);
			return _shape;
		},
		checks: []
	}));
}
function safeExtend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
	return clone(schema, {
		...schema._zod.def,
		get shape() {
			const _shape = {
				...schema._zod.def.shape,
				...shape
			};
			assignProp(this, "shape", _shape);
			return _shape;
		},
		checks: schema._zod.def.checks
	});
}
function merge(a, b) {
	return clone(a, mergeDefs(a._zod.def, {
		get shape() {
			const _shape = {
				...a._zod.def.shape,
				...b._zod.def.shape
			};
			assignProp(this, "shape", _shape);
			return _shape;
		},
		get catchall() {
			return b._zod.def.catchall;
		},
		checks: []
	}));
}
function partial(Class$1, schema, mask) {
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const oldShape = schema._zod.def.shape;
			const shape = { ...oldShape };
			if (mask) for (const key in mask) {
				if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				shape[key] = Class$1 ? new Class$1({
					type: "optional",
					innerType: oldShape[key]
				}) : oldShape[key];
			}
			else for (const key in oldShape) shape[key] = Class$1 ? new Class$1({
				type: "optional",
				innerType: oldShape[key]
			}) : oldShape[key];
			assignProp(this, "shape", shape);
			return shape;
		},
		checks: []
	}));
}
function required(Class$1, schema, mask) {
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const oldShape = schema._zod.def.shape;
			const shape = { ...oldShape };
			if (mask) for (const key in mask) {
				if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				shape[key] = new Class$1({
					type: "nonoptional",
					innerType: oldShape[key]
				});
			}
			else for (const key in oldShape) shape[key] = new Class$1({
				type: "nonoptional",
				innerType: oldShape[key]
			});
			assignProp(this, "shape", shape);
			return shape;
		},
		checks: []
	}));
}
function aborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
	return false;
}
function prefixIssues(path, issues) {
	return issues.map((iss) => {
		var _a;
		(_a = iss).path ?? (_a.path = []);
		iss.path.unshift(path);
		return iss;
	});
}
function unwrapMessage(message) {
	return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config$1) {
	const full = {
		...iss,
		path: iss.path ?? []
	};
	if (!iss.message) full.message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config$1.customError?.(iss)) ?? unwrapMessage(config$1.localeError?.(iss)) ?? "Invalid input";
	delete full.inst;
	delete full.continue;
	if (!ctx?.reportInput) delete full.input;
	return full;
}
function getSizableOrigin(input) {
	if (input instanceof Set) return "set";
	if (input instanceof Map) return "map";
	if (input instanceof File) return "file";
	return "unknown";
}
function getLengthableOrigin(input) {
	if (Array.isArray(input)) return "array";
	if (typeof input === "string") return "string";
	return "unknown";
}
function issue(...args) {
	const [iss, input, inst] = args;
	if (typeof iss === "string") return {
		message: iss,
		code: "custom",
		input,
		inst
	};
	return { ...iss };
}
function cleanEnum(obj) {
	return Object.entries(obj).filter(([k, _]) => {
		return Number.isNaN(Number.parseInt(k, 10));
	}).map((el) => el[1]);
}
function base64ToUint8Array(base64$2) {
	const binaryString = atob(base64$2);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
	return bytes;
}
function uint8ArrayToBase64(bytes) {
	let binaryString = "";
	for (let i = 0; i < bytes.length; i++) binaryString += String.fromCharCode(bytes[i]);
	return btoa(binaryString);
}
function base64urlToUint8Array(base64url$2) {
	const base64$2 = base64url$2.replace(/-/g, "+").replace(/_/g, "/");
	return base64ToUint8Array(base64$2 + "=".repeat((4 - base64$2.length % 4) % 4));
}
function uint8ArrayToBase64url(bytes) {
	return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex$2) {
	const cleanHex = hex$2.replace(/^0x/, "");
	if (cleanHex.length % 2 !== 0) throw new Error("Invalid hex string length");
	const bytes = new Uint8Array(cleanHex.length / 2);
	for (let i = 0; i < cleanHex.length; i += 2) bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
	return bytes;
}
function uint8ArrayToHex(bytes) {
	return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
var Class = class {
	constructor(..._args) {}
};

//#endregion
//#region node_modules/zod/v4/core/errors.js
const initializer$1 = (inst, def) => {
	inst.name = "$ZodError";
	Object.defineProperty(inst, "_zod", {
		value: inst._zod,
		enumerable: false
	});
	Object.defineProperty(inst, "issues", {
		value: def,
		enumerable: false
	});
	inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
	Object.defineProperty(inst, "toString", {
		value: () => inst.message,
		enumerable: false
	});
};
const $ZodError = $constructor("$ZodError", initializer$1);
const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
function flattenError(error$45, mapper = (issue$1) => issue$1.message) {
	const fieldErrors = {};
	const formErrors = [];
	for (const sub of error$45.issues) if (sub.path.length > 0) {
		fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
		fieldErrors[sub.path[0]].push(mapper(sub));
	} else formErrors.push(mapper(sub));
	return {
		formErrors,
		fieldErrors
	};
}
function formatError(error$45, mapper = (issue$1) => issue$1.message) {
	const fieldErrors = { _errors: [] };
	const processError = (error$46) => {
		for (const issue$1 of error$46.issues) if (issue$1.code === "invalid_union" && issue$1.errors.length) issue$1.errors.map((issues) => processError({ issues }));
		else if (issue$1.code === "invalid_key") processError({ issues: issue$1.issues });
		else if (issue$1.code === "invalid_element") processError({ issues: issue$1.issues });
		else if (issue$1.path.length === 0) fieldErrors._errors.push(mapper(issue$1));
		else {
			let curr = fieldErrors;
			let i = 0;
			while (i < issue$1.path.length) {
				const el = issue$1.path[i];
				if (!(i === issue$1.path.length - 1)) curr[el] = curr[el] || { _errors: [] };
				else {
					curr[el] = curr[el] || { _errors: [] };
					curr[el]._errors.push(mapper(issue$1));
				}
				curr = curr[el];
				i++;
			}
		}
	};
	processError(error$45);
	return fieldErrors;
}
function treeifyError(error$45, mapper = (issue$1) => issue$1.message) {
	const result = { errors: [] };
	const processError = (error$46, path = []) => {
		var _a, _b;
		for (const issue$1 of error$46.issues) if (issue$1.code === "invalid_union" && issue$1.errors.length) issue$1.errors.map((issues) => processError({ issues }, issue$1.path));
		else if (issue$1.code === "invalid_key") processError({ issues: issue$1.issues }, issue$1.path);
		else if (issue$1.code === "invalid_element") processError({ issues: issue$1.issues }, issue$1.path);
		else {
			const fullpath = [...path, ...issue$1.path];
			if (fullpath.length === 0) {
				result.errors.push(mapper(issue$1));
				continue;
			}
			let curr = result;
			let i = 0;
			while (i < fullpath.length) {
				const el = fullpath[i];
				const terminal = i === fullpath.length - 1;
				if (typeof el === "string") {
					curr.properties ?? (curr.properties = {});
					(_a = curr.properties)[el] ?? (_a[el] = { errors: [] });
					curr = curr.properties[el];
				} else {
					curr.items ?? (curr.items = []);
					(_b = curr.items)[el] ?? (_b[el] = { errors: [] });
					curr = curr.items[el];
				}
				if (terminal) curr.errors.push(mapper(issue$1));
				i++;
			}
		}
	};
	processError(error$45);
	return result;
}
/** Format a ZodError as a human-readable string in the following form.
*
* From
*
* ```ts
* ZodError {
*   issues: [
*     {
*       expected: 'string',
*       code: 'invalid_type',
*       path: [ 'username' ],
*       message: 'Invalid input: expected string'
*     },
*     {
*       expected: 'number',
*       code: 'invalid_type',
*       path: [ 'favoriteNumbers', 1 ],
*       message: 'Invalid input: expected number'
*     }
*   ];
* }
* ```
*
* to
*
* ```
* username
*   ✖ Expected number, received string at "username
* favoriteNumbers[0]
*   ✖ Invalid input: expected number
* ```
*/
function toDotPath(_path) {
	const segs = [];
	const path = _path.map((seg) => typeof seg === "object" ? seg.key : seg);
	for (const seg of path) if (typeof seg === "number") segs.push(`[${seg}]`);
	else if (typeof seg === "symbol") segs.push(`[${JSON.stringify(String(seg))}]`);
	else if (/[^\w$]/.test(seg)) segs.push(`[${JSON.stringify(seg)}]`);
	else {
		if (segs.length) segs.push(".");
		segs.push(seg);
	}
	return segs.join("");
}
function prettifyError(error$45) {
	const lines = [];
	const issues = [...error$45.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);
	for (const issue$1 of issues) {
		lines.push(`✖ ${issue$1.message}`);
		if (issue$1.path?.length) lines.push(`  → at ${toDotPath(issue$1.path)}`);
	}
	return lines.join("\n");
}

//#endregion
//#region node_modules/zod/v4/core/parse.js
const _parse = (_Err) => (schema, value, _ctx, _params) => {
	const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	if (result.issues.length) {
		const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, _params?.callee);
		throw e;
	}
	return result.value;
};
const parse$1 = /* @__PURE__ */ _parse($ZodRealError);
const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
	const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	if (result.issues.length) {
		const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, params?.callee);
		throw e;
	}
	return result.value;
};
const parseAsync$1 = /* @__PURE__ */ _parseAsync($ZodRealError);
const _safeParse = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	return result.issues.length ? {
		success: false,
		error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
const safeParse$1 = /* @__PURE__ */ _safeParse($ZodRealError);
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	return result.issues.length ? {
		success: false,
		error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
const safeParseAsync$1 = /* @__PURE__ */ _safeParseAsync($ZodRealError);
const _encode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
	return _parse(_Err)(schema, value, ctx);
};
const encode$1 = /* @__PURE__ */ _encode($ZodRealError);
const _decode = (_Err) => (schema, value, _ctx) => {
	return _parse(_Err)(schema, value, _ctx);
};
const decode$1 = /* @__PURE__ */ _decode($ZodRealError);
const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
	return _parseAsync(_Err)(schema, value, ctx);
};
const encodeAsync$1 = /* @__PURE__ */ _encodeAsync($ZodRealError);
const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _parseAsync(_Err)(schema, value, _ctx);
};
const decodeAsync$1 = /* @__PURE__ */ _decodeAsync($ZodRealError);
const _safeEncode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
	return _safeParse(_Err)(schema, value, ctx);
};
const safeEncode$1 = /* @__PURE__ */ _safeEncode($ZodRealError);
const _safeDecode = (_Err) => (schema, value, _ctx) => {
	return _safeParse(_Err)(schema, value, _ctx);
};
const safeDecode$1 = /* @__PURE__ */ _safeDecode($ZodRealError);
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
	return _safeParseAsync(_Err)(schema, value, ctx);
};
const safeEncodeAsync$1 = /* @__PURE__ */ _safeEncodeAsync($ZodRealError);
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _safeParseAsync(_Err)(schema, value, _ctx);
};
const safeDecodeAsync$1 = /* @__PURE__ */ _safeDecodeAsync($ZodRealError);

//#endregion
//#region node_modules/zod/v4/core/regexes.js
var regexes_exports = /* @__PURE__ */ __export({
	base64: () => base64$1,
	base64url: () => base64url$1,
	bigint: () => bigint$2,
	boolean: () => boolean$2,
	browserEmail: () => browserEmail,
	cidrv4: () => cidrv4$1,
	cidrv6: () => cidrv6$1,
	cuid: () => cuid$1,
	cuid2: () => cuid2$1,
	date: () => date$3,
	datetime: () => datetime$1,
	domain: () => domain,
	duration: () => duration$1,
	e164: () => e164$1,
	email: () => email$1,
	emoji: () => emoji$1,
	extendedDuration: () => extendedDuration,
	guid: () => guid$1,
	hex: () => hex$1,
	hostname: () => hostname$1,
	html5Email: () => html5Email,
	idnEmail: () => idnEmail,
	integer: () => integer,
	ipv4: () => ipv4$1,
	ipv6: () => ipv6$1,
	ksuid: () => ksuid$1,
	lowercase: () => lowercase,
	md5_base64: () => md5_base64,
	md5_base64url: () => md5_base64url,
	md5_hex: () => md5_hex,
	nanoid: () => nanoid$1,
	null: () => _null$2,
	number: () => number$2,
	rfc5322Email: () => rfc5322Email,
	sha1_base64: () => sha1_base64,
	sha1_base64url: () => sha1_base64url,
	sha1_hex: () => sha1_hex,
	sha256_base64: () => sha256_base64,
	sha256_base64url: () => sha256_base64url,
	sha256_hex: () => sha256_hex,
	sha384_base64: () => sha384_base64,
	sha384_base64url: () => sha384_base64url,
	sha384_hex: () => sha384_hex,
	sha512_base64: () => sha512_base64,
	sha512_base64url: () => sha512_base64url,
	sha512_hex: () => sha512_hex,
	string: () => string$2,
	time: () => time$1,
	ulid: () => ulid$1,
	undefined: () => _undefined$2,
	unicodeEmail: () => unicodeEmail,
	uppercase: () => uppercase,
	uuid: () => uuid$1,
	uuid4: () => uuid4,
	uuid6: () => uuid6,
	uuid7: () => uuid7,
	xid: () => xid$1
});
const cuid$1 = /^[cC][^\s-]{8,}$/;
const cuid2$1 = /^[0-9a-z]+$/;
const ulid$1 = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const xid$1 = /^[0-9a-vA-V]{20}$/;
const ksuid$1 = /^[A-Za-z0-9]{27}$/;
const nanoid$1 = /^[a-zA-Z0-9_-]{21}$/;
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
/** Implements ISO 8601-2 extensions like explicit +- prefixes, mixing weeks with other units, and fractional/negative components. */
const extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
const guid$1 = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
/** Returns a regex for validating an RFC 9562/4122 UUID.
*
* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
const uuid$1 = (version$1) => {
	if (!version$1) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
	return /* @__PURE__ */ new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version$1}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
const uuid4 = /* @__PURE__ */ uuid$1(4);
const uuid6 = /* @__PURE__ */ uuid$1(6);
const uuid7 = /* @__PURE__ */ uuid$1(7);
/** Practical email validation */
const email$1 = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
/** Equivalent to the HTML5 input[type=email] validation implemented by browsers. Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email */
const html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
/** The classic emailregex.com regex for RFC 5322-compliant emails */
const rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
/** A loose regex that allows Unicode characters, enforces length limits, and that's about it. */
const unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
const idnEmail = unicodeEmail;
const browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji$1() {
	return new RegExp(_emoji$1, "u");
}
const ipv4$1 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6$1 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const cidrv4$1 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6$1 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64$1 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url$1 = /^[A-Za-z0-9_-]*$/;
const hostname$1 = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
const domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const e164$1 = /^\+(?:[0-9]){6,14}[0-9]$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date$3 = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
	const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
	return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function time$1(args) {
	return /* @__PURE__ */ new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
	const time$2 = timeSource({ precision: args.precision });
	const opts = ["Z"];
	if (args.local) opts.push("");
	if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
	const timeRegex = `${time$2}(?:${opts.join("|")})`;
	return /* @__PURE__ */ new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const string$2 = (params) => {
	const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
	return /* @__PURE__ */ new RegExp(`^${regex}$`);
};
const bigint$2 = /^-?\d+n?$/;
const integer = /^-?\d+$/;
const number$2 = /^-?\d+(?:\.\d+)?/;
const boolean$2 = /^(?:true|false)$/i;
const _null$2 = /^null$/i;
const _undefined$2 = /^undefined$/i;
const lowercase = /^[^A-Z]*$/;
const uppercase = /^[^a-z]*$/;
const hex$1 = /^[0-9a-fA-F]*$/;
function fixedBase64(bodyLength, padding) {
	return /* @__PURE__ */ new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
}
function fixedBase64url(length) {
	return /* @__PURE__ */ new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
}
const md5_hex = /^[0-9a-fA-F]{32}$/;
const md5_base64 = /* @__PURE__ */ fixedBase64(22, "==");
const md5_base64url = /* @__PURE__ */ fixedBase64url(22);
const sha1_hex = /^[0-9a-fA-F]{40}$/;
const sha1_base64 = /* @__PURE__ */ fixedBase64(27, "=");
const sha1_base64url = /* @__PURE__ */ fixedBase64url(27);
const sha256_hex = /^[0-9a-fA-F]{64}$/;
const sha256_base64 = /* @__PURE__ */ fixedBase64(43, "=");
const sha256_base64url = /* @__PURE__ */ fixedBase64url(43);
const sha384_hex = /^[0-9a-fA-F]{96}$/;
const sha384_base64 = /* @__PURE__ */ fixedBase64(64, "");
const sha384_base64url = /* @__PURE__ */ fixedBase64url(64);
const sha512_hex = /^[0-9a-fA-F]{128}$/;
const sha512_base64 = /* @__PURE__ */ fixedBase64(86, "==");
const sha512_base64url = /* @__PURE__ */ fixedBase64url(86);

//#endregion
//#region node_modules/zod/v4/core/checks.js
const $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
	var _a;
	inst._zod ?? (inst._zod = {});
	inst._zod.def = def;
	(_a = inst._zod).onattach ?? (_a.onattach = []);
});
const numericOriginMap = {
	number: "number",
	bigint: "bigint",
	object: "date"
};
const $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
		if (def.value < curr) if (def.inclusive) bag.maximum = def.value;
		else bag.exclusiveMaximum = def.value;
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
		if (def.value > curr) if (def.inclusive) bag.minimum = def.value;
		else bag.exclusiveMinimum = def.value;
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		var _a;
		(_a = inst$1._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
	});
	inst._zod.check = (payload) => {
		if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
		if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
		payload.issues.push({
			origin: typeof payload.value,
			code: "not_multiple_of",
			divisor: def.value,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
	$ZodCheck.init(inst, def);
	def.format = def.format || "float64";
	const isInt = def.format?.includes("int");
	const origin = isInt ? "int" : "number";
	const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.format = def.format;
		bag.minimum = minimum;
		bag.maximum = maximum;
		if (isInt) bag.pattern = integer;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (isInt) {
			if (!Number.isInteger(input)) {
				payload.issues.push({
					expected: origin,
					format: def.format,
					code: "invalid_type",
					continue: false,
					input,
					inst
				});
				return;
			}
			if (!Number.isSafeInteger(input)) {
				if (input > 0) payload.issues.push({
					input,
					code: "too_big",
					maximum: Number.MAX_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					continue: !def.abort
				});
				else payload.issues.push({
					input,
					code: "too_small",
					minimum: Number.MIN_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					continue: !def.abort
				});
				return;
			}
		}
		if (input < minimum) payload.issues.push({
			origin: "number",
			input,
			code: "too_small",
			minimum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
		if (input > maximum) payload.issues.push({
			origin: "number",
			input,
			code: "too_big",
			maximum,
			inst
		});
	};
});
const $ZodCheckBigIntFormat = /* @__PURE__ */ $constructor("$ZodCheckBigIntFormat", (inst, def) => {
	$ZodCheck.init(inst, def);
	const [minimum, maximum] = BIGINT_FORMAT_RANGES[def.format];
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.format = def.format;
		bag.minimum = minimum;
		bag.maximum = maximum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input < minimum) payload.issues.push({
			origin: "bigint",
			input,
			code: "too_small",
			minimum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
		if (input > maximum) payload.issues.push({
			origin: "bigint",
			input,
			code: "too_big",
			maximum,
			inst
		});
	};
});
const $ZodCheckMaxSize = /* @__PURE__ */ $constructor("$ZodCheckMaxSize", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish$1(val) && val.size !== void 0;
	});
	inst._zod.onattach.push((inst$1) => {
		const curr = inst$1._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
		if (def.maximum < curr) inst$1._zod.bag.maximum = def.maximum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.size <= def.maximum) return;
		payload.issues.push({
			origin: getSizableOrigin(input),
			code: "too_big",
			maximum: def.maximum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMinSize = /* @__PURE__ */ $constructor("$ZodCheckMinSize", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish$1(val) && val.size !== void 0;
	});
	inst._zod.onattach.push((inst$1) => {
		const curr = inst$1._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
		if (def.minimum > curr) inst$1._zod.bag.minimum = def.minimum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.size >= def.minimum) return;
		payload.issues.push({
			origin: getSizableOrigin(input),
			code: "too_small",
			minimum: def.minimum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckSizeEquals = /* @__PURE__ */ $constructor("$ZodCheckSizeEquals", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish$1(val) && val.size !== void 0;
	});
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.minimum = def.size;
		bag.maximum = def.size;
		bag.size = def.size;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		const size = input.size;
		if (size === def.size) return;
		const tooBig = size > def.size;
		payload.issues.push({
			origin: getSizableOrigin(input),
			...tooBig ? {
				code: "too_big",
				maximum: def.size
			} : {
				code: "too_small",
				minimum: def.size
			},
			inclusive: true,
			exact: true,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish$1(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst$1) => {
		const curr = inst$1._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
		if (def.maximum < curr) inst$1._zod.bag.maximum = def.maximum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.length <= def.maximum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: def.maximum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish$1(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst$1) => {
		const curr = inst$1._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
		if (def.minimum > curr) inst$1._zod.bag.minimum = def.minimum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.length >= def.minimum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: def.minimum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish$1(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.minimum = def.length;
		bag.maximum = def.length;
		bag.length = def.length;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		const length = input.length;
		if (length === def.length) return;
		const origin = getLengthableOrigin(input);
		const tooBig = length > def.length;
		payload.issues.push({
			origin,
			...tooBig ? {
				code: "too_big",
				maximum: def.length
			} : {
				code: "too_small",
				minimum: def.length
			},
			inclusive: true,
			exact: true,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
	var _a, _b;
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.format = def.format;
		if (def.pattern) {
			bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
			bag.patterns.add(def.pattern);
		}
	});
	if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: def.format,
			input: payload.value,
			...def.pattern ? { pattern: def.pattern.toString() } : {},
			inst,
			continue: !def.abort
		});
	});
	else (_b = inst._zod).check ?? (_b.check = () => {});
});
const $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			input: payload.value,
			pattern: def.pattern.toString(),
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
	def.pattern ?? (def.pattern = lowercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
	def.pattern ?? (def.pattern = uppercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
	$ZodCheck.init(inst, def);
	const escapedRegex = escapeRegex(def.includes);
	const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
	def.pattern = pattern;
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.includes(def.includes, def.position)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "includes",
			includes: def.includes,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = /* @__PURE__ */ new RegExp(`^${escapeRegex(def.prefix)}.*`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.startsWith(def.prefix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "starts_with",
			prefix: def.prefix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = /* @__PURE__ */ new RegExp(`.*${escapeRegex(def.suffix)}$`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.endsWith(def.suffix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "ends_with",
			suffix: def.suffix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
function handleCheckPropertyResult(result, payload, property) {
	if (result.issues.length) payload.issues.push(...prefixIssues(property, result.issues));
}
const $ZodCheckProperty = /* @__PURE__ */ $constructor("$ZodCheckProperty", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		const result = def.schema._zod.run({
			value: payload.value[def.property],
			issues: []
		}, {});
		if (result instanceof Promise) return result.then((result$1) => handleCheckPropertyResult(result$1, payload, def.property));
		handleCheckPropertyResult(result, payload, def.property);
	};
});
const $ZodCheckMimeType = /* @__PURE__ */ $constructor("$ZodCheckMimeType", (inst, def) => {
	$ZodCheck.init(inst, def);
	const mimeSet = new Set(def.mime);
	inst._zod.onattach.push((inst$1) => {
		inst$1._zod.bag.mime = def.mime;
	});
	inst._zod.check = (payload) => {
		if (mimeSet.has(payload.value.type)) return;
		payload.issues.push({
			code: "invalid_value",
			values: def.mime,
			input: payload.value.type,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		payload.value = def.tx(payload.value);
	};
});

//#endregion
//#region node_modules/zod/v4/core/doc.js
var Doc = class {
	constructor(args = []) {
		this.content = [];
		this.indent = 0;
		if (this) this.args = args;
	}
	indented(fn) {
		this.indent += 1;
		fn(this);
		this.indent -= 1;
	}
	write(arg) {
		if (typeof arg === "function") {
			arg(this, { execution: "sync" });
			arg(this, { execution: "async" });
			return;
		}
		const lines = arg.split("\n").filter((x) => x);
		const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
		const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
		for (const line of dedented) this.content.push(line);
	}
	compile() {
		const F = Function;
		const args = this?.args;
		const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
		return new F(...args, lines.join("\n"));
	}
};

//#endregion
//#region node_modules/zod/v4/core/versions.js
const version = {
	major: 4,
	minor: 1,
	patch: 12
};

//#endregion
//#region node_modules/zod/v4/core/schemas.js
const $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
	var _a;
	inst ?? (inst = {});
	inst._zod.def = def;
	inst._zod.bag = inst._zod.bag || {};
	inst._zod.version = version;
	const checks = [...inst._zod.def.checks ?? []];
	if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
	for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
	if (checks.length === 0) {
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred?.push(() => {
			inst._zod.run = inst._zod.parse;
		});
	} else {
		const runChecks = (payload, checks$1, ctx) => {
			let isAborted = aborted(payload);
			let asyncResult;
			for (const ch of checks$1) {
				if (ch._zod.def.when) {
					if (!ch._zod.def.when(payload)) continue;
				} else if (isAborted) continue;
				const currLen = payload.issues.length;
				const _ = ch._zod.check(payload);
				if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
				if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
					await _;
					if (payload.issues.length === currLen) return;
					if (!isAborted) isAborted = aborted(payload, currLen);
				});
				else {
					if (payload.issues.length === currLen) continue;
					if (!isAborted) isAborted = aborted(payload, currLen);
				}
			}
			if (asyncResult) return asyncResult.then(() => {
				return payload;
			});
			return payload;
		};
		const handleCanaryResult = (canary, payload, ctx) => {
			if (aborted(canary)) {
				canary.aborted = true;
				return canary;
			}
			const checkResult = runChecks(payload, checks, ctx);
			if (checkResult instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return checkResult.then((checkResult$1) => inst._zod.parse(checkResult$1, ctx));
			}
			return inst._zod.parse(checkResult, ctx);
		};
		inst._zod.run = (payload, ctx) => {
			if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
			if (ctx.direction === "backward") {
				const canary = inst._zod.parse({
					value: payload.value,
					issues: []
				}, {
					...ctx,
					skipChecks: true
				});
				if (canary instanceof Promise) return canary.then((canary$1) => {
					return handleCanaryResult(canary$1, payload, ctx);
				});
				return handleCanaryResult(canary, payload, ctx);
			}
			const result = inst._zod.parse(payload, ctx);
			if (result instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return result.then((result$1) => runChecks(result$1, checks, ctx));
			}
			return runChecks(result, checks, ctx);
		};
	}
	inst["~standard"] = {
		validate: (value) => {
			try {
				const r = safeParse$1(inst, value);
				return r.success ? { value: r.data } : { issues: r.error?.issues };
			} catch (_) {
				return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
			}
		},
		vendor: "zod",
		version: 1
	};
});
const $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$2(inst._zod.bag);
	inst._zod.parse = (payload, _) => {
		if (def.coerce) try {
			payload.value = String(payload.value);
		} catch (_$1) {}
		if (typeof payload.value === "string") return payload;
		payload.issues.push({
			expected: "string",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
const $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	$ZodString.init(inst, def);
});
const $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
	def.pattern ?? (def.pattern = guid$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
	if (def.version) {
		const v = {
			v1: 1,
			v2: 2,
			v3: 3,
			v4: 4,
			v5: 5,
			v6: 6,
			v7: 7,
			v8: 8
		}[def.version];
		if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
		def.pattern ?? (def.pattern = uuid$1(v));
	} else def.pattern ?? (def.pattern = uuid$1());
	$ZodStringFormat.init(inst, def);
});
const $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
	def.pattern ?? (def.pattern = email$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		try {
			const trimmed = payload.value.trim();
			const url$1 = new URL(trimmed);
			if (def.hostname) {
				def.hostname.lastIndex = 0;
				if (!def.hostname.test(url$1.hostname)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid hostname",
					pattern: hostname$1.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.protocol) {
				def.protocol.lastIndex = 0;
				if (!def.protocol.test(url$1.protocol.endsWith(":") ? url$1.protocol.slice(0, -1) : url$1.protocol)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid protocol",
					pattern: def.protocol.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.normalize) payload.value = url$1.href;
			else payload.value = trimmed;
			return;
		} catch (_) {
			payload.issues.push({
				code: "invalid_format",
				format: "url",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
const $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
	def.pattern ?? (def.pattern = emoji$1());
	$ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
	def.pattern ?? (def.pattern = nanoid$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
	def.pattern ?? (def.pattern = cuid$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
	def.pattern ?? (def.pattern = cuid2$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
	def.pattern ?? (def.pattern = ulid$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
	def.pattern ?? (def.pattern = xid$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
	def.pattern ?? (def.pattern = ksuid$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
	def.pattern ?? (def.pattern = datetime$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
	def.pattern ?? (def.pattern = date$3);
	$ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
	def.pattern ?? (def.pattern = time$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
	def.pattern ?? (def.pattern = duration$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
	def.pattern ?? (def.pattern = ipv4$1);
	$ZodStringFormat.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.format = `ipv4`;
	});
});
const $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
	def.pattern ?? (def.pattern = ipv6$1);
	$ZodStringFormat.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.format = `ipv6`;
	});
	inst._zod.check = (payload) => {
		try {
			new URL(`http://[${payload.value}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "ipv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
const $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv4$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv6$1);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		const parts = payload.value.split("/");
		try {
			if (parts.length !== 2) throw new Error();
			const [address, prefix] = parts;
			if (!prefix) throw new Error();
			const prefixNum = Number(prefix);
			if (`${prefixNum}` !== prefix) throw new Error();
			if (prefixNum < 0 || prefixNum > 128) throw new Error();
			new URL(`http://[${address}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "cidrv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
function isValidBase64(data) {
	if (data === "") return true;
	if (data.length % 4 !== 0) return false;
	try {
		atob(data);
		return true;
	} catch {
		return false;
	}
}
const $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
	def.pattern ?? (def.pattern = base64$1);
	$ZodStringFormat.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		inst$1._zod.bag.contentEncoding = "base64";
	});
	inst._zod.check = (payload) => {
		if (isValidBase64(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
function isValidBase64URL(data) {
	if (!base64url$1.test(data)) return false;
	const base64$2 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
	return isValidBase64(base64$2.padEnd(Math.ceil(base64$2.length / 4) * 4, "="));
}
const $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
	def.pattern ?? (def.pattern = base64url$1);
	$ZodStringFormat.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		inst$1._zod.bag.contentEncoding = "base64url";
	});
	inst._zod.check = (payload) => {
		if (isValidBase64URL(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
	def.pattern ?? (def.pattern = e164$1);
	$ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
	try {
		const tokensParts = token.split(".");
		if (tokensParts.length !== 3) return false;
		const [header] = tokensParts;
		if (!header) return false;
		const parsedHeader = JSON.parse(atob(header));
		if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
		if (!parsedHeader.alg) return false;
		if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
		return true;
	} catch {
		return false;
	}
}
const $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidJWT(payload.value, def.alg)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCustomStringFormat = /* @__PURE__ */ $constructor("$ZodCustomStringFormat", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (def.fn(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: def.format,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = inst._zod.bag.pattern ?? number$2;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Number(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
		const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
		payload.issues.push({
			expected: "number",
			code: "invalid_type",
			input,
			inst,
			...received ? { received } : {}
		});
		return payload;
	};
});
const $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
	$ZodCheckNumberFormat.init(inst, def);
	$ZodNumber.init(inst, def);
});
const $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = boolean$2;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Boolean(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "boolean") return payload;
		payload.issues.push({
			expected: "boolean",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
const $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = bigint$2;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = BigInt(payload.value);
		} catch (_) {}
		if (typeof payload.value === "bigint") return payload;
		payload.issues.push({
			expected: "bigint",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
const $ZodBigIntFormat = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
	$ZodCheckBigIntFormat.init(inst, def);
	$ZodBigInt.init(inst, def);
});
const $ZodSymbol = /* @__PURE__ */ $constructor("$ZodSymbol", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (typeof input === "symbol") return payload;
		payload.issues.push({
			expected: "symbol",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
const $ZodUndefined = /* @__PURE__ */ $constructor("$ZodUndefined", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = _undefined$2;
	inst._zod.values = new Set([void 0]);
	inst._zod.optin = "optional";
	inst._zod.optout = "optional";
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (typeof input === "undefined") return payload;
		payload.issues.push({
			expected: "undefined",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
const $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = _null$2;
	inst._zod.values = new Set([null]);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (input === null) return payload;
		payload.issues.push({
			expected: "null",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
const $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload) => payload;
});
const $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload) => payload;
});
const $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		payload.issues.push({
			expected: "never",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
const $ZodVoid = /* @__PURE__ */ $constructor("$ZodVoid", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (typeof input === "undefined") return payload;
		payload.issues.push({
			expected: "void",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
const $ZodDate = /* @__PURE__ */ $constructor("$ZodDate", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = new Date(payload.value);
		} catch (_err) {}
		const input = payload.value;
		const isDate = input instanceof Date;
		if (isDate && !Number.isNaN(input.getTime())) return payload;
		payload.issues.push({
			expected: "date",
			code: "invalid_type",
			input,
			...isDate ? { received: "Invalid Date" } : {},
			inst
		});
		return payload;
	};
});
function handleArrayResult(result, final, index) {
	if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
	final.value[index] = result.value;
}
const $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!Array.isArray(input)) {
			payload.issues.push({
				expected: "array",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = Array(input.length);
		const proms = [];
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const result = def.element._zod.run({
				value: item,
				issues: []
			}, ctx);
			if (result instanceof Promise) proms.push(result.then((result$1) => handleArrayResult(result$1, payload, i)));
			else handleArrayResult(result, payload, i);
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
function handlePropertyResult(result, final, key, input) {
	if (result.issues.length) final.issues.push(...prefixIssues(key, result.issues));
	if (result.value === void 0) {
		if (key in input) final.value[key] = void 0;
	} else final.value[key] = result.value;
}
function normalizeDef(def) {
	const keys = Object.keys(def.shape);
	for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
	const okeys = optionalKeys(def.shape);
	return {
		...def,
		keys,
		keySet: new Set(keys),
		numKeys: keys.length,
		optionalKeys: new Set(okeys)
	};
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
	const unrecognized = [];
	const keySet = def.keySet;
	const _catchall = def.catchall._zod;
	const t = _catchall.def.type;
	for (const key of Object.keys(input)) {
		if (keySet.has(key)) continue;
		if (t === "never") {
			unrecognized.push(key);
			continue;
		}
		const r = _catchall.run({
			value: input[key],
			issues: []
		}, ctx);
		if (r instanceof Promise) proms.push(r.then((r$1) => handlePropertyResult(r$1, payload, key, input)));
		else handlePropertyResult(r, payload, key, input);
	}
	if (unrecognized.length) payload.issues.push({
		code: "unrecognized_keys",
		keys: unrecognized,
		input,
		inst
	});
	if (!proms.length) return payload;
	return Promise.all(proms).then(() => {
		return payload;
	});
}
const $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
	$ZodType.init(inst, def);
	if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
		const sh = def.shape;
		Object.defineProperty(def, "shape", { get: () => {
			const newSh = { ...sh };
			Object.defineProperty(def, "shape", { value: newSh });
			return newSh;
		} });
	}
	const _normalized = cached(() => normalizeDef(def));
	defineLazy(inst._zod, "propValues", () => {
		const shape = def.shape;
		const propValues = {};
		for (const key in shape) {
			const field = shape[key]._zod;
			if (field.values) {
				propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
				for (const v of field.values) propValues[key].add(v);
			}
		}
		return propValues;
	});
	const isObject$3 = isObject$1;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$3(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = {};
		const proms = [];
		const shape = value.shape;
		for (const key of value.keys) {
			const r = shape[key]._zod.run({
				value: input[key],
				issues: []
			}, ctx);
			if (r instanceof Promise) proms.push(r.then((r$1) => handlePropertyResult(r$1, payload, key, input)));
			else handlePropertyResult(r, payload, key, input);
		}
		if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
		return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
	};
});
const $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
	$ZodObject.init(inst, def);
	const superParse = inst._zod.parse;
	const _normalized = cached(() => normalizeDef(def));
	const generateFastpass = (shape) => {
		const doc = new Doc([
			"shape",
			"payload",
			"ctx"
		]);
		const normalized = _normalized.value;
		const parseStr = (key) => {
			const k = esc(key);
			return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
		};
		doc.write(`const input = payload.value;`);
		const ids = Object.create(null);
		let counter = 0;
		for (const key of normalized.keys) ids[key] = `key_${counter++}`;
		doc.write(`const newResult = {};`);
		for (const key of normalized.keys) {
			const id = ids[key];
			const k = esc(key);
			doc.write(`const ${id} = ${parseStr(key)};`);
			doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
		}
		doc.write(`payload.value = newResult;`);
		doc.write(`return payload;`);
		const fn = doc.compile();
		return (payload, ctx) => fn(shape, payload, ctx);
	};
	let fastpass;
	const isObject$3 = isObject$1;
	const jit = !globalConfig.jitless;
	const allowsEval$1 = allowsEval;
	const fastEnabled = jit && allowsEval$1.value;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$3(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
			if (!fastpass) fastpass = generateFastpass(def.shape);
			payload = fastpass(payload, ctx);
			if (!catchall) return payload;
			return handleCatchall([], input, payload, ctx, value, inst);
		}
		return superParse(payload, ctx);
	};
});
function handleUnionResults(results, final, inst, ctx) {
	for (const result of results) if (result.issues.length === 0) {
		final.value = result.value;
		return final;
	}
	const nonaborted = results.filter((r) => !aborted(r));
	if (nonaborted.length === 1) {
		final.value = nonaborted[0].value;
		return nonaborted[0];
	}
	final.issues.push({
		code: "invalid_union",
		input: final.value,
		inst,
		errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	});
	return final;
}
const $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "values", () => {
		if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
	});
	defineLazy(inst._zod, "pattern", () => {
		if (def.options.every((o) => o._zod.pattern)) {
			const patterns = def.options.map((o) => o._zod.pattern);
			return /* @__PURE__ */ new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
		}
	});
	const single = def.options.length === 1;
	const first = def.options[0]._zod.run;
	inst._zod.parse = (payload, ctx) => {
		if (single) return first(payload, ctx);
		let async = false;
		const results = [];
		for (const option of def.options) {
			const result = option._zod.run({
				value: payload.value,
				issues: []
			}, ctx);
			if (result instanceof Promise) {
				results.push(result);
				async = true;
			} else {
				if (result.issues.length === 0) return result;
				results.push(result);
			}
		}
		if (!async) return handleUnionResults(results, payload, inst, ctx);
		return Promise.all(results).then((results$1) => {
			return handleUnionResults(results$1, payload, inst, ctx);
		});
	};
});
const $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
	$ZodUnion.init(inst, def);
	const _super = inst._zod.parse;
	defineLazy(inst._zod, "propValues", () => {
		const propValues = {};
		for (const option of def.options) {
			const pv = option._zod.propValues;
			if (!pv || Object.keys(pv).length === 0) throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
			for (const [k, v] of Object.entries(pv)) {
				if (!propValues[k]) propValues[k] = /* @__PURE__ */ new Set();
				for (const val of v) propValues[k].add(val);
			}
		}
		return propValues;
	});
	const disc = cached(() => {
		const opts = def.options;
		const map$1 = /* @__PURE__ */ new Map();
		for (const o of opts) {
			const values = o._zod.propValues?.[def.discriminator];
			if (!values || values.size === 0) throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
			for (const v of values) {
				if (map$1.has(v)) throw new Error(`Duplicate discriminator value "${String(v)}"`);
				map$1.set(v, o);
			}
		}
		return map$1;
	});
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!isObject$1(input)) {
			payload.issues.push({
				code: "invalid_type",
				expected: "object",
				input,
				inst
			});
			return payload;
		}
		const opt = disc.value.get(input?.[def.discriminator]);
		if (opt) return opt._zod.run(payload, ctx);
		if (def.unionFallback) return _super(payload, ctx);
		payload.issues.push({
			code: "invalid_union",
			errors: [],
			note: "No matching discriminator",
			discriminator: def.discriminator,
			input,
			path: [def.discriminator],
			inst
		});
		return payload;
	};
});
const $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		const left = def.left._zod.run({
			value: input,
			issues: []
		}, ctx);
		const right = def.right._zod.run({
			value: input,
			issues: []
		}, ctx);
		if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left$1, right$1]) => {
			return handleIntersectionResults(payload, left$1, right$1);
		});
		return handleIntersectionResults(payload, left, right);
	};
});
function mergeValues(a, b) {
	if (a === b) return {
		valid: true,
		data: a
	};
	if (a instanceof Date && b instanceof Date && +a === +b) return {
		valid: true,
		data: a
	};
	if (isPlainObject(a) && isPlainObject(b)) {
		const bKeys = Object.keys(b);
		const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
		const newObj = {
			...a,
			...b
		};
		for (const key of sharedKeys) {
			const sharedValue = mergeValues(a[key], b[key]);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
			};
			newObj[key] = sharedValue.data;
		}
		return {
			valid: true,
			data: newObj
		};
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return {
			valid: false,
			mergeErrorPath: []
		};
		const newArray = [];
		for (let index = 0; index < a.length; index++) {
			const itemA = a[index];
			const itemB = b[index];
			const sharedValue = mergeValues(itemA, itemB);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
			};
			newArray.push(sharedValue.data);
		}
		return {
			valid: true,
			data: newArray
		};
	}
	return {
		valid: false,
		mergeErrorPath: []
	};
}
function handleIntersectionResults(result, left, right) {
	if (left.issues.length) result.issues.push(...left.issues);
	if (right.issues.length) result.issues.push(...right.issues);
	if (aborted(result)) return result;
	const merged = mergeValues(left.value, right.value);
	if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
	result.value = merged.data;
	return result;
}
const $ZodTuple = /* @__PURE__ */ $constructor("$ZodTuple", (inst, def) => {
	$ZodType.init(inst, def);
	const items = def.items;
	const optStart = items.length - [...items].reverse().findIndex((item) => item._zod.optin !== "optional");
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!Array.isArray(input)) {
			payload.issues.push({
				input,
				inst,
				expected: "tuple",
				code: "invalid_type"
			});
			return payload;
		}
		payload.value = [];
		const proms = [];
		if (!def.rest) {
			const tooBig = input.length > items.length;
			const tooSmall = input.length < optStart - 1;
			if (tooBig || tooSmall) {
				payload.issues.push({
					...tooBig ? {
						code: "too_big",
						maximum: items.length
					} : {
						code: "too_small",
						minimum: items.length
					},
					input,
					inst,
					origin: "array"
				});
				return payload;
			}
		}
		let i = -1;
		for (const item of items) {
			i++;
			if (i >= input.length) {
				if (i >= optStart) continue;
			}
			const result = item._zod.run({
				value: input[i],
				issues: []
			}, ctx);
			if (result instanceof Promise) proms.push(result.then((result$1) => handleTupleResult(result$1, payload, i)));
			else handleTupleResult(result, payload, i);
		}
		if (def.rest) {
			const rest = input.slice(items.length);
			for (const el of rest) {
				i++;
				const result = def.rest._zod.run({
					value: el,
					issues: []
				}, ctx);
				if (result instanceof Promise) proms.push(result.then((result$1) => handleTupleResult(result$1, payload, i)));
				else handleTupleResult(result, payload, i);
			}
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
function handleTupleResult(result, final, index) {
	if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
	final.value[index] = result.value;
}
const $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!isPlainObject(input)) {
			payload.issues.push({
				expected: "record",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		const proms = [];
		if (def.keyType._zod.values) {
			const values = def.keyType._zod.values;
			payload.value = {};
			for (const key of values) if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
				const result = def.valueType._zod.run({
					value: input[key],
					issues: []
				}, ctx);
				if (result instanceof Promise) proms.push(result.then((result$1) => {
					if (result$1.issues.length) payload.issues.push(...prefixIssues(key, result$1.issues));
					payload.value[key] = result$1.value;
				}));
				else {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[key] = result.value;
				}
			}
			let unrecognized;
			for (const key in input) if (!values.has(key)) {
				unrecognized = unrecognized ?? [];
				unrecognized.push(key);
			}
			if (unrecognized && unrecognized.length > 0) payload.issues.push({
				code: "unrecognized_keys",
				input,
				inst,
				keys: unrecognized
			});
		} else {
			payload.value = {};
			for (const key of Reflect.ownKeys(input)) {
				if (key === "__proto__") continue;
				const keyResult = def.keyType._zod.run({
					value: key,
					issues: []
				}, ctx);
				if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
				if (keyResult.issues.length) {
					payload.issues.push({
						code: "invalid_key",
						origin: "record",
						issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
						input: key,
						path: [key],
						inst
					});
					payload.value[keyResult.value] = keyResult.value;
					continue;
				}
				const result = def.valueType._zod.run({
					value: input[key],
					issues: []
				}, ctx);
				if (result instanceof Promise) proms.push(result.then((result$1) => {
					if (result$1.issues.length) payload.issues.push(...prefixIssues(key, result$1.issues));
					payload.value[keyResult.value] = result$1.value;
				}));
				else {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[keyResult.value] = result.value;
				}
			}
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
const $ZodMap = /* @__PURE__ */ $constructor("$ZodMap", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!(input instanceof Map)) {
			payload.issues.push({
				expected: "map",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		const proms = [];
		payload.value = /* @__PURE__ */ new Map();
		for (const [key, value] of input) {
			const keyResult = def.keyType._zod.run({
				value: key,
				issues: []
			}, ctx);
			const valueResult = def.valueType._zod.run({
				value,
				issues: []
			}, ctx);
			if (keyResult instanceof Promise || valueResult instanceof Promise) proms.push(Promise.all([keyResult, valueResult]).then(([keyResult$1, valueResult$1]) => {
				handleMapResult(keyResult$1, valueResult$1, payload, key, input, inst, ctx);
			}));
			else handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
	if (keyResult.issues.length) if (propertyKeyTypes.has(typeof key)) final.issues.push(...prefixIssues(key, keyResult.issues));
	else final.issues.push({
		code: "invalid_key",
		origin: "map",
		input,
		inst,
		issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
	});
	if (valueResult.issues.length) if (propertyKeyTypes.has(typeof key)) final.issues.push(...prefixIssues(key, valueResult.issues));
	else final.issues.push({
		origin: "map",
		code: "invalid_element",
		input,
		inst,
		key,
		issues: valueResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
	});
	final.value.set(keyResult.value, valueResult.value);
}
const $ZodSet = /* @__PURE__ */ $constructor("$ZodSet", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!(input instanceof Set)) {
			payload.issues.push({
				input,
				inst,
				expected: "set",
				code: "invalid_type"
			});
			return payload;
		}
		const proms = [];
		payload.value = /* @__PURE__ */ new Set();
		for (const item of input) {
			const result = def.valueType._zod.run({
				value: item,
				issues: []
			}, ctx);
			if (result instanceof Promise) proms.push(result.then((result$1) => handleSetResult(result$1, payload)));
			else handleSetResult(result, payload);
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
function handleSetResult(result, final) {
	if (result.issues.length) final.issues.push(...result.issues);
	final.value.add(result.value);
}
const $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
	$ZodType.init(inst, def);
	const values = getEnumValues(def.entries);
	const valuesSet = new Set(values);
	inst._zod.values = valuesSet;
	inst._zod.pattern = /* @__PURE__ */ new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (valuesSet.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values,
			input,
			inst
		});
		return payload;
	};
});
const $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
	$ZodType.init(inst, def);
	if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
	inst._zod.values = new Set(def.values);
	inst._zod.pattern = /* @__PURE__ */ new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (inst._zod.values.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values: def.values,
			input,
			inst
		});
		return payload;
	};
});
const $ZodFile = /* @__PURE__ */ $constructor("$ZodFile", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (input instanceof File) return payload;
		payload.issues.push({
			expected: "file",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
const $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		const _out = def.transform(payload.value, payload);
		if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
			payload.value = output;
			return payload;
		});
		if (_out instanceof Promise) throw new $ZodAsyncError();
		payload.value = _out;
		return payload;
	};
});
function handleOptionalResult(result, input) {
	if (result.issues.length && input === void 0) return {
		issues: [],
		value: void 0
	};
	return result;
}
const $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	inst._zod.optout = "optional";
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? new Set([...def.innerType._zod.values, void 0]) : void 0;
	});
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? /* @__PURE__ */ new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (def.innerType._zod.optin === "optional") {
			const result = def.innerType._zod.run(payload, ctx);
			if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, payload.value));
			return handleOptionalResult(result, payload.value);
		}
		if (payload.value === void 0) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? /* @__PURE__ */ new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
	});
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === null) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) {
			payload.value = def.defaultValue;
			/**
			* $ZodDefault returns the default value immediately in forward direction.
			* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
			return payload;
		}
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result$1) => handleDefaultResult(result$1, def));
		return handleDefaultResult(result, def);
	};
});
function handleDefaultResult(payload, def) {
	if (payload.value === void 0) payload.value = def.defaultValue;
	return payload;
}
const $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) payload.value = def.defaultValue;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => {
		const v = def.innerType._zod.values;
		return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result$1) => handleNonOptionalResult(result$1, inst));
		return handleNonOptionalResult(result, inst);
	};
});
function handleNonOptionalResult(payload, inst) {
	if (!payload.issues.length && payload.value === void 0) payload.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: payload.value,
		inst
	});
	return payload;
}
const $ZodSuccess = /* @__PURE__ */ $constructor("$ZodSuccess", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") throw new $ZodEncodeError("ZodSuccess");
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result$1) => {
			payload.value = result$1.issues.length === 0;
			return payload;
		});
		payload.value = result.issues.length === 0;
		return payload;
	};
});
const $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result$1) => {
			payload.value = result$1.value;
			if (result$1.issues.length) {
				payload.value = def.catchValue({
					...payload,
					error: { issues: result$1.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
					input: payload.value
				});
				payload.issues = [];
			}
			return payload;
		});
		payload.value = result.value;
		if (result.issues.length) {
			payload.value = def.catchValue({
				...payload,
				error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
				input: payload.value
			});
			payload.issues = [];
		}
		return payload;
	};
});
const $ZodNaN = /* @__PURE__ */ $constructor("$ZodNaN", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
			payload.issues.push({
				input: payload.value,
				inst,
				expected: "nan",
				code: "invalid_type"
			});
			return payload;
		}
		return payload;
	};
});
const $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => def.in._zod.values);
	defineLazy(inst._zod, "optin", () => def.in._zod.optin);
	defineLazy(inst._zod, "optout", () => def.out._zod.optout);
	defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") {
			const right = def.out._zod.run(payload, ctx);
			if (right instanceof Promise) return right.then((right$1) => handlePipeResult(right$1, def.in, ctx));
			return handlePipeResult(right, def.in, ctx);
		}
		const left = def.in._zod.run(payload, ctx);
		if (left instanceof Promise) return left.then((left$1) => handlePipeResult(left$1, def.out, ctx));
		return handlePipeResult(left, def.out, ctx);
	};
});
function handlePipeResult(left, next, ctx) {
	if (left.issues.length) {
		left.aborted = true;
		return left;
	}
	return next._zod.run({
		value: left.value,
		issues: left.issues
	}, ctx);
}
const $ZodCodec = /* @__PURE__ */ $constructor("$ZodCodec", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => def.in._zod.values);
	defineLazy(inst._zod, "optin", () => def.in._zod.optin);
	defineLazy(inst._zod, "optout", () => def.out._zod.optout);
	defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
	inst._zod.parse = (payload, ctx) => {
		if ((ctx.direction || "forward") === "forward") {
			const left = def.in._zod.run(payload, ctx);
			if (left instanceof Promise) return left.then((left$1) => handleCodecAResult(left$1, def, ctx));
			return handleCodecAResult(left, def, ctx);
		} else {
			const right = def.out._zod.run(payload, ctx);
			if (right instanceof Promise) return right.then((right$1) => handleCodecAResult(right$1, def, ctx));
			return handleCodecAResult(right, def, ctx);
		}
	};
});
function handleCodecAResult(result, def, ctx) {
	if (result.issues.length) {
		result.aborted = true;
		return result;
	}
	if ((ctx.direction || "forward") === "forward") {
		const transformed = def.transform(result.value, result);
		if (transformed instanceof Promise) return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
		return handleCodecTxResult(result, transformed, def.out, ctx);
	} else {
		const transformed = def.reverseTransform(result.value, result);
		if (transformed instanceof Promise) return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
		return handleCodecTxResult(result, transformed, def.in, ctx);
	}
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
	if (left.issues.length) {
		left.aborted = true;
		return left;
	}
	return nextSchema._zod.run({
		value,
		issues: left.issues
	}, ctx);
}
const $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then(handleReadonlyResult);
		return handleReadonlyResult(result);
	};
});
function handleReadonlyResult(payload) {
	payload.value = Object.freeze(payload.value);
	return payload;
}
const $ZodTemplateLiteral = /* @__PURE__ */ $constructor("$ZodTemplateLiteral", (inst, def) => {
	$ZodType.init(inst, def);
	const regexParts = [];
	for (const part of def.parts) if (typeof part === "object" && part !== null) {
		if (!part._zod.pattern) throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
		const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
		if (!source) throw new Error(`Invalid template literal part: ${part._zod.traits}`);
		const start = source.startsWith("^") ? 1 : 0;
		const end = source.endsWith("$") ? source.length - 1 : source.length;
		regexParts.push(source.slice(start, end));
	} else if (part === null || primitiveTypes.has(typeof part)) regexParts.push(escapeRegex(`${part}`));
	else throw new Error(`Invalid template literal part: ${part}`);
	inst._zod.pattern = /* @__PURE__ */ new RegExp(`^${regexParts.join("")}$`);
	inst._zod.parse = (payload, _ctx) => {
		if (typeof payload.value !== "string") {
			payload.issues.push({
				input: payload.value,
				inst,
				expected: "template_literal",
				code: "invalid_type"
			});
			return payload;
		}
		inst._zod.pattern.lastIndex = 0;
		if (!inst._zod.pattern.test(payload.value)) {
			payload.issues.push({
				input: payload.value,
				inst,
				code: "invalid_format",
				format: def.format ?? "template_literal",
				pattern: inst._zod.pattern.source
			});
			return payload;
		}
		return payload;
	};
});
const $ZodFunction = /* @__PURE__ */ $constructor("$ZodFunction", (inst, def) => {
	$ZodType.init(inst, def);
	inst._def = def;
	inst._zod.def = def;
	inst.implement = (func) => {
		if (typeof func !== "function") throw new Error("implement() must be called with a function");
		return function(...args) {
			const parsedArgs = inst._def.input ? parse$1(inst._def.input, args) : args;
			const result = Reflect.apply(func, this, parsedArgs);
			if (inst._def.output) return parse$1(inst._def.output, result);
			return result;
		};
	};
	inst.implementAsync = (func) => {
		if (typeof func !== "function") throw new Error("implementAsync() must be called with a function");
		return async function(...args) {
			const parsedArgs = inst._def.input ? await parseAsync$1(inst._def.input, args) : args;
			const result = await Reflect.apply(func, this, parsedArgs);
			if (inst._def.output) return await parseAsync$1(inst._def.output, result);
			return result;
		};
	};
	inst._zod.parse = (payload, _ctx) => {
		if (typeof payload.value !== "function") {
			payload.issues.push({
				code: "invalid_type",
				expected: "function",
				input: payload.value,
				inst
			});
			return payload;
		}
		if (inst._def.output && inst._def.output._zod.def.type === "promise") payload.value = inst.implementAsync(payload.value);
		else payload.value = inst.implement(payload.value);
		return payload;
	};
	inst.input = (...args) => {
		const F = inst.constructor;
		if (Array.isArray(args[0])) return new F({
			type: "function",
			input: new $ZodTuple({
				type: "tuple",
				items: args[0],
				rest: args[1]
			}),
			output: inst._def.output
		});
		return new F({
			type: "function",
			input: args[0],
			output: inst._def.output
		});
	};
	inst.output = (output) => {
		const F = inst.constructor;
		return new F({
			type: "function",
			input: inst._def.input,
			output
		});
	};
	return inst;
});
const $ZodPromise = /* @__PURE__ */ $constructor("$ZodPromise", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({
			value: inner,
			issues: []
		}, ctx));
	};
});
const $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "innerType", () => def.getter());
	defineLazy(inst._zod, "pattern", () => inst._zod.innerType._zod.pattern);
	defineLazy(inst._zod, "propValues", () => inst._zod.innerType._zod.propValues);
	defineLazy(inst._zod, "optin", () => inst._zod.innerType._zod.optin ?? void 0);
	defineLazy(inst._zod, "optout", () => inst._zod.innerType._zod.optout ?? void 0);
	inst._zod.parse = (payload, ctx) => {
		return inst._zod.innerType._zod.run(payload, ctx);
	};
});
const $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
	$ZodCheck.init(inst, def);
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _) => {
		return payload;
	};
	inst._zod.check = (payload) => {
		const input = payload.value;
		const r = def.fn(input);
		if (r instanceof Promise) return r.then((r$1) => handleRefineResult(r$1, payload, input, inst));
		handleRefineResult(r, payload, input, inst);
	};
});
function handleRefineResult(result, payload, input, inst) {
	if (!result) {
		const _iss = {
			code: "custom",
			input,
			inst,
			path: [...inst._zod.def.path ?? []],
			continue: !inst._zod.def.abort
		};
		if (inst._zod.def.params) _iss.params = inst._zod.def.params;
		payload.issues.push(issue(_iss));
	}
}

//#endregion
//#region node_modules/zod/v4/locales/ar.js
const error$44 = () => {
	const Sizable = {
		string: {
			unit: "حرف",
			verb: "أن يحوي"
		},
		file: {
			unit: "بايت",
			verb: "أن يحوي"
		},
		array: {
			unit: "عنصر",
			verb: "أن يحوي"
		},
		set: {
			unit: "عنصر",
			verb: "أن يحوي"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "number";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "مدخل",
		email: "بريد إلكتروني",
		url: "رابط",
		emoji: "إيموجي",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "تاريخ ووقت بمعيار ISO",
		date: "تاريخ بمعيار ISO",
		time: "وقت بمعيار ISO",
		duration: "مدة بمعيار ISO",
		ipv4: "عنوان IPv4",
		ipv6: "عنوان IPv6",
		cidrv4: "مدى عناوين بصيغة IPv4",
		cidrv6: "مدى عناوين بصيغة IPv6",
		base64: "نَص بترميز base64-encoded",
		base64url: "نَص بترميز base64url-encoded",
		json_string: "نَص على هيئة JSON",
		e164: "رقم هاتف بمعيار E.164",
		jwt: "JWT",
		template_literal: "مدخل"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `مدخلات غير مقبولة: يفترض إدخال ${issue$1.expected}، ولكن تم إدخال ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `مدخلات غير مقبولة: يفترض إدخال ${stringifyPrimitive(issue$1.values[0])}`;
				return `اختيار غير مقبول: يتوقع انتقاء أحد هذه الخيارات: ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return ` أكبر من اللازم: يفترض أن تكون ${issue$1.origin ?? "القيمة"} ${adj} ${issue$1.maximum.toString()} ${sizing.unit ?? "عنصر"}`;
				return `أكبر من اللازم: يفترض أن تكون ${issue$1.origin ?? "القيمة"} ${adj} ${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `أصغر من اللازم: يفترض لـ ${issue$1.origin} أن يكون ${adj} ${issue$1.minimum.toString()} ${sizing.unit}`;
				return `أصغر من اللازم: يفترض لـ ${issue$1.origin} أن يكون ${adj} ${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `نَص غير مقبول: يجب أن يبدأ بـ "${issue$1.prefix}"`;
				if (_issue.format === "ends_with") return `نَص غير مقبول: يجب أن ينتهي بـ "${_issue.suffix}"`;
				if (_issue.format === "includes") return `نَص غير مقبول: يجب أن يتضمَّن "${_issue.includes}"`;
				if (_issue.format === "regex") return `نَص غير مقبول: يجب أن يطابق النمط ${_issue.pattern}`;
				return `${Nouns[_issue.format] ?? issue$1.format} غير مقبول`;
			}
			case "not_multiple_of": return `رقم غير مقبول: يجب أن يكون من مضاعفات ${issue$1.divisor}`;
			case "unrecognized_keys": return `معرف${issue$1.keys.length > 1 ? "ات" : ""} غريب${issue$1.keys.length > 1 ? "ة" : ""}: ${joinValues(issue$1.keys, "، ")}`;
			case "invalid_key": return `معرف غير مقبول في ${issue$1.origin}`;
			case "invalid_union": return "مدخل غير مقبول";
			case "invalid_element": return `مدخل غير مقبول في ${issue$1.origin}`;
			default: return "مدخل غير مقبول";
		}
	};
};
function ar_default() {
	return { localeError: error$44() };
}

//#endregion
//#region node_modules/zod/v4/locales/az.js
const error$43 = () => {
	const Sizable = {
		string: {
			unit: "simvol",
			verb: "olmalıdır"
		},
		file: {
			unit: "bayt",
			verb: "olmalıdır"
		},
		array: {
			unit: "element",
			verb: "olmalıdır"
		},
		set: {
			unit: "element",
			verb: "olmalıdır"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "number";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "input",
		email: "email address",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO datetime",
		date: "ISO date",
		time: "ISO time",
		duration: "ISO duration",
		ipv4: "IPv4 address",
		ipv6: "IPv6 address",
		cidrv4: "IPv4 range",
		cidrv6: "IPv6 range",
		base64: "base64-encoded string",
		base64url: "base64url-encoded string",
		json_string: "JSON string",
		e164: "E.164 number",
		jwt: "JWT",
		template_literal: "input"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Yanlış dəyər: gözlənilən ${issue$1.expected}, daxil olan ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Yanlış dəyər: gözlənilən ${stringifyPrimitive(issue$1.values[0])}`;
				return `Yanlış seçim: aşağıdakılardan biri olmalıdır: ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Çox böyük: gözlənilən ${issue$1.origin ?? "dəyər"} ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "element"}`;
				return `Çox böyük: gözlənilən ${issue$1.origin ?? "dəyər"} ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Çox kiçik: gözlənilən ${issue$1.origin} ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Çox kiçik: gözlənilən ${issue$1.origin} ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Yanlış mətn: "${_issue.prefix}" ilə başlamalıdır`;
				if (_issue.format === "ends_with") return `Yanlış mətn: "${_issue.suffix}" ilə bitməlidir`;
				if (_issue.format === "includes") return `Yanlış mətn: "${_issue.includes}" daxil olmalıdır`;
				if (_issue.format === "regex") return `Yanlış mətn: ${_issue.pattern} şablonuna uyğun olmalıdır`;
				return `Yanlış ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Yanlış ədəd: ${issue$1.divisor} ilə bölünə bilən olmalıdır`;
			case "unrecognized_keys": return `Tanınmayan açar${issue$1.keys.length > 1 ? "lar" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `${issue$1.origin} daxilində yanlış açar`;
			case "invalid_union": return "Yanlış dəyər";
			case "invalid_element": return `${issue$1.origin} daxilində yanlış dəyər`;
			default: return `Yanlış dəyər`;
		}
	};
};
function az_default() {
	return { localeError: error$43() };
}

//#endregion
//#region node_modules/zod/v4/locales/be.js
function getBelarusianPlural(count, one, few, many) {
	const absCount = Math.abs(count);
	const lastDigit = absCount % 10;
	const lastTwoDigits = absCount % 100;
	if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return many;
	if (lastDigit === 1) return one;
	if (lastDigit >= 2 && lastDigit <= 4) return few;
	return many;
}
const error$42 = () => {
	const Sizable = {
		string: {
			unit: {
				one: "сімвал",
				few: "сімвалы",
				many: "сімвалаў"
			},
			verb: "мець"
		},
		array: {
			unit: {
				one: "элемент",
				few: "элементы",
				many: "элементаў"
			},
			verb: "мець"
		},
		set: {
			unit: {
				one: "элемент",
				few: "элементы",
				many: "элементаў"
			},
			verb: "мець"
		},
		file: {
			unit: {
				one: "байт",
				few: "байты",
				many: "байтаў"
			},
			verb: "мець"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "лік";
			case "object":
				if (Array.isArray(data)) return "масіў";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "увод",
		email: "email адрас",
		url: "URL",
		emoji: "эмодзі",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO дата і час",
		date: "ISO дата",
		time: "ISO час",
		duration: "ISO працягласць",
		ipv4: "IPv4 адрас",
		ipv6: "IPv6 адрас",
		cidrv4: "IPv4 дыяпазон",
		cidrv6: "IPv6 дыяпазон",
		base64: "радок у фармаце base64",
		base64url: "радок у фармаце base64url",
		json_string: "JSON радок",
		e164: "нумар E.164",
		jwt: "JWT",
		template_literal: "увод"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Няправільны ўвод: чакаўся ${issue$1.expected}, атрымана ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Няправільны ўвод: чакалася ${stringifyPrimitive(issue$1.values[0])}`;
				return `Няправільны варыянт: чакаўся адзін з ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) {
					const unit = getBelarusianPlural(Number(issue$1.maximum), sizing.unit.one, sizing.unit.few, sizing.unit.many);
					return `Занадта вялікі: чакалася, што ${issue$1.origin ?? "значэнне"} павінна ${sizing.verb} ${adj}${issue$1.maximum.toString()} ${unit}`;
				}
				return `Занадта вялікі: чакалася, што ${issue$1.origin ?? "значэнне"} павінна быць ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) {
					const unit = getBelarusianPlural(Number(issue$1.minimum), sizing.unit.one, sizing.unit.few, sizing.unit.many);
					return `Занадта малы: чакалася, што ${issue$1.origin} павінна ${sizing.verb} ${adj}${issue$1.minimum.toString()} ${unit}`;
				}
				return `Занадта малы: чакалася, што ${issue$1.origin} павінна быць ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Няправільны радок: павінен пачынацца з "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Няправільны радок: павінен заканчвацца на "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Няправільны радок: павінен змяшчаць "${_issue.includes}"`;
				if (_issue.format === "regex") return `Няправільны радок: павінен адпавядаць шаблону ${_issue.pattern}`;
				return `Няправільны ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Няправільны лік: павінен быць кратным ${issue$1.divisor}`;
			case "unrecognized_keys": return `Нераспазнаны ${issue$1.keys.length > 1 ? "ключы" : "ключ"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Няправільны ключ у ${issue$1.origin}`;
			case "invalid_union": return "Няправільны ўвод";
			case "invalid_element": return `Няправільнае значэнне ў ${issue$1.origin}`;
			default: return `Няправільны ўвод`;
		}
	};
};
function be_default() {
	return { localeError: error$42() };
}

//#endregion
//#region node_modules/zod/v4/locales/bg.js
const parsedType$6 = (data) => {
	const t = typeof data;
	switch (t) {
		case "number": return Number.isNaN(data) ? "NaN" : "число";
		case "object":
			if (Array.isArray(data)) return "масив";
			if (data === null) return "null";
			if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
	}
	return t;
};
const error$41 = () => {
	const Sizable = {
		string: {
			unit: "символа",
			verb: "да съдържа"
		},
		file: {
			unit: "байта",
			verb: "да съдържа"
		},
		array: {
			unit: "елемента",
			verb: "да съдържа"
		},
		set: {
			unit: "елемента",
			verb: "да съдържа"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const Nouns = {
		regex: "вход",
		email: "имейл адрес",
		url: "URL",
		emoji: "емоджи",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO време",
		date: "ISO дата",
		time: "ISO време",
		duration: "ISO продължителност",
		ipv4: "IPv4 адрес",
		ipv6: "IPv6 адрес",
		cidrv4: "IPv4 диапазон",
		cidrv6: "IPv6 диапазон",
		base64: "base64-кодиран низ",
		base64url: "base64url-кодиран низ",
		json_string: "JSON низ",
		e164: "E.164 номер",
		jwt: "JWT",
		template_literal: "вход"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Невалиден вход: очакван ${issue$1.expected}, получен ${parsedType$6(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Невалиден вход: очакван ${stringifyPrimitive(issue$1.values[0])}`;
				return `Невалидна опция: очаквано едно от ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Твърде голямо: очаква се ${issue$1.origin ?? "стойност"} да съдържа ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "елемента"}`;
				return `Твърде голямо: очаква се ${issue$1.origin ?? "стойност"} да бъде ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Твърде малко: очаква се ${issue$1.origin} да съдържа ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Твърде малко: очаква се ${issue$1.origin} да бъде ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Невалиден низ: трябва да започва с "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Невалиден низ: трябва да завършва с "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Невалиден низ: трябва да включва "${_issue.includes}"`;
				if (_issue.format === "regex") return `Невалиден низ: трябва да съвпада с ${_issue.pattern}`;
				let invalid_adj = "Невалиден";
				if (_issue.format === "emoji") invalid_adj = "Невалидно";
				if (_issue.format === "datetime") invalid_adj = "Невалидно";
				if (_issue.format === "date") invalid_adj = "Невалидна";
				if (_issue.format === "time") invalid_adj = "Невалидно";
				if (_issue.format === "duration") invalid_adj = "Невалидна";
				return `${invalid_adj} ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Невалидно число: трябва да бъде кратно на ${issue$1.divisor}`;
			case "unrecognized_keys": return `Неразпознат${issue$1.keys.length > 1 ? "и" : ""} ключ${issue$1.keys.length > 1 ? "ове" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Невалиден ключ в ${issue$1.origin}`;
			case "invalid_union": return "Невалиден вход";
			case "invalid_element": return `Невалидна стойност в ${issue$1.origin}`;
			default: return `Невалиден вход`;
		}
	};
};
function bg_default() {
	return { localeError: error$41() };
}

//#endregion
//#region node_modules/zod/v4/locales/ca.js
const error$40 = () => {
	const Sizable = {
		string: {
			unit: "caràcters",
			verb: "contenir"
		},
		file: {
			unit: "bytes",
			verb: "contenir"
		},
		array: {
			unit: "elements",
			verb: "contenir"
		},
		set: {
			unit: "elements",
			verb: "contenir"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "number";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "entrada",
		email: "adreça electrònica",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "data i hora ISO",
		date: "data ISO",
		time: "hora ISO",
		duration: "durada ISO",
		ipv4: "adreça IPv4",
		ipv6: "adreça IPv6",
		cidrv4: "rang IPv4",
		cidrv6: "rang IPv6",
		base64: "cadena codificada en base64",
		base64url: "cadena codificada en base64url",
		json_string: "cadena JSON",
		e164: "número E.164",
		jwt: "JWT",
		template_literal: "entrada"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Tipus invàlid: s'esperava ${issue$1.expected}, s'ha rebut ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Valor invàlid: s'esperava ${stringifyPrimitive(issue$1.values[0])}`;
				return `Opció invàlida: s'esperava una de ${joinValues(issue$1.values, " o ")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "com a màxim" : "menys de";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Massa gran: s'esperava que ${issue$1.origin ?? "el valor"} contingués ${adj} ${issue$1.maximum.toString()} ${sizing.unit ?? "elements"}`;
				return `Massa gran: s'esperava que ${issue$1.origin ?? "el valor"} fos ${adj} ${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? "com a mínim" : "més de";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Massa petit: s'esperava que ${issue$1.origin} contingués ${adj} ${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Massa petit: s'esperava que ${issue$1.origin} fos ${adj} ${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Format invàlid: ha de començar amb "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Format invàlid: ha d'acabar amb "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Format invàlid: ha d'incloure "${_issue.includes}"`;
				if (_issue.format === "regex") return `Format invàlid: ha de coincidir amb el patró ${_issue.pattern}`;
				return `Format invàlid per a ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Número invàlid: ha de ser múltiple de ${issue$1.divisor}`;
			case "unrecognized_keys": return `Clau${issue$1.keys.length > 1 ? "s" : ""} no reconeguda${issue$1.keys.length > 1 ? "s" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Clau invàlida a ${issue$1.origin}`;
			case "invalid_union": return "Entrada invàlida";
			case "invalid_element": return `Element invàlid a ${issue$1.origin}`;
			default: return `Entrada invàlida`;
		}
	};
};
function ca_default() {
	return { localeError: error$40() };
}

//#endregion
//#region node_modules/zod/v4/locales/cs.js
const error$39 = () => {
	const Sizable = {
		string: {
			unit: "znaků",
			verb: "mít"
		},
		file: {
			unit: "bajtů",
			verb: "mít"
		},
		array: {
			unit: "prvků",
			verb: "mít"
		},
		set: {
			unit: "prvků",
			verb: "mít"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "číslo";
			case "string": return "řetězec";
			case "boolean": return "boolean";
			case "bigint": return "bigint";
			case "function": return "funkce";
			case "symbol": return "symbol";
			case "undefined": return "undefined";
			case "object":
				if (Array.isArray(data)) return "pole";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "regulární výraz",
		email: "e-mailová adresa",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "datum a čas ve formátu ISO",
		date: "datum ve formátu ISO",
		time: "čas ve formátu ISO",
		duration: "doba trvání ISO",
		ipv4: "IPv4 adresa",
		ipv6: "IPv6 adresa",
		cidrv4: "rozsah IPv4",
		cidrv6: "rozsah IPv6",
		base64: "řetězec zakódovaný ve formátu base64",
		base64url: "řetězec zakódovaný ve formátu base64url",
		json_string: "řetězec ve formátu JSON",
		e164: "číslo E.164",
		jwt: "JWT",
		template_literal: "vstup"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Neplatný vstup: očekáváno ${issue$1.expected}, obdrženo ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Neplatný vstup: očekáváno ${stringifyPrimitive(issue$1.values[0])}`;
				return `Neplatná možnost: očekávána jedna z hodnot ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Hodnota je příliš velká: ${issue$1.origin ?? "hodnota"} musí mít ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "prvků"}`;
				return `Hodnota je příliš velká: ${issue$1.origin ?? "hodnota"} musí být ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Hodnota je příliš malá: ${issue$1.origin ?? "hodnota"} musí mít ${adj}${issue$1.minimum.toString()} ${sizing.unit ?? "prvků"}`;
				return `Hodnota je příliš malá: ${issue$1.origin ?? "hodnota"} musí být ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Neplatný řetězec: musí začínat na "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Neplatný řetězec: musí končit na "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Neplatný řetězec: musí obsahovat "${_issue.includes}"`;
				if (_issue.format === "regex") return `Neplatný řetězec: musí odpovídat vzoru ${_issue.pattern}`;
				return `Neplatný formát ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Neplatné číslo: musí být násobkem ${issue$1.divisor}`;
			case "unrecognized_keys": return `Neznámé klíče: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Neplatný klíč v ${issue$1.origin}`;
			case "invalid_union": return "Neplatný vstup";
			case "invalid_element": return `Neplatná hodnota v ${issue$1.origin}`;
			default: return `Neplatný vstup`;
		}
	};
};
function cs_default() {
	return { localeError: error$39() };
}

//#endregion
//#region node_modules/zod/v4/locales/da.js
const error$38 = () => {
	const Sizable = {
		string: {
			unit: "tegn",
			verb: "havde"
		},
		file: {
			unit: "bytes",
			verb: "havde"
		},
		array: {
			unit: "elementer",
			verb: "indeholdt"
		},
		set: {
			unit: "elementer",
			verb: "indeholdt"
		}
	};
	const TypeNames = {
		string: "streng",
		number: "tal",
		boolean: "boolean",
		array: "liste",
		object: "objekt",
		set: "sæt",
		file: "fil"
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	function getTypeName(type) {
		return TypeNames[type] ?? type;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "tal";
			case "object":
				if (Array.isArray(data)) return "liste";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
				return "objekt";
		}
		return t;
	};
	const Nouns = {
		regex: "input",
		email: "e-mailadresse",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO dato- og klokkeslæt",
		date: "ISO-dato",
		time: "ISO-klokkeslæt",
		duration: "ISO-varighed",
		ipv4: "IPv4-område",
		ipv6: "IPv6-område",
		cidrv4: "IPv4-spektrum",
		cidrv6: "IPv6-spektrum",
		base64: "base64-kodet streng",
		base64url: "base64url-kodet streng",
		json_string: "JSON-streng",
		e164: "E.164-nummer",
		jwt: "JWT",
		template_literal: "input"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Ugyldigt input: forventede ${getTypeName(issue$1.expected)}, fik ${getTypeName(parsedType$7(issue$1.input))}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Ugyldig værdi: forventede ${stringifyPrimitive(issue$1.values[0])}`;
				return `Ugyldigt valg: forventede en af følgende ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				const origin = getTypeName(issue$1.origin);
				if (sizing) return `For stor: forventede ${origin ?? "value"} ${sizing.verb} ${adj} ${issue$1.maximum.toString()} ${sizing.unit ?? "elementer"}`;
				return `For stor: forventede ${origin ?? "value"} havde ${adj} ${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				const origin = getTypeName(issue$1.origin);
				if (sizing) return `For lille: forventede ${origin} ${sizing.verb} ${adj} ${issue$1.minimum.toString()} ${sizing.unit}`;
				return `For lille: forventede ${origin} havde ${adj} ${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Ugyldig streng: skal starte med "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Ugyldig streng: skal ende med "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Ugyldig streng: skal indeholde "${_issue.includes}"`;
				if (_issue.format === "regex") return `Ugyldig streng: skal matche mønsteret ${_issue.pattern}`;
				return `Ugyldig ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Ugyldigt tal: skal være deleligt med ${issue$1.divisor}`;
			case "unrecognized_keys": return `${issue$1.keys.length > 1 ? "Ukendte nøgler" : "Ukendt nøgle"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Ugyldig nøgle i ${issue$1.origin}`;
			case "invalid_union": return "Ugyldigt input: matcher ingen af de tilladte typer";
			case "invalid_element": return `Ugyldig værdi i ${issue$1.origin}`;
			default: return `Ugyldigt input`;
		}
	};
};
function da_default() {
	return { localeError: error$38() };
}

//#endregion
//#region node_modules/zod/v4/locales/de.js
const error$37 = () => {
	const Sizable = {
		string: {
			unit: "Zeichen",
			verb: "zu haben"
		},
		file: {
			unit: "Bytes",
			verb: "zu haben"
		},
		array: {
			unit: "Elemente",
			verb: "zu haben"
		},
		set: {
			unit: "Elemente",
			verb: "zu haben"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "Zahl";
			case "object":
				if (Array.isArray(data)) return "Array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "Eingabe",
		email: "E-Mail-Adresse",
		url: "URL",
		emoji: "Emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO-Datum und -Uhrzeit",
		date: "ISO-Datum",
		time: "ISO-Uhrzeit",
		duration: "ISO-Dauer",
		ipv4: "IPv4-Adresse",
		ipv6: "IPv6-Adresse",
		cidrv4: "IPv4-Bereich",
		cidrv6: "IPv6-Bereich",
		base64: "Base64-codierter String",
		base64url: "Base64-URL-codierter String",
		json_string: "JSON-String",
		e164: "E.164-Nummer",
		jwt: "JWT",
		template_literal: "Eingabe"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Ungültige Eingabe: erwartet ${issue$1.expected}, erhalten ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Ungültige Eingabe: erwartet ${stringifyPrimitive(issue$1.values[0])}`;
				return `Ungültige Option: erwartet eine von ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Zu groß: erwartet, dass ${issue$1.origin ?? "Wert"} ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "Elemente"} hat`;
				return `Zu groß: erwartet, dass ${issue$1.origin ?? "Wert"} ${adj}${issue$1.maximum.toString()} ist`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Zu klein: erwartet, dass ${issue$1.origin} ${adj}${issue$1.minimum.toString()} ${sizing.unit} hat`;
				return `Zu klein: erwartet, dass ${issue$1.origin} ${adj}${issue$1.minimum.toString()} ist`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Ungültiger String: muss mit "${_issue.prefix}" beginnen`;
				if (_issue.format === "ends_with") return `Ungültiger String: muss mit "${_issue.suffix}" enden`;
				if (_issue.format === "includes") return `Ungültiger String: muss "${_issue.includes}" enthalten`;
				if (_issue.format === "regex") return `Ungültiger String: muss dem Muster ${_issue.pattern} entsprechen`;
				return `Ungültig: ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Ungültige Zahl: muss ein Vielfaches von ${issue$1.divisor} sein`;
			case "unrecognized_keys": return `${issue$1.keys.length > 1 ? "Unbekannte Schlüssel" : "Unbekannter Schlüssel"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Ungültiger Schlüssel in ${issue$1.origin}`;
			case "invalid_union": return "Ungültige Eingabe";
			case "invalid_element": return `Ungültiger Wert in ${issue$1.origin}`;
			default: return `Ungültige Eingabe`;
		}
	};
};
function de_default() {
	return { localeError: error$37() };
}

//#endregion
//#region node_modules/zod/v4/locales/en.js
const parsedType$5 = (data) => {
	const t = typeof data;
	switch (t) {
		case "number": return Number.isNaN(data) ? "NaN" : "number";
		case "object":
			if (Array.isArray(data)) return "array";
			if (data === null) return "null";
			if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
	}
	return t;
};
const error$36 = () => {
	const Sizable = {
		string: {
			unit: "characters",
			verb: "to have"
		},
		file: {
			unit: "bytes",
			verb: "to have"
		},
		array: {
			unit: "items",
			verb: "to have"
		},
		set: {
			unit: "items",
			verb: "to have"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const Nouns = {
		regex: "input",
		email: "email address",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO datetime",
		date: "ISO date",
		time: "ISO time",
		duration: "ISO duration",
		ipv4: "IPv4 address",
		ipv6: "IPv6 address",
		cidrv4: "IPv4 range",
		cidrv6: "IPv6 range",
		base64: "base64-encoded string",
		base64url: "base64url-encoded string",
		json_string: "JSON string",
		e164: "E.164 number",
		jwt: "JWT",
		template_literal: "input"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Invalid input: expected ${issue$1.expected}, received ${parsedType$5(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Invalid input: expected ${stringifyPrimitive(issue$1.values[0])}`;
				return `Invalid option: expected one of ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Too big: expected ${issue$1.origin ?? "value"} to have ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elements"}`;
				return `Too big: expected ${issue$1.origin ?? "value"} to be ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Too small: expected ${issue$1.origin} to have ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Too small: expected ${issue$1.origin} to be ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Invalid string: must start with "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Invalid string: must end with "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Invalid string: must include "${_issue.includes}"`;
				if (_issue.format === "regex") return `Invalid string: must match pattern ${_issue.pattern}`;
				return `Invalid ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Invalid number: must be a multiple of ${issue$1.divisor}`;
			case "unrecognized_keys": return `Unrecognized key${issue$1.keys.length > 1 ? "s" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Invalid key in ${issue$1.origin}`;
			case "invalid_union": return "Invalid input";
			case "invalid_element": return `Invalid value in ${issue$1.origin}`;
			default: return `Invalid input`;
		}
	};
};
function en_default() {
	return { localeError: error$36() };
}

//#endregion
//#region node_modules/zod/v4/locales/eo.js
const parsedType$4 = (data) => {
	const t = typeof data;
	switch (t) {
		case "number": return Number.isNaN(data) ? "NaN" : "nombro";
		case "object":
			if (Array.isArray(data)) return "tabelo";
			if (data === null) return "senvalora";
			if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
	}
	return t;
};
const error$35 = () => {
	const Sizable = {
		string: {
			unit: "karaktrojn",
			verb: "havi"
		},
		file: {
			unit: "bajtojn",
			verb: "havi"
		},
		array: {
			unit: "elementojn",
			verb: "havi"
		},
		set: {
			unit: "elementojn",
			verb: "havi"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const Nouns = {
		regex: "enigo",
		email: "retadreso",
		url: "URL",
		emoji: "emoĝio",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO-datotempo",
		date: "ISO-dato",
		time: "ISO-tempo",
		duration: "ISO-daŭro",
		ipv4: "IPv4-adreso",
		ipv6: "IPv6-adreso",
		cidrv4: "IPv4-rango",
		cidrv6: "IPv6-rango",
		base64: "64-ume kodita karaktraro",
		base64url: "URL-64-ume kodita karaktraro",
		json_string: "JSON-karaktraro",
		e164: "E.164-nombro",
		jwt: "JWT",
		template_literal: "enigo"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Nevalida enigo: atendiĝis ${issue$1.expected}, riceviĝis ${parsedType$4(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Nevalida enigo: atendiĝis ${stringifyPrimitive(issue$1.values[0])}`;
				return `Nevalida opcio: atendiĝis unu el ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Tro granda: atendiĝis ke ${issue$1.origin ?? "valoro"} havu ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elementojn"}`;
				return `Tro granda: atendiĝis ke ${issue$1.origin ?? "valoro"} havu ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Tro malgranda: atendiĝis ke ${issue$1.origin} havu ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Tro malgranda: atendiĝis ke ${issue$1.origin} estu ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Nevalida karaktraro: devas komenciĝi per "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Nevalida karaktraro: devas finiĝi per "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Nevalida karaktraro: devas inkluzivi "${_issue.includes}"`;
				if (_issue.format === "regex") return `Nevalida karaktraro: devas kongrui kun la modelo ${_issue.pattern}`;
				return `Nevalida ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Nevalida nombro: devas esti oblo de ${issue$1.divisor}`;
			case "unrecognized_keys": return `Nekonata${issue$1.keys.length > 1 ? "j" : ""} ŝlosilo${issue$1.keys.length > 1 ? "j" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Nevalida ŝlosilo en ${issue$1.origin}`;
			case "invalid_union": return "Nevalida enigo";
			case "invalid_element": return `Nevalida valoro en ${issue$1.origin}`;
			default: return `Nevalida enigo`;
		}
	};
};
function eo_default() {
	return { localeError: error$35() };
}

//#endregion
//#region node_modules/zod/v4/locales/es.js
const error$34 = () => {
	const Sizable = {
		string: {
			unit: "caracteres",
			verb: "tener"
		},
		file: {
			unit: "bytes",
			verb: "tener"
		},
		array: {
			unit: "elementos",
			verb: "tener"
		},
		set: {
			unit: "elementos",
			verb: "tener"
		}
	};
	const TypeNames = {
		string: "texto",
		number: "número",
		boolean: "booleano",
		array: "arreglo",
		object: "objeto",
		set: "conjunto",
		file: "archivo",
		date: "fecha",
		bigint: "número grande",
		symbol: "símbolo",
		undefined: "indefinido",
		null: "nulo",
		function: "función",
		map: "mapa",
		record: "registro",
		tuple: "tupla",
		enum: "enumeración",
		union: "unión",
		literal: "literal",
		promise: "promesa",
		void: "vacío",
		never: "nunca",
		unknown: "desconocido",
		any: "cualquiera"
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	function getTypeName(type) {
		return TypeNames[type] ?? type;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "number";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype) return data.constructor.name;
				return "object";
		}
		return t;
	};
	const Nouns = {
		regex: "entrada",
		email: "dirección de correo electrónico",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "fecha y hora ISO",
		date: "fecha ISO",
		time: "hora ISO",
		duration: "duración ISO",
		ipv4: "dirección IPv4",
		ipv6: "dirección IPv6",
		cidrv4: "rango IPv4",
		cidrv6: "rango IPv6",
		base64: "cadena codificada en base64",
		base64url: "URL codificada en base64",
		json_string: "cadena JSON",
		e164: "número E.164",
		jwt: "JWT",
		template_literal: "entrada"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Entrada inválida: se esperaba ${getTypeName(issue$1.expected)}, recibido ${getTypeName(parsedType$7(issue$1.input))}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Entrada inválida: se esperaba ${stringifyPrimitive(issue$1.values[0])}`;
				return `Opción inválida: se esperaba una de ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				const origin = getTypeName(issue$1.origin);
				if (sizing) return `Demasiado grande: se esperaba que ${origin ?? "valor"} tuviera ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elementos"}`;
				return `Demasiado grande: se esperaba que ${origin ?? "valor"} fuera ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				const origin = getTypeName(issue$1.origin);
				if (sizing) return `Demasiado pequeño: se esperaba que ${origin} tuviera ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Demasiado pequeño: se esperaba que ${origin} fuera ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Cadena inválida: debe comenzar con "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Cadena inválida: debe terminar en "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Cadena inválida: debe incluir "${_issue.includes}"`;
				if (_issue.format === "regex") return `Cadena inválida: debe coincidir con el patrón ${_issue.pattern}`;
				return `Inválido ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Número inválido: debe ser múltiplo de ${issue$1.divisor}`;
			case "unrecognized_keys": return `Llave${issue$1.keys.length > 1 ? "s" : ""} desconocida${issue$1.keys.length > 1 ? "s" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Llave inválida en ${getTypeName(issue$1.origin)}`;
			case "invalid_union": return "Entrada inválida";
			case "invalid_element": return `Valor inválido en ${getTypeName(issue$1.origin)}`;
			default: return `Entrada inválida`;
		}
	};
};
function es_default() {
	return { localeError: error$34() };
}

//#endregion
//#region node_modules/zod/v4/locales/fa.js
const error$33 = () => {
	const Sizable = {
		string: {
			unit: "کاراکتر",
			verb: "داشته باشد"
		},
		file: {
			unit: "بایت",
			verb: "داشته باشد"
		},
		array: {
			unit: "آیتم",
			verb: "داشته باشد"
		},
		set: {
			unit: "آیتم",
			verb: "داشته باشد"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "عدد";
			case "object":
				if (Array.isArray(data)) return "آرایه";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "ورودی",
		email: "آدرس ایمیل",
		url: "URL",
		emoji: "ایموجی",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "تاریخ و زمان ایزو",
		date: "تاریخ ایزو",
		time: "زمان ایزو",
		duration: "مدت زمان ایزو",
		ipv4: "IPv4 آدرس",
		ipv6: "IPv6 آدرس",
		cidrv4: "IPv4 دامنه",
		cidrv6: "IPv6 دامنه",
		base64: "base64-encoded رشته",
		base64url: "base64url-encoded رشته",
		json_string: "JSON رشته",
		e164: "E.164 عدد",
		jwt: "JWT",
		template_literal: "ورودی"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `ورودی نامعتبر: می‌بایست ${issue$1.expected} می‌بود، ${parsedType$7(issue$1.input)} دریافت شد`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `ورودی نامعتبر: می‌بایست ${stringifyPrimitive(issue$1.values[0])} می‌بود`;
				return `گزینه نامعتبر: می‌بایست یکی از ${joinValues(issue$1.values, "|")} می‌بود`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `خیلی بزرگ: ${issue$1.origin ?? "مقدار"} باید ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "عنصر"} باشد`;
				return `خیلی بزرگ: ${issue$1.origin ?? "مقدار"} باید ${adj}${issue$1.maximum.toString()} باشد`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `خیلی کوچک: ${issue$1.origin} باید ${adj}${issue$1.minimum.toString()} ${sizing.unit} باشد`;
				return `خیلی کوچک: ${issue$1.origin} باید ${adj}${issue$1.minimum.toString()} باشد`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `رشته نامعتبر: باید با "${_issue.prefix}" شروع شود`;
				if (_issue.format === "ends_with") return `رشته نامعتبر: باید با "${_issue.suffix}" تمام شود`;
				if (_issue.format === "includes") return `رشته نامعتبر: باید شامل "${_issue.includes}" باشد`;
				if (_issue.format === "regex") return `رشته نامعتبر: باید با الگوی ${_issue.pattern} مطابقت داشته باشد`;
				return `${Nouns[_issue.format] ?? issue$1.format} نامعتبر`;
			}
			case "not_multiple_of": return `عدد نامعتبر: باید مضرب ${issue$1.divisor} باشد`;
			case "unrecognized_keys": return `کلید${issue$1.keys.length > 1 ? "های" : ""} ناشناس: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `کلید ناشناس در ${issue$1.origin}`;
			case "invalid_union": return `ورودی نامعتبر`;
			case "invalid_element": return `مقدار نامعتبر در ${issue$1.origin}`;
			default: return `ورودی نامعتبر`;
		}
	};
};
function fa_default() {
	return { localeError: error$33() };
}

//#endregion
//#region node_modules/zod/v4/locales/fi.js
const error$32 = () => {
	const Sizable = {
		string: {
			unit: "merkkiä",
			subject: "merkkijonon"
		},
		file: {
			unit: "tavua",
			subject: "tiedoston"
		},
		array: {
			unit: "alkiota",
			subject: "listan"
		},
		set: {
			unit: "alkiota",
			subject: "joukon"
		},
		number: {
			unit: "",
			subject: "luvun"
		},
		bigint: {
			unit: "",
			subject: "suuren kokonaisluvun"
		},
		int: {
			unit: "",
			subject: "kokonaisluvun"
		},
		date: {
			unit: "",
			subject: "päivämäärän"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "number";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "säännöllinen lauseke",
		email: "sähköpostiosoite",
		url: "URL-osoite",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO-aikaleima",
		date: "ISO-päivämäärä",
		time: "ISO-aika",
		duration: "ISO-kesto",
		ipv4: "IPv4-osoite",
		ipv6: "IPv6-osoite",
		cidrv4: "IPv4-alue",
		cidrv6: "IPv6-alue",
		base64: "base64-koodattu merkkijono",
		base64url: "base64url-koodattu merkkijono",
		json_string: "JSON-merkkijono",
		e164: "E.164-luku",
		jwt: "JWT",
		template_literal: "templaattimerkkijono"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Virheellinen tyyppi: odotettiin ${issue$1.expected}, oli ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Virheellinen syöte: täytyy olla ${stringifyPrimitive(issue$1.values[0])}`;
				return `Virheellinen valinta: täytyy olla yksi seuraavista: ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Liian suuri: ${sizing.subject} täytyy olla ${adj}${issue$1.maximum.toString()} ${sizing.unit}`.trim();
				return `Liian suuri: arvon täytyy olla ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Liian pieni: ${sizing.subject} täytyy olla ${adj}${issue$1.minimum.toString()} ${sizing.unit}`.trim();
				return `Liian pieni: arvon täytyy olla ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Virheellinen syöte: täytyy alkaa "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Virheellinen syöte: täytyy loppua "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Virheellinen syöte: täytyy sisältää "${_issue.includes}"`;
				if (_issue.format === "regex") return `Virheellinen syöte: täytyy vastata säännöllistä lauseketta ${_issue.pattern}`;
				return `Virheellinen ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Virheellinen luku: täytyy olla luvun ${issue$1.divisor} monikerta`;
			case "unrecognized_keys": return `${issue$1.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return "Virheellinen avain tietueessa";
			case "invalid_union": return "Virheellinen unioni";
			case "invalid_element": return "Virheellinen arvo joukossa";
			default: return `Virheellinen syöte`;
		}
	};
};
function fi_default() {
	return { localeError: error$32() };
}

//#endregion
//#region node_modules/zod/v4/locales/fr.js
const error$31 = () => {
	const Sizable = {
		string: {
			unit: "caractères",
			verb: "avoir"
		},
		file: {
			unit: "octets",
			verb: "avoir"
		},
		array: {
			unit: "éléments",
			verb: "avoir"
		},
		set: {
			unit: "éléments",
			verb: "avoir"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "nombre";
			case "object":
				if (Array.isArray(data)) return "tableau";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "entrée",
		email: "adresse e-mail",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "date et heure ISO",
		date: "date ISO",
		time: "heure ISO",
		duration: "durée ISO",
		ipv4: "adresse IPv4",
		ipv6: "adresse IPv6",
		cidrv4: "plage IPv4",
		cidrv6: "plage IPv6",
		base64: "chaîne encodée en base64",
		base64url: "chaîne encodée en base64url",
		json_string: "chaîne JSON",
		e164: "numéro E.164",
		jwt: "JWT",
		template_literal: "entrée"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Entrée invalide : ${issue$1.expected} attendu, ${parsedType$7(issue$1.input)} reçu`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Entrée invalide : ${stringifyPrimitive(issue$1.values[0])} attendu`;
				return `Option invalide : une valeur parmi ${joinValues(issue$1.values, "|")} attendue`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Trop grand : ${issue$1.origin ?? "valeur"} doit ${sizing.verb} ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "élément(s)"}`;
				return `Trop grand : ${issue$1.origin ?? "valeur"} doit être ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Trop petit : ${issue$1.origin} doit ${sizing.verb} ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Trop petit : ${issue$1.origin} doit être ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Chaîne invalide : doit inclure "${_issue.includes}"`;
				if (_issue.format === "regex") return `Chaîne invalide : doit correspondre au modèle ${_issue.pattern}`;
				return `${Nouns[_issue.format] ?? issue$1.format} invalide`;
			}
			case "not_multiple_of": return `Nombre invalide : doit être un multiple de ${issue$1.divisor}`;
			case "unrecognized_keys": return `Clé${issue$1.keys.length > 1 ? "s" : ""} non reconnue${issue$1.keys.length > 1 ? "s" : ""} : ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Clé invalide dans ${issue$1.origin}`;
			case "invalid_union": return "Entrée invalide";
			case "invalid_element": return `Valeur invalide dans ${issue$1.origin}`;
			default: return `Entrée invalide`;
		}
	};
};
function fr_default() {
	return { localeError: error$31() };
}

//#endregion
//#region node_modules/zod/v4/locales/fr-CA.js
const error$30 = () => {
	const Sizable = {
		string: {
			unit: "caractères",
			verb: "avoir"
		},
		file: {
			unit: "octets",
			verb: "avoir"
		},
		array: {
			unit: "éléments",
			verb: "avoir"
		},
		set: {
			unit: "éléments",
			verb: "avoir"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "number";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "entrée",
		email: "adresse courriel",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "date-heure ISO",
		date: "date ISO",
		time: "heure ISO",
		duration: "durée ISO",
		ipv4: "adresse IPv4",
		ipv6: "adresse IPv6",
		cidrv4: "plage IPv4",
		cidrv6: "plage IPv6",
		base64: "chaîne encodée en base64",
		base64url: "chaîne encodée en base64url",
		json_string: "chaîne JSON",
		e164: "numéro E.164",
		jwt: "JWT",
		template_literal: "entrée"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Entrée invalide : attendu ${issue$1.expected}, reçu ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Entrée invalide : attendu ${stringifyPrimitive(issue$1.values[0])}`;
				return `Option invalide : attendu l'une des valeurs suivantes ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "≤" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Trop grand : attendu que ${issue$1.origin ?? "la valeur"} ait ${adj}${issue$1.maximum.toString()} ${sizing.unit}`;
				return `Trop grand : attendu que ${issue$1.origin ?? "la valeur"} soit ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? "≥" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Trop petit : attendu que ${issue$1.origin} ait ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Trop petit : attendu que ${issue$1.origin} soit ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Chaîne invalide : doit inclure "${_issue.includes}"`;
				if (_issue.format === "regex") return `Chaîne invalide : doit correspondre au motif ${_issue.pattern}`;
				return `${Nouns[_issue.format] ?? issue$1.format} invalide`;
			}
			case "not_multiple_of": return `Nombre invalide : doit être un multiple de ${issue$1.divisor}`;
			case "unrecognized_keys": return `Clé${issue$1.keys.length > 1 ? "s" : ""} non reconnue${issue$1.keys.length > 1 ? "s" : ""} : ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Clé invalide dans ${issue$1.origin}`;
			case "invalid_union": return "Entrée invalide";
			case "invalid_element": return `Valeur invalide dans ${issue$1.origin}`;
			default: return `Entrée invalide`;
		}
	};
};
function fr_CA_default() {
	return { localeError: error$30() };
}

//#endregion
//#region node_modules/zod/v4/locales/he.js
const error$29 = () => {
	const Sizable = {
		string: {
			unit: "אותיות",
			verb: "לכלול"
		},
		file: {
			unit: "בייטים",
			verb: "לכלול"
		},
		array: {
			unit: "פריטים",
			verb: "לכלול"
		},
		set: {
			unit: "פריטים",
			verb: "לכלול"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "number";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "קלט",
		email: "כתובת אימייל",
		url: "כתובת רשת",
		emoji: "אימוג'י",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "תאריך וזמן ISO",
		date: "תאריך ISO",
		time: "זמן ISO",
		duration: "משך זמן ISO",
		ipv4: "כתובת IPv4",
		ipv6: "כתובת IPv6",
		cidrv4: "טווח IPv4",
		cidrv6: "טווח IPv6",
		base64: "מחרוזת בבסיס 64",
		base64url: "מחרוזת בבסיס 64 לכתובות רשת",
		json_string: "מחרוזת JSON",
		e164: "מספר E.164",
		jwt: "JWT",
		template_literal: "קלט"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `קלט לא תקין: צריך ${issue$1.expected}, התקבל ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `קלט לא תקין: צריך ${stringifyPrimitive(issue$1.values[0])}`;
				return `קלט לא תקין: צריך אחת מהאפשרויות  ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `גדול מדי: ${issue$1.origin ?? "value"} צריך להיות ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elements"}`;
				return `גדול מדי: ${issue$1.origin ?? "value"} צריך להיות ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `קטן מדי: ${issue$1.origin} צריך להיות ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `קטן מדי: ${issue$1.origin} צריך להיות ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `מחרוזת לא תקינה: חייבת להתחיל ב"${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `מחרוזת לא תקינה: חייבת להסתיים ב "${_issue.suffix}"`;
				if (_issue.format === "includes") return `מחרוזת לא תקינה: חייבת לכלול "${_issue.includes}"`;
				if (_issue.format === "regex") return `מחרוזת לא תקינה: חייבת להתאים לתבנית ${_issue.pattern}`;
				return `${Nouns[_issue.format] ?? issue$1.format} לא תקין`;
			}
			case "not_multiple_of": return `מספר לא תקין: חייב להיות מכפלה של ${issue$1.divisor}`;
			case "unrecognized_keys": return `מפתח${issue$1.keys.length > 1 ? "ות" : ""} לא מזוה${issue$1.keys.length > 1 ? "ים" : "ה"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `מפתח לא תקין ב${issue$1.origin}`;
			case "invalid_union": return "קלט לא תקין";
			case "invalid_element": return `ערך לא תקין ב${issue$1.origin}`;
			default: return `קלט לא תקין`;
		}
	};
};
function he_default() {
	return { localeError: error$29() };
}

//#endregion
//#region node_modules/zod/v4/locales/hu.js
const error$28 = () => {
	const Sizable = {
		string: {
			unit: "karakter",
			verb: "legyen"
		},
		file: {
			unit: "byte",
			verb: "legyen"
		},
		array: {
			unit: "elem",
			verb: "legyen"
		},
		set: {
			unit: "elem",
			verb: "legyen"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "szám";
			case "object":
				if (Array.isArray(data)) return "tömb";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "bemenet",
		email: "email cím",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO időbélyeg",
		date: "ISO dátum",
		time: "ISO idő",
		duration: "ISO időintervallum",
		ipv4: "IPv4 cím",
		ipv6: "IPv6 cím",
		cidrv4: "IPv4 tartomány",
		cidrv6: "IPv6 tartomány",
		base64: "base64-kódolt string",
		base64url: "base64url-kódolt string",
		json_string: "JSON string",
		e164: "E.164 szám",
		jwt: "JWT",
		template_literal: "bemenet"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Érvénytelen bemenet: a várt érték ${issue$1.expected}, a kapott érték ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Érvénytelen bemenet: a várt érték ${stringifyPrimitive(issue$1.values[0])}`;
				return `Érvénytelen opció: valamelyik érték várt ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Túl nagy: ${issue$1.origin ?? "érték"} mérete túl nagy ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elem"}`;
				return `Túl nagy: a bemeneti érték ${issue$1.origin ?? "érték"} túl nagy: ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Túl kicsi: a bemeneti érték ${issue$1.origin} mérete túl kicsi ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Túl kicsi: a bemeneti érték ${issue$1.origin} túl kicsi ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Érvénytelen string: "${_issue.prefix}" értékkel kell kezdődnie`;
				if (_issue.format === "ends_with") return `Érvénytelen string: "${_issue.suffix}" értékkel kell végződnie`;
				if (_issue.format === "includes") return `Érvénytelen string: "${_issue.includes}" értéket kell tartalmaznia`;
				if (_issue.format === "regex") return `Érvénytelen string: ${_issue.pattern} mintának kell megfelelnie`;
				return `Érvénytelen ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Érvénytelen szám: ${issue$1.divisor} többszörösének kell lennie`;
			case "unrecognized_keys": return `Ismeretlen kulcs${issue$1.keys.length > 1 ? "s" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Érvénytelen kulcs ${issue$1.origin}`;
			case "invalid_union": return "Érvénytelen bemenet";
			case "invalid_element": return `Érvénytelen érték: ${issue$1.origin}`;
			default: return `Érvénytelen bemenet`;
		}
	};
};
function hu_default() {
	return { localeError: error$28() };
}

//#endregion
//#region node_modules/zod/v4/locales/id.js
const error$27 = () => {
	const Sizable = {
		string: {
			unit: "karakter",
			verb: "memiliki"
		},
		file: {
			unit: "byte",
			verb: "memiliki"
		},
		array: {
			unit: "item",
			verb: "memiliki"
		},
		set: {
			unit: "item",
			verb: "memiliki"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "number";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "input",
		email: "alamat email",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "tanggal dan waktu format ISO",
		date: "tanggal format ISO",
		time: "jam format ISO",
		duration: "durasi format ISO",
		ipv4: "alamat IPv4",
		ipv6: "alamat IPv6",
		cidrv4: "rentang alamat IPv4",
		cidrv6: "rentang alamat IPv6",
		base64: "string dengan enkode base64",
		base64url: "string dengan enkode base64url",
		json_string: "string JSON",
		e164: "angka E.164",
		jwt: "JWT",
		template_literal: "input"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Input tidak valid: diharapkan ${issue$1.expected}, diterima ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Input tidak valid: diharapkan ${stringifyPrimitive(issue$1.values[0])}`;
				return `Pilihan tidak valid: diharapkan salah satu dari ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Terlalu besar: diharapkan ${issue$1.origin ?? "value"} memiliki ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elemen"}`;
				return `Terlalu besar: diharapkan ${issue$1.origin ?? "value"} menjadi ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Terlalu kecil: diharapkan ${issue$1.origin} memiliki ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Terlalu kecil: diharapkan ${issue$1.origin} menjadi ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `String tidak valid: harus dimulai dengan "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `String tidak valid: harus berakhir dengan "${_issue.suffix}"`;
				if (_issue.format === "includes") return `String tidak valid: harus menyertakan "${_issue.includes}"`;
				if (_issue.format === "regex") return `String tidak valid: harus sesuai pola ${_issue.pattern}`;
				return `${Nouns[_issue.format] ?? issue$1.format} tidak valid`;
			}
			case "not_multiple_of": return `Angka tidak valid: harus kelipatan dari ${issue$1.divisor}`;
			case "unrecognized_keys": return `Kunci tidak dikenali ${issue$1.keys.length > 1 ? "s" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Kunci tidak valid di ${issue$1.origin}`;
			case "invalid_union": return "Input tidak valid";
			case "invalid_element": return `Nilai tidak valid di ${issue$1.origin}`;
			default: return `Input tidak valid`;
		}
	};
};
function id_default() {
	return { localeError: error$27() };
}

//#endregion
//#region node_modules/zod/v4/locales/is.js
const parsedType$3 = (data) => {
	const t = typeof data;
	switch (t) {
		case "number": return Number.isNaN(data) ? "NaN" : "númer";
		case "object":
			if (Array.isArray(data)) return "fylki";
			if (data === null) return "null";
			if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
	}
	return t;
};
const error$26 = () => {
	const Sizable = {
		string: {
			unit: "stafi",
			verb: "að hafa"
		},
		file: {
			unit: "bæti",
			verb: "að hafa"
		},
		array: {
			unit: "hluti",
			verb: "að hafa"
		},
		set: {
			unit: "hluti",
			verb: "að hafa"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const Nouns = {
		regex: "gildi",
		email: "netfang",
		url: "vefslóð",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO dagsetning og tími",
		date: "ISO dagsetning",
		time: "ISO tími",
		duration: "ISO tímalengd",
		ipv4: "IPv4 address",
		ipv6: "IPv6 address",
		cidrv4: "IPv4 range",
		cidrv6: "IPv6 range",
		base64: "base64-encoded strengur",
		base64url: "base64url-encoded strengur",
		json_string: "JSON strengur",
		e164: "E.164 tölugildi",
		jwt: "JWT",
		template_literal: "gildi"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Rangt gildi: Þú slóst inn ${parsedType$3(issue$1.input)} þar sem á að vera ${issue$1.expected}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Rangt gildi: gert ráð fyrir ${stringifyPrimitive(issue$1.values[0])}`;
				return `Ógilt val: má vera eitt af eftirfarandi ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Of stórt: gert er ráð fyrir að ${issue$1.origin ?? "gildi"} hafi ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "hluti"}`;
				return `Of stórt: gert er ráð fyrir að ${issue$1.origin ?? "gildi"} sé ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Of lítið: gert er ráð fyrir að ${issue$1.origin} hafi ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Of lítið: gert er ráð fyrir að ${issue$1.origin} sé ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Ógildur strengur: verður að byrja á "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Ógildur strengur: verður að enda á "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Ógildur strengur: verður að innihalda "${_issue.includes}"`;
				if (_issue.format === "regex") return `Ógildur strengur: verður að fylgja mynstri ${_issue.pattern}`;
				return `Rangt ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Röng tala: verður að vera margfeldi af ${issue$1.divisor}`;
			case "unrecognized_keys": return `Óþekkt ${issue$1.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Rangur lykill í ${issue$1.origin}`;
			case "invalid_union": return "Rangt gildi";
			case "invalid_element": return `Rangt gildi í ${issue$1.origin}`;
			default: return `Rangt gildi`;
		}
	};
};
function is_default() {
	return { localeError: error$26() };
}

//#endregion
//#region node_modules/zod/v4/locales/it.js
const error$25 = () => {
	const Sizable = {
		string: {
			unit: "caratteri",
			verb: "avere"
		},
		file: {
			unit: "byte",
			verb: "avere"
		},
		array: {
			unit: "elementi",
			verb: "avere"
		},
		set: {
			unit: "elementi",
			verb: "avere"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "numero";
			case "object":
				if (Array.isArray(data)) return "vettore";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "input",
		email: "indirizzo email",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "data e ora ISO",
		date: "data ISO",
		time: "ora ISO",
		duration: "durata ISO",
		ipv4: "indirizzo IPv4",
		ipv6: "indirizzo IPv6",
		cidrv4: "intervallo IPv4",
		cidrv6: "intervallo IPv6",
		base64: "stringa codificata in base64",
		base64url: "URL codificata in base64",
		json_string: "stringa JSON",
		e164: "numero E.164",
		jwt: "JWT",
		template_literal: "input"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Input non valido: atteso ${issue$1.expected}, ricevuto ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Input non valido: atteso ${stringifyPrimitive(issue$1.values[0])}`;
				return `Opzione non valida: atteso uno tra ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Troppo grande: ${issue$1.origin ?? "valore"} deve avere ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elementi"}`;
				return `Troppo grande: ${issue$1.origin ?? "valore"} deve essere ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Troppo piccolo: ${issue$1.origin} deve avere ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Troppo piccolo: ${issue$1.origin} deve essere ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Stringa non valida: deve iniziare con "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Stringa non valida: deve terminare con "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Stringa non valida: deve includere "${_issue.includes}"`;
				if (_issue.format === "regex") return `Stringa non valida: deve corrispondere al pattern ${_issue.pattern}`;
				return `Invalid ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Numero non valido: deve essere un multiplo di ${issue$1.divisor}`;
			case "unrecognized_keys": return `Chiav${issue$1.keys.length > 1 ? "i" : "e"} non riconosciut${issue$1.keys.length > 1 ? "e" : "a"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Chiave non valida in ${issue$1.origin}`;
			case "invalid_union": return "Input non valido";
			case "invalid_element": return `Valore non valido in ${issue$1.origin}`;
			default: return `Input non valido`;
		}
	};
};
function it_default() {
	return { localeError: error$25() };
}

//#endregion
//#region node_modules/zod/v4/locales/ja.js
const error$24 = () => {
	const Sizable = {
		string: {
			unit: "文字",
			verb: "である"
		},
		file: {
			unit: "バイト",
			verb: "である"
		},
		array: {
			unit: "要素",
			verb: "である"
		},
		set: {
			unit: "要素",
			verb: "である"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "数値";
			case "object":
				if (Array.isArray(data)) return "配列";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "入力値",
		email: "メールアドレス",
		url: "URL",
		emoji: "絵文字",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO日時",
		date: "ISO日付",
		time: "ISO時刻",
		duration: "ISO期間",
		ipv4: "IPv4アドレス",
		ipv6: "IPv6アドレス",
		cidrv4: "IPv4範囲",
		cidrv6: "IPv6範囲",
		base64: "base64エンコード文字列",
		base64url: "base64urlエンコード文字列",
		json_string: "JSON文字列",
		e164: "E.164番号",
		jwt: "JWT",
		template_literal: "入力値"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `無効な入力: ${issue$1.expected}が期待されましたが、${parsedType$7(issue$1.input)}が入力されました`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `無効な入力: ${stringifyPrimitive(issue$1.values[0])}が期待されました`;
				return `無効な選択: ${joinValues(issue$1.values, "、")}のいずれかである必要があります`;
			case "too_big": {
				const adj = issue$1.inclusive ? "以下である" : "より小さい";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `大きすぎる値: ${issue$1.origin ?? "値"}は${issue$1.maximum.toString()}${sizing.unit ?? "要素"}${adj}必要があります`;
				return `大きすぎる値: ${issue$1.origin ?? "値"}は${issue$1.maximum.toString()}${adj}必要があります`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? "以上である" : "より大きい";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `小さすぎる値: ${issue$1.origin}は${issue$1.minimum.toString()}${sizing.unit}${adj}必要があります`;
				return `小さすぎる値: ${issue$1.origin}は${issue$1.minimum.toString()}${adj}必要があります`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `無効な文字列: "${_issue.prefix}"で始まる必要があります`;
				if (_issue.format === "ends_with") return `無効な文字列: "${_issue.suffix}"で終わる必要があります`;
				if (_issue.format === "includes") return `無効な文字列: "${_issue.includes}"を含む必要があります`;
				if (_issue.format === "regex") return `無効な文字列: パターン${_issue.pattern}に一致する必要があります`;
				return `無効な${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `無効な数値: ${issue$1.divisor}の倍数である必要があります`;
			case "unrecognized_keys": return `認識されていないキー${issue$1.keys.length > 1 ? "群" : ""}: ${joinValues(issue$1.keys, "、")}`;
			case "invalid_key": return `${issue$1.origin}内の無効なキー`;
			case "invalid_union": return "無効な入力";
			case "invalid_element": return `${issue$1.origin}内の無効な値`;
			default: return `無効な入力`;
		}
	};
};
function ja_default() {
	return { localeError: error$24() };
}

//#endregion
//#region node_modules/zod/v4/locales/ka.js
const parsedType$2 = (data) => {
	const t = typeof data;
	switch (t) {
		case "number": return Number.isNaN(data) ? "NaN" : "რიცხვი";
		case "object":
			if (Array.isArray(data)) return "მასივი";
			if (data === null) return "null";
			if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
	}
	return {
		string: "სტრინგი",
		boolean: "ბულეანი",
		undefined: "undefined",
		bigint: "bigint",
		symbol: "symbol",
		function: "ფუნქცია"
	}[t] ?? t;
};
const error$23 = () => {
	const Sizable = {
		string: {
			unit: "სიმბოლო",
			verb: "უნდა შეიცავდეს"
		},
		file: {
			unit: "ბაიტი",
			verb: "უნდა შეიცავდეს"
		},
		array: {
			unit: "ელემენტი",
			verb: "უნდა შეიცავდეს"
		},
		set: {
			unit: "ელემენტი",
			verb: "უნდა შეიცავდეს"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const Nouns = {
		regex: "შეყვანა",
		email: "ელ-ფოსტის მისამართი",
		url: "URL",
		emoji: "ემოჯი",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "თარიღი-დრო",
		date: "თარიღი",
		time: "დრო",
		duration: "ხანგრძლივობა",
		ipv4: "IPv4 მისამართი",
		ipv6: "IPv6 მისამართი",
		cidrv4: "IPv4 დიაპაზონი",
		cidrv6: "IPv6 დიაპაზონი",
		base64: "base64-კოდირებული სტრინგი",
		base64url: "base64url-კოდირებული სტრინგი",
		json_string: "JSON სტრინგი",
		e164: "E.164 ნომერი",
		jwt: "JWT",
		template_literal: "შეყვანა"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `არასწორი შეყვანა: მოსალოდნელი ${issue$1.expected}, მიღებული ${parsedType$2(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `არასწორი შეყვანა: მოსალოდნელი ${stringifyPrimitive(issue$1.values[0])}`;
				return `არასწორი ვარიანტი: მოსალოდნელია ერთ-ერთი ${joinValues(issue$1.values, "|")}-დან`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `ზედმეტად დიდი: მოსალოდნელი ${issue$1.origin ?? "მნიშვნელობა"} ${sizing.verb} ${adj}${issue$1.maximum.toString()} ${sizing.unit}`;
				return `ზედმეტად დიდი: მოსალოდნელი ${issue$1.origin ?? "მნიშვნელობა"} იყოს ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `ზედმეტად პატარა: მოსალოდნელი ${issue$1.origin} ${sizing.verb} ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `ზედმეტად პატარა: მოსალოდნელი ${issue$1.origin} იყოს ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `არასწორი სტრინგი: უნდა იწყებოდეს "${_issue.prefix}"-ით`;
				if (_issue.format === "ends_with") return `არასწორი სტრინგი: უნდა მთავრდებოდეს "${_issue.suffix}"-ით`;
				if (_issue.format === "includes") return `არასწორი სტრინგი: უნდა შეიცავდეს "${_issue.includes}"-ს`;
				if (_issue.format === "regex") return `არასწორი სტრინგი: უნდა შეესაბამებოდეს შაბლონს ${_issue.pattern}`;
				return `არასწორი ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `არასწორი რიცხვი: უნდა იყოს ${issue$1.divisor}-ის ჯერადი`;
			case "unrecognized_keys": return `უცნობი გასაღებ${issue$1.keys.length > 1 ? "ები" : "ი"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `არასწორი გასაღები ${issue$1.origin}-ში`;
			case "invalid_union": return "არასწორი შეყვანა";
			case "invalid_element": return `არასწორი მნიშვნელობა ${issue$1.origin}-ში`;
			default: return `არასწორი შეყვანა`;
		}
	};
};
function ka_default() {
	return { localeError: error$23() };
}

//#endregion
//#region node_modules/zod/v4/locales/km.js
const error$22 = () => {
	const Sizable = {
		string: {
			unit: "តួអក្សរ",
			verb: "គួរមាន"
		},
		file: {
			unit: "បៃ",
			verb: "គួរមាន"
		},
		array: {
			unit: "ធាតុ",
			verb: "គួរមាន"
		},
		set: {
			unit: "ធាតុ",
			verb: "គួរមាន"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "មិនមែនជាលេខ (NaN)" : "លេខ";
			case "object":
				if (Array.isArray(data)) return "អារេ (Array)";
				if (data === null) return "គ្មានតម្លៃ (null)";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "ទិន្នន័យបញ្ចូល",
		email: "អាសយដ្ឋានអ៊ីមែល",
		url: "URL",
		emoji: "សញ្ញាអារម្មណ៍",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "កាលបរិច្ឆេទ និងម៉ោង ISO",
		date: "កាលបរិច្ឆេទ ISO",
		time: "ម៉ោង ISO",
		duration: "រយៈពេល ISO",
		ipv4: "អាសយដ្ឋាន IPv4",
		ipv6: "អាសយដ្ឋាន IPv6",
		cidrv4: "ដែនអាសយដ្ឋាន IPv4",
		cidrv6: "ដែនអាសយដ្ឋាន IPv6",
		base64: "ខ្សែអក្សរអ៊ិកូដ base64",
		base64url: "ខ្សែអក្សរអ៊ិកូដ base64url",
		json_string: "ខ្សែអក្សរ JSON",
		e164: "លេខ E.164",
		jwt: "JWT",
		template_literal: "ទិន្នន័យបញ្ចូល"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${issue$1.expected} ប៉ុន្តែទទួលបាន ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${stringifyPrimitive(issue$1.values[0])}`;
				return `ជម្រើសមិនត្រឹមត្រូវ៖ ត្រូវជាមួយក្នុងចំណោម ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `ធំពេក៖ ត្រូវការ ${issue$1.origin ?? "តម្លៃ"} ${adj} ${issue$1.maximum.toString()} ${sizing.unit ?? "ធាតុ"}`;
				return `ធំពេក៖ ត្រូវការ ${issue$1.origin ?? "តម្លៃ"} ${adj} ${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `តូចពេក៖ ត្រូវការ ${issue$1.origin} ${adj} ${issue$1.minimum.toString()} ${sizing.unit}`;
				return `តូចពេក៖ ត្រូវការ ${issue$1.origin} ${adj} ${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវចាប់ផ្តើមដោយ "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវបញ្ចប់ដោយ "${_issue.suffix}"`;
				if (_issue.format === "includes") return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវមាន "${_issue.includes}"`;
				if (_issue.format === "regex") return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវតែផ្គូផ្គងនឹងទម្រង់ដែលបានកំណត់ ${_issue.pattern}`;
				return `មិនត្រឹមត្រូវ៖ ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `លេខមិនត្រឹមត្រូវ៖ ត្រូវតែជាពហុគុណនៃ ${issue$1.divisor}`;
			case "unrecognized_keys": return `រកឃើញសោមិនស្គាល់៖ ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `សោមិនត្រឹមត្រូវនៅក្នុង ${issue$1.origin}`;
			case "invalid_union": return `ទិន្នន័យមិនត្រឹមត្រូវ`;
			case "invalid_element": return `ទិន្នន័យមិនត្រឹមត្រូវនៅក្នុង ${issue$1.origin}`;
			default: return `ទិន្នន័យមិនត្រឹមត្រូវ`;
		}
	};
};
function km_default() {
	return { localeError: error$22() };
}

//#endregion
//#region node_modules/zod/v4/locales/kh.js
/** @deprecated Use `km` instead. */
function kh_default() {
	return km_default();
}

//#endregion
//#region node_modules/zod/v4/locales/ko.js
const error$21 = () => {
	const Sizable = {
		string: {
			unit: "문자",
			verb: "to have"
		},
		file: {
			unit: "바이트",
			verb: "to have"
		},
		array: {
			unit: "개",
			verb: "to have"
		},
		set: {
			unit: "개",
			verb: "to have"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "number";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "입력",
		email: "이메일 주소",
		url: "URL",
		emoji: "이모지",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO 날짜시간",
		date: "ISO 날짜",
		time: "ISO 시간",
		duration: "ISO 기간",
		ipv4: "IPv4 주소",
		ipv6: "IPv6 주소",
		cidrv4: "IPv4 범위",
		cidrv6: "IPv6 범위",
		base64: "base64 인코딩 문자열",
		base64url: "base64url 인코딩 문자열",
		json_string: "JSON 문자열",
		e164: "E.164 번호",
		jwt: "JWT",
		template_literal: "입력"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `잘못된 입력: 예상 타입은 ${issue$1.expected}, 받은 타입은 ${parsedType$7(issue$1.input)}입니다`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `잘못된 입력: 값은 ${stringifyPrimitive(issue$1.values[0])} 이어야 합니다`;
				return `잘못된 옵션: ${joinValues(issue$1.values, "또는 ")} 중 하나여야 합니다`;
			case "too_big": {
				const adj = issue$1.inclusive ? "이하" : "미만";
				const suffix = adj === "미만" ? "이어야 합니다" : "여야 합니다";
				const sizing = getSizing(issue$1.origin);
				const unit = sizing?.unit ?? "요소";
				if (sizing) return `${issue$1.origin ?? "값"}이 너무 큽니다: ${issue$1.maximum.toString()}${unit} ${adj}${suffix}`;
				return `${issue$1.origin ?? "값"}이 너무 큽니다: ${issue$1.maximum.toString()} ${adj}${suffix}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? "이상" : "초과";
				const suffix = adj === "이상" ? "이어야 합니다" : "여야 합니다";
				const sizing = getSizing(issue$1.origin);
				const unit = sizing?.unit ?? "요소";
				if (sizing) return `${issue$1.origin ?? "값"}이 너무 작습니다: ${issue$1.minimum.toString()}${unit} ${adj}${suffix}`;
				return `${issue$1.origin ?? "값"}이 너무 작습니다: ${issue$1.minimum.toString()} ${adj}${suffix}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `잘못된 문자열: "${_issue.prefix}"(으)로 시작해야 합니다`;
				if (_issue.format === "ends_with") return `잘못된 문자열: "${_issue.suffix}"(으)로 끝나야 합니다`;
				if (_issue.format === "includes") return `잘못된 문자열: "${_issue.includes}"을(를) 포함해야 합니다`;
				if (_issue.format === "regex") return `잘못된 문자열: 정규식 ${_issue.pattern} 패턴과 일치해야 합니다`;
				return `잘못된 ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `잘못된 숫자: ${issue$1.divisor}의 배수여야 합니다`;
			case "unrecognized_keys": return `인식할 수 없는 키: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `잘못된 키: ${issue$1.origin}`;
			case "invalid_union": return `잘못된 입력`;
			case "invalid_element": return `잘못된 값: ${issue$1.origin}`;
			default: return `잘못된 입력`;
		}
	};
};
function ko_default() {
	return { localeError: error$21() };
}

//#endregion
//#region node_modules/zod/v4/locales/lt.js
const parsedType$1 = (data) => {
	return parsedTypeFromType(typeof data, data);
};
const parsedTypeFromType = (t, data = void 0) => {
	switch (t) {
		case "number": return Number.isNaN(data) ? "NaN" : "skaičius";
		case "bigint": return "sveikasis skaičius";
		case "string": return "eilutė";
		case "boolean": return "loginė reikšmė";
		case "undefined":
		case "void": return "neapibrėžta reikšmė";
		case "function": return "funkcija";
		case "symbol": return "simbolis";
		case "object":
			if (data === void 0) return "nežinomas objektas";
			if (data === null) return "nulinė reikšmė";
			if (Array.isArray(data)) return "masyvas";
			if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
			return "objektas";
		case "null": return "nulinė reikšmė";
	}
	return t;
};
const capitalizeFirstCharacter = (text) => {
	return text.charAt(0).toUpperCase() + text.slice(1);
};
function getUnitTypeFromNumber(number$3) {
	const abs = Math.abs(number$3);
	const last = abs % 10;
	const last2 = abs % 100;
	if (last2 >= 11 && last2 <= 19 || last === 0) return "many";
	if (last === 1) return "one";
	return "few";
}
const error$20 = () => {
	const Sizable = {
		string: {
			unit: {
				one: "simbolis",
				few: "simboliai",
				many: "simbolių"
			},
			verb: {
				smaller: {
					inclusive: "turi būti ne ilgesnė kaip",
					notInclusive: "turi būti trumpesnė kaip"
				},
				bigger: {
					inclusive: "turi būti ne trumpesnė kaip",
					notInclusive: "turi būti ilgesnė kaip"
				}
			}
		},
		file: {
			unit: {
				one: "baitas",
				few: "baitai",
				many: "baitų"
			},
			verb: {
				smaller: {
					inclusive: "turi būti ne didesnis kaip",
					notInclusive: "turi būti mažesnis kaip"
				},
				bigger: {
					inclusive: "turi būti ne mažesnis kaip",
					notInclusive: "turi būti didesnis kaip"
				}
			}
		},
		array: {
			unit: {
				one: "elementą",
				few: "elementus",
				many: "elementų"
			},
			verb: {
				smaller: {
					inclusive: "turi turėti ne daugiau kaip",
					notInclusive: "turi turėti mažiau kaip"
				},
				bigger: {
					inclusive: "turi turėti ne mažiau kaip",
					notInclusive: "turi turėti daugiau kaip"
				}
			}
		},
		set: {
			unit: {
				one: "elementą",
				few: "elementus",
				many: "elementų"
			},
			verb: {
				smaller: {
					inclusive: "turi turėti ne daugiau kaip",
					notInclusive: "turi turėti mažiau kaip"
				},
				bigger: {
					inclusive: "turi turėti ne mažiau kaip",
					notInclusive: "turi turėti daugiau kaip"
				}
			}
		}
	};
	function getSizing(origin, unitType, inclusive, targetShouldBe) {
		const result = Sizable[origin] ?? null;
		if (result === null) return result;
		return {
			unit: result.unit[unitType],
			verb: result.verb[targetShouldBe][inclusive ? "inclusive" : "notInclusive"]
		};
	}
	const Nouns = {
		regex: "įvestis",
		email: "el. pašto adresas",
		url: "URL",
		emoji: "jaustukas",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO data ir laikas",
		date: "ISO data",
		time: "ISO laikas",
		duration: "ISO trukmė",
		ipv4: "IPv4 adresas",
		ipv6: "IPv6 adresas",
		cidrv4: "IPv4 tinklo prefiksas (CIDR)",
		cidrv6: "IPv6 tinklo prefiksas (CIDR)",
		base64: "base64 užkoduota eilutė",
		base64url: "base64url užkoduota eilutė",
		json_string: "JSON eilutė",
		e164: "E.164 numeris",
		jwt: "JWT",
		template_literal: "įvestis"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Gautas tipas ${parsedType$1(issue$1.input)}, o tikėtasi - ${parsedTypeFromType(issue$1.expected)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Privalo būti ${stringifyPrimitive(issue$1.values[0])}`;
				return `Privalo būti vienas iš ${joinValues(issue$1.values, "|")} pasirinkimų`;
			case "too_big": {
				const origin = parsedTypeFromType(issue$1.origin);
				const sizing = getSizing(issue$1.origin, getUnitTypeFromNumber(Number(issue$1.maximum)), issue$1.inclusive ?? false, "smaller");
				if (sizing?.verb) return `${capitalizeFirstCharacter(origin ?? issue$1.origin ?? "reikšmė")} ${sizing.verb} ${issue$1.maximum.toString()} ${sizing.unit ?? "elementų"}`;
				const adj = issue$1.inclusive ? "ne didesnis kaip" : "mažesnis kaip";
				return `${capitalizeFirstCharacter(origin ?? issue$1.origin ?? "reikšmė")} turi būti ${adj} ${issue$1.maximum.toString()} ${sizing?.unit}`;
			}
			case "too_small": {
				const origin = parsedTypeFromType(issue$1.origin);
				const sizing = getSizing(issue$1.origin, getUnitTypeFromNumber(Number(issue$1.minimum)), issue$1.inclusive ?? false, "bigger");
				if (sizing?.verb) return `${capitalizeFirstCharacter(origin ?? issue$1.origin ?? "reikšmė")} ${sizing.verb} ${issue$1.minimum.toString()} ${sizing.unit ?? "elementų"}`;
				const adj = issue$1.inclusive ? "ne mažesnis kaip" : "didesnis kaip";
				return `${capitalizeFirstCharacter(origin ?? issue$1.origin ?? "reikšmė")} turi būti ${adj} ${issue$1.minimum.toString()} ${sizing?.unit}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Eilutė privalo prasidėti "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Eilutė privalo pasibaigti "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Eilutė privalo įtraukti "${_issue.includes}"`;
				if (_issue.format === "regex") return `Eilutė privalo atitikti ${_issue.pattern}`;
				return `Neteisingas ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Skaičius privalo būti ${issue$1.divisor} kartotinis.`;
			case "unrecognized_keys": return `Neatpažint${issue$1.keys.length > 1 ? "i" : "as"} rakt${issue$1.keys.length > 1 ? "ai" : "as"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return "Rastas klaidingas raktas";
			case "invalid_union": return "Klaidinga įvestis";
			case "invalid_element": return `${capitalizeFirstCharacter(parsedTypeFromType(issue$1.origin) ?? issue$1.origin ?? "reikšmė")} turi klaidingą įvestį`;
			default: return "Klaidinga įvestis";
		}
	};
};
function lt_default() {
	return { localeError: error$20() };
}

//#endregion
//#region node_modules/zod/v4/locales/mk.js
const error$19 = () => {
	const Sizable = {
		string: {
			unit: "знаци",
			verb: "да имаат"
		},
		file: {
			unit: "бајти",
			verb: "да имаат"
		},
		array: {
			unit: "ставки",
			verb: "да имаат"
		},
		set: {
			unit: "ставки",
			verb: "да имаат"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "број";
			case "object":
				if (Array.isArray(data)) return "низа";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "внес",
		email: "адреса на е-пошта",
		url: "URL",
		emoji: "емоџи",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO датум и време",
		date: "ISO датум",
		time: "ISO време",
		duration: "ISO времетраење",
		ipv4: "IPv4 адреса",
		ipv6: "IPv6 адреса",
		cidrv4: "IPv4 опсег",
		cidrv6: "IPv6 опсег",
		base64: "base64-енкодирана низа",
		base64url: "base64url-енкодирана низа",
		json_string: "JSON низа",
		e164: "E.164 број",
		jwt: "JWT",
		template_literal: "внес"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Грешен внес: се очекува ${issue$1.expected}, примено ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Invalid input: expected ${stringifyPrimitive(issue$1.values[0])}`;
				return `Грешана опција: се очекува една ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Премногу голем: се очекува ${issue$1.origin ?? "вредноста"} да има ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "елементи"}`;
				return `Премногу голем: се очекува ${issue$1.origin ?? "вредноста"} да биде ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Премногу мал: се очекува ${issue$1.origin} да има ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Премногу мал: се очекува ${issue$1.origin} да биде ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Неважечка низа: мора да започнува со "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Неважечка низа: мора да завршува со "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Неважечка низа: мора да вклучува "${_issue.includes}"`;
				if (_issue.format === "regex") return `Неважечка низа: мора да одгоара на патернот ${_issue.pattern}`;
				return `Invalid ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Грешен број: мора да биде делив со ${issue$1.divisor}`;
			case "unrecognized_keys": return `${issue$1.keys.length > 1 ? "Непрепознаени клучеви" : "Непрепознаен клуч"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Грешен клуч во ${issue$1.origin}`;
			case "invalid_union": return "Грешен внес";
			case "invalid_element": return `Грешна вредност во ${issue$1.origin}`;
			default: return `Грешен внес`;
		}
	};
};
function mk_default() {
	return { localeError: error$19() };
}

//#endregion
//#region node_modules/zod/v4/locales/ms.js
const error$18 = () => {
	const Sizable = {
		string: {
			unit: "aksara",
			verb: "mempunyai"
		},
		file: {
			unit: "bait",
			verb: "mempunyai"
		},
		array: {
			unit: "elemen",
			verb: "mempunyai"
		},
		set: {
			unit: "elemen",
			verb: "mempunyai"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "nombor";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "input",
		email: "alamat e-mel",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "tarikh masa ISO",
		date: "tarikh ISO",
		time: "masa ISO",
		duration: "tempoh ISO",
		ipv4: "alamat IPv4",
		ipv6: "alamat IPv6",
		cidrv4: "julat IPv4",
		cidrv6: "julat IPv6",
		base64: "string dikodkan base64",
		base64url: "string dikodkan base64url",
		json_string: "string JSON",
		e164: "nombor E.164",
		jwt: "JWT",
		template_literal: "input"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Input tidak sah: dijangka ${issue$1.expected}, diterima ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Input tidak sah: dijangka ${stringifyPrimitive(issue$1.values[0])}`;
				return `Pilihan tidak sah: dijangka salah satu daripada ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Terlalu besar: dijangka ${issue$1.origin ?? "nilai"} ${sizing.verb} ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elemen"}`;
				return `Terlalu besar: dijangka ${issue$1.origin ?? "nilai"} adalah ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Terlalu kecil: dijangka ${issue$1.origin} ${sizing.verb} ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Terlalu kecil: dijangka ${issue$1.origin} adalah ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `String tidak sah: mesti bermula dengan "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `String tidak sah: mesti berakhir dengan "${_issue.suffix}"`;
				if (_issue.format === "includes") return `String tidak sah: mesti mengandungi "${_issue.includes}"`;
				if (_issue.format === "regex") return `String tidak sah: mesti sepadan dengan corak ${_issue.pattern}`;
				return `${Nouns[_issue.format] ?? issue$1.format} tidak sah`;
			}
			case "not_multiple_of": return `Nombor tidak sah: perlu gandaan ${issue$1.divisor}`;
			case "unrecognized_keys": return `Kunci tidak dikenali: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Kunci tidak sah dalam ${issue$1.origin}`;
			case "invalid_union": return "Input tidak sah";
			case "invalid_element": return `Nilai tidak sah dalam ${issue$1.origin}`;
			default: return `Input tidak sah`;
		}
	};
};
function ms_default() {
	return { localeError: error$18() };
}

//#endregion
//#region node_modules/zod/v4/locales/nl.js
const error$17 = () => {
	const Sizable = {
		string: { unit: "tekens" },
		file: { unit: "bytes" },
		array: { unit: "elementen" },
		set: { unit: "elementen" }
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "getal";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "invoer",
		email: "emailadres",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO datum en tijd",
		date: "ISO datum",
		time: "ISO tijd",
		duration: "ISO duur",
		ipv4: "IPv4-adres",
		ipv6: "IPv6-adres",
		cidrv4: "IPv4-bereik",
		cidrv6: "IPv6-bereik",
		base64: "base64-gecodeerde tekst",
		base64url: "base64 URL-gecodeerde tekst",
		json_string: "JSON string",
		e164: "E.164-nummer",
		jwt: "JWT",
		template_literal: "invoer"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Ongeldige invoer: verwacht ${issue$1.expected}, ontving ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Ongeldige invoer: verwacht ${stringifyPrimitive(issue$1.values[0])}`;
				return `Ongeldige optie: verwacht één van ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Te lang: verwacht dat ${issue$1.origin ?? "waarde"} ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elementen"} bevat`;
				return `Te lang: verwacht dat ${issue$1.origin ?? "waarde"} ${adj}${issue$1.maximum.toString()} is`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Te kort: verwacht dat ${issue$1.origin} ${adj}${issue$1.minimum.toString()} ${sizing.unit} bevat`;
				return `Te kort: verwacht dat ${issue$1.origin} ${adj}${issue$1.minimum.toString()} is`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Ongeldige tekst: moet met "${_issue.prefix}" beginnen`;
				if (_issue.format === "ends_with") return `Ongeldige tekst: moet op "${_issue.suffix}" eindigen`;
				if (_issue.format === "includes") return `Ongeldige tekst: moet "${_issue.includes}" bevatten`;
				if (_issue.format === "regex") return `Ongeldige tekst: moet overeenkomen met patroon ${_issue.pattern}`;
				return `Ongeldig: ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Ongeldig getal: moet een veelvoud van ${issue$1.divisor} zijn`;
			case "unrecognized_keys": return `Onbekende key${issue$1.keys.length > 1 ? "s" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Ongeldige key in ${issue$1.origin}`;
			case "invalid_union": return "Ongeldige invoer";
			case "invalid_element": return `Ongeldige waarde in ${issue$1.origin}`;
			default: return `Ongeldige invoer`;
		}
	};
};
function nl_default() {
	return { localeError: error$17() };
}

//#endregion
//#region node_modules/zod/v4/locales/no.js
const error$16 = () => {
	const Sizable = {
		string: {
			unit: "tegn",
			verb: "å ha"
		},
		file: {
			unit: "bytes",
			verb: "å ha"
		},
		array: {
			unit: "elementer",
			verb: "å inneholde"
		},
		set: {
			unit: "elementer",
			verb: "å inneholde"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "tall";
			case "object":
				if (Array.isArray(data)) return "liste";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "input",
		email: "e-postadresse",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO dato- og klokkeslett",
		date: "ISO-dato",
		time: "ISO-klokkeslett",
		duration: "ISO-varighet",
		ipv4: "IPv4-område",
		ipv6: "IPv6-område",
		cidrv4: "IPv4-spekter",
		cidrv6: "IPv6-spekter",
		base64: "base64-enkodet streng",
		base64url: "base64url-enkodet streng",
		json_string: "JSON-streng",
		e164: "E.164-nummer",
		jwt: "JWT",
		template_literal: "input"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Ugyldig input: forventet ${issue$1.expected}, fikk ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Ugyldig verdi: forventet ${stringifyPrimitive(issue$1.values[0])}`;
				return `Ugyldig valg: forventet en av ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `For stor(t): forventet ${issue$1.origin ?? "value"} til å ha ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elementer"}`;
				return `For stor(t): forventet ${issue$1.origin ?? "value"} til å ha ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `For lite(n): forventet ${issue$1.origin} til å ha ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `For lite(n): forventet ${issue$1.origin} til å ha ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Ugyldig streng: må starte med "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Ugyldig streng: må ende med "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Ugyldig streng: må inneholde "${_issue.includes}"`;
				if (_issue.format === "regex") return `Ugyldig streng: må matche mønsteret ${_issue.pattern}`;
				return `Ugyldig ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Ugyldig tall: må være et multiplum av ${issue$1.divisor}`;
			case "unrecognized_keys": return `${issue$1.keys.length > 1 ? "Ukjente nøkler" : "Ukjent nøkkel"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Ugyldig nøkkel i ${issue$1.origin}`;
			case "invalid_union": return "Ugyldig input";
			case "invalid_element": return `Ugyldig verdi i ${issue$1.origin}`;
			default: return `Ugyldig input`;
		}
	};
};
function no_default() {
	return { localeError: error$16() };
}

//#endregion
//#region node_modules/zod/v4/locales/ota.js
const error$15 = () => {
	const Sizable = {
		string: {
			unit: "harf",
			verb: "olmalıdır"
		},
		file: {
			unit: "bayt",
			verb: "olmalıdır"
		},
		array: {
			unit: "unsur",
			verb: "olmalıdır"
		},
		set: {
			unit: "unsur",
			verb: "olmalıdır"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "numara";
			case "object":
				if (Array.isArray(data)) return "saf";
				if (data === null) return "gayb";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "giren",
		email: "epostagâh",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO hengâmı",
		date: "ISO tarihi",
		time: "ISO zamanı",
		duration: "ISO müddeti",
		ipv4: "IPv4 nişânı",
		ipv6: "IPv6 nişânı",
		cidrv4: "IPv4 menzili",
		cidrv6: "IPv6 menzili",
		base64: "base64-şifreli metin",
		base64url: "base64url-şifreli metin",
		json_string: "JSON metin",
		e164: "E.164 sayısı",
		jwt: "JWT",
		template_literal: "giren"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Fâsit giren: umulan ${issue$1.expected}, alınan ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Fâsit giren: umulan ${stringifyPrimitive(issue$1.values[0])}`;
				return `Fâsit tercih: mûteberler ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Fazla büyük: ${issue$1.origin ?? "value"}, ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elements"} sahip olmalıydı.`;
				return `Fazla büyük: ${issue$1.origin ?? "value"}, ${adj}${issue$1.maximum.toString()} olmalıydı.`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Fazla küçük: ${issue$1.origin}, ${adj}${issue$1.minimum.toString()} ${sizing.unit} sahip olmalıydı.`;
				return `Fazla küçük: ${issue$1.origin}, ${adj}${issue$1.minimum.toString()} olmalıydı.`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Fâsit metin: "${_issue.prefix}" ile başlamalı.`;
				if (_issue.format === "ends_with") return `Fâsit metin: "${_issue.suffix}" ile bitmeli.`;
				if (_issue.format === "includes") return `Fâsit metin: "${_issue.includes}" ihtivâ etmeli.`;
				if (_issue.format === "regex") return `Fâsit metin: ${_issue.pattern} nakşına uymalı.`;
				return `Fâsit ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Fâsit sayı: ${issue$1.divisor} katı olmalıydı.`;
			case "unrecognized_keys": return `Tanınmayan anahtar ${issue$1.keys.length > 1 ? "s" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `${issue$1.origin} için tanınmayan anahtar var.`;
			case "invalid_union": return "Giren tanınamadı.";
			case "invalid_element": return `${issue$1.origin} için tanınmayan kıymet var.`;
			default: return `Kıymet tanınamadı.`;
		}
	};
};
function ota_default() {
	return { localeError: error$15() };
}

//#endregion
//#region node_modules/zod/v4/locales/ps.js
const error$14 = () => {
	const Sizable = {
		string: {
			unit: "توکي",
			verb: "ولري"
		},
		file: {
			unit: "بایټس",
			verb: "ولري"
		},
		array: {
			unit: "توکي",
			verb: "ولري"
		},
		set: {
			unit: "توکي",
			verb: "ولري"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "عدد";
			case "object":
				if (Array.isArray(data)) return "ارې";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "ورودي",
		email: "بریښنالیک",
		url: "یو آر ال",
		emoji: "ایموجي",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "نیټه او وخت",
		date: "نېټه",
		time: "وخت",
		duration: "موده",
		ipv4: "د IPv4 پته",
		ipv6: "د IPv6 پته",
		cidrv4: "د IPv4 ساحه",
		cidrv6: "د IPv6 ساحه",
		base64: "base64-encoded متن",
		base64url: "base64url-encoded متن",
		json_string: "JSON متن",
		e164: "د E.164 شمېره",
		jwt: "JWT",
		template_literal: "ورودي"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `ناسم ورودي: باید ${issue$1.expected} وای, مګر ${parsedType$7(issue$1.input)} ترلاسه شو`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `ناسم ورودي: باید ${stringifyPrimitive(issue$1.values[0])} وای`;
				return `ناسم انتخاب: باید یو له ${joinValues(issue$1.values, "|")} څخه وای`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `ډیر لوی: ${issue$1.origin ?? "ارزښت"} باید ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "عنصرونه"} ولري`;
				return `ډیر لوی: ${issue$1.origin ?? "ارزښت"} باید ${adj}${issue$1.maximum.toString()} وي`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `ډیر کوچنی: ${issue$1.origin} باید ${adj}${issue$1.minimum.toString()} ${sizing.unit} ولري`;
				return `ډیر کوچنی: ${issue$1.origin} باید ${adj}${issue$1.minimum.toString()} وي`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `ناسم متن: باید د "${_issue.prefix}" سره پیل شي`;
				if (_issue.format === "ends_with") return `ناسم متن: باید د "${_issue.suffix}" سره پای ته ورسيږي`;
				if (_issue.format === "includes") return `ناسم متن: باید "${_issue.includes}" ولري`;
				if (_issue.format === "regex") return `ناسم متن: باید د ${_issue.pattern} سره مطابقت ولري`;
				return `${Nouns[_issue.format] ?? issue$1.format} ناسم دی`;
			}
			case "not_multiple_of": return `ناسم عدد: باید د ${issue$1.divisor} مضرب وي`;
			case "unrecognized_keys": return `ناسم ${issue$1.keys.length > 1 ? "کلیډونه" : "کلیډ"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `ناسم کلیډ په ${issue$1.origin} کې`;
			case "invalid_union": return `ناسمه ورودي`;
			case "invalid_element": return `ناسم عنصر په ${issue$1.origin} کې`;
			default: return `ناسمه ورودي`;
		}
	};
};
function ps_default() {
	return { localeError: error$14() };
}

//#endregion
//#region node_modules/zod/v4/locales/pl.js
const error$13 = () => {
	const Sizable = {
		string: {
			unit: "znaków",
			verb: "mieć"
		},
		file: {
			unit: "bajtów",
			verb: "mieć"
		},
		array: {
			unit: "elementów",
			verb: "mieć"
		},
		set: {
			unit: "elementów",
			verb: "mieć"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "liczba";
			case "object":
				if (Array.isArray(data)) return "tablica";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "wyrażenie",
		email: "adres email",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "data i godzina w formacie ISO",
		date: "data w formacie ISO",
		time: "godzina w formacie ISO",
		duration: "czas trwania ISO",
		ipv4: "adres IPv4",
		ipv6: "adres IPv6",
		cidrv4: "zakres IPv4",
		cidrv6: "zakres IPv6",
		base64: "ciąg znaków zakodowany w formacie base64",
		base64url: "ciąg znaków zakodowany w formacie base64url",
		json_string: "ciąg znaków w formacie JSON",
		e164: "liczba E.164",
		jwt: "JWT",
		template_literal: "wejście"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Nieprawidłowe dane wejściowe: oczekiwano ${issue$1.expected}, otrzymano ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Nieprawidłowe dane wejściowe: oczekiwano ${stringifyPrimitive(issue$1.values[0])}`;
				return `Nieprawidłowa opcja: oczekiwano jednej z wartości ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Za duża wartość: oczekiwano, że ${issue$1.origin ?? "wartość"} będzie mieć ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elementów"}`;
				return `Zbyt duż(y/a/e): oczekiwano, że ${issue$1.origin ?? "wartość"} będzie wynosić ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Za mała wartość: oczekiwano, że ${issue$1.origin ?? "wartość"} będzie mieć ${adj}${issue$1.minimum.toString()} ${sizing.unit ?? "elementów"}`;
				return `Zbyt mał(y/a/e): oczekiwano, że ${issue$1.origin ?? "wartość"} będzie wynosić ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Nieprawidłowy ciąg znaków: musi zaczynać się od "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Nieprawidłowy ciąg znaków: musi kończyć się na "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Nieprawidłowy ciąg znaków: musi zawierać "${_issue.includes}"`;
				if (_issue.format === "regex") return `Nieprawidłowy ciąg znaków: musi odpowiadać wzorcowi ${_issue.pattern}`;
				return `Nieprawidłow(y/a/e) ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Nieprawidłowa liczba: musi być wielokrotnością ${issue$1.divisor}`;
			case "unrecognized_keys": return `Nierozpoznane klucze${issue$1.keys.length > 1 ? "s" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Nieprawidłowy klucz w ${issue$1.origin}`;
			case "invalid_union": return "Nieprawidłowe dane wejściowe";
			case "invalid_element": return `Nieprawidłowa wartość w ${issue$1.origin}`;
			default: return `Nieprawidłowe dane wejściowe`;
		}
	};
};
function pl_default() {
	return { localeError: error$13() };
}

//#endregion
//#region node_modules/zod/v4/locales/pt.js
const error$12 = () => {
	const Sizable = {
		string: {
			unit: "caracteres",
			verb: "ter"
		},
		file: {
			unit: "bytes",
			verb: "ter"
		},
		array: {
			unit: "itens",
			verb: "ter"
		},
		set: {
			unit: "itens",
			verb: "ter"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "número";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "nulo";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "padrão",
		email: "endereço de e-mail",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "data e hora ISO",
		date: "data ISO",
		time: "hora ISO",
		duration: "duração ISO",
		ipv4: "endereço IPv4",
		ipv6: "endereço IPv6",
		cidrv4: "faixa de IPv4",
		cidrv6: "faixa de IPv6",
		base64: "texto codificado em base64",
		base64url: "URL codificada em base64",
		json_string: "texto JSON",
		e164: "número E.164",
		jwt: "JWT",
		template_literal: "entrada"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Tipo inválido: esperado ${issue$1.expected}, recebido ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Entrada inválida: esperado ${stringifyPrimitive(issue$1.values[0])}`;
				return `Opção inválida: esperada uma das ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Muito grande: esperado que ${issue$1.origin ?? "valor"} tivesse ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elementos"}`;
				return `Muito grande: esperado que ${issue$1.origin ?? "valor"} fosse ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Muito pequeno: esperado que ${issue$1.origin} tivesse ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Muito pequeno: esperado que ${issue$1.origin} fosse ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Texto inválido: deve começar com "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Texto inválido: deve terminar com "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Texto inválido: deve incluir "${_issue.includes}"`;
				if (_issue.format === "regex") return `Texto inválido: deve corresponder ao padrão ${_issue.pattern}`;
				return `${Nouns[_issue.format] ?? issue$1.format} inválido`;
			}
			case "not_multiple_of": return `Número inválido: deve ser múltiplo de ${issue$1.divisor}`;
			case "unrecognized_keys": return `Chave${issue$1.keys.length > 1 ? "s" : ""} desconhecida${issue$1.keys.length > 1 ? "s" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Chave inválida em ${issue$1.origin}`;
			case "invalid_union": return "Entrada inválida";
			case "invalid_element": return `Valor inválido em ${issue$1.origin}`;
			default: return `Campo inválido`;
		}
	};
};
function pt_default() {
	return { localeError: error$12() };
}

//#endregion
//#region node_modules/zod/v4/locales/ru.js
function getRussianPlural(count, one, few, many) {
	const absCount = Math.abs(count);
	const lastDigit = absCount % 10;
	const lastTwoDigits = absCount % 100;
	if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return many;
	if (lastDigit === 1) return one;
	if (lastDigit >= 2 && lastDigit <= 4) return few;
	return many;
}
const error$11 = () => {
	const Sizable = {
		string: {
			unit: {
				one: "символ",
				few: "символа",
				many: "символов"
			},
			verb: "иметь"
		},
		file: {
			unit: {
				one: "байт",
				few: "байта",
				many: "байт"
			},
			verb: "иметь"
		},
		array: {
			unit: {
				one: "элемент",
				few: "элемента",
				many: "элементов"
			},
			verb: "иметь"
		},
		set: {
			unit: {
				one: "элемент",
				few: "элемента",
				many: "элементов"
			},
			verb: "иметь"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "число";
			case "object":
				if (Array.isArray(data)) return "массив";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "ввод",
		email: "email адрес",
		url: "URL",
		emoji: "эмодзи",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO дата и время",
		date: "ISO дата",
		time: "ISO время",
		duration: "ISO длительность",
		ipv4: "IPv4 адрес",
		ipv6: "IPv6 адрес",
		cidrv4: "IPv4 диапазон",
		cidrv6: "IPv6 диапазон",
		base64: "строка в формате base64",
		base64url: "строка в формате base64url",
		json_string: "JSON строка",
		e164: "номер E.164",
		jwt: "JWT",
		template_literal: "ввод"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Неверный ввод: ожидалось ${issue$1.expected}, получено ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Неверный ввод: ожидалось ${stringifyPrimitive(issue$1.values[0])}`;
				return `Неверный вариант: ожидалось одно из ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) {
					const unit = getRussianPlural(Number(issue$1.maximum), sizing.unit.one, sizing.unit.few, sizing.unit.many);
					return `Слишком большое значение: ожидалось, что ${issue$1.origin ?? "значение"} будет иметь ${adj}${issue$1.maximum.toString()} ${unit}`;
				}
				return `Слишком большое значение: ожидалось, что ${issue$1.origin ?? "значение"} будет ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) {
					const unit = getRussianPlural(Number(issue$1.minimum), sizing.unit.one, sizing.unit.few, sizing.unit.many);
					return `Слишком маленькое значение: ожидалось, что ${issue$1.origin} будет иметь ${adj}${issue$1.minimum.toString()} ${unit}`;
				}
				return `Слишком маленькое значение: ожидалось, что ${issue$1.origin} будет ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Неверная строка: должна начинаться с "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Неверная строка: должна заканчиваться на "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Неверная строка: должна содержать "${_issue.includes}"`;
				if (_issue.format === "regex") return `Неверная строка: должна соответствовать шаблону ${_issue.pattern}`;
				return `Неверный ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Неверное число: должно быть кратным ${issue$1.divisor}`;
			case "unrecognized_keys": return `Нераспознанн${issue$1.keys.length > 1 ? "ые" : "ый"} ключ${issue$1.keys.length > 1 ? "и" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Неверный ключ в ${issue$1.origin}`;
			case "invalid_union": return "Неверные входные данные";
			case "invalid_element": return `Неверное значение в ${issue$1.origin}`;
			default: return `Неверные входные данные`;
		}
	};
};
function ru_default() {
	return { localeError: error$11() };
}

//#endregion
//#region node_modules/zod/v4/locales/sl.js
const error$10 = () => {
	const Sizable = {
		string: {
			unit: "znakov",
			verb: "imeti"
		},
		file: {
			unit: "bajtov",
			verb: "imeti"
		},
		array: {
			unit: "elementov",
			verb: "imeti"
		},
		set: {
			unit: "elementov",
			verb: "imeti"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "število";
			case "object":
				if (Array.isArray(data)) return "tabela";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "vnos",
		email: "e-poštni naslov",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO datum in čas",
		date: "ISO datum",
		time: "ISO čas",
		duration: "ISO trajanje",
		ipv4: "IPv4 naslov",
		ipv6: "IPv6 naslov",
		cidrv4: "obseg IPv4",
		cidrv6: "obseg IPv6",
		base64: "base64 kodiran niz",
		base64url: "base64url kodiran niz",
		json_string: "JSON niz",
		e164: "E.164 številka",
		jwt: "JWT",
		template_literal: "vnos"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Neveljaven vnos: pričakovano ${issue$1.expected}, prejeto ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Neveljaven vnos: pričakovano ${stringifyPrimitive(issue$1.values[0])}`;
				return `Neveljavna možnost: pričakovano eno izmed ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Preveliko: pričakovano, da bo ${issue$1.origin ?? "vrednost"} imelo ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "elementov"}`;
				return `Preveliko: pričakovano, da bo ${issue$1.origin ?? "vrednost"} ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Premajhno: pričakovano, da bo ${issue$1.origin} imelo ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Premajhno: pričakovano, da bo ${issue$1.origin} ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Neveljaven niz: mora se začeti z "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Neveljaven niz: mora se končati z "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Neveljaven niz: mora vsebovati "${_issue.includes}"`;
				if (_issue.format === "regex") return `Neveljaven niz: mora ustrezati vzorcu ${_issue.pattern}`;
				return `Neveljaven ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Neveljavno število: mora biti večkratnik ${issue$1.divisor}`;
			case "unrecognized_keys": return `Neprepoznan${issue$1.keys.length > 1 ? "i ključi" : " ključ"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Neveljaven ključ v ${issue$1.origin}`;
			case "invalid_union": return "Neveljaven vnos";
			case "invalid_element": return `Neveljavna vrednost v ${issue$1.origin}`;
			default: return "Neveljaven vnos";
		}
	};
};
function sl_default() {
	return { localeError: error$10() };
}

//#endregion
//#region node_modules/zod/v4/locales/sv.js
const error$9 = () => {
	const Sizable = {
		string: {
			unit: "tecken",
			verb: "att ha"
		},
		file: {
			unit: "bytes",
			verb: "att ha"
		},
		array: {
			unit: "objekt",
			verb: "att innehålla"
		},
		set: {
			unit: "objekt",
			verb: "att innehålla"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "antal";
			case "object":
				if (Array.isArray(data)) return "lista";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "reguljärt uttryck",
		email: "e-postadress",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO-datum och tid",
		date: "ISO-datum",
		time: "ISO-tid",
		duration: "ISO-varaktighet",
		ipv4: "IPv4-intervall",
		ipv6: "IPv6-intervall",
		cidrv4: "IPv4-spektrum",
		cidrv6: "IPv6-spektrum",
		base64: "base64-kodad sträng",
		base64url: "base64url-kodad sträng",
		json_string: "JSON-sträng",
		e164: "E.164-nummer",
		jwt: "JWT",
		template_literal: "mall-literal"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Ogiltig inmatning: förväntat ${issue$1.expected}, fick ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Ogiltig inmatning: förväntat ${stringifyPrimitive(issue$1.values[0])}`;
				return `Ogiltigt val: förväntade en av ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `För stor(t): förväntade ${issue$1.origin ?? "värdet"} att ha ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "element"}`;
				return `För stor(t): förväntat ${issue$1.origin ?? "värdet"} att ha ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `För lite(t): förväntade ${issue$1.origin ?? "värdet"} att ha ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `För lite(t): förväntade ${issue$1.origin ?? "värdet"} att ha ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Ogiltig sträng: måste börja med "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Ogiltig sträng: måste sluta med "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Ogiltig sträng: måste innehålla "${_issue.includes}"`;
				if (_issue.format === "regex") return `Ogiltig sträng: måste matcha mönstret "${_issue.pattern}"`;
				return `Ogiltig(t) ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Ogiltigt tal: måste vara en multipel av ${issue$1.divisor}`;
			case "unrecognized_keys": return `${issue$1.keys.length > 1 ? "Okända nycklar" : "Okänd nyckel"}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Ogiltig nyckel i ${issue$1.origin ?? "värdet"}`;
			case "invalid_union": return "Ogiltig input";
			case "invalid_element": return `Ogiltigt värde i ${issue$1.origin ?? "värdet"}`;
			default: return `Ogiltig input`;
		}
	};
};
function sv_default() {
	return { localeError: error$9() };
}

//#endregion
//#region node_modules/zod/v4/locales/ta.js
const error$8 = () => {
	const Sizable = {
		string: {
			unit: "எழுத்துக்கள்",
			verb: "கொண்டிருக்க வேண்டும்"
		},
		file: {
			unit: "பைட்டுகள்",
			verb: "கொண்டிருக்க வேண்டும்"
		},
		array: {
			unit: "உறுப்புகள்",
			verb: "கொண்டிருக்க வேண்டும்"
		},
		set: {
			unit: "உறுப்புகள்",
			verb: "கொண்டிருக்க வேண்டும்"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "எண் அல்லாதது" : "எண்";
			case "object":
				if (Array.isArray(data)) return "அணி";
				if (data === null) return "வெறுமை";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "உள்ளீடு",
		email: "மின்னஞ்சல் முகவரி",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO தேதி நேரம்",
		date: "ISO தேதி",
		time: "ISO நேரம்",
		duration: "ISO கால அளவு",
		ipv4: "IPv4 முகவரி",
		ipv6: "IPv6 முகவரி",
		cidrv4: "IPv4 வரம்பு",
		cidrv6: "IPv6 வரம்பு",
		base64: "base64-encoded சரம்",
		base64url: "base64url-encoded சரம்",
		json_string: "JSON சரம்",
		e164: "E.164 எண்",
		jwt: "JWT",
		template_literal: "input"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${issue$1.expected}, பெறப்பட்டது ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${stringifyPrimitive(issue$1.values[0])}`;
				return `தவறான விருப்பம்: எதிர்பார்க்கப்பட்டது ${joinValues(issue$1.values, "|")} இல் ஒன்று`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue$1.origin ?? "மதிப்பு"} ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "உறுப்புகள்"} ஆக இருக்க வேண்டும்`;
				return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue$1.origin ?? "மதிப்பு"} ${adj}${issue$1.maximum.toString()} ஆக இருக்க வேண்டும்`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue$1.origin} ${adj}${issue$1.minimum.toString()} ${sizing.unit} ஆக இருக்க வேண்டும்`;
				return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue$1.origin} ${adj}${issue$1.minimum.toString()} ஆக இருக்க வேண்டும்`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `தவறான சரம்: "${_issue.prefix}" இல் தொடங்க வேண்டும்`;
				if (_issue.format === "ends_with") return `தவறான சரம்: "${_issue.suffix}" இல் முடிவடைய வேண்டும்`;
				if (_issue.format === "includes") return `தவறான சரம்: "${_issue.includes}" ஐ உள்ளடக்க வேண்டும்`;
				if (_issue.format === "regex") return `தவறான சரம்: ${_issue.pattern} முறைபாட்டுடன் பொருந்த வேண்டும்`;
				return `தவறான ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `தவறான எண்: ${issue$1.divisor} இன் பலமாக இருக்க வேண்டும்`;
			case "unrecognized_keys": return `அடையாளம் தெரியாத விசை${issue$1.keys.length > 1 ? "கள்" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `${issue$1.origin} இல் தவறான விசை`;
			case "invalid_union": return "தவறான உள்ளீடு";
			case "invalid_element": return `${issue$1.origin} இல் தவறான மதிப்பு`;
			default: return `தவறான உள்ளீடு`;
		}
	};
};
function ta_default() {
	return { localeError: error$8() };
}

//#endregion
//#region node_modules/zod/v4/locales/th.js
const error$7 = () => {
	const Sizable = {
		string: {
			unit: "ตัวอักษร",
			verb: "ควรมี"
		},
		file: {
			unit: "ไบต์",
			verb: "ควรมี"
		},
		array: {
			unit: "รายการ",
			verb: "ควรมี"
		},
		set: {
			unit: "รายการ",
			verb: "ควรมี"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "ไม่ใช่ตัวเลข (NaN)" : "ตัวเลข";
			case "object":
				if (Array.isArray(data)) return "อาร์เรย์ (Array)";
				if (data === null) return "ไม่มีค่า (null)";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "ข้อมูลที่ป้อน",
		email: "ที่อยู่อีเมล",
		url: "URL",
		emoji: "อิโมจิ",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "วันที่เวลาแบบ ISO",
		date: "วันที่แบบ ISO",
		time: "เวลาแบบ ISO",
		duration: "ช่วงเวลาแบบ ISO",
		ipv4: "ที่อยู่ IPv4",
		ipv6: "ที่อยู่ IPv6",
		cidrv4: "ช่วง IP แบบ IPv4",
		cidrv6: "ช่วง IP แบบ IPv6",
		base64: "ข้อความแบบ Base64",
		base64url: "ข้อความแบบ Base64 สำหรับ URL",
		json_string: "ข้อความแบบ JSON",
		e164: "เบอร์โทรศัพท์ระหว่างประเทศ (E.164)",
		jwt: "โทเคน JWT",
		template_literal: "ข้อมูลที่ป้อน"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น ${issue$1.expected} แต่ได้รับ ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `ค่าไม่ถูกต้อง: ควรเป็น ${stringifyPrimitive(issue$1.values[0])}`;
				return `ตัวเลือกไม่ถูกต้อง: ควรเป็นหนึ่งใน ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "ไม่เกิน" : "น้อยกว่า";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `เกินกำหนด: ${issue$1.origin ?? "ค่า"} ควรมี${adj} ${issue$1.maximum.toString()} ${sizing.unit ?? "รายการ"}`;
				return `เกินกำหนด: ${issue$1.origin ?? "ค่า"} ควรมี${adj} ${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? "อย่างน้อย" : "มากกว่า";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `น้อยกว่ากำหนด: ${issue$1.origin} ควรมี${adj} ${issue$1.minimum.toString()} ${sizing.unit}`;
				return `น้อยกว่ากำหนด: ${issue$1.origin} ควรมี${adj} ${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `รูปแบบไม่ถูกต้อง: ข้อความต้องขึ้นต้นด้วย "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `รูปแบบไม่ถูกต้อง: ข้อความต้องลงท้ายด้วย "${_issue.suffix}"`;
				if (_issue.format === "includes") return `รูปแบบไม่ถูกต้อง: ข้อความต้องมี "${_issue.includes}" อยู่ในข้อความ`;
				if (_issue.format === "regex") return `รูปแบบไม่ถูกต้อง: ต้องตรงกับรูปแบบที่กำหนด ${_issue.pattern}`;
				return `รูปแบบไม่ถูกต้อง: ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `ตัวเลขไม่ถูกต้อง: ต้องเป็นจำนวนที่หารด้วย ${issue$1.divisor} ได้ลงตัว`;
			case "unrecognized_keys": return `พบคีย์ที่ไม่รู้จัก: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `คีย์ไม่ถูกต้องใน ${issue$1.origin}`;
			case "invalid_union": return "ข้อมูลไม่ถูกต้อง: ไม่ตรงกับรูปแบบยูเนียนที่กำหนดไว้";
			case "invalid_element": return `ข้อมูลไม่ถูกต้องใน ${issue$1.origin}`;
			default: return `ข้อมูลไม่ถูกต้อง`;
		}
	};
};
function th_default() {
	return { localeError: error$7() };
}

//#endregion
//#region node_modules/zod/v4/locales/tr.js
const parsedType = (data) => {
	const t = typeof data;
	switch (t) {
		case "number": return Number.isNaN(data) ? "NaN" : "number";
		case "object":
			if (Array.isArray(data)) return "array";
			if (data === null) return "null";
			if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
	}
	return t;
};
const error$6 = () => {
	const Sizable = {
		string: {
			unit: "karakter",
			verb: "olmalı"
		},
		file: {
			unit: "bayt",
			verb: "olmalı"
		},
		array: {
			unit: "öğe",
			verb: "olmalı"
		},
		set: {
			unit: "öğe",
			verb: "olmalı"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const Nouns = {
		regex: "girdi",
		email: "e-posta adresi",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO tarih ve saat",
		date: "ISO tarih",
		time: "ISO saat",
		duration: "ISO süre",
		ipv4: "IPv4 adresi",
		ipv6: "IPv6 adresi",
		cidrv4: "IPv4 aralığı",
		cidrv6: "IPv6 aralığı",
		base64: "base64 ile şifrelenmiş metin",
		base64url: "base64url ile şifrelenmiş metin",
		json_string: "JSON dizesi",
		e164: "E.164 sayısı",
		jwt: "JWT",
		template_literal: "Şablon dizesi"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Geçersiz değer: beklenen ${issue$1.expected}, alınan ${parsedType(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Geçersiz değer: beklenen ${stringifyPrimitive(issue$1.values[0])}`;
				return `Geçersiz seçenek: aşağıdakilerden biri olmalı: ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Çok büyük: beklenen ${issue$1.origin ?? "değer"} ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "öğe"}`;
				return `Çok büyük: beklenen ${issue$1.origin ?? "değer"} ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Çok küçük: beklenen ${issue$1.origin} ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Çok küçük: beklenen ${issue$1.origin} ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Geçersiz metin: "${_issue.prefix}" ile başlamalı`;
				if (_issue.format === "ends_with") return `Geçersiz metin: "${_issue.suffix}" ile bitmeli`;
				if (_issue.format === "includes") return `Geçersiz metin: "${_issue.includes}" içermeli`;
				if (_issue.format === "regex") return `Geçersiz metin: ${_issue.pattern} desenine uymalı`;
				return `Geçersiz ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Geçersiz sayı: ${issue$1.divisor} ile tam bölünebilmeli`;
			case "unrecognized_keys": return `Tanınmayan anahtar${issue$1.keys.length > 1 ? "lar" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `${issue$1.origin} içinde geçersiz anahtar`;
			case "invalid_union": return "Geçersiz değer";
			case "invalid_element": return `${issue$1.origin} içinde geçersiz değer`;
			default: return `Geçersiz değer`;
		}
	};
};
function tr_default() {
	return { localeError: error$6() };
}

//#endregion
//#region node_modules/zod/v4/locales/uk.js
const error$5 = () => {
	const Sizable = {
		string: {
			unit: "символів",
			verb: "матиме"
		},
		file: {
			unit: "байтів",
			verb: "матиме"
		},
		array: {
			unit: "елементів",
			verb: "матиме"
		},
		set: {
			unit: "елементів",
			verb: "матиме"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "число";
			case "object":
				if (Array.isArray(data)) return "масив";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "вхідні дані",
		email: "адреса електронної пошти",
		url: "URL",
		emoji: "емодзі",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "дата та час ISO",
		date: "дата ISO",
		time: "час ISO",
		duration: "тривалість ISO",
		ipv4: "адреса IPv4",
		ipv6: "адреса IPv6",
		cidrv4: "діапазон IPv4",
		cidrv6: "діапазон IPv6",
		base64: "рядок у кодуванні base64",
		base64url: "рядок у кодуванні base64url",
		json_string: "рядок JSON",
		e164: "номер E.164",
		jwt: "JWT",
		template_literal: "вхідні дані"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Неправильні вхідні дані: очікується ${issue$1.expected}, отримано ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Неправильні вхідні дані: очікується ${stringifyPrimitive(issue$1.values[0])}`;
				return `Неправильна опція: очікується одне з ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Занадто велике: очікується, що ${issue$1.origin ?? "значення"} ${sizing.verb} ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "елементів"}`;
				return `Занадто велике: очікується, що ${issue$1.origin ?? "значення"} буде ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Занадто мале: очікується, що ${issue$1.origin} ${sizing.verb} ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Занадто мале: очікується, що ${issue$1.origin} буде ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Неправильний рядок: повинен починатися з "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Неправильний рядок: повинен закінчуватися на "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Неправильний рядок: повинен містити "${_issue.includes}"`;
				if (_issue.format === "regex") return `Неправильний рядок: повинен відповідати шаблону ${_issue.pattern}`;
				return `Неправильний ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Неправильне число: повинно бути кратним ${issue$1.divisor}`;
			case "unrecognized_keys": return `Нерозпізнаний ключ${issue$1.keys.length > 1 ? "і" : ""}: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Неправильний ключ у ${issue$1.origin}`;
			case "invalid_union": return "Неправильні вхідні дані";
			case "invalid_element": return `Неправильне значення у ${issue$1.origin}`;
			default: return `Неправильні вхідні дані`;
		}
	};
};
function uk_default() {
	return { localeError: error$5() };
}

//#endregion
//#region node_modules/zod/v4/locales/ua.js
/** @deprecated Use `uk` instead. */
function ua_default() {
	return uk_default();
}

//#endregion
//#region node_modules/zod/v4/locales/ur.js
const error$4 = () => {
	const Sizable = {
		string: {
			unit: "حروف",
			verb: "ہونا"
		},
		file: {
			unit: "بائٹس",
			verb: "ہونا"
		},
		array: {
			unit: "آئٹمز",
			verb: "ہونا"
		},
		set: {
			unit: "آئٹمز",
			verb: "ہونا"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "نمبر";
			case "object":
				if (Array.isArray(data)) return "آرے";
				if (data === null) return "نل";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "ان پٹ",
		email: "ای میل ایڈریس",
		url: "یو آر ایل",
		emoji: "ایموجی",
		uuid: "یو یو آئی ڈی",
		uuidv4: "یو یو آئی ڈی وی 4",
		uuidv6: "یو یو آئی ڈی وی 6",
		nanoid: "نینو آئی ڈی",
		guid: "جی یو آئی ڈی",
		cuid: "سی یو آئی ڈی",
		cuid2: "سی یو آئی ڈی 2",
		ulid: "یو ایل آئی ڈی",
		xid: "ایکس آئی ڈی",
		ksuid: "کے ایس یو آئی ڈی",
		datetime: "آئی ایس او ڈیٹ ٹائم",
		date: "آئی ایس او تاریخ",
		time: "آئی ایس او وقت",
		duration: "آئی ایس او مدت",
		ipv4: "آئی پی وی 4 ایڈریس",
		ipv6: "آئی پی وی 6 ایڈریس",
		cidrv4: "آئی پی وی 4 رینج",
		cidrv6: "آئی پی وی 6 رینج",
		base64: "بیس 64 ان کوڈڈ سٹرنگ",
		base64url: "بیس 64 یو آر ایل ان کوڈڈ سٹرنگ",
		json_string: "جے ایس او این سٹرنگ",
		e164: "ای 164 نمبر",
		jwt: "جے ڈبلیو ٹی",
		template_literal: "ان پٹ"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `غلط ان پٹ: ${issue$1.expected} متوقع تھا، ${parsedType$7(issue$1.input)} موصول ہوا`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `غلط ان پٹ: ${stringifyPrimitive(issue$1.values[0])} متوقع تھا`;
				return `غلط آپشن: ${joinValues(issue$1.values, "|")} میں سے ایک متوقع تھا`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `بہت بڑا: ${issue$1.origin ?? "ویلیو"} کے ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "عناصر"} ہونے متوقع تھے`;
				return `بہت بڑا: ${issue$1.origin ?? "ویلیو"} کا ${adj}${issue$1.maximum.toString()} ہونا متوقع تھا`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `بہت چھوٹا: ${issue$1.origin} کے ${adj}${issue$1.minimum.toString()} ${sizing.unit} ہونے متوقع تھے`;
				return `بہت چھوٹا: ${issue$1.origin} کا ${adj}${issue$1.minimum.toString()} ہونا متوقع تھا`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `غلط سٹرنگ: "${_issue.prefix}" سے شروع ہونا چاہیے`;
				if (_issue.format === "ends_with") return `غلط سٹرنگ: "${_issue.suffix}" پر ختم ہونا چاہیے`;
				if (_issue.format === "includes") return `غلط سٹرنگ: "${_issue.includes}" شامل ہونا چاہیے`;
				if (_issue.format === "regex") return `غلط سٹرنگ: پیٹرن ${_issue.pattern} سے میچ ہونا چاہیے`;
				return `غلط ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `غلط نمبر: ${issue$1.divisor} کا مضاعف ہونا چاہیے`;
			case "unrecognized_keys": return `غیر تسلیم شدہ کی${issue$1.keys.length > 1 ? "ز" : ""}: ${joinValues(issue$1.keys, "، ")}`;
			case "invalid_key": return `${issue$1.origin} میں غلط کی`;
			case "invalid_union": return "غلط ان پٹ";
			case "invalid_element": return `${issue$1.origin} میں غلط ویلیو`;
			default: return `غلط ان پٹ`;
		}
	};
};
function ur_default() {
	return { localeError: error$4() };
}

//#endregion
//#region node_modules/zod/v4/locales/vi.js
const error$3 = () => {
	const Sizable = {
		string: {
			unit: "ký tự",
			verb: "có"
		},
		file: {
			unit: "byte",
			verb: "có"
		},
		array: {
			unit: "phần tử",
			verb: "có"
		},
		set: {
			unit: "phần tử",
			verb: "có"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "số";
			case "object":
				if (Array.isArray(data)) return "mảng";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "đầu vào",
		email: "địa chỉ email",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ngày giờ ISO",
		date: "ngày ISO",
		time: "giờ ISO",
		duration: "khoảng thời gian ISO",
		ipv4: "địa chỉ IPv4",
		ipv6: "địa chỉ IPv6",
		cidrv4: "dải IPv4",
		cidrv6: "dải IPv6",
		base64: "chuỗi mã hóa base64",
		base64url: "chuỗi mã hóa base64url",
		json_string: "chuỗi JSON",
		e164: "số E.164",
		jwt: "JWT",
		template_literal: "đầu vào"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Đầu vào không hợp lệ: mong đợi ${issue$1.expected}, nhận được ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Đầu vào không hợp lệ: mong đợi ${stringifyPrimitive(issue$1.values[0])}`;
				return `Tùy chọn không hợp lệ: mong đợi một trong các giá trị ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Quá lớn: mong đợi ${issue$1.origin ?? "giá trị"} ${sizing.verb} ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "phần tử"}`;
				return `Quá lớn: mong đợi ${issue$1.origin ?? "giá trị"} ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Quá nhỏ: mong đợi ${issue$1.origin} ${sizing.verb} ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `Quá nhỏ: mong đợi ${issue$1.origin} ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Chuỗi không hợp lệ: phải bắt đầu bằng "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Chuỗi không hợp lệ: phải kết thúc bằng "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Chuỗi không hợp lệ: phải bao gồm "${_issue.includes}"`;
				if (_issue.format === "regex") return `Chuỗi không hợp lệ: phải khớp với mẫu ${_issue.pattern}`;
				return `${Nouns[_issue.format] ?? issue$1.format} không hợp lệ`;
			}
			case "not_multiple_of": return `Số không hợp lệ: phải là bội số của ${issue$1.divisor}`;
			case "unrecognized_keys": return `Khóa không được nhận dạng: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Khóa không hợp lệ trong ${issue$1.origin}`;
			case "invalid_union": return "Đầu vào không hợp lệ";
			case "invalid_element": return `Giá trị không hợp lệ trong ${issue$1.origin}`;
			default: return `Đầu vào không hợp lệ`;
		}
	};
};
function vi_default() {
	return { localeError: error$3() };
}

//#endregion
//#region node_modules/zod/v4/locales/zh-CN.js
const error$2 = () => {
	const Sizable = {
		string: {
			unit: "字符",
			verb: "包含"
		},
		file: {
			unit: "字节",
			verb: "包含"
		},
		array: {
			unit: "项",
			verb: "包含"
		},
		set: {
			unit: "项",
			verb: "包含"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "非数字(NaN)" : "数字";
			case "object":
				if (Array.isArray(data)) return "数组";
				if (data === null) return "空值(null)";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "输入",
		email: "电子邮件",
		url: "URL",
		emoji: "表情符号",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO日期时间",
		date: "ISO日期",
		time: "ISO时间",
		duration: "ISO时长",
		ipv4: "IPv4地址",
		ipv6: "IPv6地址",
		cidrv4: "IPv4网段",
		cidrv6: "IPv6网段",
		base64: "base64编码字符串",
		base64url: "base64url编码字符串",
		json_string: "JSON字符串",
		e164: "E.164号码",
		jwt: "JWT",
		template_literal: "输入"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `无效输入：期望 ${issue$1.expected}，实际接收 ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `无效输入：期望 ${stringifyPrimitive(issue$1.values[0])}`;
				return `无效选项：期望以下之一 ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `数值过大：期望 ${issue$1.origin ?? "值"} ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "个元素"}`;
				return `数值过大：期望 ${issue$1.origin ?? "值"} ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `数值过小：期望 ${issue$1.origin} ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `数值过小：期望 ${issue$1.origin} ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `无效字符串：必须以 "${_issue.prefix}" 开头`;
				if (_issue.format === "ends_with") return `无效字符串：必须以 "${_issue.suffix}" 结尾`;
				if (_issue.format === "includes") return `无效字符串：必须包含 "${_issue.includes}"`;
				if (_issue.format === "regex") return `无效字符串：必须满足正则表达式 ${_issue.pattern}`;
				return `无效${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `无效数字：必须是 ${issue$1.divisor} 的倍数`;
			case "unrecognized_keys": return `出现未知的键(key): ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `${issue$1.origin} 中的键(key)无效`;
			case "invalid_union": return "无效输入";
			case "invalid_element": return `${issue$1.origin} 中包含无效值(value)`;
			default: return `无效输入`;
		}
	};
};
function zh_CN_default() {
	return { localeError: error$2() };
}

//#endregion
//#region node_modules/zod/v4/locales/zh-TW.js
const error$1 = () => {
	const Sizable = {
		string: {
			unit: "字元",
			verb: "擁有"
		},
		file: {
			unit: "位元組",
			verb: "擁有"
		},
		array: {
			unit: "項目",
			verb: "擁有"
		},
		set: {
			unit: "項目",
			verb: "擁有"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "number";
			case "object":
				if (Array.isArray(data)) return "array";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "輸入",
		email: "郵件地址",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO 日期時間",
		date: "ISO 日期",
		time: "ISO 時間",
		duration: "ISO 期間",
		ipv4: "IPv4 位址",
		ipv6: "IPv6 位址",
		cidrv4: "IPv4 範圍",
		cidrv6: "IPv6 範圍",
		base64: "base64 編碼字串",
		base64url: "base64url 編碼字串",
		json_string: "JSON 字串",
		e164: "E.164 數值",
		jwt: "JWT",
		template_literal: "輸入"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `無效的輸入值：預期為 ${issue$1.expected}，但收到 ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `無效的輸入值：預期為 ${stringifyPrimitive(issue$1.values[0])}`;
				return `無效的選項：預期為以下其中之一 ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `數值過大：預期 ${issue$1.origin ?? "值"} 應為 ${adj}${issue$1.maximum.toString()} ${sizing.unit ?? "個元素"}`;
				return `數值過大：預期 ${issue$1.origin ?? "值"} 應為 ${adj}${issue$1.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `數值過小：預期 ${issue$1.origin} 應為 ${adj}${issue$1.minimum.toString()} ${sizing.unit}`;
				return `數值過小：預期 ${issue$1.origin} 應為 ${adj}${issue$1.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `無效的字串：必須以 "${_issue.prefix}" 開頭`;
				if (_issue.format === "ends_with") return `無效的字串：必須以 "${_issue.suffix}" 結尾`;
				if (_issue.format === "includes") return `無效的字串：必須包含 "${_issue.includes}"`;
				if (_issue.format === "regex") return `無效的字串：必須符合格式 ${_issue.pattern}`;
				return `無效的 ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `無效的數字：必須為 ${issue$1.divisor} 的倍數`;
			case "unrecognized_keys": return `無法識別的鍵值${issue$1.keys.length > 1 ? "們" : ""}：${joinValues(issue$1.keys, "、")}`;
			case "invalid_key": return `${issue$1.origin} 中有無效的鍵值`;
			case "invalid_union": return "無效的輸入值";
			case "invalid_element": return `${issue$1.origin} 中有無效的值`;
			default: return `無效的輸入值`;
		}
	};
};
function zh_TW_default() {
	return { localeError: error$1() };
}

//#endregion
//#region node_modules/zod/v4/locales/yo.js
const error = () => {
	const Sizable = {
		string: {
			unit: "àmi",
			verb: "ní"
		},
		file: {
			unit: "bytes",
			verb: "ní"
		},
		array: {
			unit: "nkan",
			verb: "ní"
		},
		set: {
			unit: "nkan",
			verb: "ní"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const parsedType$7 = (data) => {
		const t = typeof data;
		switch (t) {
			case "number": return Number.isNaN(data) ? "NaN" : "nọ́mbà";
			case "object":
				if (Array.isArray(data)) return "akopọ";
				if (data === null) return "null";
				if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) return data.constructor.name;
		}
		return t;
	};
	const Nouns = {
		regex: "ẹ̀rọ ìbáwọlé",
		email: "àdírẹ́sì ìmẹ́lì",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "àkókò ISO",
		date: "ọjọ́ ISO",
		time: "àkókò ISO",
		duration: "àkókò tó pé ISO",
		ipv4: "àdírẹ́sì IPv4",
		ipv6: "àdírẹ́sì IPv6",
		cidrv4: "àgbègbè IPv4",
		cidrv6: "àgbègbè IPv6",
		base64: "ọ̀rọ̀ tí a kọ́ ní base64",
		base64url: "ọ̀rọ̀ base64url",
		json_string: "ọ̀rọ̀ JSON",
		e164: "nọ́mbà E.164",
		jwt: "JWT",
		template_literal: "ẹ̀rọ ìbáwọlé"
	};
	return (issue$1) => {
		switch (issue$1.code) {
			case "invalid_type": return `Ìbáwọlé aṣìṣe: a ní láti fi ${issue$1.expected}, àmọ̀ a rí ${parsedType$7(issue$1.input)}`;
			case "invalid_value":
				if (issue$1.values.length === 1) return `Ìbáwọlé aṣìṣe: a ní láti fi ${stringifyPrimitive(issue$1.values[0])}`;
				return `Àṣàyàn aṣìṣe: yan ọ̀kan lára ${joinValues(issue$1.values, "|")}`;
			case "too_big": {
				const adj = issue$1.inclusive ? "<=" : "<";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Tó pọ̀ jù: a ní láti jẹ́ pé ${issue$1.origin ?? "iye"} ${sizing.verb} ${adj}${issue$1.maximum} ${sizing.unit}`;
				return `Tó pọ̀ jù: a ní láti jẹ́ ${adj}${issue$1.maximum}`;
			}
			case "too_small": {
				const adj = issue$1.inclusive ? ">=" : ">";
				const sizing = getSizing(issue$1.origin);
				if (sizing) return `Kéré ju: a ní láti jẹ́ pé ${issue$1.origin} ${sizing.verb} ${adj}${issue$1.minimum} ${sizing.unit}`;
				return `Kéré ju: a ní láti jẹ́ ${adj}${issue$1.minimum}`;
			}
			case "invalid_format": {
				const _issue = issue$1;
				if (_issue.format === "starts_with") return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bẹ̀rẹ̀ pẹ̀lú "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ parí pẹ̀lú "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ ní "${_issue.includes}"`;
				if (_issue.format === "regex") return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bá àpẹẹrẹ mu ${_issue.pattern}`;
				return `Aṣìṣe: ${Nouns[_issue.format] ?? issue$1.format}`;
			}
			case "not_multiple_of": return `Nọ́mbà aṣìṣe: gbọ́dọ̀ jẹ́ èyà pípín ti ${issue$1.divisor}`;
			case "unrecognized_keys": return `Bọtìnì àìmọ̀: ${joinValues(issue$1.keys, ", ")}`;
			case "invalid_key": return `Bọtìnì aṣìṣe nínú ${issue$1.origin}`;
			case "invalid_union": return "Ìbáwọlé aṣìṣe";
			case "invalid_element": return `Iye aṣìṣe nínú ${issue$1.origin}`;
			default: return "Ìbáwọlé aṣìṣe";
		}
	};
};
function yo_default() {
	return { localeError: error() };
}

//#endregion
//#region node_modules/zod/v4/locales/index.js
var locales_exports = /* @__PURE__ */ __export({
	ar: () => ar_default,
	az: () => az_default,
	be: () => be_default,
	bg: () => bg_default,
	ca: () => ca_default,
	cs: () => cs_default,
	da: () => da_default,
	de: () => de_default,
	en: () => en_default,
	eo: () => eo_default,
	es: () => es_default,
	fa: () => fa_default,
	fi: () => fi_default,
	fr: () => fr_default,
	frCA: () => fr_CA_default,
	he: () => he_default,
	hu: () => hu_default,
	id: () => id_default,
	is: () => is_default,
	it: () => it_default,
	ja: () => ja_default,
	ka: () => ka_default,
	kh: () => kh_default,
	km: () => km_default,
	ko: () => ko_default,
	lt: () => lt_default,
	mk: () => mk_default,
	ms: () => ms_default,
	nl: () => nl_default,
	no: () => no_default,
	ota: () => ota_default,
	pl: () => pl_default,
	ps: () => ps_default,
	pt: () => pt_default,
	ru: () => ru_default,
	sl: () => sl_default,
	sv: () => sv_default,
	ta: () => ta_default,
	th: () => th_default,
	tr: () => tr_default,
	ua: () => ua_default,
	uk: () => uk_default,
	ur: () => ur_default,
	vi: () => vi_default,
	yo: () => yo_default,
	zhCN: () => zh_CN_default,
	zhTW: () => zh_TW_default
});

//#endregion
//#region node_modules/zod/v4/core/registries.js
const $output = Symbol("ZodOutput");
const $input = Symbol("ZodInput");
var $ZodRegistry = class {
	constructor() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
	}
	add(schema, ..._meta) {
		const meta = _meta[0];
		this._map.set(schema, meta);
		if (meta && typeof meta === "object" && "id" in meta) {
			if (this._idmap.has(meta.id)) throw new Error(`ID ${meta.id} already exists in the registry`);
			this._idmap.set(meta.id, schema);
		}
		return this;
	}
	clear() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
		return this;
	}
	remove(schema) {
		const meta = this._map.get(schema);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
		this._map.delete(schema);
		return this;
	}
	get(schema) {
		const p = schema._zod.parent;
		if (p) {
			const pm = { ...this.get(p) ?? {} };
			delete pm.id;
			const f = {
				...pm,
				...this._map.get(schema)
			};
			return Object.keys(f).length ? f : void 0;
		}
		return this._map.get(schema);
	}
	has(schema) {
		return this._map.has(schema);
	}
};
function registry() {
	return new $ZodRegistry();
}
const globalRegistry = /* @__PURE__ */ registry();

//#endregion
//#region node_modules/zod/v4/core/api.js
function _string(Class$1, params) {
	return new Class$1({
		type: "string",
		...normalizeParams(params)
	});
}
function _coercedString(Class$1, params) {
	return new Class$1({
		type: "string",
		coerce: true,
		...normalizeParams(params)
	});
}
function _email(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "email",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _guid(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _uuid(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _uuidv4(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v4",
		...normalizeParams(params)
	});
}
function _uuidv6(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v6",
		...normalizeParams(params)
	});
}
function _uuidv7(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v7",
		...normalizeParams(params)
	});
}
function _url(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _emoji(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _nanoid(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _cuid(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _cuid2(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _ulid(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _xid(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _ksuid(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _ipv4(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _ipv6(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _cidrv4(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _cidrv6(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _base64(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _base64url(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _e164(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _jwt(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
const TimePrecision = {
	Any: null,
	Minute: -1,
	Second: 0,
	Millisecond: 3,
	Microsecond: 6
};
function _isoDateTime(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: false,
		local: false,
		precision: null,
		...normalizeParams(params)
	});
}
function _isoDate(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "date",
		check: "string_format",
		...normalizeParams(params)
	});
}
function _isoTime(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...normalizeParams(params)
	});
}
function _isoDuration(Class$1, params) {
	return new Class$1({
		type: "string",
		format: "duration",
		check: "string_format",
		...normalizeParams(params)
	});
}
function _number(Class$1, params) {
	return new Class$1({
		type: "number",
		checks: [],
		...normalizeParams(params)
	});
}
function _coercedNumber(Class$1, params) {
	return new Class$1({
		type: "number",
		coerce: true,
		checks: [],
		...normalizeParams(params)
	});
}
function _int(Class$1, params) {
	return new Class$1({
		type: "number",
		check: "number_format",
		abort: false,
		format: "safeint",
		...normalizeParams(params)
	});
}
function _float32(Class$1, params) {
	return new Class$1({
		type: "number",
		check: "number_format",
		abort: false,
		format: "float32",
		...normalizeParams(params)
	});
}
function _float64(Class$1, params) {
	return new Class$1({
		type: "number",
		check: "number_format",
		abort: false,
		format: "float64",
		...normalizeParams(params)
	});
}
function _int32(Class$1, params) {
	return new Class$1({
		type: "number",
		check: "number_format",
		abort: false,
		format: "int32",
		...normalizeParams(params)
	});
}
function _uint32(Class$1, params) {
	return new Class$1({
		type: "number",
		check: "number_format",
		abort: false,
		format: "uint32",
		...normalizeParams(params)
	});
}
function _boolean(Class$1, params) {
	return new Class$1({
		type: "boolean",
		...normalizeParams(params)
	});
}
function _coercedBoolean(Class$1, params) {
	return new Class$1({
		type: "boolean",
		coerce: true,
		...normalizeParams(params)
	});
}
function _bigint(Class$1, params) {
	return new Class$1({
		type: "bigint",
		...normalizeParams(params)
	});
}
function _coercedBigint(Class$1, params) {
	return new Class$1({
		type: "bigint",
		coerce: true,
		...normalizeParams(params)
	});
}
function _int64(Class$1, params) {
	return new Class$1({
		type: "bigint",
		check: "bigint_format",
		abort: false,
		format: "int64",
		...normalizeParams(params)
	});
}
function _uint64(Class$1, params) {
	return new Class$1({
		type: "bigint",
		check: "bigint_format",
		abort: false,
		format: "uint64",
		...normalizeParams(params)
	});
}
function _symbol(Class$1, params) {
	return new Class$1({
		type: "symbol",
		...normalizeParams(params)
	});
}
function _undefined$1(Class$1, params) {
	return new Class$1({
		type: "undefined",
		...normalizeParams(params)
	});
}
function _null$1(Class$1, params) {
	return new Class$1({
		type: "null",
		...normalizeParams(params)
	});
}
function _any(Class$1) {
	return new Class$1({ type: "any" });
}
function _unknown(Class$1) {
	return new Class$1({ type: "unknown" });
}
function _never(Class$1, params) {
	return new Class$1({
		type: "never",
		...normalizeParams(params)
	});
}
function _void$1(Class$1, params) {
	return new Class$1({
		type: "void",
		...normalizeParams(params)
	});
}
function _date(Class$1, params) {
	return new Class$1({
		type: "date",
		...normalizeParams(params)
	});
}
function _coercedDate(Class$1, params) {
	return new Class$1({
		type: "date",
		coerce: true,
		...normalizeParams(params)
	});
}
function _nan(Class$1, params) {
	return new Class$1({
		type: "nan",
		...normalizeParams(params)
	});
}
function _lt(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
function _lte(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
function _gt(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
function _gte(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
function _positive(params) {
	return _gt(0, params);
}
function _negative(params) {
	return _lt(0, params);
}
function _nonpositive(params) {
	return _lte(0, params);
}
function _nonnegative(params) {
	return _gte(0, params);
}
function _multipleOf(value, params) {
	return new $ZodCheckMultipleOf({
		check: "multiple_of",
		...normalizeParams(params),
		value
	});
}
function _maxSize(maximum, params) {
	return new $ZodCheckMaxSize({
		check: "max_size",
		...normalizeParams(params),
		maximum
	});
}
function _minSize(minimum, params) {
	return new $ZodCheckMinSize({
		check: "min_size",
		...normalizeParams(params),
		minimum
	});
}
function _size(size, params) {
	return new $ZodCheckSizeEquals({
		check: "size_equals",
		...normalizeParams(params),
		size
	});
}
function _maxLength(maximum, params) {
	return new $ZodCheckMaxLength({
		check: "max_length",
		...normalizeParams(params),
		maximum
	});
}
function _minLength(minimum, params) {
	return new $ZodCheckMinLength({
		check: "min_length",
		...normalizeParams(params),
		minimum
	});
}
function _length(length, params) {
	return new $ZodCheckLengthEquals({
		check: "length_equals",
		...normalizeParams(params),
		length
	});
}
function _regex(pattern, params) {
	return new $ZodCheckRegex({
		check: "string_format",
		format: "regex",
		...normalizeParams(params),
		pattern
	});
}
function _lowercase(params) {
	return new $ZodCheckLowerCase({
		check: "string_format",
		format: "lowercase",
		...normalizeParams(params)
	});
}
function _uppercase(params) {
	return new $ZodCheckUpperCase({
		check: "string_format",
		format: "uppercase",
		...normalizeParams(params)
	});
}
function _includes(includes, params) {
	return new $ZodCheckIncludes({
		check: "string_format",
		format: "includes",
		...normalizeParams(params),
		includes
	});
}
function _startsWith(prefix, params) {
	return new $ZodCheckStartsWith({
		check: "string_format",
		format: "starts_with",
		...normalizeParams(params),
		prefix
	});
}
function _endsWith(suffix, params) {
	return new $ZodCheckEndsWith({
		check: "string_format",
		format: "ends_with",
		...normalizeParams(params),
		suffix
	});
}
function _property(property, schema, params) {
	return new $ZodCheckProperty({
		check: "property",
		property,
		schema,
		...normalizeParams(params)
	});
}
function _mime(types, params) {
	return new $ZodCheckMimeType({
		check: "mime_type",
		mime: types,
		...normalizeParams(params)
	});
}
function _overwrite(tx) {
	return new $ZodCheckOverwrite({
		check: "overwrite",
		tx
	});
}
function _normalize(form) {
	return _overwrite((input) => input.normalize(form));
}
function _trim() {
	return _overwrite((input) => input.trim());
}
function _toLowerCase() {
	return _overwrite((input) => input.toLowerCase());
}
function _toUpperCase() {
	return _overwrite((input) => input.toUpperCase());
}
function _array(Class$1, element, params) {
	return new Class$1({
		type: "array",
		element,
		...normalizeParams(params)
	});
}
function _union(Class$1, options, params) {
	return new Class$1({
		type: "union",
		options,
		...normalizeParams(params)
	});
}
function _discriminatedUnion(Class$1, discriminator, options, params) {
	return new Class$1({
		type: "union",
		options,
		discriminator,
		...normalizeParams(params)
	});
}
function _intersection(Class$1, left, right) {
	return new Class$1({
		type: "intersection",
		left,
		right
	});
}
function _tuple(Class$1, items, _paramsOrRest, _params) {
	const hasRest = _paramsOrRest instanceof $ZodType;
	const params = hasRest ? _params : _paramsOrRest;
	return new Class$1({
		type: "tuple",
		items,
		rest: hasRest ? _paramsOrRest : null,
		...normalizeParams(params)
	});
}
function _record(Class$1, keyType, valueType, params) {
	return new Class$1({
		type: "record",
		keyType,
		valueType,
		...normalizeParams(params)
	});
}
function _map(Class$1, keyType, valueType, params) {
	return new Class$1({
		type: "map",
		keyType,
		valueType,
		...normalizeParams(params)
	});
}
function _set(Class$1, valueType, params) {
	return new Class$1({
		type: "set",
		valueType,
		...normalizeParams(params)
	});
}
function _enum$1(Class$1, values, params) {
	return new Class$1({
		type: "enum",
		entries: Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values,
		...normalizeParams(params)
	});
}
/** @deprecated This API has been merged into `z.enum()`. Use `z.enum()` instead.
*
* ```ts
* enum Colors { red, green, blue }
* z.enum(Colors);
* ```
*/
function _nativeEnum(Class$1, entries, params) {
	return new Class$1({
		type: "enum",
		entries,
		...normalizeParams(params)
	});
}
function _literal(Class$1, value, params) {
	return new Class$1({
		type: "literal",
		values: Array.isArray(value) ? value : [value],
		...normalizeParams(params)
	});
}
function _file(Class$1, params) {
	return new Class$1({
		type: "file",
		...normalizeParams(params)
	});
}
function _transform(Class$1, fn) {
	return new Class$1({
		type: "transform",
		transform: fn
	});
}
function _optional(Class$1, innerType) {
	return new Class$1({
		type: "optional",
		innerType
	});
}
function _nullable(Class$1, innerType) {
	return new Class$1({
		type: "nullable",
		innerType
	});
}
function _default$1(Class$1, innerType, defaultValue) {
	return new Class$1({
		type: "default",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
function _nonoptional(Class$1, innerType, params) {
	return new Class$1({
		type: "nonoptional",
		innerType,
		...normalizeParams(params)
	});
}
function _success(Class$1, innerType) {
	return new Class$1({
		type: "success",
		innerType
	});
}
function _catch$1(Class$1, innerType, catchValue) {
	return new Class$1({
		type: "catch",
		innerType,
		catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
	});
}
function _pipe(Class$1, in_, out) {
	return new Class$1({
		type: "pipe",
		in: in_,
		out
	});
}
function _readonly(Class$1, innerType) {
	return new Class$1({
		type: "readonly",
		innerType
	});
}
function _templateLiteral(Class$1, parts, params) {
	return new Class$1({
		type: "template_literal",
		parts,
		...normalizeParams(params)
	});
}
function _lazy(Class$1, getter) {
	return new Class$1({
		type: "lazy",
		getter
	});
}
function _promise(Class$1, innerType) {
	return new Class$1({
		type: "promise",
		innerType
	});
}
function _custom(Class$1, fn, _params) {
	const norm = normalizeParams(_params);
	norm.abort ?? (norm.abort = true);
	return new Class$1({
		type: "custom",
		check: "custom",
		fn,
		...norm
	});
}
function _refine(Class$1, fn, _params) {
	return new Class$1({
		type: "custom",
		check: "custom",
		fn,
		...normalizeParams(_params)
	});
}
function _superRefine(fn) {
	const ch = _check((payload) => {
		payload.addIssue = (issue$1) => {
			if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, ch._zod.def));
			else {
				const _issue = issue$1;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = ch);
				_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
				payload.issues.push(issue(_issue));
			}
		};
		return fn(payload.value, payload);
	});
	return ch;
}
function _check(fn, params) {
	const ch = new $ZodCheck({
		check: "custom",
		...normalizeParams(params)
	});
	ch._zod.check = fn;
	return ch;
}
function _stringbool(Classes, _params) {
	const params = normalizeParams(_params);
	let truthyArray = params.truthy ?? [
		"true",
		"1",
		"yes",
		"on",
		"y",
		"enabled"
	];
	let falsyArray = params.falsy ?? [
		"false",
		"0",
		"no",
		"off",
		"n",
		"disabled"
	];
	if (params.case !== "sensitive") {
		truthyArray = truthyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
		falsyArray = falsyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
	}
	const truthySet = new Set(truthyArray);
	const falsySet = new Set(falsyArray);
	const _Codec = Classes.Codec ?? $ZodCodec;
	const _Boolean = Classes.Boolean ?? $ZodBoolean;
	const codec$1 = new _Codec({
		type: "pipe",
		in: new (Classes.String ?? $ZodString)({
			type: "string",
			error: params.error
		}),
		out: new _Boolean({
			type: "boolean",
			error: params.error
		}),
		transform: ((input, payload) => {
			let data = input;
			if (params.case !== "sensitive") data = data.toLowerCase();
			if (truthySet.has(data)) return true;
			else if (falsySet.has(data)) return false;
			else {
				payload.issues.push({
					code: "invalid_value",
					expected: "stringbool",
					values: [...truthySet, ...falsySet],
					input: payload.value,
					inst: codec$1,
					continue: false
				});
				return {};
			}
		}),
		reverseTransform: ((input, _payload) => {
			if (input === true) return truthyArray[0] || "true";
			else return falsyArray[0] || "false";
		}),
		error: params.error
	});
	return codec$1;
}
function _stringFormat(Class$1, format, fnOrRegex, _params = {}) {
	const params = normalizeParams(_params);
	const def = {
		...normalizeParams(_params),
		check: "string_format",
		type: "string",
		format,
		fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
		...params
	};
	if (fnOrRegex instanceof RegExp) def.pattern = fnOrRegex;
	return new Class$1(def);
}

//#endregion
//#region node_modules/zod/v4/core/to-json-schema.js
var JSONSchemaGenerator = class {
	constructor(params) {
		this.counter = 0;
		this.metadataRegistry = params?.metadata ?? globalRegistry;
		this.target = params?.target ?? "draft-2020-12";
		this.unrepresentable = params?.unrepresentable ?? "throw";
		this.override = params?.override ?? (() => {});
		this.io = params?.io ?? "output";
		this.seen = /* @__PURE__ */ new Map();
	}
	process(schema, _params = {
		path: [],
		schemaPath: []
	}) {
		var _a;
		const def = schema._zod.def;
		const formatMap = {
			guid: "uuid",
			url: "uri",
			datetime: "date-time",
			json_string: "json-string",
			regex: ""
		};
		const seen = this.seen.get(schema);
		if (seen) {
			seen.count++;
			if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
			return seen.schema;
		}
		const result = {
			schema: {},
			count: 1,
			cycle: void 0,
			path: _params.path
		};
		this.seen.set(schema, result);
		const overrideSchema = schema._zod.toJSONSchema?.();
		if (overrideSchema) result.schema = overrideSchema;
		else {
			const params = {
				..._params,
				schemaPath: [..._params.schemaPath, schema],
				path: _params.path
			};
			const parent = schema._zod.parent;
			if (parent) {
				result.ref = parent;
				this.process(parent, params);
				this.seen.get(parent).isParent = true;
			} else {
				const _json = result.schema;
				switch (def.type) {
					case "string": {
						const json$1 = _json;
						json$1.type = "string";
						const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
						if (typeof minimum === "number") json$1.minLength = minimum;
						if (typeof maximum === "number") json$1.maxLength = maximum;
						if (format) {
							json$1.format = formatMap[format] ?? format;
							if (json$1.format === "") delete json$1.format;
						}
						if (contentEncoding) json$1.contentEncoding = contentEncoding;
						if (patterns && patterns.size > 0) {
							const regexes = [...patterns];
							if (regexes.length === 1) json$1.pattern = regexes[0].source;
							else if (regexes.length > 1) result.schema.allOf = [...regexes.map((regex) => ({
								...this.target === "draft-7" || this.target === "draft-4" || this.target === "openapi-3.0" ? { type: "string" } : {},
								pattern: regex.source
							}))];
						}
						break;
					}
					case "number": {
						const json$1 = _json;
						const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
						if (typeof format === "string" && format.includes("int")) json$1.type = "integer";
						else json$1.type = "number";
						if (typeof exclusiveMinimum === "number") if (this.target === "draft-4" || this.target === "openapi-3.0") {
							json$1.minimum = exclusiveMinimum;
							json$1.exclusiveMinimum = true;
						} else json$1.exclusiveMinimum = exclusiveMinimum;
						if (typeof minimum === "number") {
							json$1.minimum = minimum;
							if (typeof exclusiveMinimum === "number" && this.target !== "draft-4") if (exclusiveMinimum >= minimum) delete json$1.minimum;
							else delete json$1.exclusiveMinimum;
						}
						if (typeof exclusiveMaximum === "number") if (this.target === "draft-4" || this.target === "openapi-3.0") {
							json$1.maximum = exclusiveMaximum;
							json$1.exclusiveMaximum = true;
						} else json$1.exclusiveMaximum = exclusiveMaximum;
						if (typeof maximum === "number") {
							json$1.maximum = maximum;
							if (typeof exclusiveMaximum === "number" && this.target !== "draft-4") if (exclusiveMaximum <= maximum) delete json$1.maximum;
							else delete json$1.exclusiveMaximum;
						}
						if (typeof multipleOf === "number") json$1.multipleOf = multipleOf;
						break;
					}
					case "boolean": {
						const json$1 = _json;
						json$1.type = "boolean";
						break;
					}
					case "bigint":
						if (this.unrepresentable === "throw") throw new Error("BigInt cannot be represented in JSON Schema");
						break;
					case "symbol":
						if (this.unrepresentable === "throw") throw new Error("Symbols cannot be represented in JSON Schema");
						break;
					case "null":
						if (this.target === "openapi-3.0") {
							_json.type = "string";
							_json.nullable = true;
							_json.enum = [null];
						} else _json.type = "null";
						break;
					case "any": break;
					case "unknown": break;
					case "undefined":
						if (this.unrepresentable === "throw") throw new Error("Undefined cannot be represented in JSON Schema");
						break;
					case "void":
						if (this.unrepresentable === "throw") throw new Error("Void cannot be represented in JSON Schema");
						break;
					case "never":
						_json.not = {};
						break;
					case "date":
						if (this.unrepresentable === "throw") throw new Error("Date cannot be represented in JSON Schema");
						break;
					case "array": {
						const json$1 = _json;
						const { minimum, maximum } = schema._zod.bag;
						if (typeof minimum === "number") json$1.minItems = minimum;
						if (typeof maximum === "number") json$1.maxItems = maximum;
						json$1.type = "array";
						json$1.items = this.process(def.element, {
							...params,
							path: [...params.path, "items"]
						});
						break;
					}
					case "object": {
						const json$1 = _json;
						json$1.type = "object";
						json$1.properties = {};
						const shape = def.shape;
						for (const key in shape) json$1.properties[key] = this.process(shape[key], {
							...params,
							path: [
								...params.path,
								"properties",
								key
							]
						});
						const allKeys = new Set(Object.keys(shape));
						const requiredKeys = new Set([...allKeys].filter((key) => {
							const v = def.shape[key]._zod;
							if (this.io === "input") return v.optin === void 0;
							else return v.optout === void 0;
						}));
						if (requiredKeys.size > 0) json$1.required = Array.from(requiredKeys);
						if (def.catchall?._zod.def.type === "never") json$1.additionalProperties = false;
						else if (!def.catchall) {
							if (this.io === "output") json$1.additionalProperties = false;
						} else if (def.catchall) json$1.additionalProperties = this.process(def.catchall, {
							...params,
							path: [...params.path, "additionalProperties"]
						});
						break;
					}
					case "union": {
						const json$1 = _json;
						json$1.anyOf = def.options.map((x, i) => this.process(x, {
							...params,
							path: [
								...params.path,
								"anyOf",
								i
							]
						}));
						break;
					}
					case "intersection": {
						const json$1 = _json;
						const a = this.process(def.left, {
							...params,
							path: [
								...params.path,
								"allOf",
								0
							]
						});
						const b = this.process(def.right, {
							...params,
							path: [
								...params.path,
								"allOf",
								1
							]
						});
						const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
						json$1.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
						break;
					}
					case "tuple": {
						const json$1 = _json;
						json$1.type = "array";
						const prefixPath = this.target === "draft-2020-12" ? "prefixItems" : "items";
						const restPath = this.target === "draft-2020-12" ? "items" : this.target === "openapi-3.0" ? "items" : "additionalItems";
						const prefixItems = def.items.map((x, i) => this.process(x, {
							...params,
							path: [
								...params.path,
								prefixPath,
								i
							]
						}));
						const rest = def.rest ? this.process(def.rest, {
							...params,
							path: [
								...params.path,
								restPath,
								...this.target === "openapi-3.0" ? [def.items.length] : []
							]
						}) : null;
						if (this.target === "draft-2020-12") {
							json$1.prefixItems = prefixItems;
							if (rest) json$1.items = rest;
						} else if (this.target === "openapi-3.0") {
							json$1.items = { anyOf: prefixItems };
							if (rest) json$1.items.anyOf.push(rest);
							json$1.minItems = prefixItems.length;
							if (!rest) json$1.maxItems = prefixItems.length;
						} else {
							json$1.items = prefixItems;
							if (rest) json$1.additionalItems = rest;
						}
						const { minimum, maximum } = schema._zod.bag;
						if (typeof minimum === "number") json$1.minItems = minimum;
						if (typeof maximum === "number") json$1.maxItems = maximum;
						break;
					}
					case "record": {
						const json$1 = _json;
						json$1.type = "object";
						if (this.target === "draft-7" || this.target === "draft-2020-12") json$1.propertyNames = this.process(def.keyType, {
							...params,
							path: [...params.path, "propertyNames"]
						});
						json$1.additionalProperties = this.process(def.valueType, {
							...params,
							path: [...params.path, "additionalProperties"]
						});
						break;
					}
					case "map":
						if (this.unrepresentable === "throw") throw new Error("Map cannot be represented in JSON Schema");
						break;
					case "set":
						if (this.unrepresentable === "throw") throw new Error("Set cannot be represented in JSON Schema");
						break;
					case "enum": {
						const json$1 = _json;
						const values = getEnumValues(def.entries);
						if (values.every((v) => typeof v === "number")) json$1.type = "number";
						if (values.every((v) => typeof v === "string")) json$1.type = "string";
						json$1.enum = values;
						break;
					}
					case "literal": {
						const json$1 = _json;
						const vals = [];
						for (const val of def.values) if (val === void 0) {
							if (this.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
						} else if (typeof val === "bigint") if (this.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
						else vals.push(Number(val));
						else vals.push(val);
						if (vals.length === 0) {} else if (vals.length === 1) {
							const val = vals[0];
							json$1.type = val === null ? "null" : typeof val;
							if (this.target === "draft-4" || this.target === "openapi-3.0") json$1.enum = [val];
							else json$1.const = val;
						} else {
							if (vals.every((v) => typeof v === "number")) json$1.type = "number";
							if (vals.every((v) => typeof v === "string")) json$1.type = "string";
							if (vals.every((v) => typeof v === "boolean")) json$1.type = "string";
							if (vals.every((v) => v === null)) json$1.type = "null";
							json$1.enum = vals;
						}
						break;
					}
					case "file": {
						const json$1 = _json;
						const file$1 = {
							type: "string",
							format: "binary",
							contentEncoding: "binary"
						};
						const { minimum, maximum, mime } = schema._zod.bag;
						if (minimum !== void 0) file$1.minLength = minimum;
						if (maximum !== void 0) file$1.maxLength = maximum;
						if (mime) if (mime.length === 1) {
							file$1.contentMediaType = mime[0];
							Object.assign(json$1, file$1);
						} else json$1.anyOf = mime.map((m) => {
							return {
								...file$1,
								contentMediaType: m
							};
						});
						else Object.assign(json$1, file$1);
						break;
					}
					case "transform":
						if (this.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
						break;
					case "nullable": {
						const inner = this.process(def.innerType, params);
						if (this.target === "openapi-3.0") {
							result.ref = def.innerType;
							_json.nullable = true;
						} else _json.anyOf = [inner, { type: "null" }];
						break;
					}
					case "nonoptional":
						this.process(def.innerType, params);
						result.ref = def.innerType;
						break;
					case "success": {
						const json$1 = _json;
						json$1.type = "boolean";
						break;
					}
					case "default":
						this.process(def.innerType, params);
						result.ref = def.innerType;
						_json.default = JSON.parse(JSON.stringify(def.defaultValue));
						break;
					case "prefault":
						this.process(def.innerType, params);
						result.ref = def.innerType;
						if (this.io === "input") _json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
						break;
					case "catch": {
						this.process(def.innerType, params);
						result.ref = def.innerType;
						let catchValue;
						try {
							catchValue = def.catchValue(void 0);
						} catch {
							throw new Error("Dynamic catch values are not supported in JSON Schema");
						}
						_json.default = catchValue;
						break;
					}
					case "nan":
						if (this.unrepresentable === "throw") throw new Error("NaN cannot be represented in JSON Schema");
						break;
					case "template_literal": {
						const json$1 = _json;
						const pattern = schema._zod.pattern;
						if (!pattern) throw new Error("Pattern not found in template literal");
						json$1.type = "string";
						json$1.pattern = pattern.source;
						break;
					}
					case "pipe": {
						const innerType = this.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
						this.process(innerType, params);
						result.ref = innerType;
						break;
					}
					case "readonly":
						this.process(def.innerType, params);
						result.ref = def.innerType;
						_json.readOnly = true;
						break;
					case "promise":
						this.process(def.innerType, params);
						result.ref = def.innerType;
						break;
					case "optional":
						this.process(def.innerType, params);
						result.ref = def.innerType;
						break;
					case "lazy": {
						const innerType = schema._zod.innerType;
						this.process(innerType, params);
						result.ref = innerType;
						break;
					}
					case "custom":
						if (this.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
						break;
					case "function":
						if (this.unrepresentable === "throw") throw new Error("Function types cannot be represented in JSON Schema");
						break;
					default:
				}
			}
		}
		const meta = this.metadataRegistry.get(schema);
		if (meta) Object.assign(result.schema, meta);
		if (this.io === "input" && isTransforming(schema)) {
			delete result.schema.examples;
			delete result.schema.default;
		}
		if (this.io === "input" && result.schema._prefault) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
		delete result.schema._prefault;
		return this.seen.get(schema).schema;
	}
	emit(schema, _params) {
		const params = {
			cycles: _params?.cycles ?? "ref",
			reused: _params?.reused ?? "inline",
			external: _params?.external ?? void 0
		};
		const root = this.seen.get(schema);
		if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
		const makeURI = (entry) => {
			const defsSegment = this.target === "draft-2020-12" ? "$defs" : "definitions";
			if (params.external) {
				const externalId = params.external.registry.get(entry[0])?.id;
				const uriGenerator = params.external.uri ?? ((id$1) => id$1);
				if (externalId) return { ref: uriGenerator(externalId) };
				const id = entry[1].defId ?? entry[1].schema.id ?? `schema${this.counter++}`;
				entry[1].defId = id;
				return {
					defId: id,
					ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
				};
			}
			if (entry[1] === root) return { ref: "#" };
			const defUriPrefix = `#/${defsSegment}/`;
			const defId = entry[1].schema.id ?? `__schema${this.counter++}`;
			return {
				defId,
				ref: defUriPrefix + defId
			};
		};
		const extractToDef = (entry) => {
			if (entry[1].schema.$ref) return;
			const seen = entry[1];
			const { ref, defId } = makeURI(entry);
			seen.def = { ...seen.schema };
			if (defId) seen.defId = defId;
			const schema$1 = seen.schema;
			for (const key in schema$1) delete schema$1[key];
			schema$1.$ref = ref;
		};
		if (params.cycles === "throw") for (const entry of this.seen.entries()) {
			const seen = entry[1];
			if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
		}
		for (const entry of this.seen.entries()) {
			const seen = entry[1];
			if (schema === entry[0]) {
				extractToDef(entry);
				continue;
			}
			if (params.external) {
				const ext = params.external.registry.get(entry[0])?.id;
				if (schema !== entry[0] && ext) {
					extractToDef(entry);
					continue;
				}
			}
			if (this.metadataRegistry.get(entry[0])?.id) {
				extractToDef(entry);
				continue;
			}
			if (seen.cycle) {
				extractToDef(entry);
				continue;
			}
			if (seen.count > 1) {
				if (params.reused === "ref") {
					extractToDef(entry);
					continue;
				}
			}
		}
		const flattenRef = (zodSchema, params$1) => {
			const seen = this.seen.get(zodSchema);
			const schema$1 = seen.def ?? seen.schema;
			const _cached = { ...schema$1 };
			if (seen.ref === null) return;
			const ref = seen.ref;
			seen.ref = null;
			if (ref) {
				flattenRef(ref, params$1);
				const refSchema = this.seen.get(ref).schema;
				if (refSchema.$ref && (params$1.target === "draft-7" || params$1.target === "draft-4" || params$1.target === "openapi-3.0")) {
					schema$1.allOf = schema$1.allOf ?? [];
					schema$1.allOf.push(refSchema);
				} else {
					Object.assign(schema$1, refSchema);
					Object.assign(schema$1, _cached);
				}
			}
			if (!seen.isParent) this.override({
				zodSchema,
				jsonSchema: schema$1,
				path: seen.path ?? []
			});
		};
		for (const entry of [...this.seen.entries()].reverse()) flattenRef(entry[0], { target: this.target });
		const result = {};
		if (this.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
		else if (this.target === "draft-7") result.$schema = "http://json-schema.org/draft-07/schema#";
		else if (this.target === "draft-4") result.$schema = "http://json-schema.org/draft-04/schema#";
		else if (this.target === "openapi-3.0") {} else console.warn(`Invalid target: ${this.target}`);
		if (params.external?.uri) {
			const id = params.external.registry.get(schema)?.id;
			if (!id) throw new Error("Schema is missing an `id` property");
			result.$id = params.external.uri(id);
		}
		Object.assign(result, root.def);
		const defs = params.external?.defs ?? {};
		for (const entry of this.seen.entries()) {
			const seen = entry[1];
			if (seen.def && seen.defId) defs[seen.defId] = seen.def;
		}
		if (params.external) {} else if (Object.keys(defs).length > 0) if (this.target === "draft-2020-12") result.$defs = defs;
		else result.definitions = defs;
		try {
			return JSON.parse(JSON.stringify(result));
		} catch (_err) {
			throw new Error("Error converting schema to JSON.");
		}
	}
};
function toJSONSchema(input, _params) {
	if (input instanceof $ZodRegistry) {
		const gen$1 = new JSONSchemaGenerator(_params);
		const defs = {};
		for (const entry of input._idmap.entries()) {
			const [_, schema] = entry;
			gen$1.process(schema);
		}
		const schemas = {};
		const external = {
			registry: input,
			uri: _params?.uri,
			defs
		};
		for (const entry of input._idmap.entries()) {
			const [key, schema] = entry;
			schemas[key] = gen$1.emit(schema, {
				..._params,
				external
			});
		}
		if (Object.keys(defs).length > 0) schemas.__shared = { [gen$1.target === "draft-2020-12" ? "$defs" : "definitions"]: defs };
		return { schemas };
	}
	const gen = new JSONSchemaGenerator(_params);
	gen.process(input);
	return gen.emit(input, _params);
}
function isTransforming(_schema, _ctx) {
	const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
	if (ctx.seen.has(_schema)) return false;
	ctx.seen.add(_schema);
	const def = _schema._zod.def;
	switch (def.type) {
		case "string":
		case "number":
		case "bigint":
		case "boolean":
		case "date":
		case "symbol":
		case "undefined":
		case "null":
		case "any":
		case "unknown":
		case "never":
		case "void":
		case "literal":
		case "enum":
		case "nan":
		case "file":
		case "template_literal": return false;
		case "array": return isTransforming(def.element, ctx);
		case "object":
			for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
			return false;
		case "union":
			for (const option of def.options) if (isTransforming(option, ctx)) return true;
			return false;
		case "intersection": return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
		case "tuple":
			for (const item of def.items) if (isTransforming(item, ctx)) return true;
			if (def.rest && isTransforming(def.rest, ctx)) return true;
			return false;
		case "record": return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
		case "map": return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
		case "set": return isTransforming(def.valueType, ctx);
		case "promise":
		case "optional":
		case "nonoptional":
		case "nullable":
		case "readonly": return isTransforming(def.innerType, ctx);
		case "lazy": return isTransforming(def.getter(), ctx);
		case "default": return isTransforming(def.innerType, ctx);
		case "prefault": return isTransforming(def.innerType, ctx);
		case "custom": return false;
		case "transform": return true;
		case "pipe": return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
		case "success": return false;
		case "catch": return false;
		case "function": return false;
		default:
	}
	throw new Error(`Unknown schema type: ${def.type}`);
}

//#endregion
//#region node_modules/zod/v4/core/json-schema.js
var json_schema_exports = {};

//#endregion
//#region node_modules/zod/v4/core/index.js
var core_exports = /* @__PURE__ */ __export({
	$ZodAny: () => $ZodAny,
	$ZodArray: () => $ZodArray,
	$ZodAsyncError: () => $ZodAsyncError,
	$ZodBase64: () => $ZodBase64,
	$ZodBase64URL: () => $ZodBase64URL,
	$ZodBigInt: () => $ZodBigInt,
	$ZodBigIntFormat: () => $ZodBigIntFormat,
	$ZodBoolean: () => $ZodBoolean,
	$ZodCIDRv4: () => $ZodCIDRv4,
	$ZodCIDRv6: () => $ZodCIDRv6,
	$ZodCUID: () => $ZodCUID,
	$ZodCUID2: () => $ZodCUID2,
	$ZodCatch: () => $ZodCatch,
	$ZodCheck: () => $ZodCheck,
	$ZodCheckBigIntFormat: () => $ZodCheckBigIntFormat,
	$ZodCheckEndsWith: () => $ZodCheckEndsWith,
	$ZodCheckGreaterThan: () => $ZodCheckGreaterThan,
	$ZodCheckIncludes: () => $ZodCheckIncludes,
	$ZodCheckLengthEquals: () => $ZodCheckLengthEquals,
	$ZodCheckLessThan: () => $ZodCheckLessThan,
	$ZodCheckLowerCase: () => $ZodCheckLowerCase,
	$ZodCheckMaxLength: () => $ZodCheckMaxLength,
	$ZodCheckMaxSize: () => $ZodCheckMaxSize,
	$ZodCheckMimeType: () => $ZodCheckMimeType,
	$ZodCheckMinLength: () => $ZodCheckMinLength,
	$ZodCheckMinSize: () => $ZodCheckMinSize,
	$ZodCheckMultipleOf: () => $ZodCheckMultipleOf,
	$ZodCheckNumberFormat: () => $ZodCheckNumberFormat,
	$ZodCheckOverwrite: () => $ZodCheckOverwrite,
	$ZodCheckProperty: () => $ZodCheckProperty,
	$ZodCheckRegex: () => $ZodCheckRegex,
	$ZodCheckSizeEquals: () => $ZodCheckSizeEquals,
	$ZodCheckStartsWith: () => $ZodCheckStartsWith,
	$ZodCheckStringFormat: () => $ZodCheckStringFormat,
	$ZodCheckUpperCase: () => $ZodCheckUpperCase,
	$ZodCodec: () => $ZodCodec,
	$ZodCustom: () => $ZodCustom,
	$ZodCustomStringFormat: () => $ZodCustomStringFormat,
	$ZodDate: () => $ZodDate,
	$ZodDefault: () => $ZodDefault,
	$ZodDiscriminatedUnion: () => $ZodDiscriminatedUnion,
	$ZodE164: () => $ZodE164,
	$ZodEmail: () => $ZodEmail,
	$ZodEmoji: () => $ZodEmoji,
	$ZodEncodeError: () => $ZodEncodeError,
	$ZodEnum: () => $ZodEnum,
	$ZodError: () => $ZodError,
	$ZodFile: () => $ZodFile,
	$ZodFunction: () => $ZodFunction,
	$ZodGUID: () => $ZodGUID,
	$ZodIPv4: () => $ZodIPv4,
	$ZodIPv6: () => $ZodIPv6,
	$ZodISODate: () => $ZodISODate,
	$ZodISODateTime: () => $ZodISODateTime,
	$ZodISODuration: () => $ZodISODuration,
	$ZodISOTime: () => $ZodISOTime,
	$ZodIntersection: () => $ZodIntersection,
	$ZodJWT: () => $ZodJWT,
	$ZodKSUID: () => $ZodKSUID,
	$ZodLazy: () => $ZodLazy,
	$ZodLiteral: () => $ZodLiteral,
	$ZodMap: () => $ZodMap,
	$ZodNaN: () => $ZodNaN,
	$ZodNanoID: () => $ZodNanoID,
	$ZodNever: () => $ZodNever,
	$ZodNonOptional: () => $ZodNonOptional,
	$ZodNull: () => $ZodNull,
	$ZodNullable: () => $ZodNullable,
	$ZodNumber: () => $ZodNumber,
	$ZodNumberFormat: () => $ZodNumberFormat,
	$ZodObject: () => $ZodObject,
	$ZodObjectJIT: () => $ZodObjectJIT,
	$ZodOptional: () => $ZodOptional,
	$ZodPipe: () => $ZodPipe,
	$ZodPrefault: () => $ZodPrefault,
	$ZodPromise: () => $ZodPromise,
	$ZodReadonly: () => $ZodReadonly,
	$ZodRealError: () => $ZodRealError,
	$ZodRecord: () => $ZodRecord,
	$ZodRegistry: () => $ZodRegistry,
	$ZodSet: () => $ZodSet,
	$ZodString: () => $ZodString,
	$ZodStringFormat: () => $ZodStringFormat,
	$ZodSuccess: () => $ZodSuccess,
	$ZodSymbol: () => $ZodSymbol,
	$ZodTemplateLiteral: () => $ZodTemplateLiteral,
	$ZodTransform: () => $ZodTransform,
	$ZodTuple: () => $ZodTuple,
	$ZodType: () => $ZodType,
	$ZodULID: () => $ZodULID,
	$ZodURL: () => $ZodURL,
	$ZodUUID: () => $ZodUUID,
	$ZodUndefined: () => $ZodUndefined,
	$ZodUnion: () => $ZodUnion,
	$ZodUnknown: () => $ZodUnknown,
	$ZodVoid: () => $ZodVoid,
	$ZodXID: () => $ZodXID,
	$brand: () => $brand,
	$constructor: () => $constructor,
	$input: () => $input,
	$output: () => $output,
	Doc: () => Doc,
	JSONSchema: () => json_schema_exports,
	JSONSchemaGenerator: () => JSONSchemaGenerator,
	NEVER: () => NEVER,
	TimePrecision: () => TimePrecision,
	_any: () => _any,
	_array: () => _array,
	_base64: () => _base64,
	_base64url: () => _base64url,
	_bigint: () => _bigint,
	_boolean: () => _boolean,
	_catch: () => _catch$1,
	_check: () => _check,
	_cidrv4: () => _cidrv4,
	_cidrv6: () => _cidrv6,
	_coercedBigint: () => _coercedBigint,
	_coercedBoolean: () => _coercedBoolean,
	_coercedDate: () => _coercedDate,
	_coercedNumber: () => _coercedNumber,
	_coercedString: () => _coercedString,
	_cuid: () => _cuid,
	_cuid2: () => _cuid2,
	_custom: () => _custom,
	_date: () => _date,
	_decode: () => _decode,
	_decodeAsync: () => _decodeAsync,
	_default: () => _default$1,
	_discriminatedUnion: () => _discriminatedUnion,
	_e164: () => _e164,
	_email: () => _email,
	_emoji: () => _emoji,
	_encode: () => _encode,
	_encodeAsync: () => _encodeAsync,
	_endsWith: () => _endsWith,
	_enum: () => _enum$1,
	_file: () => _file,
	_float32: () => _float32,
	_float64: () => _float64,
	_gt: () => _gt,
	_gte: () => _gte,
	_guid: () => _guid,
	_includes: () => _includes,
	_int: () => _int,
	_int32: () => _int32,
	_int64: () => _int64,
	_intersection: () => _intersection,
	_ipv4: () => _ipv4,
	_ipv6: () => _ipv6,
	_isoDate: () => _isoDate,
	_isoDateTime: () => _isoDateTime,
	_isoDuration: () => _isoDuration,
	_isoTime: () => _isoTime,
	_jwt: () => _jwt,
	_ksuid: () => _ksuid,
	_lazy: () => _lazy,
	_length: () => _length,
	_literal: () => _literal,
	_lowercase: () => _lowercase,
	_lt: () => _lt,
	_lte: () => _lte,
	_map: () => _map,
	_max: () => _lte,
	_maxLength: () => _maxLength,
	_maxSize: () => _maxSize,
	_mime: () => _mime,
	_min: () => _gte,
	_minLength: () => _minLength,
	_minSize: () => _minSize,
	_multipleOf: () => _multipleOf,
	_nan: () => _nan,
	_nanoid: () => _nanoid,
	_nativeEnum: () => _nativeEnum,
	_negative: () => _negative,
	_never: () => _never,
	_nonnegative: () => _nonnegative,
	_nonoptional: () => _nonoptional,
	_nonpositive: () => _nonpositive,
	_normalize: () => _normalize,
	_null: () => _null$1,
	_nullable: () => _nullable,
	_number: () => _number,
	_optional: () => _optional,
	_overwrite: () => _overwrite,
	_parse: () => _parse,
	_parseAsync: () => _parseAsync,
	_pipe: () => _pipe,
	_positive: () => _positive,
	_promise: () => _promise,
	_property: () => _property,
	_readonly: () => _readonly,
	_record: () => _record,
	_refine: () => _refine,
	_regex: () => _regex,
	_safeDecode: () => _safeDecode,
	_safeDecodeAsync: () => _safeDecodeAsync,
	_safeEncode: () => _safeEncode,
	_safeEncodeAsync: () => _safeEncodeAsync,
	_safeParse: () => _safeParse,
	_safeParseAsync: () => _safeParseAsync,
	_set: () => _set,
	_size: () => _size,
	_startsWith: () => _startsWith,
	_string: () => _string,
	_stringFormat: () => _stringFormat,
	_stringbool: () => _stringbool,
	_success: () => _success,
	_superRefine: () => _superRefine,
	_symbol: () => _symbol,
	_templateLiteral: () => _templateLiteral,
	_toLowerCase: () => _toLowerCase,
	_toUpperCase: () => _toUpperCase,
	_transform: () => _transform,
	_trim: () => _trim,
	_tuple: () => _tuple,
	_uint32: () => _uint32,
	_uint64: () => _uint64,
	_ulid: () => _ulid,
	_undefined: () => _undefined$1,
	_union: () => _union,
	_unknown: () => _unknown,
	_uppercase: () => _uppercase,
	_url: () => _url,
	_uuid: () => _uuid,
	_uuidv4: () => _uuidv4,
	_uuidv6: () => _uuidv6,
	_uuidv7: () => _uuidv7,
	_void: () => _void$1,
	_xid: () => _xid,
	clone: () => clone,
	config: () => config,
	decode: () => decode$1,
	decodeAsync: () => decodeAsync$1,
	encode: () => encode$1,
	encodeAsync: () => encodeAsync$1,
	flattenError: () => flattenError,
	formatError: () => formatError,
	globalConfig: () => globalConfig,
	globalRegistry: () => globalRegistry,
	isValidBase64: () => isValidBase64,
	isValidBase64URL: () => isValidBase64URL,
	isValidJWT: () => isValidJWT,
	locales: () => locales_exports,
	parse: () => parse$1,
	parseAsync: () => parseAsync$1,
	prettifyError: () => prettifyError,
	regexes: () => regexes_exports,
	registry: () => registry,
	safeDecode: () => safeDecode$1,
	safeDecodeAsync: () => safeDecodeAsync$1,
	safeEncode: () => safeEncode$1,
	safeEncodeAsync: () => safeEncodeAsync$1,
	safeParse: () => safeParse$1,
	safeParseAsync: () => safeParseAsync$1,
	toDotPath: () => toDotPath,
	toJSONSchema: () => toJSONSchema,
	treeifyError: () => treeifyError,
	util: () => util_exports,
	version: () => version
});

//#endregion
//#region node_modules/zod/v4/classic/iso.js
var iso_exports = /* @__PURE__ */ __export({
	ZodISODate: () => ZodISODate,
	ZodISODateTime: () => ZodISODateTime,
	ZodISODuration: () => ZodISODuration,
	ZodISOTime: () => ZodISOTime,
	date: () => date$2,
	datetime: () => datetime,
	duration: () => duration,
	time: () => time
});
const ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
	$ZodISODateTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function datetime(params) {
	return _isoDateTime(ZodISODateTime, params);
}
const ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
	$ZodISODate.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function date$2(params) {
	return _isoDate(ZodISODate, params);
}
const ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
	$ZodISOTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function time(params) {
	return _isoTime(ZodISOTime, params);
}
const ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
	$ZodISODuration.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function duration(params) {
	return _isoDuration(ZodISODuration, params);
}

//#endregion
//#region node_modules/zod/v4/classic/errors.js
const initializer = (inst, issues) => {
	$ZodError.init(inst, issues);
	inst.name = "ZodError";
	Object.defineProperties(inst, {
		format: { value: (mapper) => formatError(inst, mapper) },
		flatten: { value: (mapper) => flattenError(inst, mapper) },
		addIssue: { value: (issue$1) => {
			inst.issues.push(issue$1);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		addIssues: { value: (issues$1) => {
			inst.issues.push(...issues$1);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		isEmpty: { get() {
			return inst.issues.length === 0;
		} }
	});
};
const ZodError = $constructor("ZodError", initializer);
const ZodRealError = $constructor("ZodError", initializer, { Parent: Error });

//#endregion
//#region node_modules/zod/v4/classic/parse.js
const parse = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
const encode = /* @__PURE__ */ _encode(ZodRealError);
const decode = /* @__PURE__ */ _decode(ZodRealError);
const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

//#endregion
//#region node_modules/zod/v4/classic/schemas.js
const ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
	$ZodType.init(inst, def);
	inst.def = def;
	inst.type = def.type;
	Object.defineProperty(inst, "_def", { value: def });
	inst.check = (...checks) => {
		return inst.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...checks.map((ch) => typeof ch === "function" ? { _zod: {
			check: ch,
			def: { check: "custom" },
			onattach: []
		} } : ch)] }));
	};
	inst.clone = (def$1, params) => clone(inst, def$1, params);
	inst.brand = () => inst;
	inst.register = ((reg, meta) => {
		reg.add(inst, meta);
		return inst;
	});
	inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
	inst.safeParse = (data, params) => safeParse(inst, data, params);
	inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
	inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
	inst.spa = inst.safeParseAsync;
	inst.encode = (data, params) => encode(inst, data, params);
	inst.decode = (data, params) => decode(inst, data, params);
	inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
	inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
	inst.safeEncode = (data, params) => safeEncode(inst, data, params);
	inst.safeDecode = (data, params) => safeDecode(inst, data, params);
	inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
	inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
	inst.refine = (check$1, params) => inst.check(refine(check$1, params));
	inst.superRefine = (refinement) => inst.check(superRefine(refinement));
	inst.overwrite = (fn) => inst.check(_overwrite(fn));
	inst.optional = () => optional(inst);
	inst.nullable = () => nullable(inst);
	inst.nullish = () => optional(nullable(inst));
	inst.nonoptional = (params) => nonoptional(inst, params);
	inst.array = () => array(inst);
	inst.or = (arg) => union([inst, arg]);
	inst.and = (arg) => intersection(inst, arg);
	inst.transform = (tx) => pipe(inst, transform(tx));
	inst.default = (def$1) => _default(inst, def$1);
	inst.prefault = (def$1) => prefault(inst, def$1);
	inst.catch = (params) => _catch(inst, params);
	inst.pipe = (target) => pipe(inst, target);
	inst.readonly = () => readonly(inst);
	inst.describe = (description) => {
		const cl = inst.clone();
		globalRegistry.add(cl, { description });
		return cl;
	};
	Object.defineProperty(inst, "description", {
		get() {
			return globalRegistry.get(inst)?.description;
		},
		configurable: true
	});
	inst.meta = (...args) => {
		if (args.length === 0) return globalRegistry.get(inst);
		const cl = inst.clone();
		globalRegistry.add(cl, args[0]);
		return cl;
	};
	inst.isOptional = () => inst.safeParse(void 0).success;
	inst.isNullable = () => inst.safeParse(null).success;
	return inst;
});
/** @internal */
const _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	ZodType.init(inst, def);
	const bag = inst._zod.bag;
	inst.format = bag.format ?? null;
	inst.minLength = bag.minimum ?? null;
	inst.maxLength = bag.maximum ?? null;
	inst.regex = (...args) => inst.check(_regex(...args));
	inst.includes = (...args) => inst.check(_includes(...args));
	inst.startsWith = (...args) => inst.check(_startsWith(...args));
	inst.endsWith = (...args) => inst.check(_endsWith(...args));
	inst.min = (...args) => inst.check(_minLength(...args));
	inst.max = (...args) => inst.check(_maxLength(...args));
	inst.length = (...args) => inst.check(_length(...args));
	inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
	inst.lowercase = (params) => inst.check(_lowercase(params));
	inst.uppercase = (params) => inst.check(_uppercase(params));
	inst.trim = () => inst.check(_trim());
	inst.normalize = (...args) => inst.check(_normalize(...args));
	inst.toLowerCase = () => inst.check(_toLowerCase());
	inst.toUpperCase = () => inst.check(_toUpperCase());
});
const ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	_ZodString.init(inst, def);
	inst.email = (params) => inst.check(_email(ZodEmail, params));
	inst.url = (params) => inst.check(_url(ZodURL, params));
	inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
	inst.emoji = (params) => inst.check(_emoji(ZodEmoji, params));
	inst.guid = (params) => inst.check(_guid(ZodGUID, params));
	inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
	inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
	inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
	inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
	inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
	inst.guid = (params) => inst.check(_guid(ZodGUID, params));
	inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
	inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
	inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
	inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
	inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
	inst.xid = (params) => inst.check(_xid(ZodXID, params));
	inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
	inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
	inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
	inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
	inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
	inst.e164 = (params) => inst.check(_e164(ZodE164, params));
	inst.datetime = (params) => inst.check(datetime(params));
	inst.date = (params) => inst.check(date$2(params));
	inst.time = (params) => inst.check(time(params));
	inst.duration = (params) => inst.check(duration(params));
});
function string$1(params) {
	return _string(ZodString, params);
}
const ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	_ZodString.init(inst, def);
});
const ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
	$ZodEmail.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function email(params) {
	return _email(ZodEmail, params);
}
const ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
	$ZodGUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function guid(params) {
	return _guid(ZodGUID, params);
}
const ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
	$ZodUUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function uuid(params) {
	return _uuid(ZodUUID, params);
}
function uuidv4(params) {
	return _uuidv4(ZodUUID, params);
}
function uuidv6(params) {
	return _uuidv6(ZodUUID, params);
}
function uuidv7(params) {
	return _uuidv7(ZodUUID, params);
}
const ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
	$ZodURL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function url(params) {
	return _url(ZodURL, params);
}
function httpUrl(params) {
	return _url(ZodURL, {
		protocol: /^https?$/,
		hostname: domain,
		...normalizeParams(params)
	});
}
const ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
	$ZodEmoji.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function emoji(params) {
	return _emoji(ZodEmoji, params);
}
const ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
	$ZodNanoID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function nanoid(params) {
	return _nanoid(ZodNanoID, params);
}
const ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
	$ZodCUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function cuid(params) {
	return _cuid(ZodCUID, params);
}
const ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
	$ZodCUID2.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function cuid2(params) {
	return _cuid2(ZodCUID2, params);
}
const ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
	$ZodULID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function ulid(params) {
	return _ulid(ZodULID, params);
}
const ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
	$ZodXID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function xid(params) {
	return _xid(ZodXID, params);
}
const ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
	$ZodKSUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function ksuid(params) {
	return _ksuid(ZodKSUID, params);
}
const ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
	$ZodIPv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function ipv4(params) {
	return _ipv4(ZodIPv4, params);
}
const ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
	$ZodIPv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function ipv6(params) {
	return _ipv6(ZodIPv6, params);
}
const ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
	$ZodCIDRv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function cidrv4(params) {
	return _cidrv4(ZodCIDRv4, params);
}
const ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
	$ZodCIDRv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function cidrv6(params) {
	return _cidrv6(ZodCIDRv6, params);
}
const ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
	$ZodBase64.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function base64(params) {
	return _base64(ZodBase64, params);
}
const ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
	$ZodBase64URL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function base64url(params) {
	return _base64url(ZodBase64URL, params);
}
const ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
	$ZodE164.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function e164(params) {
	return _e164(ZodE164, params);
}
const ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
	$ZodJWT.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function jwt(params) {
	return _jwt(ZodJWT, params);
}
const ZodCustomStringFormat = /* @__PURE__ */ $constructor("ZodCustomStringFormat", (inst, def) => {
	$ZodCustomStringFormat.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function stringFormat(format, fnOrRegex, _params = {}) {
	return _stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
}
function hostname(_params) {
	return _stringFormat(ZodCustomStringFormat, "hostname", hostname$1, _params);
}
function hex(_params) {
	return _stringFormat(ZodCustomStringFormat, "hex", hex$1, _params);
}
function hash(alg, params) {
	const format = `${alg}_${params?.enc ?? "hex"}`;
	const regex = regexes_exports[format];
	if (!regex) throw new Error(`Unrecognized hash format: ${format}`);
	return _stringFormat(ZodCustomStringFormat, format, regex, params);
}
const ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
	$ZodNumber.init(inst, def);
	ZodType.init(inst, def);
	inst.gt = (value, params) => inst.check(_gt(value, params));
	inst.gte = (value, params) => inst.check(_gte(value, params));
	inst.min = (value, params) => inst.check(_gte(value, params));
	inst.lt = (value, params) => inst.check(_lt(value, params));
	inst.lte = (value, params) => inst.check(_lte(value, params));
	inst.max = (value, params) => inst.check(_lte(value, params));
	inst.int = (params) => inst.check(int(params));
	inst.safe = (params) => inst.check(int(params));
	inst.positive = (params) => inst.check(_gt(0, params));
	inst.nonnegative = (params) => inst.check(_gte(0, params));
	inst.negative = (params) => inst.check(_lt(0, params));
	inst.nonpositive = (params) => inst.check(_lte(0, params));
	inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
	inst.step = (value, params) => inst.check(_multipleOf(value, params));
	inst.finite = () => inst;
	const bag = inst._zod.bag;
	inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
	inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
	inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
	inst.isFinite = true;
	inst.format = bag.format ?? null;
});
function number$1(params) {
	return _number(ZodNumber, params);
}
const ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
	$ZodNumberFormat.init(inst, def);
	ZodNumber.init(inst, def);
});
function int(params) {
	return _int(ZodNumberFormat, params);
}
function float32(params) {
	return _float32(ZodNumberFormat, params);
}
function float64(params) {
	return _float64(ZodNumberFormat, params);
}
function int32(params) {
	return _int32(ZodNumberFormat, params);
}
function uint32(params) {
	return _uint32(ZodNumberFormat, params);
}
const ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
	$ZodBoolean.init(inst, def);
	ZodType.init(inst, def);
});
function boolean$1(params) {
	return _boolean(ZodBoolean, params);
}
const ZodBigInt = /* @__PURE__ */ $constructor("ZodBigInt", (inst, def) => {
	$ZodBigInt.init(inst, def);
	ZodType.init(inst, def);
	inst.gte = (value, params) => inst.check(_gte(value, params));
	inst.min = (value, params) => inst.check(_gte(value, params));
	inst.gt = (value, params) => inst.check(_gt(value, params));
	inst.gte = (value, params) => inst.check(_gte(value, params));
	inst.min = (value, params) => inst.check(_gte(value, params));
	inst.lt = (value, params) => inst.check(_lt(value, params));
	inst.lte = (value, params) => inst.check(_lte(value, params));
	inst.max = (value, params) => inst.check(_lte(value, params));
	inst.positive = (params) => inst.check(_gt(BigInt(0), params));
	inst.negative = (params) => inst.check(_lt(BigInt(0), params));
	inst.nonpositive = (params) => inst.check(_lte(BigInt(0), params));
	inst.nonnegative = (params) => inst.check(_gte(BigInt(0), params));
	inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
	const bag = inst._zod.bag;
	inst.minValue = bag.minimum ?? null;
	inst.maxValue = bag.maximum ?? null;
	inst.format = bag.format ?? null;
});
function bigint$1(params) {
	return _bigint(ZodBigInt, params);
}
const ZodBigIntFormat = /* @__PURE__ */ $constructor("ZodBigIntFormat", (inst, def) => {
	$ZodBigIntFormat.init(inst, def);
	ZodBigInt.init(inst, def);
});
function int64(params) {
	return _int64(ZodBigIntFormat, params);
}
function uint64(params) {
	return _uint64(ZodBigIntFormat, params);
}
const ZodSymbol = /* @__PURE__ */ $constructor("ZodSymbol", (inst, def) => {
	$ZodSymbol.init(inst, def);
	ZodType.init(inst, def);
});
function symbol(params) {
	return _symbol(ZodSymbol, params);
}
const ZodUndefined = /* @__PURE__ */ $constructor("ZodUndefined", (inst, def) => {
	$ZodUndefined.init(inst, def);
	ZodType.init(inst, def);
});
function _undefined(params) {
	return _undefined$1(ZodUndefined, params);
}
const ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
	$ZodNull.init(inst, def);
	ZodType.init(inst, def);
});
function _null(params) {
	return _null$1(ZodNull, params);
}
const ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
	$ZodAny.init(inst, def);
	ZodType.init(inst, def);
});
function any() {
	return _any(ZodAny);
}
const ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
	$ZodUnknown.init(inst, def);
	ZodType.init(inst, def);
});
function unknown() {
	return _unknown(ZodUnknown);
}
const ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
	$ZodNever.init(inst, def);
	ZodType.init(inst, def);
});
function never(params) {
	return _never(ZodNever, params);
}
const ZodVoid = /* @__PURE__ */ $constructor("ZodVoid", (inst, def) => {
	$ZodVoid.init(inst, def);
	ZodType.init(inst, def);
});
function _void(params) {
	return _void$1(ZodVoid, params);
}
const ZodDate = /* @__PURE__ */ $constructor("ZodDate", (inst, def) => {
	$ZodDate.init(inst, def);
	ZodType.init(inst, def);
	inst.min = (value, params) => inst.check(_gte(value, params));
	inst.max = (value, params) => inst.check(_lte(value, params));
	const c = inst._zod.bag;
	inst.minDate = c.minimum ? new Date(c.minimum) : null;
	inst.maxDate = c.maximum ? new Date(c.maximum) : null;
});
function date$1(params) {
	return _date(ZodDate, params);
}
const ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
	$ZodArray.init(inst, def);
	ZodType.init(inst, def);
	inst.element = def.element;
	inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
	inst.nonempty = (params) => inst.check(_minLength(1, params));
	inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
	inst.length = (len, params) => inst.check(_length(len, params));
	inst.unwrap = () => inst.element;
});
function array(element, params) {
	return _array(ZodArray, element, params);
}
function keyof(schema) {
	const shape = schema._zod.def.shape;
	return _enum(Object.keys(shape));
}
const ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
	$ZodObjectJIT.init(inst, def);
	ZodType.init(inst, def);
	defineLazy(inst, "shape", () => {
		return def.shape;
	});
	inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
	inst.catchall = (catchall) => inst.clone({
		...inst._zod.def,
		catchall
	});
	inst.passthrough = () => inst.clone({
		...inst._zod.def,
		catchall: unknown()
	});
	inst.loose = () => inst.clone({
		...inst._zod.def,
		catchall: unknown()
	});
	inst.strict = () => inst.clone({
		...inst._zod.def,
		catchall: never()
	});
	inst.strip = () => inst.clone({
		...inst._zod.def,
		catchall: void 0
	});
	inst.extend = (incoming) => {
		return extend(inst, incoming);
	};
	inst.safeExtend = (incoming) => {
		return safeExtend(inst, incoming);
	};
	inst.merge = (other) => merge(inst, other);
	inst.pick = (mask) => pick(inst, mask);
	inst.omit = (mask) => omit(inst, mask);
	inst.partial = (...args) => partial(ZodOptional, inst, args[0]);
	inst.required = (...args) => required(ZodNonOptional, inst, args[0]);
});
function object(shape, params) {
	return new ZodObject({
		type: "object",
		shape: shape ?? {},
		...normalizeParams(params)
	});
}
function strictObject(shape, params) {
	return new ZodObject({
		type: "object",
		shape,
		catchall: never(),
		...normalizeParams(params)
	});
}
function looseObject(shape, params) {
	return new ZodObject({
		type: "object",
		shape,
		catchall: unknown(),
		...normalizeParams(params)
	});
}
const ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
	$ZodUnion.init(inst, def);
	ZodType.init(inst, def);
	inst.options = def.options;
});
function union(options, params) {
	return new ZodUnion({
		type: "union",
		options,
		...normalizeParams(params)
	});
}
const ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
	ZodUnion.init(inst, def);
	$ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
	return new ZodDiscriminatedUnion({
		type: "union",
		options,
		discriminator,
		...normalizeParams(params)
	});
}
const ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
	$ZodIntersection.init(inst, def);
	ZodType.init(inst, def);
});
function intersection(left, right) {
	return new ZodIntersection({
		type: "intersection",
		left,
		right
	});
}
const ZodTuple = /* @__PURE__ */ $constructor("ZodTuple", (inst, def) => {
	$ZodTuple.init(inst, def);
	ZodType.init(inst, def);
	inst.rest = (rest) => inst.clone({
		...inst._zod.def,
		rest
	});
});
function tuple(items, _paramsOrRest, _params) {
	const hasRest = _paramsOrRest instanceof $ZodType;
	const params = hasRest ? _params : _paramsOrRest;
	return new ZodTuple({
		type: "tuple",
		items,
		rest: hasRest ? _paramsOrRest : null,
		...normalizeParams(params)
	});
}
const ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
	$ZodRecord.init(inst, def);
	ZodType.init(inst, def);
	inst.keyType = def.keyType;
	inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
	return new ZodRecord({
		type: "record",
		keyType,
		valueType,
		...normalizeParams(params)
	});
}
function partialRecord(keyType, valueType, params) {
	const k = clone(keyType);
	k._zod.values = void 0;
	return new ZodRecord({
		type: "record",
		keyType: k,
		valueType,
		...normalizeParams(params)
	});
}
const ZodMap = /* @__PURE__ */ $constructor("ZodMap", (inst, def) => {
	$ZodMap.init(inst, def);
	ZodType.init(inst, def);
	inst.keyType = def.keyType;
	inst.valueType = def.valueType;
});
function map(keyType, valueType, params) {
	return new ZodMap({
		type: "map",
		keyType,
		valueType,
		...normalizeParams(params)
	});
}
const ZodSet = /* @__PURE__ */ $constructor("ZodSet", (inst, def) => {
	$ZodSet.init(inst, def);
	ZodType.init(inst, def);
	inst.min = (...args) => inst.check(_minSize(...args));
	inst.nonempty = (params) => inst.check(_minSize(1, params));
	inst.max = (...args) => inst.check(_maxSize(...args));
	inst.size = (...args) => inst.check(_size(...args));
});
function set(valueType, params) {
	return new ZodSet({
		type: "set",
		valueType,
		...normalizeParams(params)
	});
}
const ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
	$ZodEnum.init(inst, def);
	ZodType.init(inst, def);
	inst.enum = def.entries;
	inst.options = Object.values(def.entries);
	const keys = new Set(Object.keys(def.entries));
	inst.extract = (values, params) => {
		const newEntries = {};
		for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
	inst.exclude = (values, params) => {
		const newEntries = { ...def.entries };
		for (const value of values) if (keys.has(value)) delete newEntries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
});
function _enum(values, params) {
	return new ZodEnum({
		type: "enum",
		entries: Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values,
		...normalizeParams(params)
	});
}
/** @deprecated This API has been merged into `z.enum()`. Use `z.enum()` instead.
*
* ```ts
* enum Colors { red, green, blue }
* z.enum(Colors);
* ```
*/
function nativeEnum(entries, params) {
	return new ZodEnum({
		type: "enum",
		entries,
		...normalizeParams(params)
	});
}
const ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
	$ZodLiteral.init(inst, def);
	ZodType.init(inst, def);
	inst.values = new Set(def.values);
	Object.defineProperty(inst, "value", { get() {
		if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
		return def.values[0];
	} });
});
function literal(value, params) {
	return new ZodLiteral({
		type: "literal",
		values: Array.isArray(value) ? value : [value],
		...normalizeParams(params)
	});
}
const ZodFile = /* @__PURE__ */ $constructor("ZodFile", (inst, def) => {
	$ZodFile.init(inst, def);
	ZodType.init(inst, def);
	inst.min = (size, params) => inst.check(_minSize(size, params));
	inst.max = (size, params) => inst.check(_maxSize(size, params));
	inst.mime = (types, params) => inst.check(_mime(Array.isArray(types) ? types : [types], params));
});
function file(params) {
	return _file(ZodFile, params);
}
const ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
	$ZodTransform.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		payload.addIssue = (issue$1) => {
			if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
			else {
				const _issue = issue$1;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = inst);
				payload.issues.push(issue(_issue));
			}
		};
		const output = def.transform(payload.value, payload);
		if (output instanceof Promise) return output.then((output$1) => {
			payload.value = output$1;
			return payload;
		});
		payload.value = output;
		return payload;
	};
});
function transform(fn) {
	return new ZodTransform({
		type: "transform",
		transform: fn
	});
}
const ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
	return new ZodOptional({
		type: "optional",
		innerType
	});
}
const ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
	$ZodNullable.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
	return new ZodNullable({
		type: "nullable",
		innerType
	});
}
function nullish(innerType) {
	return optional(nullable(innerType));
}
const ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
	$ZodDefault.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
	return new ZodDefault({
		type: "default",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
const ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
	$ZodPrefault.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
	return new ZodPrefault({
		type: "prefault",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
const ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
	$ZodNonOptional.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
	return new ZodNonOptional({
		type: "nonoptional",
		innerType,
		...normalizeParams(params)
	});
}
const ZodSuccess = /* @__PURE__ */ $constructor("ZodSuccess", (inst, def) => {
	$ZodSuccess.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function success(innerType) {
	return new ZodSuccess({
		type: "success",
		innerType
	});
}
const ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
	$ZodCatch.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
	return new ZodCatch({
		type: "catch",
		innerType,
		catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
	});
}
const ZodNaN = /* @__PURE__ */ $constructor("ZodNaN", (inst, def) => {
	$ZodNaN.init(inst, def);
	ZodType.init(inst, def);
});
function nan(params) {
	return _nan(ZodNaN, params);
}
const ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
	$ZodPipe.init(inst, def);
	ZodType.init(inst, def);
	inst.in = def.in;
	inst.out = def.out;
});
function pipe(in_, out) {
	return new ZodPipe({
		type: "pipe",
		in: in_,
		out
	});
}
const ZodCodec = /* @__PURE__ */ $constructor("ZodCodec", (inst, def) => {
	ZodPipe.init(inst, def);
	$ZodCodec.init(inst, def);
});
function codec(in_, out, params) {
	return new ZodCodec({
		type: "pipe",
		in: in_,
		out,
		transform: params.decode,
		reverseTransform: params.encode
	});
}
const ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
	$ZodReadonly.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
	return new ZodReadonly({
		type: "readonly",
		innerType
	});
}
const ZodTemplateLiteral = /* @__PURE__ */ $constructor("ZodTemplateLiteral", (inst, def) => {
	$ZodTemplateLiteral.init(inst, def);
	ZodType.init(inst, def);
});
function templateLiteral(parts, params) {
	return new ZodTemplateLiteral({
		type: "template_literal",
		parts,
		...normalizeParams(params)
	});
}
const ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
	$ZodLazy.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.getter();
});
function lazy(getter) {
	return new ZodLazy({
		type: "lazy",
		getter
	});
}
const ZodPromise = /* @__PURE__ */ $constructor("ZodPromise", (inst, def) => {
	$ZodPromise.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function promise(innerType) {
	return new ZodPromise({
		type: "promise",
		innerType
	});
}
const ZodFunction = /* @__PURE__ */ $constructor("ZodFunction", (inst, def) => {
	$ZodFunction.init(inst, def);
	ZodType.init(inst, def);
});
function _function(params) {
	return new ZodFunction({
		type: "function",
		input: Array.isArray(params?.input) ? tuple(params?.input) : params?.input ?? array(unknown()),
		output: params?.output ?? unknown()
	});
}
const ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
	$ZodCustom.init(inst, def);
	ZodType.init(inst, def);
});
function check(fn) {
	const ch = new $ZodCheck({ check: "custom" });
	ch._zod.check = fn;
	return ch;
}
function custom(fn, _params) {
	return _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
	return _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
	return _superRefine(fn);
}
function _instanceof(cls, params = { error: `Input not instance of ${cls.name}` }) {
	const inst = new ZodCustom({
		type: "custom",
		check: "custom",
		fn: (data) => data instanceof cls,
		abort: true,
		...normalizeParams(params)
	});
	inst._zod.bag.Class = cls;
	return inst;
}
const stringbool = (...args) => _stringbool({
	Codec: ZodCodec,
	Boolean: ZodBoolean,
	String: ZodString
}, ...args);
function json(params) {
	const jsonSchema = lazy(() => {
		return union([
			string$1(params),
			number$1(),
			boolean$1(),
			_null(),
			array(jsonSchema),
			record(string$1(), jsonSchema)
		]);
	});
	return jsonSchema;
}
function preprocess(fn, schema) {
	return pipe(transform(fn), schema);
}

//#endregion
//#region node_modules/zod/v4/classic/compat.js
/** @deprecated Use the raw string literal codes instead, e.g. "invalid_type". */
const ZodIssueCode = {
	invalid_type: "invalid_type",
	too_big: "too_big",
	too_small: "too_small",
	invalid_format: "invalid_format",
	not_multiple_of: "not_multiple_of",
	unrecognized_keys: "unrecognized_keys",
	invalid_union: "invalid_union",
	invalid_key: "invalid_key",
	invalid_element: "invalid_element",
	invalid_value: "invalid_value",
	custom: "custom"
};
/** @deprecated Use `z.config(params)` instead. */
function setErrorMap(map$1) {
	config({ customError: map$1 });
}
/** @deprecated Use `z.config()` instead. */
function getErrorMap() {
	return config().customError;
}
/** @deprecated Do not use. Stub definition, only included for zod-to-json-schema compatibility. */
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind$1) {})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));

//#endregion
//#region node_modules/zod/v4/classic/coerce.js
var coerce_exports = /* @__PURE__ */ __export({
	bigint: () => bigint,
	boolean: () => boolean,
	date: () => date,
	number: () => number,
	string: () => string
});
function string(params) {
	return _coercedString(ZodString, params);
}
function number(params) {
	return _coercedNumber(ZodNumber, params);
}
function boolean(params) {
	return _coercedBoolean(ZodBoolean, params);
}
function bigint(params) {
	return _coercedBigint(ZodBigInt, params);
}
function date(params) {
	return _coercedDate(ZodDate, params);
}

//#endregion
//#region node_modules/zod/v4/classic/external.js
var external_exports = /* @__PURE__ */ __export({
	$brand: () => $brand,
	$input: () => $input,
	$output: () => $output,
	NEVER: () => NEVER,
	TimePrecision: () => TimePrecision,
	ZodAny: () => ZodAny,
	ZodArray: () => ZodArray,
	ZodBase64: () => ZodBase64,
	ZodBase64URL: () => ZodBase64URL,
	ZodBigInt: () => ZodBigInt,
	ZodBigIntFormat: () => ZodBigIntFormat,
	ZodBoolean: () => ZodBoolean,
	ZodCIDRv4: () => ZodCIDRv4,
	ZodCIDRv6: () => ZodCIDRv6,
	ZodCUID: () => ZodCUID,
	ZodCUID2: () => ZodCUID2,
	ZodCatch: () => ZodCatch,
	ZodCodec: () => ZodCodec,
	ZodCustom: () => ZodCustom,
	ZodCustomStringFormat: () => ZodCustomStringFormat,
	ZodDate: () => ZodDate,
	ZodDefault: () => ZodDefault,
	ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
	ZodE164: () => ZodE164,
	ZodEmail: () => ZodEmail,
	ZodEmoji: () => ZodEmoji,
	ZodEnum: () => ZodEnum,
	ZodError: () => ZodError,
	ZodFile: () => ZodFile,
	ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
	ZodFunction: () => ZodFunction,
	ZodGUID: () => ZodGUID,
	ZodIPv4: () => ZodIPv4,
	ZodIPv6: () => ZodIPv6,
	ZodISODate: () => ZodISODate,
	ZodISODateTime: () => ZodISODateTime,
	ZodISODuration: () => ZodISODuration,
	ZodISOTime: () => ZodISOTime,
	ZodIntersection: () => ZodIntersection,
	ZodIssueCode: () => ZodIssueCode,
	ZodJWT: () => ZodJWT,
	ZodKSUID: () => ZodKSUID,
	ZodLazy: () => ZodLazy,
	ZodLiteral: () => ZodLiteral,
	ZodMap: () => ZodMap,
	ZodNaN: () => ZodNaN,
	ZodNanoID: () => ZodNanoID,
	ZodNever: () => ZodNever,
	ZodNonOptional: () => ZodNonOptional,
	ZodNull: () => ZodNull,
	ZodNullable: () => ZodNullable,
	ZodNumber: () => ZodNumber,
	ZodNumberFormat: () => ZodNumberFormat,
	ZodObject: () => ZodObject,
	ZodOptional: () => ZodOptional,
	ZodPipe: () => ZodPipe,
	ZodPrefault: () => ZodPrefault,
	ZodPromise: () => ZodPromise,
	ZodReadonly: () => ZodReadonly,
	ZodRealError: () => ZodRealError,
	ZodRecord: () => ZodRecord,
	ZodSet: () => ZodSet,
	ZodString: () => ZodString,
	ZodStringFormat: () => ZodStringFormat,
	ZodSuccess: () => ZodSuccess,
	ZodSymbol: () => ZodSymbol,
	ZodTemplateLiteral: () => ZodTemplateLiteral,
	ZodTransform: () => ZodTransform,
	ZodTuple: () => ZodTuple,
	ZodType: () => ZodType,
	ZodULID: () => ZodULID,
	ZodURL: () => ZodURL,
	ZodUUID: () => ZodUUID,
	ZodUndefined: () => ZodUndefined,
	ZodUnion: () => ZodUnion,
	ZodUnknown: () => ZodUnknown,
	ZodVoid: () => ZodVoid,
	ZodXID: () => ZodXID,
	_ZodString: () => _ZodString,
	_default: () => _default,
	_function: () => _function,
	any: () => any,
	array: () => array,
	base64: () => base64,
	base64url: () => base64url,
	bigint: () => bigint$1,
	boolean: () => boolean$1,
	catch: () => _catch,
	check: () => check,
	cidrv4: () => cidrv4,
	cidrv6: () => cidrv6,
	clone: () => clone,
	codec: () => codec,
	coerce: () => coerce_exports,
	config: () => config,
	core: () => core_exports,
	cuid: () => cuid,
	cuid2: () => cuid2,
	custom: () => custom,
	date: () => date$1,
	decode: () => decode,
	decodeAsync: () => decodeAsync,
	discriminatedUnion: () => discriminatedUnion,
	e164: () => e164,
	email: () => email,
	emoji: () => emoji,
	encode: () => encode,
	encodeAsync: () => encodeAsync,
	endsWith: () => _endsWith,
	enum: () => _enum,
	file: () => file,
	flattenError: () => flattenError,
	float32: () => float32,
	float64: () => float64,
	formatError: () => formatError,
	function: () => _function,
	getErrorMap: () => getErrorMap,
	globalRegistry: () => globalRegistry,
	gt: () => _gt,
	gte: () => _gte,
	guid: () => guid,
	hash: () => hash,
	hex: () => hex,
	hostname: () => hostname,
	httpUrl: () => httpUrl,
	includes: () => _includes,
	instanceof: () => _instanceof,
	int: () => int,
	int32: () => int32,
	int64: () => int64,
	intersection: () => intersection,
	ipv4: () => ipv4,
	ipv6: () => ipv6,
	iso: () => iso_exports,
	json: () => json,
	jwt: () => jwt,
	keyof: () => keyof,
	ksuid: () => ksuid,
	lazy: () => lazy,
	length: () => _length,
	literal: () => literal,
	locales: () => locales_exports,
	looseObject: () => looseObject,
	lowercase: () => _lowercase,
	lt: () => _lt,
	lte: () => _lte,
	map: () => map,
	maxLength: () => _maxLength,
	maxSize: () => _maxSize,
	mime: () => _mime,
	minLength: () => _minLength,
	minSize: () => _minSize,
	multipleOf: () => _multipleOf,
	nan: () => nan,
	nanoid: () => nanoid,
	nativeEnum: () => nativeEnum,
	negative: () => _negative,
	never: () => never,
	nonnegative: () => _nonnegative,
	nonoptional: () => nonoptional,
	nonpositive: () => _nonpositive,
	normalize: () => _normalize,
	null: () => _null,
	nullable: () => nullable,
	nullish: () => nullish,
	number: () => number$1,
	object: () => object,
	optional: () => optional,
	overwrite: () => _overwrite,
	parse: () => parse,
	parseAsync: () => parseAsync,
	partialRecord: () => partialRecord,
	pipe: () => pipe,
	positive: () => _positive,
	prefault: () => prefault,
	preprocess: () => preprocess,
	prettifyError: () => prettifyError,
	promise: () => promise,
	property: () => _property,
	readonly: () => readonly,
	record: () => record,
	refine: () => refine,
	regex: () => _regex,
	regexes: () => regexes_exports,
	registry: () => registry,
	safeDecode: () => safeDecode,
	safeDecodeAsync: () => safeDecodeAsync,
	safeEncode: () => safeEncode,
	safeEncodeAsync: () => safeEncodeAsync,
	safeParse: () => safeParse,
	safeParseAsync: () => safeParseAsync,
	set: () => set,
	setErrorMap: () => setErrorMap,
	size: () => _size,
	startsWith: () => _startsWith,
	strictObject: () => strictObject,
	string: () => string$1,
	stringFormat: () => stringFormat,
	stringbool: () => stringbool,
	success: () => success,
	superRefine: () => superRefine,
	symbol: () => symbol,
	templateLiteral: () => templateLiteral,
	toJSONSchema: () => toJSONSchema,
	toLowerCase: () => _toLowerCase,
	toUpperCase: () => _toUpperCase,
	transform: () => transform,
	treeifyError: () => treeifyError,
	trim: () => _trim,
	tuple: () => tuple,
	uint32: () => uint32,
	uint64: () => uint64,
	ulid: () => ulid,
	undefined: () => _undefined,
	union: () => union,
	unknown: () => unknown,
	uppercase: () => _uppercase,
	url: () => url,
	util: () => util_exports,
	uuid: () => uuid,
	uuidv4: () => uuidv4,
	uuidv6: () => uuidv6,
	uuidv7: () => uuidv7,
	void: () => _void,
	xid: () => xid
});
config(en_default());

//#endregion
//#region node_modules/@hono/zod-openapi/dist/index.js
function isObject(x) {
	return typeof x === "object" && x !== null;
}
function isZod(x) {
	if (!x) return false;
	if (!isObject(x)) return false;
	return typeof x.parse === "function" && typeof x.safeParse === "function" && typeof x.parseAsync === "function" && typeof x.safeParseAsync === "function";
}
var OpenAPIHono = class _OpenAPIHono extends Hono {
	openAPIRegistry;
	defaultHook;
	constructor(init) {
		super(init);
		this.openAPIRegistry = new OpenAPIRegistry();
		this.defaultHook = init?.defaultHook;
	}
	/**
	*
	* @param {RouteConfig} route - The route definition which you create with `createRoute()`.
	* @param {Handler} handler - The handler. If you want to return a JSON object, you should specify the status code with `c.json()`.
	* @param {Hook} hook - Optional. The hook method defines what it should do after validation.
	* @example
	* app.openapi(
	*   route,
	*   (c) => {
	*     // ...
	*     return c.json(
	*       {
	*         age: 20,
	*         name: 'Young man',
	*       },
	*       200 // You should specify the status code even if it's 200.
	*     )
	*   },
	*  (result, c) => {
	*    if (!result.success) {
	*      return c.json(
	*        {
	*          code: 400,
	*          message: 'Custom Message',
	*        },
	*        400
	*      )
	*    }
	*  }
	*)
	*/
	openapi = ({ middleware: routeMiddleware, hide, ...route }, handler, hook = this.defaultHook) => {
		if (!hide) this.openAPIRegistry.registerPath(route);
		const validators = [];
		if (route.request?.query) {
			const validator$1 = zValidator("query", route.request.query, hook);
			validators.push(validator$1);
		}
		if (route.request?.params) {
			const validator$1 = zValidator("param", route.request.params, hook);
			validators.push(validator$1);
		}
		if (route.request?.headers) {
			const validator$1 = zValidator("header", route.request.headers, hook);
			validators.push(validator$1);
		}
		if (route.request?.cookies) {
			const validator$1 = zValidator("cookie", route.request.cookies, hook);
			validators.push(validator$1);
		}
		const bodyContent = route.request?.body?.content;
		if (bodyContent) for (const mediaType of Object.keys(bodyContent)) {
			if (!bodyContent[mediaType]) continue;
			const schema = bodyContent[mediaType]["schema"];
			if (!isZod(schema)) continue;
			if (isJSONContentType(mediaType)) {
				const validator$1 = zValidator("json", schema, hook);
				if (route.request?.body?.required) validators.push(validator$1);
				else {
					const mw = async (c, next) => {
						if (c.req.header("content-type")) {
							if (isJSONContentType(c.req.header("content-type"))) return await validator$1(c, next);
						}
						c.req.addValidatedData("json", {});
						await next();
					};
					validators.push(mw);
				}
			}
			if (isFormContentType(mediaType)) {
				const validator$1 = zValidator("form", schema, hook);
				if (route.request?.body?.required) validators.push(validator$1);
				else {
					const mw = async (c, next) => {
						if (c.req.header("content-type")) {
							if (isFormContentType(c.req.header("content-type"))) return await validator$1(c, next);
						}
						c.req.addValidatedData("form", {});
						await next();
					};
					validators.push(mw);
				}
			}
		}
		const middleware = routeMiddleware ? Array.isArray(routeMiddleware) ? routeMiddleware : [routeMiddleware] : [];
		this.on([route.method], route.path.replaceAll(/\/{(.+?)}/g, "/:$1"), ...middleware, ...validators, handler);
		return this;
	};
	getOpenAPIDocument = (objectConfig, generatorConfig) => {
		const document = new OpenApiGeneratorV3(this.openAPIRegistry.definitions, generatorConfig).generateDocument(objectConfig);
		return this._basePath ? addBasePathToDocument(document, this._basePath) : document;
	};
	getOpenAPI31Document = (objectConfig, generatorConfig) => {
		const document = new OpenApiGeneratorV31(this.openAPIRegistry.definitions, generatorConfig).generateDocument(objectConfig);
		return this._basePath ? addBasePathToDocument(document, this._basePath) : document;
	};
	doc = (path, configureObject, configureGenerator) => {
		return this.get(path, (c) => {
			const objectConfig = typeof configureObject === "function" ? configureObject(c) : configureObject;
			const generatorConfig = typeof configureGenerator === "function" ? configureGenerator(c) : configureGenerator;
			try {
				const document = this.getOpenAPIDocument(objectConfig, generatorConfig);
				return c.json(document);
			} catch (e) {
				return c.json(e, 500);
			}
		});
	};
	doc31 = (path, configureObject, configureGenerator) => {
		return this.get(path, (c) => {
			const objectConfig = typeof configureObject === "function" ? configureObject(c) : configureObject;
			const generatorConfig = typeof configureGenerator === "function" ? configureGenerator(c) : configureGenerator;
			try {
				const document = this.getOpenAPI31Document(objectConfig, generatorConfig);
				return c.json(document);
			} catch (e) {
				return c.json(e, 500);
			}
		});
	};
	route(path, app$1) {
		const pathForOpenAPI = path.replaceAll(/:([^\/]+)/g, "{$1}");
		super.route(path, app$1);
		if (!(app$1 instanceof _OpenAPIHono)) return this;
		app$1.openAPIRegistry.definitions.forEach((def) => {
			switch (def.type) {
				case "component": return this.openAPIRegistry.registerComponent(def.componentType, def.name, def.component);
				case "route":
					this.openAPIRegistry.registerPath({
						...def.route,
						path: mergePath(pathForOpenAPI, app$1._basePath.replaceAll(/:([^\/]+)/g, "{$1}"), def.route.path)
					});
					return;
				case "webhook":
					this.openAPIRegistry.registerWebhook({
						...def.webhook,
						path: mergePath(pathForOpenAPI, app$1._basePath.replaceAll(/:([^\/]+)/g, "{$1}"), def.webhook.path)
					});
					return;
				case "schema": return this.openAPIRegistry.register(getOpenApiMetadata(def.schema)._internal?.refId, def.schema);
				case "parameter": return this.openAPIRegistry.registerParameter(getOpenApiMetadata(def.schema)._internal?.refId, def.schema);
				default: {
					const errorIfNotExhaustive = def;
					throw new Error(`Unknown registry type: ${errorIfNotExhaustive}`);
				}
			}
		});
		return this;
	}
	basePath(path) {
		return new _OpenAPIHono({
			...super.basePath(path),
			defaultHook: this.defaultHook
		});
	}
};
var createRoute = (routeConfig) => {
	const route = {
		...routeConfig,
		getRoutingPath() {
			return routeConfig.path.replaceAll(/\/{(.+?)}/g, "/:$1");
		}
	};
	return Object.defineProperty(route, "getRoutingPath", { enumerable: false });
};
extendZodWithOpenApi(external_exports);
function addBasePathToDocument(document, basePath) {
	const updatedPaths = {};
	Object.keys(document.paths).forEach((path) => {
		updatedPaths[mergePath(basePath.replaceAll(/:([^\/]+)/g, "{$1}"), path)] = document.paths[path];
	});
	return {
		...document,
		paths: updatedPaths
	};
}
function isJSONContentType(contentType) {
	return /^application\/([a-z-\.]+\+)?json/.test(contentType);
}
function isFormContentType(contentType) {
	return contentType.startsWith("multipart/form-data") || contentType.startsWith("application/x-www-form-urlencoded");
}

//#endregion
//#region node_modules/@scalar/core/dist/libs/html-rendering/html-rendering.js
/**
* Helper function to add consistent indentation to multiline strings
* @param str The string to indent
* @param spaces Number of spaces for each level
* @param initialIndent Whether to indent the first line
*/
const addIndent = (str, spaces = 2, initialIndent = false) => {
	const indent = " ".repeat(spaces);
	return str.split("\n").map((line, index) => {
		if (index === 0 && !initialIndent) return line;
		return `${indent}${line}`;
	}).join("\n");
};
/**
* Generate the style tag with custom theme if needed
*/
const getStyles = (configuration, customTheme$1) => {
	const styles = [];
	if (configuration.customCss) {
		styles.push("/* Custom CSS */");
		styles.push(configuration.customCss);
	}
	if (!configuration.theme && customTheme$1) {
		styles.push("/* Custom Theme */");
		styles.push(customTheme$1);
	}
	if (styles.length === 0) return "";
	return `
    <style type="text/css">
      ${addIndent(styles.join("\n\n"), 6)}
    </style>`;
};
/**
* The HTML document to render the Scalar API reference.
*
* We must check the passed in configuration and not the configuration for the theme as the configuration will have it
* defaulted to 'default'
*/
const getHtmlDocument = (givenConfiguration, customTheme$1 = "") => {
	const { cdn, pageTitle, customCss, theme, ...rest } = givenConfiguration;
	const configuration = getConfiguration({
		...rest,
		...theme ? { theme } : {},
		customCss
	});
	return `<!doctype html>
<html>
  <head>
    <title>${pageTitle ?? "Scalar API Reference"}</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />${getStyles(configuration, customTheme$1)}
  </head>
  <body>
    <div id="app"></div>${getScriptTags(configuration, cdn)}
  </body>
</html>`;
};
/**
* Helper function to serialize arrays that may contain functions
*/
const serializeArrayWithFunctions = (arr) => {
	return `[${arr.map((item) => typeof item === "function" ? item.toString() : JSON.stringify(item)).join(", ")}]`;
};
/**
* The script tags to load the @scalar/api-reference package from the CDN.
*/
function getScriptTags(configuration, cdn) {
	const restConfig = { ...configuration };
	const functionProps = [];
	for (const [key, value] of Object.entries(configuration)) if (typeof value === "function") {
		functionProps.push(`"${key}": ${value.toString()}`);
		delete restConfig[key];
	} else if (Array.isArray(value) && value.some((item) => typeof item === "function")) {
		functionProps.push(`"${key}": ${serializeArrayWithFunctions(value)}`);
		delete restConfig[key];
	}
	const configString = JSON.stringify(restConfig, null, 2).split("\n").map((line, index) => index === 0 ? line : "      " + line).join("\n").replace(/\s*}$/, "");
	const functionPropsString = functionProps.length ? `,\n        ${functionProps.join(",\n        ")}\n      }` : "}";
	return `
    <!-- Load the Script -->
    <script src="${cdn ?? "https://cdn.jsdelivr.net/npm/@scalar/api-reference"}"><\/script>

    <!-- Initialize the Scalar API Reference -->
    <script type="text/javascript">
      Scalar.createApiReference('#app', ${configString}${functionPropsString})
    <\/script>`;
}
/**
* The configuration to pass to the @scalar/api-reference package.
*/
const getConfiguration = (givenConfiguration) => {
	const configuration = { ...givenConfiguration };
	if (typeof configuration.content === "function") configuration.content = configuration.content();
	if (configuration.content && configuration.url) delete configuration.content;
	return configuration;
};

//#endregion
//#region node_modules/@scalar/hono-api-reference/dist/scalar.js
const DEFAULT_CONFIGURATION = { _integration: "hono" };
const customTheme = `
.dark-mode {
  color-scheme: dark;
  --scalar-color-1: rgba(255, 255, 245, .86);
  --scalar-color-2: rgba(255, 255, 245, .6);
  --scalar-color-3: rgba(255, 255, 245, .38);
  --scalar-color-disabled: rgba(255, 255, 245, .25);
  --scalar-color-ghost: rgba(255, 255, 245, .25);
  --scalar-color-accent: #e36002;
  --scalar-background-1: #1e1e20;
  --scalar-background-2: #2a2a2a;
  --scalar-background-3: #505053;
  --scalar-background-4: rgba(255, 255, 255, 0.06);
  --scalar-background-accent: #e360021f;

  --scalar-border-color: rgba(255, 255, 255, 0.1);
  --scalar-scrollbar-color: rgba(255, 255, 255, 0.24);
  --scalar-scrollbar-color-active: rgba(255, 255, 255, 0.48);
  --scalar-lifted-brightness: 1.45;
  --scalar-backdrop-brightness: 0.5;

  --scalar-shadow-1: 0 1px 3px 0 rgb(0, 0, 0, 0.1);
  --scalar-shadow-2: rgba(15, 15, 15, 0.2) 0px 3px 6px,
    rgba(15, 15, 15, 0.4) 0px 9px 24px, 0 0 0 1px rgba(255, 255, 255, 0.1);

  --scalar-button-1: #f6f6f6;
  --scalar-button-1-color: #000;
  --scalar-button-1-hover: #e7e7e7;

  --scalar-color-green: #3dd68c;
  --scalar-color-red: #f66f81;
  --scalar-color-yellow: #f9b44e;
  --scalar-color-blue: #5c73e7;
  --scalar-color-orange: #ff8d4d;
  --scalar-color-purple: #b191f9;
}
/* Sidebar */
.dark-mode .sidebar {
  --scalar-sidebar-background-1: #161618;
  --scalar-sidebar-item-hover-color: var(--scalar-color-accent);
  --scalar-sidebar-item-hover-background: transparent;
  --scalar-sidebar-item-active-background: transparent;
  --scalar-sidebar-border-color: transparent;
  --scalar-sidebar-color-1: var(--scalar-color-1);
  --scalar-sidebar-color-2: var(--scalar-color-2);
  --scalar-sidebar-color-active: var(--scalar-color-accent);
  --scalar-sidebar-search-background: #252529;
  --scalar-sidebar-search-border-color: transparent;
  --scalar-sidebar-search-color: var(--scalar-color-3);
}
`;
const Scalar = (configOrResolver) => {
	return async (c) => {
		let resolvedConfig = {};
		if (typeof configOrResolver === "function") resolvedConfig = await configOrResolver(c);
		else resolvedConfig = configOrResolver;
		const configuration = {
			...DEFAULT_CONFIGURATION,
			...resolvedConfig
		};
		return c.html(getHtmlDocument(configuration, customTheme));
	};
};

//#endregion
//#region src/services/errors.ts
const defaultReasonContext = {
	reason_code: "UNEXPECTED_ERROR",
	instruction: "Retry the request or contact support."
};
const reasonContextByStatus = {
	404: {
		reason_code: "RESOURCE_NOT_FOUND",
		instruction: "Verify the identifier or create a new session."
	},
	409: {
		reason_code: "STATE_CONFLICT",
		instruction: "Fetch the latest state and resend the command."
	},
	422: {
		reason_code: "REQUEST_INVALID",
		instruction: "Review the request payload and try again."
	},
	503: {
		reason_code: "SERVICE_UNAVAILABLE",
		instruction: "Wait for the service to recover and retry."
	}
};
const resolveReasonContext = (status) => reasonContextByStatus[status] ?? defaultReasonContext;
/**
* API サービスで共通利用するエラーオブジェクトを生成する。
* @param code API で返すエラーコード
* @param status HTTP ステータスコード
* @param message ユーザー向けメッセージ
*/
const createServiceError = (code, status, message) => Object.assign(new Error(message), {
	code,
	status
});
/**
* HTTP レスポンスや SSE で共通利用するエラーペイロードを構築する。
* @param input エラーコードや HTTP ステータスなどの情報。
* @param input.code 返却するアプリケーションエラーコード。
* @param input.message ユーザーへ表示する詳細メッセージ。
* @param input.status HTTP ステータスコード。
*/
const createErrorDetail = (input) => {
	const context = resolveReasonContext(input.status);
	return {
		code: input.code,
		message: input.message,
		reason_code: context.reason_code,
		instruction: context.instruction
	};
};
/**
* エラーレスポンスボディを組み立てる。
* @param input エラーの基本情報。
* @param input.code 返却するアプリケーションエラーコード。
* @param input.message ユーザーへ表示する詳細メッセージ。
* @param input.status HTTP ステータスコード。
*/
const createErrorResponseBody = (input) => ({ error: createErrorDetail(input) });

//#endregion
//#region src/routes/sessions/shared.ts
/**
* セッションエンベロープを API レスポンス形式へ整形する。
* @param envelope ストアに保存されたセッション情報。
*/
const toSessionResponse = (envelope) => ({
	session_id: envelope.snapshot.sessionId,
	state_version: envelope.version,
	state: envelope.snapshot
});
/**
* バリデーションエラーを 422 レスポンスとして返送する。
* @param c Hono コンテキスト。
* @param code エラーコード。
* @param message 詳細メッセージ。
*/
const respondValidationError = (c, code, message) => c.json(createErrorResponseBody({
	code,
	message,
	status: 422
}), 422);
/**
* リソースが見つからなかった場合に 404 レスポンスを返す。
* @param c Hono コンテキスト。
* @param code エラーコード。
* @param message 詳細メッセージ。
*/
const respondNotFound = (c, code, message) => c.json(createErrorResponseBody({
	code,
	message,
	status: 404
}), 404);

//#endregion
//#region src/schema/players.ts
const playerRegistrationSchema = object({
	id: string$1().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, { message: "Player id must include alphanumeric characters, underscore, or hyphen." }).openapi({ description: "英数字とアンダースコア・ハイフンのみ許可されるプレイヤーID。" }),
	display_name: string$1().min(1).max(64).openapi({ description: "UI 上で表示するプレイヤー名。" })
});
const playerSummarySchema = object({
	id: string$1().openapi({ description: "セッション内で一意となるプレイヤーID。" }),
	displayName: string$1().openapi({ description: "ユーザーへ提示するプレイヤー表示名。" })
});

//#endregion
//#region src/schema/game.ts
const gamePhaseSchema = _enum([
	"setup",
	"running",
	"completed"
]).openapi({ description: "ゲームの進行段階。セットアップ、進行中、終了のいずれか。" });
const turnStateSchema = object({
	turn: number$1().int().min(0).openapi({ description: "現在のターン番号。0 から開始しアクションごとに加算されます。" }),
	currentPlayerId: string$1().openapi({ description: "現在の手番を担当するプレイヤーID。" }),
	currentPlayerIndex: number$1().int().min(0).openapi({ description: "playerOrder 内で現在プレイヤーが位置するインデックス。" }),
	cardInCenter: number$1().nullable().openapi({ description: "中央に公開されているカード番号。カードが無いときは null。" }),
	awaitingAction: boolean$1().openapi({ description: "プレイヤーのアクション待ち状態かどうか。" }),
	deadline: string$1().nullable().optional().openapi({ description: "アクションの締切を示す ISO 8601 形式の日時。締切なしは null。" })
});
const scorePlacementSchema = object({
	rank: number$1().int().min(1).openapi({ description: "順位 (同点の場合は同じランク値)。" }),
	playerId: string$1().openapi({ description: "対象プレイヤーの ID。" }),
	score: number$1().openapi({ description: "カードセットの最小値合計からチップを差し引いた最終スコア。" }),
	chipsRemaining: number$1().int().min(0).openapi({ description: "スコア計算時点で残っているチップ数。" }),
	cards: array(number$1()).openapi({ description: "プレイヤーが獲得したカード番号一覧 (昇順)。" }),
	cardSets: array(array(number$1())).openapi({ description: "連番ごとにグルーピングされたカードセット。" })
}).openapi({ description: "個々のプレイヤーのスコア詳細。" });
const scoreTieBreakSchema = object({
	reason: literal("chipCount").openapi({ description: "今回適用されたタイブレーク理由。chipCount 固定。" }),
	tiedScore: number$1().openapi({ description: "同点となったスコア値。" }),
	contenders: array(string$1()).openapi({ description: "同点となったプレイヤーIDの一覧。" }),
	winner: string$1().nullable().openapi({ description: "タイブレーク後の勝者ID。同点継続の場合は null。" })
}).openapi({ description: "同点時のタイブレーク情報。" });
const scoreSummarySchema = object({
	placements: array(scorePlacementSchema).openapi({ description: "スコア順に並んだプレイヤーの順位情報。" }),
	tieBreak: scoreTieBreakSchema.nullable().openapi({ description: "同点発生時のタイブレーク結果。なければ null。" })
}).openapi({ description: "ゲーム終了時の結果サマリー。" });
const ruleHintSchema = object({
	text: string$1().openapi({ description: "現在の状況に基づくヒント本文。" }),
	emphasis: _enum(["info", "warning"]).openapi({ description: "ヒントの強調度。warning は注意喚起。" }),
	turn: number$1().int().min(0).openapi({ description: "ヒントが対象とするターン番号。" }),
	generated_at: string$1().openapi({ description: "ヒント生成時刻 (ISO8601)。" })
}).openapi({ description: "カードとチップ状況から導かれるルールヘルプ。" });
const snapshotSchema = object({
	sessionId: string$1().openapi({ description: "セッションを一意に識別する ID。" }),
	phase: gamePhaseSchema.openapi({ description: "スナップショット時点のゲーム進行段階。" }),
	deck: array(number$1()).openapi({ description: "山札に残っているカード番号の配列。先頭が次にめくられるカード。" }),
	discardHidden: array(number$1()).openapi({ description: "裏向きに取り除かれ公開されていないカード番号の配列。" }),
	playerOrder: array(string$1()).openapi({ description: "手番順を表すプレイヤーIDの配列。" }),
	rngSeed: string$1().openapi({ description: "セットアップで使用した乱数シード文字列。" }),
	players: array(playerSummarySchema).openapi({ description: "参加している各プレイヤーの概要情報。" }),
	chips: record(string$1(), number$1()).openapi({ description: "プレイヤーIDをキーにした所持チップ枚数のマップ。" }),
	hands: record(string$1(), array(number$1())).openapi({ description: "プレイヤーIDをキーにした取得済みカード番号のリスト。" }),
	centralPot: number$1().openapi({ description: "中央ポットに置かれているチップ数。" }),
	turnState: turnStateSchema.openapi({ description: "現在のターンに関する詳細情報。" }),
	createdAt: string$1().openapi({ description: "スナップショットが作成された日時 (ISO 8601)。" }),
	updatedAt: string$1().openapi({ description: "状態が最後に更新された日時 (ISO 8601)。" }),
	finalResults: scoreSummarySchema.nullable().openapi({ description: "ゲーム終了後の最終結果。進行中は null。" })
});

//#endregion
//#region src/schema/sessions.ts
const createSessionBodySchema = object({
	players: array(playerRegistrationSchema).min(1).openapi({ description: "セッションへ参加させるプレイヤー情報の配列。2〜7 名を想定。" }),
	seed: string$1().min(1).optional().openapi({ description: "任意の乱数シード文字列。同じシードで山札構成を再現します。" })
});
const sessionResponseSchema = object({
	session_id: string$1().openapi({ description: "作成されたセッションの識別子。" }),
	state_version: string$1().openapi({ description: "状態ストアのバージョン。楽観的排他や再取得の目印です。" }),
	state: snapshotSchema.openapi({ description: "現在のゲームスナップショット全体。" })
});
const errorResponseSchema = object({ error: object({
	code: string$1().openapi({ description: "アプリケーション固有のエラーコード。" }),
	message: string$1().openapi({ description: "エラーの詳細メッセージ。" }),
	reason_code: string$1().openapi({ description: "ユーザーが次に取るべき対処を示す理由コード。例: REQUEST_INVALID。" }),
	instruction: string$1().openapi({ description: "ユーザー向けの具体的な再入力・再試行手順。" })
}).openapi({ description: "エラー情報オブジェクト。" }) });
const turnActionSchema = _enum(["placeChip", "takeCard"]);
const sessionActionBodySchema = object({
	command_id: string$1().min(1).openapi({ description: "冪等制御のためにクライアントが付与するコマンドID。" }),
	state_version: string$1().min(1).openapi({ description: "クライアントが保持する最新状態バージョン。" }),
	player_id: string$1().min(1).openapi({ description: "アクションを実行するプレイヤーID。" }),
	action: turnActionSchema.openapi({ description: "実行するアクション種別。placeChip または takeCard。" })
});
const sessionActionResponseSchema = sessionResponseSchema.extend({ turn_context: object({
	turn: number$1().int().min(0).openapi({ description: "現在のターン番号。" }),
	current_player_id: string$1().openapi({ description: "現在の手番プレイヤーID。" }),
	card_in_center: number$1().int().min(0).nullable().openapi({ description: "中央に表向きのカード番号。カードが無いときは null。" }),
	awaiting_action: boolean$1().openapi({ description: "手番プレイヤーのアクション待ちかどうか。" }),
	central_pot: number$1().int().min(0).openapi({ description: "中央ポットに積まれているチップ数。" }),
	chips: record(string$1(), number$1().int().min(0)).openapi({ description: "各プレイヤーの所持チップ数マップ。" })
}).openapi({ description: "UI が即時に参照できるターン状況の要約。" }) });
const eventLogEntrySchema = object({
	id: string$1().openapi({ description: "イベントログのユニーク ID。" }),
	turn: number$1().int().min(0).openapi({ description: "イベントが発生したターン番号。" }),
	actor: string$1().openapi({ description: "アクションを行ったプレイヤーまたはシステム識別子。" }),
	action: string$1().openapi({ description: "実行されたアクション名。" }),
	timestamp: string$1().openapi({ description: "ISO 8601 形式の記録時刻。" }),
	chipsDelta: number$1().optional().openapi({ description: "チップ増減がある場合、その差分値。" }),
	details: record(string$1(), unknown()).optional().openapi({ description: "任意の追加メタデータ。" })
}).openapi({ description: "イベントログ行。" });
const sessionResultsResponseSchema = object({
	session_id: string$1().openapi({ description: "対象セッションの ID。" }),
	final_results: scoreSummarySchema.openapi({ description: "最終スコアと順位情報。" }),
	event_log: array(eventLogEntrySchema).openapi({ description: "ターン順に並んだイベントログ。" })
});
const sessionHintResponseSchema = object({
	session_id: string$1().openapi({ description: "対象セッションの ID。" }),
	state_version: string$1().openapi({ description: "現在の状態バージョン。" }),
	generated_from_version: string$1().openapi({ description: "ヒント作成時点での状態バージョン。" }),
	hint: ruleHintSchema.openapi({ description: "最新のルールヘルプ。" })
});

//#endregion
//#region src/services/ssePublisher.ts
/**
* スナップショット更新と派生するヒントを SSE で通知する。
* @param options 通知に利用するゲートウェイやヒントサービス。
* @param options.sseGateway 送信に使用するブロードキャストゲートウェイ。
* @param options.ruleHints 最新ヒントを生成・キャッシュするサービス。
* @param snapshot 送信する最新スナップショット。
* @param version 対応する状態バージョン。
*/
const publishStateEvents = (options, snapshot, version$1) => {
	const gateway = options.sseGateway;
	const storedHint = options.ruleHints?.refreshHint(snapshot, version$1) ?? null;
	if (!gateway) return;
	gateway.publishStateDelta(snapshot.sessionId, snapshot, version$1);
	if (storedHint) gateway.publishRuleHint(snapshot.sessionId, {
		stateVersion: storedHint.stateVersion,
		hint: storedHint.hint
	});
	if (snapshot.finalResults !== null) gateway.publishStateFinal(snapshot.sessionId, snapshot, version$1);
};

//#endregion
//#region src/services/timerSupervisor.ts
const parseDeadline = (iso) => {
	const timestamp = Date.parse(iso);
	if (Number.isNaN(timestamp)) return;
	return timestamp;
};
const nowFromIso = (iso) => {
	const parsed = parseDeadline(iso);
	if (parsed === void 0) return Date.now();
	return parsed;
};
/**
* 基準時刻と制限時間から締切 ISO 文字列を算出する。
* @param baseIso ターン開始時刻。
* @param durationMs 締切までのミリ秒。
*/
const calculateTurnDeadline = (baseIso, durationMs) => new Date(nowFromIso(baseIso) + durationMs).toISOString();
/**
* ターン締切のセット/解除/復元を担うタイマー管理を構築する。
* @param dependencies ストアや setTimeout ラッパー。
*/
const createTimerSupervisor = (dependencies) => {
	const clear = (sessionId) => {
		const envelope = dependencies.store.getEnvelope(sessionId);
		if (envelope?.deadlineHandle === void 0) return;
		const turn = envelope.snapshot.turnState.turn;
		dependencies.cancel(envelope.deadlineHandle);
		delete envelope.deadlineHandle;
		delete envelope.deadlineAt;
		dependencies.monitoring?.logTimerEvent({
			sessionId,
			action: "clear",
			turn
		});
	};
	const register = (sessionId, deadlineIso) => {
		const envelope = dependencies.store.getEnvelope(sessionId);
		if (envelope === void 0) return;
		const existingHandle = envelope.deadlineHandle;
		if (existingHandle !== void 0) {
			dependencies.cancel(existingHandle);
			delete envelope.deadlineHandle;
			delete envelope.deadlineAt;
		}
		if (deadlineIso === void 0 || deadlineIso === null) return;
		const dueTime = parseDeadline(deadlineIso);
		if (dueTime === void 0) return;
		const turn = envelope.snapshot.turnState.turn;
		const delay = Math.max(0, dueTime - dependencies.now());
		envelope.deadlineHandle = dependencies.schedule(() => {
			delete envelope.deadlineHandle;
			delete envelope.deadlineAt;
			dependencies.onTimeout(sessionId);
		}, delay);
		envelope.deadlineAt = dueTime;
		dependencies.monitoring?.logTimerEvent({
			sessionId,
			action: "register",
			deadline: deadlineIso,
			turn
		});
	};
	const restore = () => {
		for (const summary of dependencies.store.listSessions()) {
			const envelope = dependencies.store.getEnvelope(summary.sessionId);
			if (envelope === void 0) continue;
			const deadline = envelope.snapshot.turnState.deadline;
			if (deadline === void 0 || deadline === null || envelope.snapshot.turnState.awaitingAction === false) {
				clear(summary.sessionId);
				continue;
			}
			register(summary.sessionId, deadline);
		}
	};
	return {
		register,
		clear,
		restore
	};
};

//#endregion
//#region src/states/setup.ts
const CARD_MIN = 3;
const CARD_MAX = 35;
const HIDDEN_CARD_COUNT = 9;
const createCardRange = () => Array.from({ length: CARD_MAX - CARD_MIN + 1 }, (_, index) => CARD_MIN + index);
const createSeed = () => randomBytes(16).toString("hex");
const createSeededRandom = (seed) => {
	let counter = 0;
	return () => {
		const hash$1 = createHash("sha256");
		hash$1.update(seed);
		hash$1.update(counter.toString(16));
		counter += 1;
		return hash$1.digest().readUInt32BE(0) / 4294967295;
	};
};
const shuffle = (values, random) => {
	const items = [...values];
	for (let index = items.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(random() * (index + 1));
		const current = items[index];
		const candidate = items[swapIndex];
		if (current === void 0 || candidate === void 0) continue;
		items[index] = candidate;
		items[swapIndex] = current;
	}
	return items;
};
const assertPlayerCount = (playerIds) => {
	if (playerIds.length < 2 || playerIds.length > 7) throw new Error("Players must contain between 2 and 7 entries to satisfy setup rules.");
};
/**
* 初期デッキ順序や伏せ札、プレイヤー順のシャッフル結果を生成する。
* @param playerIds プレイヤー ID の配列（2〜7名）。
* @param options シードなどのオプション。
*/
const createSetupSnapshot = (playerIds, options = {}) => {
	assertPlayerCount(playerIds);
	const rngSeed = options.seed ?? createSeed();
	const random = createSeededRandom(rngSeed);
	const shuffledDeck = shuffle(createCardRange(), random);
	const discardHidden = shuffledDeck.slice(0, HIDDEN_CARD_COUNT);
	return {
		deck: shuffledDeck.slice(HIDDEN_CARD_COUNT),
		discardHidden,
		playerOrder: shuffle(playerIds, random),
		rngSeed
	};
};

//#endregion
//#region src/routes/sessions/index.post.ts
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 7;
const INITIAL_PLAYER_CHIPS = 11;
/**
* セッション作成 POST ルートの静的定義。
*/
const sessionPostRoute = createRoute({
	method: "post",
	path: "/sessions",
	description: "指定されたプレイヤー情報と任意のシード値を用いてゲームのセットアップを実行し、初期スナップショットと状態バージョンを返します。",
	request: { body: {
		required: true,
		content: { "application/json": {
			schema: createSessionBodySchema,
			example: {
				seed: "optional-seed-string",
				players: [{
					id: "alice",
					display_name: "Alice"
				}, {
					id: "bob",
					display_name: "Bob"
				}]
			}
		} },
		description: "プレイヤー ID と表示名、そして任意の乱数シード。ID は 2〜7 名、英数 + `_`/`-` のみ許可されます。"
	} },
	responses: {
		201: {
			description: "新しいセッションが作成され、初期状態が返却されました。",
			content: { "application/json": { schema: sessionResponseSchema } }
		},
		422: {
			description: "入力検証に失敗しました。プレイヤー人数や ID の重複などを `error.code` で示します。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
const ensurePlayerConstraints = (players) => {
	if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) return {
		ok: false,
		code: "PLAYER_COUNT_INVALID",
		message: `Players must contain between ${MIN_PLAYERS} and ${MAX_PLAYERS} entries.`
	};
	const normalized = [];
	const existing = /* @__PURE__ */ new Set();
	for (const player of players) {
		const id = player.id.trim();
		const displayName = player.display_name.trim();
		if (id.length === 0) return {
			ok: false,
			code: "PLAYER_ID_INVALID",
			message: "Player id cannot be empty."
		};
		if (displayName.length === 0) return {
			ok: false,
			code: "PLAYER_NAME_INVALID",
			message: `Player ${player.id} display name cannot be empty.`
		};
		if (existing.has(id)) return {
			ok: false,
			code: "PLAYER_ID_NOT_UNIQUE",
			message: `Player id ${id} is duplicated.`
		};
		existing.add(id);
		normalized.push({
			id,
			displayName
		});
	}
	return {
		ok: true,
		players: normalized
	};
};
const createInitialSnapshot = (sessionId, players, timestamp, seed) => {
	const setupOptions = seed === void 0 ? void 0 : { seed };
	const setup = createSetupSnapshot(players.map((player) => player.id), setupOptions);
	const chips = {};
	const hands = {};
	for (const player of players) {
		chips[player.id] = INITIAL_PLAYER_CHIPS;
		hands[player.id] = [];
	}
	const [activeCard, ...remainingDeck] = setup.deck;
	const firstPlayerIndex = 0;
	const firstPlayerId = setup.playerOrder[firstPlayerIndex] ?? players[0]?.id ?? "";
	const awaitingAction = activeCard !== void 0;
	return {
		sessionId,
		phase: "setup",
		deck: remainingDeck,
		discardHidden: setup.discardHidden,
		playerOrder: setup.playerOrder,
		rngSeed: setup.rngSeed,
		players: [...players],
		chips,
		hands,
		centralPot: 0,
		turnState: {
			turn: awaitingAction ? 1 : 0,
			currentPlayerId: firstPlayerId,
			currentPlayerIndex: firstPlayerIndex,
			cardInCenter: activeCard ?? null,
			awaitingAction
		},
		createdAt: timestamp,
		updatedAt: timestamp,
		finalResults: null
	};
};
/**
* セッション作成 POST ルートを持つ Hono アプリケーション。
*/
const sessionPostApp = new OpenAPIHono().openapi(sessionPostRoute, (c) => {
	const deps = c.var.deps;
	const payload = c.req.valid("json");
	const check$1 = ensurePlayerConstraints(payload.players);
	if (check$1.ok) {
		const sessionId = deps.generateSessionId();
		const snapshot = createInitialSnapshot(sessionId, check$1.players, deps.now(), payload.seed);
		if (snapshot.turnState.awaitingAction) snapshot.turnState.deadline = calculateTurnDeadline(snapshot.updatedAt, deps.turnTimeoutMs);
		else snapshot.turnState.deadline = null;
		const envelope = deps.store.saveSnapshot(snapshot);
		const initialDeadline = snapshot.turnState.deadline;
		if (snapshot.turnState.awaitingAction && initialDeadline !== null && initialDeadline !== void 0) deps.timerSupervisor.register(sessionId, initialDeadline);
		else deps.timerSupervisor.clear(sessionId);
		publishStateEvents({
			sseGateway: deps.sseGateway,
			ruleHints: deps.ruleHintService
		}, envelope.snapshot, envelope.version);
		return c.json(toSessionResponse(envelope), 201);
	}
	return respondValidationError(c, check$1.code, check$1.message);
});

//#endregion
//#region node_modules/hono/dist/helper/factory/index.js
var createMiddleware = (middleware) => middleware;

//#endregion
//#region src/routes/sessions/types.ts
/**
* 依存注入ミドルウェアを生成するファクトリ。
* app.use() で使用する。
* @param deps セッションルートに必要な依存オブジェクト。
*/
const createSessionDepsMiddleware = (deps) => createMiddleware(async (c, next) => {
	c.set("deps", deps);
	await next();
});

//#endregion
//#region src/routes/sessions/{sessionId}/actions.post.ts
/**
* プレイヤーアクション POST ルートのハンドラ。
* @param c Hono コンテキスト。
*/
const sessionActionsPostRoute = createRoute({
	method: "post",
	path: "/sessions/{sessionId}/actions",
	description: "手番プレイヤーまたはシステムからのアクションコマンドを TurnDecisionService へ転送し、最新スナップショットと要約情報を返します。",
	request: {
		params: object({ sessionId: string$1().min(1).describe("アクションを送信する対象の `session_id`。") }),
		body: {
			required: true,
			content: { "application/json": {
				schema: sessionActionBodySchema,
				example: {
					command_id: "cmd-123",
					state_version: "etag-hex",
					player_id: "alice",
					action: "placeChip"
				}
			} }
		}
	},
	responses: {
		200: {
			description: "アクションが適用され、新しい状態とターン要約が返却されました。",
			content: { "application/json": { schema: sessionActionResponseSchema } }
		},
		404: {
			description: "セッションまたはプレイヤーが存在しません。",
			content: { "application/json": { schema: errorResponseSchema } }
		},
		409: {
			description: "`state_version` が最新と一致しない、または完了済みゲームなどのため競合しました。",
			content: { "application/json": { schema: errorResponseSchema } }
		},
		422: {
			description: "入力やチップ残量などの検証に失敗しました。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
const createTurnContext = (snapshot) => ({
	turn: snapshot.turnState.turn,
	current_player_id: snapshot.turnState.currentPlayerId,
	card_in_center: snapshot.turnState.cardInCenter,
	awaiting_action: snapshot.turnState.awaitingAction,
	central_pot: snapshot.centralPot,
	chips: snapshot.chips
});
const toActionResponse = (snapshot, version$1) => ({
	session_id: snapshot.sessionId,
	state_version: version$1,
	state: snapshot,
	turn_context: createTurnContext(snapshot)
});
const isServiceError = (err) => typeof err === "object" && err !== null && "code" in err && "status" in err && typeof err.code === "string" && typeof err.status === "number";
/**
* プレイヤーアクション POST ルートを持つ Hono アプリケーション。
*/
const sessionActionsPostApp = new OpenAPIHono().openapi(sessionActionsPostRoute, async (c) => {
	const deps = c.var.deps;
	const { sessionId } = c.req.valid("param");
	const payload = c.req.valid("json");
	try {
		const result = await deps.turnService.applyCommand({
			sessionId,
			commandId: payload.command_id,
			expectedVersion: payload.state_version,
			playerId: payload.player_id,
			action: payload.action
		});
		publishStateEvents({
			sseGateway: deps.sseGateway,
			ruleHints: deps.ruleHintService
		}, result.snapshot, result.version);
		return c.json(toActionResponse(result.snapshot, result.version), 200);
	} catch (err) {
		if (isServiceError(err)) {
			if ([
				404,
				409,
				422
			].includes(err.status)) {
				const status = err.status;
				const body = createErrorResponseBody({
					code: err.code,
					message: err.message,
					status
				});
				deps.sseGateway.publishSystemError(sessionId, body.error);
				return c.json(body, status);
			}
			throw err;
		}
		throw err;
	}
});

//#endregion
//#region src/routes/sessions/{sessionId}/hint.get.ts
/**
* ルールヒント取得 GET ルートの静的定義。
*/
const sessionHintGetRoute = createRoute({
	method: "get",
	path: "/sessions/{sessionId}/hint",
	description: "現在のカード・チップ状況に基づくルールヘルプを返し、UI が即時に意思決定ヒントを表示できるようにします。",
	request: { params: object({ sessionId: string$1().min(1).describe("対象となる `session_id`。") }) },
	responses: {
		200: {
			description: "最新のルールヒントを取得できました。",
			content: { "application/json": { schema: sessionHintResponseSchema } }
		},
		404: {
			description: "セッションが見つかりません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
const toHintPayload = (sessionId, stateVersion, stored) => ({
	session_id: sessionId,
	state_version: stateVersion,
	generated_from_version: stored.stateVersion,
	hint: {
		text: stored.hint.text,
		emphasis: stored.hint.emphasis,
		turn: stored.hint.turn,
		generated_at: stored.hint.generatedAt
	}
});
/**
* ルールヒント取得 GET ルートを持つ Hono アプリケーション。
*/
const sessionHintGetApp = new OpenAPIHono().openapi(sessionHintGetRoute, (c) => {
	const deps = c.var.deps;
	const { sessionId } = c.req.valid("param");
	const envelope = deps.store.getEnvelope(sessionId);
	if (!envelope) return respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
	const cached$1 = deps.ruleHintService.getLatestHint(sessionId);
	const latest = cached$1 && cached$1.stateVersion === envelope.version ? cached$1 : deps.ruleHintService.refreshHint(envelope.snapshot, envelope.version);
	return c.json(toHintPayload(sessionId, envelope.version, latest), 200);
});

//#endregion
//#region src/routes/sessions/{sessionId}/index.get.ts
/**
* セッション取得 GET ルートの静的定義。
*/
const sessionGetRoute = createRoute({
	method: "get",
	path: "/sessions/{sessionId}",
	description: "既存セッションの最新スナップショットと状態バージョンを返し、クライアントが状態同期を行えるようにします。",
	request: { params: object({ sessionId: string$1().min(1).describe("取得対象の `session_id`。作成時にレスポンスへ含まれる値を指定します。") }) },
	responses: {
		200: {
			description: "該当セッションが見つかり、現在の状態が返却されました。",
			content: { "application/json": { schema: sessionResponseSchema } }
		},
		404: {
			description: "指定された `session_id` のデータが存在しません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
/**
* セッション取得 GET ルートを持つ Hono アプリケーション。
*/
const sessionGetApp = new OpenAPIHono().openapi(sessionGetRoute, (c) => {
	const deps = c.var.deps;
	const { sessionId } = c.req.valid("param");
	const envelope = deps.store.getEnvelope(sessionId);
	if (envelope) return c.json(toSessionResponse(envelope), 200);
	return respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
});

//#endregion
//#region src/routes/sessions/{sessionId}/logs/export.ts
const CSV_HEADERS = [
	"id",
	"turn",
	"actor",
	"action",
	"timestamp",
	"chipsDelta",
	"details"
];
const toCsvRow = (values) => values.map((value) => {
	if (value === void 0 || value === null) return "";
	const text = typeof value === "string" ? value : JSON.stringify(value);
	if (text.includes(",") || text.includes("\"") || text.includes("\n")) return `"${text.replace(/"/g, "\"\"")}"`;
	return text;
}).join(",");
const createCsvBody = (entries) => {
	const rows = [CSV_HEADERS.join(",")];
	for (const entry of entries) rows.push(toCsvRow([
		entry.id,
		entry.turn,
		entry.actor,
		entry.action,
		entry.timestamp,
		entry.chipsDelta ?? "",
		entry.details ?? ""
	]));
	return rows.join("\n");
};
const respondMissingSession = (c) => respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
/**
* イベントログを CSV へ整形しレスポンスへ書き込む。
* @param c Hono コンテキスト。
* @param dependencies セッションストアなどの依存性。
*/
const handleLogsCsvExport = (c, dependencies) => {
	const sessionId = c.req.param("sessionId");
	const envelope = dependencies.store.getEnvelope(sessionId);
	if (!envelope) return respondMissingSession(c);
	const entryCount = envelope.eventLog.length;
	const csv = createCsvBody(envelope.eventLog);
	dependencies.monitoring?.logExport({
		sessionId,
		format: "csv",
		entryCount
	});
	c.header("content-type", "text/csv; charset=utf-8");
	c.header("content-disposition", `attachment; filename="session-${sessionId}-logs.csv"`);
	return c.body(csv, 200);
};
/**
* イベントログを JSON 形式で返す。
* @param c Hono コンテキスト。
* @param dependencies セッションストアなどの依存性。
*/
const handleLogsJsonExport = (c, dependencies) => {
	const sessionId = c.req.param("sessionId");
	const envelope = dependencies.store.getEnvelope(sessionId);
	if (!envelope) return respondMissingSession(c);
	const entryCount = envelope.eventLog.length;
	dependencies.monitoring?.logExport({
		sessionId,
		format: "json",
		entryCount
	});
	c.header("content-disposition", `attachment; filename="session-${sessionId}-logs.json"`);
	return c.json({
		session_id: sessionId,
		event_log: envelope.eventLog
	}, 200);
};

//#endregion
//#region src/routes/sessions/{sessionId}/logs/export.csv.get.ts
/**
* CSV ログエクスポート GET ルートのハンドラ。
* @param c Hono コンテキスト。
*/
const logsExportCsvGetRoute = createRoute({
	method: "get",
	path: "/sessions/{sessionId}/logs/export.csv",
	description: "イベントログを CSV 形式でエクスポートします。`Content-Disposition` を設定してダウンロードを促します。",
	request: { params: object({ sessionId: string$1().min(1).describe("対象となる `session_id`。") }) },
	responses: {
		200: { description: "CSV が生成されました。" },
		404: {
			description: "セッションが見つかりません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
/**
* CSV ログエクスポート GET ルートを持つ Hono アプリケーション。
*/
const logsExportCsvGetApp = new OpenAPIHono().openapi(logsExportCsvGetRoute, (c) => {
	const deps = c.var.deps;
	return handleLogsCsvExport(c, deps);
});

//#endregion
//#region src/routes/sessions/{sessionId}/logs/export.json.get.ts
/**
* JSON ログエクスポート GET ルートのハンドラ。
* @param c Hono コンテキスト。
*/
const logsExportJsonGetRoute = createRoute({
	method: "get",
	path: "/sessions/{sessionId}/logs/export.json",
	description: "イベントログを JSON 形式でエクスポートします。",
	request: { params: object({ sessionId: string$1().min(1).describe("対象となる `session_id`。") }) },
	responses: {
		200: { description: "JSON イベントログが返却されました。" },
		404: {
			description: "セッションが見つかりません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
/**
* JSON ログエクスポート GET ルートを持つ Hono アプリケーション。
*/
const logsExportJsonGetApp = new OpenAPIHono().openapi(logsExportJsonGetRoute, (c) => {
	const deps = c.var.deps;
	return handleLogsJsonExport(c, deps);
});

//#endregion
//#region src/routes/sessions/{sessionId}/results.get.ts
/**
* 最終結果取得 GET ルートの静的定義。
*/
const sessionResultsGetRoute = createRoute({
	method: "get",
	path: "/sessions/{sessionId}/results",
	description: "ゲーム終了後の最終結果とイベントログを取得します。完了前は 409 を返します。",
	request: { params: object({ sessionId: string$1().min(1).describe("結果を取得する対象の `session_id`。") }) },
	responses: {
		200: {
			description: "セッションが完了しており、最終結果が取得できました。",
			content: { "application/json": { schema: sessionResultsResponseSchema } }
		},
		404: {
			description: "セッションが存在しません。",
			content: { "application/json": { schema: errorResponseSchema } }
		},
		409: {
			description: "セッションがまだ完了していないため結果を取得できません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
/**
* 最終結果取得 GET ルートを持つ Hono アプリケーション。
*/
const sessionResultsGetApp = new OpenAPIHono().openapi(sessionResultsGetRoute, (c) => {
	const deps = c.var.deps;
	const { sessionId } = c.req.valid("param");
	const envelope = deps.store.getEnvelope(sessionId);
	if (!envelope) return respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
	const finalResults = envelope.snapshot.finalResults;
	if (finalResults === null) return c.json(createErrorResponseBody({
		code: "RESULT_NOT_READY",
		message: "Session has not completed yet.",
		status: 409
	}), 409);
	return c.json({
		session_id: envelope.snapshot.sessionId,
		final_results: finalResults,
		event_log: envelope.eventLog
	}, 200);
});

//#endregion
//#region src/routes/sessions/{sessionId}/state.get.ts
/**
* セッション状態取得 GET ルートの静的定義。
*/
const sessionStateGetRoute = createRoute({
	method: "get",
	path: "/sessions/{sessionId}/state",
	description: "セッションの最新スナップショットを取得し、ETag でクライアントのキャッシュバージョンと突き合わせます。",
	request: { params: object({ sessionId: string$1().min(1).describe("状態を取得する `session_id`。初期作成レスポンスで受け取った値を指定します。") }) },
	responses: {
		200: {
			description: "セッションが存在し、最新スナップショットとバージョンが返却されました。",
			content: { "application/json": { schema: sessionResponseSchema } }
		},
		304: { description: "送信された `If-None-Match` が最新バージョンと一致したため、キャッシュ済みデータを再利用できます。" },
		404: {
			description: "指定された `session_id` のデータが存在しません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
const formatEtag = (version$1) => `"${version$1}"`;
const normalizeEtagToken = (token) => {
	const trimmed = token.trim();
	if (trimmed.length === 0) return "";
	if (trimmed === "*") return "*";
	const withoutWeakPrefix = trimmed.startsWith("W/") ? trimmed.slice(2) : trimmed;
	if (withoutWeakPrefix.startsWith("\"") && withoutWeakPrefix.endsWith("\"") && withoutWeakPrefix.length >= 2) return withoutWeakPrefix.slice(1, -1);
	return withoutWeakPrefix;
};
const parseIfNoneMatch = (headerValue) => {
	if (headerValue === null) return [];
	if (headerValue.trim().length === 0) return [];
	return headerValue.split(",").map((token) => normalizeEtagToken(token)).filter((token) => token.length > 0);
};
const isCachedVersionFresh = (ifNoneMatchHeader, version$1) => {
	const tokens = parseIfNoneMatch(ifNoneMatchHeader);
	if (tokens.length === 0) return false;
	if (tokens.includes("*")) return true;
	return tokens.includes(version$1);
};
/**
* セッション状態取得 GET ルートを持つ Hono アプリケーション。
*/
const sessionStateGetApp = new OpenAPIHono().openapi(sessionStateGetRoute, (c) => {
	const deps = c.var.deps;
	const { sessionId } = c.req.valid("param");
	const envelope = deps.store.getEnvelope(sessionId);
	if (!envelope) return respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
	const etag = formatEtag(envelope.version);
	c.header("ETag", etag);
	if (isCachedVersionFresh(c.req.header("if-none-match") ?? null, envelope.version)) return c.body(null, 304);
	return c.json(toSessionResponse(envelope), 200);
});

//#endregion
//#region node_modules/hono/dist/utils/stream.js
var StreamingApi = class {
	writer;
	encoder;
	writable;
	abortSubscribers = [];
	responseReadable;
	aborted = false;
	closed = false;
	constructor(writable, _readable) {
		this.writable = writable;
		this.writer = writable.getWriter();
		this.encoder = new TextEncoder();
		const reader = _readable.getReader();
		this.abortSubscribers.push(async () => {
			await reader.cancel();
		});
		this.responseReadable = new ReadableStream({
			async pull(controller) {
				const { done, value } = await reader.read();
				done ? controller.close() : controller.enqueue(value);
			},
			cancel: () => {
				this.abort();
			}
		});
	}
	async write(input) {
		try {
			if (typeof input === "string") input = this.encoder.encode(input);
			await this.writer.write(input);
		} catch {}
		return this;
	}
	async writeln(input) {
		await this.write(input + "\n");
		return this;
	}
	sleep(ms) {
		return new Promise((res) => setTimeout(res, ms));
	}
	async close() {
		try {
			await this.writer.close();
		} catch {}
		this.closed = true;
	}
	async pipe(body) {
		this.writer.releaseLock();
		await body.pipeTo(this.writable, { preventClose: true });
		this.writer = this.writable.getWriter();
	}
	onAbort(listener) {
		this.abortSubscribers.push(listener);
	}
	abort() {
		if (!this.aborted) {
			this.aborted = true;
			this.abortSubscribers.forEach((subscriber) => subscriber());
		}
	}
};

//#endregion
//#region node_modules/hono/dist/helper/streaming/utils.js
var isOldBunVersion = () => {
	const version$1 = typeof Bun !== "undefined" ? Bun.version : void 0;
	if (version$1 === void 0) return false;
	const result = version$1.startsWith("1.1") || version$1.startsWith("1.0") || version$1.startsWith("0.");
	isOldBunVersion = () => result;
	return result;
};

//#endregion
//#region node_modules/hono/dist/helper/streaming/sse.js
var SSEStreamingApi = class extends StreamingApi {
	constructor(writable, readable) {
		super(writable, readable);
	}
	async writeSSE(message) {
		const dataLines = (await resolveCallback(message.data, HtmlEscapedCallbackPhase.Stringify, false, {})).split("\n").map((line) => {
			return `data: ${line}`;
		}).join("\n");
		const sseData = [
			message.event && `event: ${message.event}`,
			dataLines,
			message.id && `id: ${message.id}`,
			message.retry && `retry: ${message.retry}`
		].filter(Boolean).join("\n") + "\n\n";
		await this.write(sseData);
	}
};
var run = async (stream, cb, onError) => {
	try {
		await cb(stream);
	} catch (e) {
		if (e instanceof Error && onError) {
			await onError(e, stream);
			await stream.writeSSE({
				event: "error",
				data: e.message
			});
		} else console.error(e);
	} finally {
		stream.close();
	}
};
var contextStash = /* @__PURE__ */ new WeakMap();
var streamSSE = (c, cb, onError) => {
	const { readable, writable } = new TransformStream();
	const stream = new SSEStreamingApi(writable, readable);
	if (isOldBunVersion()) c.req.raw.signal.addEventListener("abort", () => {
		if (!stream.closed) stream.abort();
	});
	contextStash.set(stream.responseReadable, c);
	c.header("Transfer-Encoding", "chunked");
	c.header("Content-Type", "text/event-stream");
	c.header("Cache-Control", "no-cache");
	c.header("Connection", "keep-alive");
	run(stream, cb, onError);
	return c.newResponse(stream.responseReadable);
};

//#endregion
//#region src/routes/sessions/{sessionId}/stream.get.ts
const KEEP_ALIVE_INTERVAL_MS = 15e3;
/**
* SSE ストリーム GET ルートの静的定義。
*/
const sessionStreamGetRoute = createRoute({
	method: "get",
	path: "/sessions/{sessionId}/stream",
	description: "指定したセッションの状態更新を SSE (Server-Sent Events) で購読します。`Last-Event-ID` を送ると未取得イベントを再送します。",
	request: { params: object({ sessionId: string$1().min(1).describe("SSE で監視する `session_id`。プレイヤー登録レスポンスで受け取った値を指定します。") }) },
	responses: {
		200: { description: "SSE ストリームが確立され、`state.delta` や `state.final` などのイベントが配信されます。" },
		404: {
			description: "セッションが見つかりません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
const formatPayload = (event) => ({
	id: event.id,
	event: event.event,
	data: event.data
});
/**
* SSE ストリーム GET ルートを持つ Hono アプリケーション。
*/
const sessionStreamGetApp = new OpenAPIHono().openapi(sessionStreamGetRoute, (c) => {
	const deps = c.var.deps;
	const { sessionId } = c.req.valid("param");
	if (!deps.store.getEnvelope(sessionId)) return respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
	const lastEventIdHeader = c.req.header("last-event-id");
	const logReplayAfterId = deps.eventLogService.isEventLogId(lastEventIdHeader ?? null) ? lastEventIdHeader ?? void 0 : void 0;
	let connection = null;
	let keepAliveHandle = null;
	const cleanup = () => {
		if (keepAliveHandle) {
			clearInterval(keepAliveHandle);
			keepAliveHandle = null;
		}
		if (connection) {
			connection.disconnect();
			connection = null;
		}
	};
	return streamSSE(c, async (stream) => {
		const send = (event) => {
			stream.writeSSE(formatPayload(event));
		};
		const connectOptions = {
			sessionId,
			send
		};
		if (typeof lastEventIdHeader === "string" && lastEventIdHeader.length > 0) connectOptions.lastEventId = lastEventIdHeader;
		connection = deps.sseGateway.connect(connectOptions);
		keepAliveHandle = setInterval(() => {
			stream.write(": keep-alive\n\n");
		}, KEEP_ALIVE_INTERVAL_MS);
		const replayInput = {
			sessionId,
			send: (entry) => stream.writeSSE({
				id: entry.id,
				event: "event.log",
				data: JSON.stringify(entry)
			})
		};
		if (logReplayAfterId !== void 0) replayInput.lastEventId = logReplayAfterId;
		await deps.eventLogService.replayEntries(replayInput);
		await new Promise((resolve) => {
			stream.onAbort(() => {
				cleanup();
				resolve();
			});
		});
	}, async (err, stream) => {
		cleanup();
		console.error(err);
		await stream.write(": error\n\n");
	});
});

//#endregion
//#region src/services/eventLogService.ts
const isEventLogIdentifier = (value) => typeof value === "string" && value.startsWith("turn-");
const createEntryId = (store, sessionId, turn) => {
	return `turn-${turn}-log-${store.listEventLogAfter(sessionId).filter((entry) => entry.turn === turn).length + 1}`;
};
const appendEntries = (store, gateway, sessionId, entries) => {
	const saved = store.appendEventLog(sessionId, entries);
	for (const entry of saved) gateway.publishEventLog(sessionId, entry);
	return saved;
};
/**
* イベントログの永続化と SSE 配信を司るサービスを構築する。
* @param dependencies ストアと SSE ゲートウェイ。
*/
const createEventLogService = (dependencies) => {
	const recordAction = (input) => {
		const id = createEntryId(dependencies.store, input.sessionId, input.turn);
		const chipsDelta = input.chipsAfter - input.chipsBefore;
		const entry = {
			id,
			turn: input.turn,
			actor: input.actor,
			action: input.action,
			timestamp: input.timestamp,
			chipsDelta,
			details: {
				card: input.card,
				centralPotBefore: input.centralPotBefore,
				centralPotAfter: input.centralPotAfter,
				targetPlayer: input.targetPlayer ?? input.actor
			}
		};
		appendEntries(dependencies.store, dependencies.sseGateway, input.sessionId, [entry]);
		return entry;
	};
	const recordSystemEvent = (input) => {
		const entry = {
			id: createEntryId(dependencies.store, input.sessionId, input.turn),
			turn: input.turn,
			actor: input.actor,
			action: input.action,
			timestamp: input.timestamp,
			...input.details !== void 0 && { details: input.details },
			...input.chipsDelta !== void 0 && { chipsDelta: input.chipsDelta }
		};
		appendEntries(dependencies.store, dependencies.sseGateway, input.sessionId, [entry]);
		return entry;
	};
	const replayEntries = async ({ sessionId, lastEventId, send }) => {
		const entries = dependencies.store.listEventLogAfter(sessionId, lastEventId);
		for (const entry of entries) await send(entry);
	};
	return {
		recordAction,
		recordSystemEvent,
		replayEntries,
		isEventLogId: isEventLogIdentifier
	};
};

//#endregion
//#region src/services/monitoringService.ts
/**
* 構造化ログを出力するモニタリングサービスを構築する。
* @param dependencies ログ関数を含む依存性。
*/
const createMonitoringService = (dependencies) => {
	const logActionProcessing = (params) => {
		const entry = {
			level: params.result === "success" ? "info" : "warn",
			event: "action_processing",
			sessionId: params.sessionId,
			commandId: params.commandId,
			action: params.action,
			playerId: params.playerId,
			action_processing_ms: params.durationMs,
			result: params.result
		};
		if (params.version !== void 0) entry.version = params.version;
		if (params.errorCode !== void 0) entry.errorCode = params.errorCode;
		dependencies.log(entry);
	};
	const logMutexWait = (params) => {
		dependencies.log({
			level: "debug",
			event: "mutex_wait",
			sessionId: params.sessionId,
			mutex_wait_ms: params.waitMs
		});
	};
	const logSseConnectionChange = (params) => {
		dependencies.log({
			level: "info",
			event: "sse_connection_change",
			sessionId: params.sessionId,
			action: params.action,
			sse_connection_count: params.connectionCount
		});
	};
	const logTimerEvent = (params) => {
		const entry = {
			level: "info",
			event: "timer_event",
			sessionId: params.sessionId,
			action: params.action
		};
		if (params.deadline !== void 0) entry.deadline = params.deadline;
		if (params.turn !== void 0) entry.turn = params.turn;
		dependencies.log(entry);
	};
	const logSystemTimeout = (params) => {
		dependencies.log({
			level: "info",
			event: "system_timeout",
			sessionId: params.sessionId,
			turn: params.turn,
			forcedPlayerId: params.forcedPlayerId,
			cardTaken: params.cardTaken
		});
	};
	const logExport = (params) => {
		dependencies.log({
			level: "info",
			event: "export_success",
			sessionId: params.sessionId,
			format: params.format,
			entryCount: params.entryCount
		});
	};
	const logSessionEvent = (params) => {
		const entry = {
			level: "info",
			event: "session_event",
			sessionId: params.sessionId,
			action: params.action
		};
		if (params.playerCount !== void 0) entry.playerCount = params.playerCount;
		dependencies.log(entry);
	};
	return {
		logActionProcessing,
		logMutexWait,
		logSseConnectionChange,
		logTimerEvent,
		logSystemTimeout,
		logExport,
		logSessionEvent
	};
};

//#endregion
//#region src/services/ruleHintService.ts
const formatNoCardHint = (snapshot, timestamp) => {
	return {
		text: `公開カードはありません。新しいターン待機中です。山札は残り ${snapshot.deck.length} 枚です。`,
		emphasis: "info",
		turn: snapshot.turnState.turn,
		generatedAt: timestamp
	};
};
const formatForcedTakeHint = (snapshot, timestamp, card) => ({
	text: `チップを使い切った ${snapshot.turnState.currentPlayerId} はカード ${card} を必ず取得します。中央ポット ${snapshot.centralPot} 枚も一緒に受け取ります。`,
	emphasis: "warning",
	turn: snapshot.turnState.turn,
	generatedAt: timestamp
});
const describeActionableHint = (snapshot, timestamp, card) => {
	const centralPot = snapshot.centralPot;
	const effectiveValue = Math.max(card - centralPot, 0);
	const playerId = snapshot.turnState.currentPlayerId;
	const chips = snapshot.chips[playerId] ?? 0;
	const deckRemaining = snapshot.deck.length;
	const sentences = [`カード ${card} はポット ${centralPot} 枚で実質 ${effectiveValue} 点です。`];
	let emphasis = "info";
	if (chips <= 2) {
		sentences.push(`${playerId} の残りチップは ${chips} 枚です。支払うと選択肢が限られるため注意してください。`);
		emphasis = "warning";
	} else sentences.push(`${playerId} はチップ ${chips} 枚を保有しており、支払いと取得のどちらも選べます。`);
	if (deckRemaining <= 5) sentences.push(`山札は残り ${deckRemaining} 枚です。終盤の得点計画を意識しましょう。`);
	return {
		text: sentences.join(" "),
		emphasis,
		turn: snapshot.turnState.turn,
		generatedAt: timestamp
	};
};
const createHintFromSnapshot = (snapshot, timestamp) => {
	if (!snapshot.turnState.awaitingAction) return formatNoCardHint(snapshot, timestamp);
	const card = snapshot.turnState.cardInCenter;
	if (card === null) return formatNoCardHint(snapshot, timestamp);
	const currentPlayerId = snapshot.turnState.currentPlayerId;
	if ((snapshot.chips[currentPlayerId] ?? 0) === 0) return formatForcedTakeHint(snapshot, timestamp, card);
	return describeActionableHint(snapshot, timestamp, card);
};
/**
* ルールヘルプの生成とキャッシュ管理を担当するサービスを構築する。
* @param options 生成時刻を差し替えるためのオプション。
*/
const createRuleHintService = (options = {}) => {
	const now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
	const cache = /* @__PURE__ */ new Map();
	const refreshHint = (snapshot, version$1) => {
		const hint = createHintFromSnapshot(snapshot, now());
		const stored = {
			sessionId: snapshot.sessionId,
			stateVersion: version$1,
			hint
		};
		cache.set(snapshot.sessionId, stored);
		return stored;
	};
	const getLatestHint = (sessionId) => cache.get(sessionId) ?? null;
	return {
		refreshHint,
		getLatestHint
	};
};

//#endregion
//#region src/services/sseBroadcastGateway.ts
const MAX_EVENT_HISTORY = 100;
const cloneValue$1 = (value) => structuredClone(value);
const createStateDeltaEvent = (sessionId, snapshot, version$1) => ({
	id: `state:${version$1}`,
	event: "state.delta",
	data: JSON.stringify({
		session_id: sessionId,
		state_version: version$1,
		state: cloneValue$1(snapshot)
	})
});
const createStateFinalEvent = (sessionId, snapshot, version$1) => {
	if (snapshot.finalResults === null) return null;
	return {
		id: `state-final:${version$1}`,
		event: "state.final",
		data: JSON.stringify({
			session_id: sessionId,
			state_version: version$1,
			final_results: cloneValue$1(snapshot.finalResults)
		})
	};
};
const createSystemErrorEvent = (sessionId, payload) => ({
	id: `system-error:${Date.now().toString(16)}`,
	event: "system.error",
	data: JSON.stringify({
		session_id: sessionId,
		error: payload
	})
});
const createRuleHintEvent = (sessionId, payload) => ({
	id: `rule-hint:${payload.stateVersion}`,
	event: "rule.hint",
	data: JSON.stringify({
		session_id: sessionId,
		state_version: payload.stateVersion,
		hint: {
			text: payload.hint.text,
			emphasis: payload.hint.emphasis,
			turn: payload.hint.turn,
			generated_at: payload.hint.generatedAt
		}
	})
});
/**
* SSE 接続の登録とイベント履歴の管理を行うブロードキャストゲートウェイを構築する。
* @param dependencies モニタリングサービスなどのオプション依存性。
*/
const createSseBroadcastGateway = (dependencies = {}) => {
	const connections = /* @__PURE__ */ new Map();
	const history = /* @__PURE__ */ new Map();
	const getConnectionCount = (sessionId) => connections.get(sessionId)?.size ?? 0;
	const appendHistory = (sessionId, event) => {
		const events = history.get(sessionId) ?? [];
		events.push(event);
		if (events.length > MAX_EVENT_HISTORY) events.splice(0, events.length - MAX_EVENT_HISTORY);
		history.set(sessionId, events);
	};
	const broadcast = (sessionId, event, options = {}) => {
		if (options.remember ?? true) appendHistory(sessionId, event);
		const listeners = connections.get(sessionId);
		if (!listeners) return;
		for (const listener of listeners) listener.send(event);
	};
	const replayHistory = (sessionId, send, lastEventId) => {
		const events = history.get(sessionId);
		if (!events || events.length === 0) return;
		if (lastEventId === void 0) {
			for (const event of events) send(event);
			return;
		}
		const index = events.findIndex((event) => event.id === lastEventId);
		if (index === -1) {
			for (const event of events) send(event);
			return;
		}
		for (let offset = index + 1; offset < events.length; offset += 1) {
			const event = events[offset];
			if (!event) continue;
			send(event);
		}
	};
	const connect = (options) => {
		const listeners = connections.get(options.sessionId) ?? /* @__PURE__ */ new Set();
		const connection = {
			sessionId: options.sessionId,
			send: options.send
		};
		listeners.add(connection);
		connections.set(options.sessionId, listeners);
		const connectionCount = getConnectionCount(options.sessionId);
		dependencies.monitoring?.logSseConnectionChange({
			sessionId: options.sessionId,
			action: "connect",
			connectionCount
		});
		replayHistory(options.sessionId, options.send, options.lastEventId);
		const disconnect = () => {
			const current = connections.get(options.sessionId);
			if (!current) return;
			current.delete(connection);
			if (current.size === 0) connections.delete(options.sessionId);
			const newConnectionCount = getConnectionCount(options.sessionId);
			dependencies.monitoring?.logSseConnectionChange({
				sessionId: options.sessionId,
				action: "disconnect",
				connectionCount: newConnectionCount
			});
		};
		return { disconnect };
	};
	const publishStateDelta = (sessionId, snapshot, version$1) => {
		broadcast(sessionId, createStateDeltaEvent(sessionId, snapshot, version$1));
	};
	const publishStateFinal = (sessionId, snapshot, version$1) => {
		const event = createStateFinalEvent(sessionId, snapshot, version$1);
		if (!event) return;
		broadcast(sessionId, event);
	};
	const publishSystemError = (sessionId, payload) => {
		broadcast(sessionId, createSystemErrorEvent(sessionId, payload));
	};
	const publishEventLog = (sessionId, entry) => {
		broadcast(sessionId, {
			id: entry.id,
			event: "event.log",
			data: JSON.stringify(entry)
		}, { remember: false });
	};
	const publishRuleHint = (sessionId, payload) => {
		broadcast(sessionId, createRuleHintEvent(sessionId, payload));
	};
	return {
		connect,
		publishStateDelta,
		publishStateFinal,
		publishSystemError,
		publishEventLog,
		publishRuleHint
	};
};

//#endregion
//#region src/services/systemTimeoutHandler.ts
const defaultGenerateCommandId = (snapshot) => `system-timeout-${snapshot.turnState.turn}`;
/**
* タイムアウト発生時に system コマンドで強制取得させるハンドラを構築する。
* @param dependencies セッションストアとターンサービス。
*/
const createTimeoutCommandHandler = (dependencies) => {
	const generateCommandId = dependencies.generateCommandId ?? defaultGenerateCommandId;
	const handleTimeout = async (sessionId) => {
		const envelope = dependencies.store.getEnvelope(sessionId);
		if (envelope === void 0) return;
		const snapshot = envelope.snapshot;
		const turnState = snapshot.turnState;
		if (turnState.awaitingAction === false || turnState.cardInCenter === null) return;
		const turn = turnState.turn;
		const forcedPlayerId = turnState.currentPlayerId;
		const cardTaken = turnState.cardInCenter;
		try {
			const result = await dependencies.turnService.applyCommand({
				sessionId,
				commandId: generateCommandId(snapshot),
				expectedVersion: envelope.version,
				playerId: "system",
				action: "takeCard"
			});
			dependencies.monitoring?.logSystemTimeout({
				sessionId,
				turn,
				forcedPlayerId,
				cardTaken
			});
			const eventOptions = {};
			if (dependencies.sseGateway) eventOptions.sseGateway = dependencies.sseGateway;
			if (dependencies.ruleHintService) eventOptions.ruleHints = dependencies.ruleHintService;
			publishStateEvents(eventOptions, result.snapshot, result.version);
		} catch {}
	};
	return handleTimeout;
};

//#endregion
//#region src/services/chipLedger.ts
const ensurePlayerRegistered = (snapshot, playerId) => {
	const chips = snapshot.chips[playerId];
	if (typeof chips !== "number") throw createServiceError("PLAYER_NOT_FOUND", 404, `Player ${playerId} is not registered.`);
	return chips;
};
/**
* プレイヤーの所持チップに基づきアクション実行可否を検証する。
* @param snapshot チップ状況を保持しているゲームスナップショット
* @param playerId 判定対象のプレイヤーID
* @param action 検証するアクション種別
*/
const ensureChipActionAllowed = (snapshot, playerId, action) => {
	if (ensurePlayerRegistered(snapshot, playerId) > 0) return;
	if (action === "takeCard") return;
	throw createServiceError("CHIP_INSUFFICIENT", 422, "Player does not have enough chips.");
};
/**
* 現在のプレイヤーから 1 枚チップを徴収し中央ポットへ移す。
* @param snapshot チップ状況を保持しているゲームスナップショット
* @param playerId チップを支払うプレイヤーID
*/
const placeChipIntoCenter = (snapshot, playerId) => {
	const chips = ensurePlayerRegistered(snapshot, playerId);
	if (chips <= 0) throw createServiceError("CHIP_INSUFFICIENT", 422, "Player does not have enough chips.");
	const updated = chips - 1;
	snapshot.chips[playerId] = updated;
	snapshot.centralPot += 1;
	return {
		type: "chip.place",
		playerId,
		chipsDelta: -1,
		resultingChips: updated,
		centralPot: snapshot.centralPot
	};
};
/**
* 中央ポットにあるチップ全量をプレイヤーへ払い戻す。
* @param snapshot チップ状況を保持しているゲームスナップショット
* @param playerId 受け取るプレイヤーID
*/
const collectCentralPotForPlayer = (snapshot, playerId) => {
	const chips = ensurePlayerRegistered(snapshot, playerId);
	const pot = snapshot.centralPot;
	if (pot <= 0) return null;
	const updated = chips + pot;
	snapshot.chips[playerId] = updated;
	snapshot.centralPot = 0;
	return {
		type: "chip.collect",
		playerId,
		chipsDelta: pot,
		resultingChips: updated,
		centralPot: snapshot.centralPot
	};
};

//#endregion
//#region src/services/scoreService.ts
const createCardSets = (cards) => {
	const sorted = [...cards].toSorted((a, b) => a - b);
	const sets = [];
	for (const card of sorted) {
		const current = sets.at(-1);
		const lastValue = current?.at(-1);
		if (current && lastValue !== void 0 && card === lastValue + 1) current.push(card);
		else sets.push([card]);
	}
	if (sorted.length === 0) return [];
	return sets;
};
const createPlacement = (playerId, cards, chips) => {
	const sets = createCardSets(cards);
	return {
		playerId,
		score: sets.reduce((sum, set$1) => sum + (set$1[0] ?? 0), 0) - chips,
		chipsRemaining: chips,
		cards: [...cards].toSorted((a, b) => a - b),
		cardSets: sets
	};
};
const sortPlacements = (placements) => {
	const sorted = placements.map((placement) => ({
		...placement,
		rank: 0
	})).toSorted((a, b) => {
		if (a.score !== b.score) return a.score - b.score;
		if (a.chipsRemaining !== b.chipsRemaining) return b.chipsRemaining - a.chipsRemaining;
		return a.playerId.localeCompare(b.playerId);
	});
	let currentRank = 0;
	let lastScore;
	let lastChips;
	for (const placement of sorted) {
		if (lastScore === void 0 || lastChips === void 0 || placement.score !== lastScore || placement.chipsRemaining !== lastChips) {
			currentRank += 1;
			lastScore = placement.score;
			lastChips = placement.chipsRemaining;
		}
		placement.rank = currentRank;
	}
	return sorted;
};
const detectTieBreak = (placements) => {
	let tieGroup;
	for (const placement of placements) {
		const existingGroup = tieGroup && tieGroup.score === placement.score ? tieGroup : void 0;
		if (existingGroup) existingGroup.contenders.push(placement);
		else {
			const sameScore = placements.filter((candidate) => candidate.score === placement.score);
			if (sameScore.length > 1) {
				tieGroup = {
					score: placement.score,
					contenders: sameScore
				};
				break;
			}
		}
	}
	if (!tieGroup) return null;
	const maxChips = Math.max(...tieGroup.contenders.map((item) => item.chipsRemaining));
	const winners = tieGroup.contenders.filter((item) => item.chipsRemaining === maxChips).map((item) => item.playerId).toSorted((a, b) => a.localeCompare(b));
	return {
		reason: "chipCount",
		tiedScore: tieGroup.score,
		contenders: tieGroup.contenders.map((item) => item.playerId).toSorted((a, b) => a.localeCompare(b)),
		winner: winners.length === 1 ? winners[0] ?? null : null
	};
};
/**
* ゲームスナップショットから最終スコアサマリーを算出する。
* @param snapshot 対象のゲームスナップショット。
*/
const calculateScoreSummary = (snapshot) => {
	const sorted = sortPlacements(snapshot.players.map((player) => createPlacement(player.id, snapshot.hands[player.id] ?? [], snapshot.chips[player.id] ?? 0)));
	return {
		placements: sorted,
		tieBreak: detectTieBreak(sorted)
	};
};

//#endregion
//#region src/services/turnDecision.ts
const createError = createServiceError;
const cloneSnapshot = (snapshot) => structuredClone(snapshot);
const ensureSessionEnvelope = (store, sessionId) => {
	const envelope = store.getEnvelope(sessionId);
	if (!envelope) throw createError("SESSION_NOT_FOUND", 404, "Session does not exist.");
	return envelope;
};
const nextPlayerIndex = (totalPlayers, currentIndex) => totalPlayers === 0 ? 0 : (currentIndex + 1) % totalPlayers;
const rotateToNextPlayer = (snapshot) => {
	const total = snapshot.playerOrder.length;
	if (total === 0) throw createError("PLAYER_ORDER_INVALID", 422, "Player order is not initialized.");
	const nextIndex = nextPlayerIndex(total, snapshot.turnState.currentPlayerIndex);
	const nextPlayerId = snapshot.playerOrder[nextIndex];
	if (nextPlayerId === void 0) throw createError("PLAYER_ORDER_INVALID", 422, "Player order is not initialized.");
	snapshot.turnState.currentPlayerIndex = nextIndex;
	snapshot.turnState.currentPlayerId = nextPlayerId;
};
const findPlayerIndex = (snapshot, playerId) => {
	const index = snapshot.playerOrder.indexOf(playerId);
	if (index === -1) return 0;
	return index;
};
const sortHand = (cards) => cards.toSorted((a, b) => a - b);
const drawNextCard = (snapshot) => {
	if (snapshot.deck.length === 0) return;
	const [nextCard, ...rest] = snapshot.deck;
	snapshot.deck = rest;
	return nextCard;
};
const applyPlaceChip = (snapshot) => {
	const playerId = snapshot.turnState.currentPlayerId;
	placeChipIntoCenter(snapshot, playerId);
	rotateToNextPlayer(snapshot);
};
const applyTakeCard = (snapshot) => {
	const card = snapshot.turnState.cardInCenter;
	const playerId = snapshot.turnState.currentPlayerId;
	if (card === null) throw createError("TURN_NOT_AVAILABLE", 422, "No active card is available.");
	const hand = snapshot.hands[playerId] ?? [];
	snapshot.hands[playerId] = sortHand([...hand, card]);
	collectCentralPotForPlayer(snapshot, playerId);
	snapshot.turnState.cardInCenter = null;
	snapshot.turnState.awaitingAction = false;
	const nextCard = drawNextCard(snapshot);
	if (nextCard !== void 0) {
		snapshot.turnState.cardInCenter = nextCard;
		snapshot.turnState.turn += 1;
		snapshot.turnState.awaitingAction = true;
	}
	snapshot.turnState.currentPlayerId = playerId;
	snapshot.turnState.currentPlayerIndex = findPlayerIndex(snapshot, playerId);
};
const isGameCompleted = (snapshot) => snapshot.deck.length === 0 && snapshot.turnState.cardInCenter === null && snapshot.turnState.awaitingAction === false;
const ensureActionAllowed = (snapshot, input) => {
	if (snapshot.phase === "completed") throw createError("GAME_ALREADY_COMPLETED", 409, "Game session already completed.");
	if (!snapshot.turnState.awaitingAction) throw createError("TURN_NOT_AVAILABLE", 422, "There is no active card waiting for an action.");
	const currentPlayerId = snapshot.turnState.currentPlayerId;
	if (input.playerId === "system") return;
	if (currentPlayerId !== input.playerId) throw createError("TURN_NOT_AVAILABLE", 422, "Action is only allowed for the current player.");
	ensureChipActionAllowed(snapshot, input.playerId, input.action);
};
const applyAction = (snapshot, input) => {
	switch (input.action) {
		case "placeChip":
			applyPlaceChip(snapshot);
			return;
		case "takeCard":
			applyTakeCard(snapshot);
			return;
		default: {
			const unsupportedAction = input.action;
			throw createError("ACTION_NOT_SUPPORTED", 422, `Action ${unsupportedAction} is not supported.`);
		}
	}
};
const updateTurnDeadline = (snapshot, timestamp, timeoutMs) => {
	if (snapshot.turnState.awaitingAction) {
		snapshot.turnState.deadline = calculateTurnDeadline(timestamp, timeoutMs);
		return;
	}
	snapshot.turnState.deadline = null;
};
/**
* ターン進行コマンドを処理するサービスを構築する。
* @param dependencies ストアやクロックなどの依存性。
*/
const createTurnDecisionService = (dependencies) => {
	const applyCommand = async (input) => {
		const startTime = Date.now();
		const envelope = ensureSessionEnvelope(dependencies.store, input.sessionId);
		const mutexStartTime = Date.now();
		try {
			const result = await envelope.mutex.runExclusive(() => {
				const mutexWaitMs = Date.now() - mutexStartTime;
				dependencies.monitoring?.logMutexWait({
					sessionId: input.sessionId,
					waitMs: mutexWaitMs
				});
				const current = ensureSessionEnvelope(dependencies.store, input.sessionId);
				if (dependencies.store.hasProcessedCommand(input.sessionId, input.commandId)) return {
					snapshot: current.snapshot,
					version: current.version
				};
				if (input.expectedVersion !== current.version) throw createError("STATE_VERSION_MISMATCH", 409, "State version does not match the latest snapshot.");
				const snapshot = cloneSnapshot(current.snapshot);
				ensureActionAllowed(snapshot, input);
				const actingPlayerId = input.playerId === "system" ? snapshot.turnState.currentPlayerId : input.playerId;
				const actionTurn = snapshot.turnState.turn;
				const cardBeforeAction = snapshot.turnState.cardInCenter;
				const centralPotBeforeAction = snapshot.centralPot;
				const chipsBeforeAction = snapshot.chips[actingPlayerId] ?? snapshot.chips[input.playerId] ?? 0;
				applyAction(snapshot, input);
				const chipsAfterAction = snapshot.chips[actingPlayerId] ?? snapshot.chips[input.playerId] ?? 0;
				const centralPotAfterAction = snapshot.centralPot;
				if (snapshot.phase === "setup") snapshot.phase = "running";
				const timestamp = dependencies.now();
				snapshot.updatedAt = timestamp;
				updateTurnDeadline(snapshot, timestamp, dependencies.turnTimeoutMs);
				if (input.action === "placeChip" || input.action === "takeCard") dependencies.eventLogs.recordAction({
					sessionId: snapshot.sessionId,
					turn: actionTurn,
					actor: input.playerId,
					targetPlayer: actingPlayerId,
					action: input.action,
					card: cardBeforeAction,
					centralPotBefore: centralPotBeforeAction,
					centralPotAfter: centralPotAfterAction,
					chipsBefore: chipsBeforeAction,
					chipsAfter: chipsAfterAction,
					timestamp
				});
				let finalSummary = null;
				if (snapshot.finalResults === null && snapshot.phase !== "completed" && isGameCompleted(snapshot)) {
					snapshot.phase = "completed";
					finalSummary = calculateScoreSummary(snapshot);
					snapshot.finalResults = finalSummary;
					snapshot.turnState.deadline = null;
				}
				const saved = dependencies.store.saveSnapshot(snapshot);
				dependencies.store.markCommandProcessed(input.sessionId, input.commandId);
				const next = saved.snapshot.turnState;
				const nextDeadline = next.deadline;
				if (next.awaitingAction && nextDeadline !== null && nextDeadline !== void 0) dependencies.timerSupervisor.register(saved.snapshot.sessionId, nextDeadline);
				else dependencies.timerSupervisor.clear(saved.snapshot.sessionId);
				if (finalSummary !== null) dependencies.eventLogs.recordSystemEvent({
					sessionId: saved.snapshot.sessionId,
					turn: saved.snapshot.turnState.turn,
					actor: "system",
					action: "gameCompleted",
					timestamp,
					details: { finalResults: finalSummary }
				});
				return {
					snapshot: saved.snapshot,
					version: saved.version
				};
			});
			const durationMs = Date.now() - startTime;
			dependencies.monitoring?.logActionProcessing({
				sessionId: input.sessionId,
				commandId: input.commandId,
				action: input.action,
				playerId: input.playerId,
				durationMs,
				result: "success",
				version: result.version
			});
			return result;
		} catch (err) {
			const durationMs = Date.now() - startTime;
			const errorCode = err !== null && typeof err === "object" && "code" in err && typeof err.code === "string" ? err.code : "UNKNOWN_ERROR";
			dependencies.monitoring?.logActionProcessing({
				sessionId: input.sessionId,
				commandId: input.commandId,
				action: input.action,
				playerId: input.playerId,
				durationMs,
				result: "error",
				errorCode
			});
			throw err;
		}
	};
	return { applyCommand };
};

//#endregion
//#region src/states/inMemoryGameStore.ts
const cloneValue = (value) => structuredClone(value);
const createSnapshotVersion = (snapshot) => createHash("sha1").update(JSON.stringify(snapshot)).digest("hex");
const createMutex = () => {
	let tail = Promise.resolve();
	const runExclusive = async (task) => {
		const run$1 = tail.then(() => task(), () => task());
		const release = () => {
			tail = Promise.resolve();
		};
		tail = run$1.then(release, release);
		return run$1;
	};
	return { runExclusive };
};
const ensureEnvelope = (sessions, sessionId) => {
	const envelope = sessions.get(sessionId);
	if (!envelope) throw new Error(`Session ${sessionId} is not initialized`);
	return envelope;
};
/**
* 現在のプロセス内でゲームのセッション情報をすべてメモリに保持するストア。
*/
const createInMemoryGameStore = () => {
	const sessions = /* @__PURE__ */ new Map();
	const saveSnapshot = (snapshot) => {
		const normalizedSnapshot = cloneValue(snapshot);
		const version$1 = createSnapshotVersion(normalizedSnapshot);
		const existing = sessions.get(snapshot.sessionId);
		if (existing) {
			existing.snapshot = normalizedSnapshot;
			existing.version = version$1;
			return existing;
		}
		const created = {
			snapshot: normalizedSnapshot,
			version: version$1,
			eventLog: [],
			processedCommands: /* @__PURE__ */ new Set(),
			mutex: createMutex()
		};
		sessions.set(snapshot.sessionId, created);
		return created;
	};
	const getSnapshot = (sessionId) => {
		const envelope = sessions.get(sessionId);
		if (!envelope) return;
		return cloneValue(envelope.snapshot);
	};
	const getEnvelope = (sessionId) => sessions.get(sessionId);
	const appendEventLog = (sessionId, entries) => {
		const envelope = ensureEnvelope(sessions, sessionId);
		const normalized = entries.map((entry) => cloneValue(entry));
		for (const entry of normalized) envelope.eventLog.push(entry);
		return normalized;
	};
	const listEventLogAfter = (sessionId, afterId) => {
		const envelope = ensureEnvelope(sessions, sessionId);
		if (afterId === void 0) return envelope.eventLog.map((entry) => cloneValue(entry));
		const index = envelope.eventLog.findIndex((entry) => entry.id === afterId);
		if (index === -1) return envelope.eventLog.map((entry) => cloneValue(entry));
		return envelope.eventLog.slice(index + 1).map((entry) => cloneValue(entry));
	};
	const hasProcessedCommand = (sessionId, commandId) => {
		return ensureEnvelope(sessions, sessionId).processedCommands.has(commandId);
	};
	const markCommandProcessed = (sessionId, commandId) => {
		ensureEnvelope(sessions, sessionId).processedCommands.add(commandId);
	};
	const listSessions = () => [...sessions.entries()].map(([sessionId, envelope]) => ({
		sessionId,
		version: envelope.version,
		phase: envelope.snapshot.phase,
		updatedAt: envelope.snapshot.updatedAt
	}));
	return {
		saveSnapshot,
		getSnapshot,
		getEnvelope,
		appendEventLog,
		listEventLogAfter,
		hasProcessedCommand,
		markCommandProcessed,
		listSessions
	};
};

//#endregion
//#region src/app.ts
/**
* console.info で構造化ログを出力するデフォルトロガー。
* @param entry ログエントリ。
*/
const defaultLogger = (entry) => {
	console.info(JSON.stringify(entry));
};
const noopTimeoutHandler = () => void 0;
/**
* 共通ミドルウェアやドキュメント、ルートをまとめた API アプリケーションを構築する。
* @param options ストアやクロック、ID 生成器などを差し替えるためのオプション。
*/
const createApp = (options = {}) => {
	const store = options.store ?? createInMemoryGameStore();
	const now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
	const generateSessionId = options.generateSessionId ?? (() => randomUUID());
	const turnTimeoutMs = options.turnTimeoutMs ?? 45e3;
	const monitoring = options.monitoring ?? createMonitoringService({ log: defaultLogger });
	const sseGateway = options.sseGateway ?? createSseBroadcastGateway({ monitoring });
	const ruleHintService = options.ruleHintService ?? createRuleHintService({ now });
	const eventLogService = options.eventLogService ?? createEventLogService({
		store,
		sseGateway
	});
	let timeoutHandler = noopTimeoutHandler;
	const timerSupervisor = options.timerSupervisor ?? createTimerSupervisor({
		store,
		now: () => Date.now(),
		schedule: (handler, delay) => setTimeout(handler, delay),
		cancel: (handle) => clearTimeout(handle),
		onTimeout: (sessionId) => timeoutHandler(sessionId),
		monitoring
	});
	const turnService = createTurnDecisionService({
		store,
		now,
		timerSupervisor,
		turnTimeoutMs,
		eventLogs: eventLogService,
		monitoring
	});
	if (options.timerSupervisor === void 0) timeoutHandler = createTimeoutCommandHandler({
		store,
		turnService,
		sseGateway,
		ruleHintService,
		monitoring
	});
	const sessionDependencies = {
		store,
		now,
		generateSessionId,
		turnService,
		timerSupervisor,
		turnTimeoutMs,
		sseGateway,
		eventLogService,
		ruleHintService,
		monitoring
	};
	timerSupervisor.restore();
	const app$1 = new OpenAPIHono();
	app$1.use("/sessions/*", createSessionDepsMiddleware(sessionDependencies));
	app$1.use("/sessions", createSessionDepsMiddleware(sessionDependencies));
	return app$1.route("/", sessionPostApp).route("/", sessionGetApp).route("/", sessionStateGetApp).route("/", sessionHintGetApp).route("/", sessionStreamGetApp).route("/", sessionActionsPostApp).route("/", sessionResultsGetApp).route("/", logsExportCsvGetApp).route("/", logsExportJsonGetApp).doc("/doc", {
		openapi: "3.0.0",
		info: {
			version: "1.0.0",
			title: "API ドキュメント"
		}
	}).get("/scalar", Scalar({ url: "/doc" }));
};

//#endregion
//#region src/index.ts
const app = createApp();
if (import.meta.main) serve({
	fetch: app.fetch,
	port: 3e3
}, (info) => {
	console.info(`Server is running on http://localhost:${info.port}`);
});
const hcWithType = (...args) => hc(...args);

//#endregion
export { hcWithType };