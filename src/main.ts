import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js'
import { AppClient, DEFAULT_PORT, type CallResult, type ConnectionError, type Snapshot } from './client.js'
import { UpdateVariableDefinitions, UpdateVariableValues, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: ModuleSecrets
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

const STATUS: Record<ConnectionError, [InstanceStatus, string]> = {
	app_not_running: [InstanceStatus.Disconnected, 'Worship LIVE is not running on this computer'],
	not_a_mac: [InstanceStatus.BadConfig, 'Worship LIVE runs on a Mac. Enter the IP of that Mac and its password'],
	no_password: [InstanceStatus.BadConfig, 'Enter the password shown in Worship LIVE on that computer'],
	unreachable: [InstanceStatus.ConnectionFailure, 'Worship LIVE was not found at that address'],
	bad_key: [InstanceStatus.AuthenticationFailure, 'The password does not match'],
	deck_disabled: [InstanceStatus.ConnectionFailure, '"Use from another computer" is turned off in Worship LIVE'],
	too_many_attempts: [InstanceStatus.AuthenticationFailure, 'The password was wrong too many times. Wait a minute'],
	old_app: [InstanceStatus.UnknownError, 'Update Worship LIVE to 2.1 or later'],
	app_not_ready: [InstanceStatus.Connecting, 'Worship LIVE is still starting'],
	failed: [InstanceStatus.UnknownError, 'Could not connect'],
}

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	client = new AppClient((snapshot) => this.onSnapshot(snapshot))
	/** What the definitions (choices, presets, variables) were last built from. */
	#builtFrom = ''
	#lastStatus = ''

	constructor(internal: unknown) {
		super(internal)
	}

	get snapshot(): Snapshot {
		return this.client.snapshot
	}

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets): Promise<void> {
		this.updateStatus(InstanceStatus.Connecting)
		this.rebuildDefinitions()
		this.connect(config, secrets)
	}

	async destroy(): Promise<void> {
		this.client.stop()
	}

	async configUpdated(config: ModuleConfig, secrets: ModuleSecrets): Promise<void> {
		// The presets carry the name of this connection in their variables, and it may just have been changed.
		this.rebuildDefinitions()
		this.connect(config, secrets)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	/** Run one command of the app and read the status right after, so buttons follow without waiting for the next poll. */
	async run(pathName: string, params: Record<string, string> = {}): Promise<void> {
		const result = await this.client.call(pathName, params)
		if (!result.ok) {
			this.log('warn', `${pathName}: ${describe(result)}`)
		}
		void this.client.refresh()
	}

	private connect(config: ModuleConfig, secrets: ModuleSecrets): void {
		this.#lastStatus = ''
		this.client.start({
			host: String(config?.host ?? ''),
			port: Number(config?.port) || DEFAULT_PORT,
			password: String(secrets?.password ?? ''),
		})
	}

	private onSnapshot(snapshot: Snapshot): void {
		const [status, message] = snapshot.connected ? [InstanceStatus.Ok, null] : STATUS[snapshot.error ?? 'failed']
		const key = `${status}|${message ?? ''}`
		if (key !== this.#lastStatus) {
			this.#lastStatus = key
			this.updateStatus(status, message)
		}

		// Choices, presets and the countdown variables follow the lists of the app (scenes, overlays, countdowns ...).
		if (JSON.stringify(snapshot.lists) !== this.#builtFrom) {
			this.rebuildDefinitions()
		}
		UpdateVariableValues(this)
		this.checkAllFeedbacks()
	}

	private rebuildDefinitions(): void {
		this.#builtFrom = JSON.stringify(this.snapshot.lists)
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdateVariableDefinitions(this)
		UpdatePresets(this)
	}
}

function describe(result: CallResult): string {
	switch (result.error) {
		case 'app_busy':
			return 'Worship LIVE is in edit mode'
		case 'not_found':
			return `nothing to act on in Worship LIVE${result.message ? ` (${result.message})` : ''}`
		case 'missing_id':
			return 'no target chosen'
		default:
			return STATUS[result.error as ConnectionError]?.[1] ?? result.message ?? result.error ?? 'failed'
	}
}
