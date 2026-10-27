import type { DropdownChoice } from '@companion-module/base'
import type { Named } from './client.js'
import type ModuleInstance from './main.js'

export type ActionsSchema = {
	step: { options: { direction: string } }
	part: { options: { id: string } }
	clear: { options: { layer: string } }
	blackout: { options: { mode: string } }
	output: { options: { mode: string } }
	prompter_output: { options: { mode: string } }
	scene: { options: { id: string } }
	prompter_layout: { options: { id: string } }
	overlay: { options: { id: string; mode: string } }
	countdown: { options: { id: string; mode: string } }
	stage_message: { options: { mode: string; text: string; blink: boolean } }
	audio: { options: { mode: string; id: string } }
	playback: { options: { layer: string; mode: string; seconds: number } }
}

/** The choices of a list of the app. An id saved on a button stays valid while the app is away (allowCustom). */
export function toChoices(list: Named[]): DropdownChoice<string>[] {
	return list.map((entry) => ({ id: entry.id, label: entry.name }))
}

export const SWITCH_CHOICES: DropdownChoice<string>[] = [
	{ id: 'toggle', label: 'Toggle' },
	{ id: 'on', label: 'Turn on' },
	{ id: 'off', label: 'Turn off' },
]

export const CLEAR_CHOICES: DropdownChoice<string>[] = [
	{ id: 'all', label: 'Everything' },
	{ id: 'slide', label: 'Subtitles' },
	{ id: 'media', label: 'Media' },
	{ id: 'overlay', label: 'Overlays' },
	{ id: 'audio', label: 'Audio' },
]

export const LAYER_CHOICES: DropdownChoice<string>[] = [
	{ id: 'media', label: 'Video' },
	{ id: 'audio', label: 'Audio' },
]

const SKIP_MODES = ['forward', 'backward', 'end']

function pick(value: unknown, allowed: readonly string[], fallback: string): string {
	return allowed.includes(String(value)) ? String(value) : fallback
}

export function UpdateActions(self: ModuleInstance): void {
	const lists = self.snapshot.lists
	const target = (label: string, list: Named[]) =>
		({
			id: 'id',
			type: 'dropdown',
			label,
			choices: toChoices(list),
			default: list[0]?.id ?? '',
			allowCustom: true,
		}) as const

	self.setActionDefinitions({
		step: {
			name: 'Next / Previous',
			description: 'Go to the next or the previous slide.',
			options: [
				{
					id: 'direction',
					type: 'dropdown',
					label: 'Action',
					choices: [
						{ id: 'next', label: 'Next' },
						{ id: 'previous', label: 'Previous' },
					],
					default: 'next',
				},
			],
			callback: async (event) => self.run(event.options.direction === 'previous' ? 'previous' : 'next'),
		},
		part: {
			name: 'Part',
			description: 'Jump to a part of the current song, such as a verse or the chorus.',
			options: [target('Part', lists.parts)],
			callback: async (event) => {
				if (event.options.id) await self.run('part', { id: String(event.options.id) })
			},
		},
		clear: {
			name: 'Clear',
			description: 'Clear subtitles, media, overlays, audio or everything.',
			options: [{ id: 'layer', type: 'dropdown', label: 'Clear', choices: CLEAR_CHOICES, default: 'all' }],
			callback: async (event) =>
				self.run(`clear/${pick(event.options.layer, ['slide', 'media', 'overlay', 'audio'], 'all')}`),
		},
		blackout: {
			name: 'Blackout',
			description: 'Turn blackout on or off.',
			options: [{ id: 'mode', type: 'dropdown', label: 'Action', choices: SWITCH_CHOICES, default: 'toggle' }],
			callback: async (event) => self.run(`blackout/${pick(event.options.mode, ['on', 'off'], 'toggle')}`),
		},
		output: {
			name: 'Main Output',
			description: 'Turn the main output on or off.',
			options: [{ id: 'mode', type: 'dropdown', label: 'Action', choices: SWITCH_CHOICES, default: 'toggle' }],
			callback: async (event) => self.run(`output/${pick(event.options.mode, ['on', 'off'], 'toggle')}`),
		},
		prompter_output: {
			name: 'Prompter Output',
			description: 'Turn the prompter output on or off.',
			options: [{ id: 'mode', type: 'dropdown', label: 'Action', choices: SWITCH_CHOICES, default: 'toggle' }],
			callback: async (event) => self.run(`prompter-output/${pick(event.options.mode, ['on', 'off'], 'toggle')}`),
		},
		scene: {
			name: 'Scene',
			description: 'Switch to one of your scenes.',
			options: [target('Scene', lists.scenes)],
			callback: async (event) => {
				if (event.options.id) await self.run('scene', { id: String(event.options.id) })
			},
		},
		prompter_layout: {
			name: 'Prompter Layout',
			description: 'Switch the prompter layout.',
			options: [target('Prompter layout', lists.prompterLayouts)],
			callback: async (event) => {
				if (event.options.id) await self.run('prompter-layout', { id: String(event.options.id) })
			},
		},
		overlay: {
			name: 'Overlay',
			description: 'Show or hide an overlay.',
			options: [
				target('Overlay', lists.overlays),
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Action',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'show', label: 'Show' },
						{ id: 'hide', label: 'Hide' },
					],
					default: 'toggle',
				},
			],
			callback: async (event) => {
				if (!event.options.id) return
				const mode = pick(event.options.mode, ['show', 'hide'], 'toggle')
				await self.run(`overlay/${mode}`, { id: String(event.options.id) })
			},
		},
		countdown: {
			name: 'Countdown',
			description: 'Start, stop or reset a countdown.',
			options: [
				target('Countdown', lists.countdowns),
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Action',
					choices: [
						{ id: 'toggle', label: 'Start / stop' },
						{ id: 'start', label: 'Start' },
						{ id: 'stop', label: 'Stop' },
						{ id: 'reset', label: 'Reset' },
					],
					default: 'toggle',
				},
			],
			callback: async (event) => {
				if (!event.options.id) return
				const mode = pick(event.options.mode, ['start', 'stop', 'reset'], 'toggle')
				await self.run(`countdown/${mode}`, { id: String(event.options.id) })
			},
		},
		stage_message: {
			name: 'Stage Message',
			description: 'Send a message to the stage display, or clear it.',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Action',
					choices: [
						{ id: 'send', label: 'Send message' },
						{ id: 'clear', label: 'Clear message' },
					],
					default: 'send',
					disableAutoExpression: true,
				},
				{
					id: 'text',
					type: 'textinput',
					label: 'Message',
					default: '',
					useVariables: true,
					isVisibleExpression: "$(options:mode) == 'send'",
				},
				{
					id: 'blink',
					type: 'checkbox',
					label: 'Blink',
					default: false,
					isVisibleExpression: "$(options:mode) == 'send'",
				},
			],
			callback: async (event) => {
				if (event.options.mode === 'clear') {
					await self.run('stage-message/clear')
					return
				}
				const text = String(event.options.text ?? '').trim()
				if (text) await self.run('stage-message/send', event.options.blink ? { text, blink: '1' } : { text })
			},
		},
		audio: {
			name: 'Audio',
			description: 'Play a track, pause and resume, or stop audio playback.',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Action',
					choices: [
						{ id: 'pause', label: 'Pause / resume' },
						{ id: 'play', label: 'Play' },
						{ id: 'stop', label: 'Stop' },
					],
					default: 'pause',
					disableAutoExpression: true,
				},
				{
					id: 'id',
					type: 'dropdown',
					label: 'Track',
					choices: [{ id: '', label: 'Track selected in Worship LIVE' }, ...toChoices(lists.audios)],
					default: '',
					allowCustom: true,
					isVisibleExpression: "$(options:mode) == 'play'",
				},
			],
			callback: async (event) => {
				if (event.options.mode === 'play') {
					await self.run('audio/play', event.options.id ? { id: String(event.options.id) } : {})
					return
				}
				await self.run(event.options.mode === 'stop' ? 'audio/stop' : 'audio/pause')
			},
		},
		playback: {
			name: 'Playback',
			description: 'Play, pause or skip the video or audio that is playing, or jump near its end.',
			options: [
				{ id: 'layer', type: 'dropdown', label: 'Target', choices: LAYER_CHOICES, default: 'media' },
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Action',
					choices: [
						{ id: 'toggle', label: 'Play / pause' },
						{ id: 'play', label: 'Play' },
						{ id: 'pause', label: 'Pause' },
						{ id: 'forward', label: 'Skip forward' },
						{ id: 'backward', label: 'Skip backward' },
						{ id: 'end', label: 'Go near the end' },
					],
					default: 'toggle',
					disableAutoExpression: true,
				},
				{
					id: 'seconds',
					type: 'number',
					label: 'Seconds',
					description: 'Skip: how far to jump. Go near the end: how many seconds before the end to land.',
					default: 10,
					min: 1,
					max: 3600,
					asInteger: true,
					clampValues: true,
					isVisibleExpression:
						"$(options:mode) == 'forward' || $(options:mode) == 'backward' || $(options:mode) == 'end'",
				},
			],
			callback: async (event) => {
				const layer = event.options.layer === 'audio' ? 'audio' : 'media'
				const mode = pick(event.options.mode, ['play', 'pause', ...SKIP_MODES], 'toggle')
				if (SKIP_MODES.includes(mode)) {
					const seconds = Number(event.options.seconds)
					const value = Number.isFinite(seconds) && seconds > 0 ? Math.min(3600, Math.round(seconds)) : 10
					await self.run(`transport/${layer}/${mode}`, { seconds: String(value) })
					return
				}
				await self.run(`transport/${layer}/${mode}`)
			},
		},
	})
}
