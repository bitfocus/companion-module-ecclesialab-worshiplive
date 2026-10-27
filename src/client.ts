import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

/**
 * Talks to the Worship LIVE app (macOS) through its control API: GET /api/deck/<command>.
 *
 * There are two ways in.
 * - Same Mac: the app keeps a local socket open while it runs. Nothing to turn on and no password.
 * - Another computer: the app's network port (7788), opened by "Use from another computer" in the app, with its password.
 *
 * The app does not push changes, so the status is read once a second while connected.
 */

export type Named = { id: string; name: string }

export type AppStatus = {
	editing: boolean
	blackout: boolean
	output: boolean
	scene: string
	prompterLayout: string
	overlays: string[]
	countdowns: { id: string; running: boolean; remainingSeconds: number }[]
	audioPlaying: boolean
	stageMessage: boolean
	prompterOutput?: boolean
	/** The part (id from lists.parts) of the slide that is live, or an empty string. */
	part?: string
	/** The video that is on the output. */
	media?: { active: boolean; paused: boolean }
	/** Whether there is something to clear on each layer. */
	content?: { slide: boolean; media: boolean; overlay: boolean; audio: boolean }
}

export type AppLists = {
	scenes: Named[]
	prompterLayouts: Named[]
	overlays: Named[]
	countdowns: Named[]
	parts: Named[]
	audios: Named[]
}

export type ConnectionError =
	| 'app_not_running'
	| 'not_a_mac'
	| 'no_password'
	| 'unreachable'
	| 'bad_key'
	| 'deck_disabled'
	| 'too_many_attempts'
	| 'old_app'
	| 'app_not_ready'
	| 'failed'

export type Snapshot = {
	connected: boolean
	/** Connected through the local socket of the same Mac. */
	local: boolean
	error?: ConnectionError
	app?: { name?: string; version?: string }
	status?: AppStatus
	lists: AppLists
}

export type CallResult = {
	ok: boolean
	httpStatus: number
	error?: string
	message?: string
	body?: Record<string, unknown>
}

export type ConnectionSettings = {
	host: string
	port: number
	password: string
}

type Target = { socketPath: string } | { host: string; port: number; password: string }

// Must match the app (getDefaultDeckLocalSocketPath): the usual place, and the one the app falls back to
// when the user name makes the usual path too long for a socket.
const LOCAL_SOCKET_CANDIDATES = [
	path.join(os.homedir(), 'Library', 'Application Support', 'kr.ecclesialab.worshiplive', 'deck.sock'),
	path.join(os.homedir(), '.worshiplive-deck.sock'),
]
export const DEFAULT_PORT = 7788
const REQUEST_TIMEOUT_MS = 2500
const POLL_MS = 1000
const POLL_WHEN_DOWN_MS = 3000

export const EMPTY_LISTS: AppLists = {
	scenes: [],
	prompterLayouts: [],
	overlays: [],
	countdowns: [],
	parts: [],
	audios: [],
}

export function isThisComputer(host: string): boolean {
	const name = host.trim().toLowerCase()
	return name === '' || name === '127.0.0.1' || name === 'localhost' || name === '::1'
}

/**
 * Worship LIVE shows its address together with the port ("192.168.0.10:7788"), so people paste it whole into Target IP.
 * Take the port from there when it is given; "http://" in front and a "/" at the end are accepted too.
 */
export function splitHostPort(host: string, fallbackPort: number): { host: string; port: number } {
	const bare = host
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/.*$/, '')
	const match = /^([^:]*):(\d{1,5})$/.exec(bare)
	if (match) {
		const port = Number(match[2])
		if (port > 0 && port < 65536) return { host: match[1], port }
	}
	return { host: bare, port: fallbackPort }
}

function isSocketPath(host: string): boolean {
	return host.startsWith('/') || host.startsWith('unix:')
}

export class AppClient {
	#settings: ConnectionSettings = { host: '', port: DEFAULT_PORT, password: '' }
	#snapshot: Snapshot = { connected: false, local: true, error: 'app_not_running', lists: EMPTY_LISTS }
	#onSnapshot: (snapshot: Snapshot) => void
	#timer: NodeJS.Timeout | undefined
	#refreshing: Promise<Snapshot> | undefined
	/** The settings changed while a read was running: read once more with the new ones. */
	#stale = false
	#running = false
	/** The local socket place that answered last: tried first next time. */
	#localIndex = 0

	constructor(onSnapshot: (snapshot: Snapshot) => void) {
		this.#onSnapshot = onSnapshot
	}

	get snapshot(): Snapshot {
		return this.#snapshot
	}

	/** Start (or restart with new settings) reading the status. */
	start(settings: ConnectionSettings): void {
		this.#settings = settings
		this.#running = true
		if (this.#refreshing) {
			this.#stale = true
		} else {
			void this.refresh()
		}
	}

	stop(): void {
		this.#running = false
		if (this.#timer) {
			clearTimeout(this.#timer)
			this.#timer = undefined
		}
	}

	/** Run one command, e.g. call('overlay/toggle', { id }). */
	async call(pathName: string, params: Record<string, string> = {}): Promise<CallResult> {
		const query = new URLSearchParams(params).toString()
		const pathAndQuery = `/api/deck/${pathName}${query ? `?${query}` : ''}`
		const typed = this.#settings.host.trim()
		const password = this.#settings.password.trim()
		const configuredPort =
			Number.isInteger(this.#settings.port) && this.#settings.port > 0 ? this.#settings.port : DEFAULT_PORT

		// A socket path typed into the address (development and tests).
		if (isSocketPath(typed)) {
			return request({ socketPath: typed.replace(/^unix:/, '') }, pathAndQuery)
		}
		const { host, port } = splitHostPort(typed, configuredPort)

		if (isThisComputer(host)) {
			if (process.platform === 'darwin') {
				for (let step = 0; step < LOCAL_SOCKET_CANDIDATES.length; step += 1) {
					const index = (this.#localIndex + step) % LOCAL_SOCKET_CANDIDATES.length
					const result = await request({ socketPath: LOCAL_SOCKET_CANDIDATES[index] }, pathAndQuery)
					if (result.error !== 'app_not_running') {
						this.#localIndex = index
						return result
					}
				}
			}
			// No local socket (the app is closed, or it runs under another user of this Mac): the network port, if a password was given.
			if (password) {
				const result = await request({ host: '127.0.0.1', port, password }, pathAndQuery)
				return result.error === 'unreachable' ? { ...result, error: localError() } : result
			}
			return { ok: false, httpStatus: 0, error: localError() }
		}

		if (!password) {
			return { ok: false, httpStatus: 0, error: 'no_password' }
		}
		return request({ host, port, password }, pathAndQuery)
	}

	/** Read the status now. Overlapping calls wait for the read in progress. */
	async refresh(): Promise<Snapshot> {
		this.#refreshing ??= this.#read().finally(() => {
			this.#refreshing = undefined
			if (this.#stale) {
				this.#stale = false
				void this.refresh()
			} else {
				this.#schedule()
			}
		})
		return this.#refreshing
	}

	async #read(): Promise<Snapshot> {
		const typed = this.#settings.host.trim()
		const host = isSocketPath(typed) ? typed : splitHostPort(typed, DEFAULT_PORT).host
		const result = await this.call('status')
		let next: Snapshot
		if (result.ok && result.body && typeof result.body.status === 'object' && result.body.status !== null) {
			next = {
				connected: true,
				local: isThisComputer(host) || isSocketPath(host),
				app: (result.body.app as Snapshot['app']) ?? {},
				status: result.body.status as AppStatus,
				lists: { ...EMPTY_LISTS, ...((result.body.lists as Partial<AppLists>) ?? {}) },
			}
		} else {
			// Keep the last lists, so buttons keep their names and choices while the app is away.
			next = {
				connected: false,
				local: isThisComputer(host) || isSocketPath(host),
				error: toConnectionError(result),
				lists: this.#snapshot.lists,
			}
		}
		this.#snapshot = next
		if (this.#running) {
			this.#onSnapshot(next)
		}
		return next
	}

	#schedule(): void {
		if (this.#timer) {
			clearTimeout(this.#timer)
			this.#timer = undefined
		}
		if (!this.#running) {
			return
		}
		this.#timer = setTimeout(() => void this.refresh(), this.#snapshot.connected ? POLL_MS : POLL_WHEN_DOWN_MS)
	}
}

/** Worship LIVE is a Mac app: on another system "this computer" cannot be right. */
function localError(): ConnectionError {
	return process.platform === 'darwin' ? 'app_not_running' : 'not_a_mac'
}

async function request(target: Target, pathAndQuery: string): Promise<CallResult> {
	const local = 'socketPath' in target
	return new Promise((resolve) => {
		// The password travels in a header, not in the address, so it does not end up in logs.
		const options: http.RequestOptions = local
			? { socketPath: target.socketPath, path: pathAndQuery, method: 'GET' }
			: {
					host: target.host,
					port: target.port,
					path: pathAndQuery,
					method: 'GET',
					headers: { 'X-Deck-Key': target.password },
				}
		const req = http.request({ ...options, timeout: REQUEST_TIMEOUT_MS }, (res) => {
			const chunks: Buffer[] = []
			res.on('data', (chunk: Buffer) => chunks.push(chunk))
			res.on('end', () => {
				let body: Record<string, unknown>
				try {
					body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
				} catch {
					body = {}
				}
				const status = res.statusCode ?? 0
				const ok = status >= 200 && status < 300 && body.ok === true
				resolve({
					ok,
					httpStatus: status,
					error: typeof body.error === 'string' ? body.error : undefined,
					message: typeof body.message === 'string' ? body.message : undefined,
					body: ok ? body : undefined,
				})
			})
		})
		req.on('timeout', () => req.destroy(new Error('timeout')))
		// No socket file (the app is closed) or nobody listening on it counts as "the app is not running" on the same Mac.
		req.on('error', () => resolve({ ok: false, httpStatus: 0, error: local ? 'app_not_running' : 'unreachable' }))
		req.end()
	})
}

function toConnectionError(result: CallResult): ConnectionError {
	switch (result.error) {
		case 'app_not_running':
		case 'not_a_mac':
		case 'no_password':
		case 'unreachable':
		case 'bad_key':
		case 'deck_disabled':
		case 'too_many_attempts':
		case 'app_not_ready':
			return result.error
		// An app older than 2.1 does not know the status command.
		case 'unknown_command':
			return 'old_app'
		default:
			return result.httpStatus === 503 ? 'app_not_ready' : 'failed'
	}
}
