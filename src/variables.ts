import type { CompanionVariableDefinition } from '@companion-module/base'
import type { Named } from './client.js'
import type ModuleInstance from './main.js'

export type VariablesSchema = {
	[variableId: string]: string | number | boolean | undefined
}

/** The variable of a countdown: countdown_<id>. The id is the one Worship LIVE gave it, so renaming keeps the variable. */
export function countdownVariable(id: string): string {
	return `countdown_${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

/** As in the app: mm:ss under an hour, h:mm:ss from there. */
export function formatSeconds(totalSeconds: number): string {
	const total = Math.max(0, Math.round(totalSeconds))
	const hours = Math.floor(total / 3600)
	const minutes = Math.floor((total % 3600) / 60)
	const seconds = total % 60
	const two = (value: number): string => String(value).padStart(2, '0')
	return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${two(minutes)}:${two(seconds)}`
}

function nameOf(list: Named[], id: string | undefined): string {
	return list.find((entry) => entry.id === id)?.name ?? ''
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const definitions: Record<string, CompanionVariableDefinition> = {
		connected: { name: 'Connected to Worship LIVE' },
		version: { name: 'Worship LIVE version' },
		scene: { name: 'Scene in use' },
		prompter_layout: { name: 'Prompter layout in use' },
		part: { name: 'Part that is live' },
		overlays: { name: 'Overlays shown' },
		blackout: { name: 'Blackout is on' },
		output: { name: 'Main output is on' },
		prompter_output: { name: 'Prompter output is on' },
		stage_message: { name: 'Stage message is showing' },
		video_playing: { name: 'Video is playing' },
		audio_playing: { name: 'Audio is playing' },
	}
	for (const countdown of self.snapshot.lists.countdowns) {
		definitions[countdownVariable(countdown.id)] = { name: `Countdown remaining time: ${countdown.name}` }
		definitions[`${countdownVariable(countdown.id)}_seconds`] = {
			name: `Countdown remaining seconds: ${countdown.name}`,
		}
	}
	self.setVariableDefinitions(definitions)
}

export function UpdateVariableValues(self: ModuleInstance): void {
	const { connected, app, status, lists } = self.snapshot
	const now = connected ? status : undefined
	const values: VariablesSchema = {
		connected,
		version: app?.version ?? '',
		scene: nameOf(lists.scenes, now?.scene),
		prompter_layout: nameOf(lists.prompterLayouts, now?.prompterLayout),
		part: nameOf(lists.parts, now?.part),
		overlays: (now?.overlays ?? [])
			.map((id) => nameOf(lists.overlays, id))
			.filter(Boolean)
			.join(', '),
		blackout: now?.blackout === true,
		output: now?.output === true,
		prompter_output: now?.prompterOutput === true,
		stage_message: now?.stageMessage === true,
		video_playing: Boolean(now?.media?.active) && !now?.media?.paused,
		audio_playing: now?.audioPlaying === true,
	}
	for (const countdown of lists.countdowns) {
		const entry = (now?.countdowns ?? []).find((candidate) => candidate.id === countdown.id)
		values[countdownVariable(countdown.id)] = entry ? formatSeconds(entry.remainingSeconds) : ''
		values[`${countdownVariable(countdown.id)}_seconds`] = entry ? Math.max(0, Math.round(entry.remainingSeconds)) : 0
	}
	self.setVariableValues(values)
}
