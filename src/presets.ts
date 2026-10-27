import type {
	CompanionButtonStyleProps,
	CompanionPresetDefinitions,
	CompanionPresetGroupSimple,
	CompanionPresetSection,
	CompanionSimplePresetDefinition,
} from '@companion-module/base'
import { ICONS, type IconName } from './icons.js'
import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import { countdownVariable } from './variables.js'

type Preset = CompanionSimplePresetDefinition<ModuleSchema>
type Step = Preset['steps'][number]['down'][number]
type Feedback = Preset['feedbacks'][number]
type Group = CompanionPresetGroupSimple<ModuleSchema>

const WHITE = 0xffffff
const DARK = 0x1b1f29

/**
 * A key that shows one of the Worship LIVE pictures, with an optional line of text under it.
 * The text size is fixed: with 'auto' Companion grows a short text until it covers the picture.
 */
function style(icon: IconName, text = '', size?: number): CompanionButtonStyleProps {
	return {
		text,
		size: size ?? (text.length <= 5 ? 14 : text.length <= 9 ? 12 : 10),
		color: WHITE,
		bgcolor: DARK,
		alignment: 'center:bottom',
		pngalignment: 'center:center',
		png64: ICONS[icon],
		show_topbar: false,
	}
}

/** The picture a key changes to while its feedback is true: the same key, lit. */
function lit(icon: IconName): { png64: string } {
	return { png64: ICONS[`${icon}-on` as IconName] ?? ICONS[icon] }
}

function key(
	name: string,
	icon: IconName,
	down: Step,
	feedback?: (onStyle: { png64: string }) => Feedback,
	text = '',
	size?: number,
): Preset {
	return {
		type: 'simple',
		name,
		style: style(icon, text, size),
		steps: [{ down: [down], up: [] }],
		feedbacks: feedback ? [feedback(lit(icon))] : [],
	}
}

export function UpdatePresets(self: ModuleInstance): void {
	const lists = self.snapshot.lists
	const presets: CompanionPresetDefinitions<ModuleSchema> = {}
	const add = (id: string, preset: Preset): string => {
		presets[id] = preset
		return id
	}

	const slides = [
		add(
			'previous',
			key('Previous slide', 'step/as-previous', { actionId: 'step', options: { direction: 'previous' } }),
		),
		add('next', key('Next slide', 'step/key', { actionId: 'step', options: { direction: 'next' } })),
	]

	const parts = lists.parts.map((part) =>
		add(
			`part_${part.id}`,
			key(
				`Part: ${part.name}`,
				'part/key',
				{ actionId: 'part', options: { id: part.id } },
				(onStyle) => ({ feedbackId: 'part', options: { id: part.id }, style: onStyle }),
				part.name,
			),
		),
	)

	const clearKey = (layer: string, name: string, icon: IconName, text = ''): string =>
		add(
			`clear_${layer}`,
			key(
				name,
				icon,
				{ actionId: 'clear', options: { layer } },
				(onStyle) => ({ feedbackId: 'content', options: { layer }, style: onStyle }),
				text,
			),
		)
	const clear = [
		clearKey('all', 'Clear everything', 'clear/key', 'All'),
		clearKey('slide', 'Clear subtitles', 'clear/as-slide'),
		clearKey('media', 'Clear media', 'clear/as-media'),
		clearKey('overlay', 'Clear overlays', 'clear/as-overlay'),
		clearKey('audio', 'Clear audio', 'clear/as-audio'),
	]

	const outputs = [
		add(
			'blackout',
			key('Blackout', 'blackout/key', { actionId: 'blackout', options: { mode: 'toggle' } }, (onStyle) => ({
				feedbackId: 'blackout',
				options: {},
				style: onStyle,
			})),
		),
		add(
			'output',
			key('Main output', 'output/key', { actionId: 'output', options: { mode: 'toggle' } }, (onStyle) => ({
				feedbackId: 'output',
				options: {},
				style: onStyle,
			})),
		),
		add(
			'prompter_output',
			key(
				'Prompter output',
				'prompter-output/key',
				{ actionId: 'prompter_output', options: { mode: 'toggle' } },
				(onStyle) => ({ feedbackId: 'prompter_output', options: {}, style: onStyle }),
			),
		),
	]

	const scenes = lists.scenes.map((scene) =>
		add(
			`scene_${scene.id}`,
			key(
				`Scene: ${scene.name}`,
				'scene/key',
				{ actionId: 'scene', options: { id: scene.id } },
				(onStyle) => ({ feedbackId: 'scene', options: { id: scene.id }, style: onStyle }),
				scene.name,
			),
		),
	)

	const prompterLayouts = lists.prompterLayouts.map((layout) =>
		add(
			`prompter_layout_${layout.id}`,
			key(
				`Prompter layout: ${layout.name}`,
				'prompter-layout/key',
				{ actionId: 'prompter_layout', options: { id: layout.id } },
				(onStyle) => ({ feedbackId: 'prompter_layout', options: { id: layout.id }, style: onStyle }),
				layout.name,
			),
		),
	)

	const overlays = lists.overlays.map((overlay) =>
		add(
			`overlay_${overlay.id}`,
			key(
				`Overlay: ${overlay.name}`,
				'overlay/key',
				{ actionId: 'overlay', options: { id: overlay.id, mode: 'toggle' } },
				(onStyle) => ({ feedbackId: 'overlay', options: { id: overlay.id }, style: onStyle }),
				overlay.name,
			),
		),
	)

	const countdowns = lists.countdowns.flatMap((countdown) => {
		const running = (onStyle: { png64: string }): Feedback => ({
			feedbackId: 'countdown',
			options: { id: countdown.id },
			style: onStyle,
		})
		return [
			add(
				`countdown_${countdown.id}`,
				key(
					`Countdown: ${countdown.name} (start / stop, shows the remaining time)`,
					'countdown/key',
					{ actionId: 'countdown', options: { id: countdown.id, mode: 'toggle' } },
					running,
					`$(${self.label}:${countdownVariable(countdown.id)})`,
					18,
				),
			),
			add(
				`countdown_reset_${countdown.id}`,
				key(
					`Countdown: ${countdown.name} (reset)`,
					'countdown/as-reset',
					{ actionId: 'countdown', options: { id: countdown.id, mode: 'reset' } },
					running,
				),
			),
		]
	})

	const stageMessage = [
		add(
			'stage_message_clear',
			key(
				'Clear the stage message',
				'stage-message/as-clear',
				{ actionId: 'stage_message', options: { mode: 'clear', text: '', blink: false } },
				(onStyle) => ({ feedbackId: 'stage_message', options: {}, style: onStyle }),
			),
		),
	]

	const audioPlaying = (onStyle: { png64: string }): Feedback => ({
		feedbackId: 'playing',
		options: { layer: 'audio' },
		style: onStyle,
	})
	const audio = [
		add(
			'audio_pause',
			key(
				'Audio: pause / resume',
				'audio/key',
				{ actionId: 'audio', options: { mode: 'pause', id: '' } },
				audioPlaying,
			),
		),
		add(
			'audio_play',
			key(
				'Audio: play the track selected in Worship LIVE',
				'audio/as-play',
				{ actionId: 'audio', options: { mode: 'play', id: '' } },
				audioPlaying,
			),
		),
		add(
			'audio_stop',
			key('Audio: stop', 'audio/as-stop', { actionId: 'audio', options: { mode: 'stop', id: '' } }, audioPlaying),
		),
	]
	const tracks = lists.audios
		.filter((track) => track.id)
		.map((track) =>
			add(
				`audio_play_${track.id}`,
				key(
					`Play: ${track.name}`,
					'audio/as-play',
					{ actionId: 'audio', options: { mode: 'play', id: track.id } },
					undefined,
					track.name,
					10,
				),
			),
		)

	const playback = (layer: 'media' | 'audio', label: string): string[] => {
		const playing = (onStyle: { png64: string }): Feedback => ({
			feedbackId: 'playing',
			options: { layer },
			style: onStyle,
		})
		const action = (mode: string): Step => ({ actionId: 'playback', options: { layer, mode, seconds: 10 } })
		return [
			add(`playback_${layer}_toggle`, key(`${label}: play / pause`, 'transport/key', action('toggle'), playing)),
			add(
				`playback_${layer}_backward`,
				key(`${label}: back 10 seconds`, 'transport/as-backward', action('backward'), playing),
			),
			add(
				`playback_${layer}_forward`,
				key(`${label}: forward 10 seconds`, 'transport/as-forward', action('forward'), playing),
			),
			add(
				`playback_${layer}_end`,
				key(`${label}: go to 10 seconds before the end`, 'transport/as-end', action('end'), playing),
			),
		]
	}

	const group = (id: string, name: string, list: string[]): Group => ({ id, type: 'simple', name, presets: list })
	const structure: { id: string; name: string; description?: string; definitions: string[] | Group[] }[] = [
		{ id: 'slides', name: 'Slides', definitions: slides },
		{
			id: 'parts',
			name: 'Parts',
			description: 'Jump to a part of the current song. The key lights up while that part is live.',
			definitions: parts,
		},
		{
			id: 'clear',
			name: 'Clear',
			description: 'The key lights up when there is something to clear.',
			definitions: clear,
		},
		{ id: 'outputs', name: 'Outputs', definitions: outputs },
		{ id: 'scenes', name: 'Scenes', definitions: scenes },
		{ id: 'prompter_layouts', name: 'Prompter layouts', definitions: prompterLayouts },
		{ id: 'overlays', name: 'Overlays', definitions: overlays },
		{ id: 'countdowns', name: 'Countdowns', definitions: countdowns },
		{ id: 'stage_message', name: 'Stage message', definitions: stageMessage },
		{
			id: 'audio',
			name: 'Audio',
			definitions: [group('audio_controls', 'Controls', audio), group('audio_tracks', 'Tracks', tracks)],
		},
		{
			id: 'playback',
			name: 'Playback',
			definitions: [
				group('playback_video', 'Video', playback('media', 'Video')),
				group('playback_audio', 'Audio', playback('audio', 'Audio')),
			],
		},
	]

	// Groups and sections whose list is empty (the app is not connected yet, or has none) are left out.
	const filled = structure
		.map((section) => ({
			...section,
			definitions: section.definitions.filter((entry) => typeof entry === 'string' || entry.presets.length > 0),
		}))
		.filter((section) => section.definitions.length > 0) as CompanionPresetSection<ModuleSchema>[]
	self.setPresetDefinitions(filled, presets)
}
