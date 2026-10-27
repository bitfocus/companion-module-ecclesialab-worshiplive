import { CLEAR_CHOICES, LAYER_CHOICES, toChoices } from './actions.js'
import type { Named } from './client.js'
import type ModuleInstance from './main.js'

export type FeedbacksSchema = {
	blackout: { type: 'boolean'; options: Record<string, never> }
	output: { type: 'boolean'; options: Record<string, never> }
	prompter_output: { type: 'boolean'; options: Record<string, never> }
	scene: { type: 'boolean'; options: { id: string } }
	prompter_layout: { type: 'boolean'; options: { id: string } }
	overlay: { type: 'boolean'; options: { id: string } }
	countdown: { type: 'boolean'; options: { id: string } }
	part: { type: 'boolean'; options: { id: string } }
	stage_message: { type: 'boolean'; options: Record<string, never> }
	playing: { type: 'boolean'; options: { layer: string } }
	content: { type: 'boolean'; options: { layer: string } }
}

// The colours Worship LIVE uses for "on": red for outputs, amber for blackout, indigo for the rest.
export const WHITE = 0xffffff
export const RED = 0xef4444
export const AMBER = 0xf59e0b
export const INDIGO = 0x6366f1

export function UpdateFeedbacks(self: ModuleInstance): void {
	const lists = self.snapshot.lists
	const status = () => (self.snapshot.connected ? self.snapshot.status : undefined)
	const target = (label: string, list: Named[]) =>
		({
			id: 'id',
			type: 'dropdown',
			label,
			choices: toChoices(list),
			default: list[0]?.id ?? '',
			allowCustom: true,
		}) as const
	const lit = (bgcolor: number) => ({ bgcolor, color: WHITE })

	self.setFeedbackDefinitions({
		blackout: {
			type: 'boolean',
			name: 'Blackout is on',
			defaultStyle: lit(AMBER),
			options: [],
			callback: () => status()?.blackout === true,
		},
		output: {
			type: 'boolean',
			name: 'Main output is on',
			defaultStyle: lit(RED),
			options: [],
			callback: () => status()?.output === true,
		},
		prompter_output: {
			type: 'boolean',
			name: 'Prompter output is on',
			defaultStyle: lit(RED),
			options: [],
			callback: () => status()?.prompterOutput === true,
		},
		scene: {
			type: 'boolean',
			name: 'Scene is in use',
			defaultStyle: lit(INDIGO),
			options: [target('Scene', lists.scenes)],
			callback: (feedback) => Boolean(feedback.options.id) && status()?.scene === feedback.options.id,
		},
		prompter_layout: {
			type: 'boolean',
			name: 'Prompter layout is in use',
			defaultStyle: lit(INDIGO),
			options: [target('Prompter layout', lists.prompterLayouts)],
			callback: (feedback) => Boolean(feedback.options.id) && status()?.prompterLayout === feedback.options.id,
		},
		overlay: {
			type: 'boolean',
			name: 'Overlay is shown',
			defaultStyle: lit(INDIGO),
			options: [target('Overlay', lists.overlays)],
			callback: (feedback) => (status()?.overlays ?? []).includes(String(feedback.options.id ?? '')),
		},
		countdown: {
			type: 'boolean',
			name: 'Countdown is running',
			defaultStyle: lit(INDIGO),
			options: [target('Countdown', lists.countdowns)],
			callback: (feedback) =>
				(status()?.countdowns ?? []).find((entry) => entry.id === feedback.options.id)?.running === true,
		},
		part: {
			type: 'boolean',
			name: 'Part is live',
			defaultStyle: lit(INDIGO),
			options: [target('Part', lists.parts)],
			callback: (feedback) => Boolean(feedback.options.id) && status()?.part === feedback.options.id,
		},
		stage_message: {
			type: 'boolean',
			name: 'Stage message is showing',
			defaultStyle: lit(INDIGO),
			options: [],
			callback: () => status()?.stageMessage === true,
		},
		playing: {
			type: 'boolean',
			name: 'Video or audio is playing',
			defaultStyle: lit(INDIGO),
			options: [{ id: 'layer', type: 'dropdown', label: 'Target', choices: LAYER_CHOICES, default: 'media' }],
			callback: (feedback) => {
				const now = status()
				if (feedback.options.layer === 'audio') return now?.audioPlaying === true
				return Boolean(now?.media?.active) && !now?.media?.paused
			},
		},
		content: {
			type: 'boolean',
			name: 'There is something to clear',
			defaultStyle: lit(INDIGO),
			options: [{ id: 'layer', type: 'dropdown', label: 'Layer', choices: CLEAR_CHOICES, default: 'all' }],
			callback: (feedback) => {
				const content = status()?.content
				if (!content) return false
				switch (feedback.options.layer) {
					case 'slide':
						return content.slide
					case 'media':
						return content.media
					case 'overlay':
						return content.overlay
					case 'audio':
						return content.audio
					default:
						return content.slide || content.media || content.overlay || content.audio
				}
			},
		},
	})
}
