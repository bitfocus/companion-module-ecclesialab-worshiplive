import type { SomeCompanionConfigField } from '@companion-module/base'
import { DEFAULT_PORT } from './client.js'

export type ModuleConfig = {
	host: string
	port: number
}

export type ModuleSecrets = {
	password: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Connection',
			value:
				'Worship LIVE on this computer: leave the settings as they are. Nothing to turn on, no password. ' +
				'Worship LIVE on another computer: in Worship LIVE open Settings › Devices › Controller, turn on ' +
				'"Use from another computer", then enter the IP address, port and password shown there.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 8,
			default: '127.0.0.1',
			tooltip: 'The IP address shown in Worship LIVE, such as 192.168.0.10.',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Target Port',
			width: 4,
			min: 1,
			max: 65535,
			default: DEFAULT_PORT,
		},
		{
			type: 'secret-text',
			id: 'password',
			label: 'Password',
			width: 8,
			description: 'Only when Worship LIVE runs on another computer.',
		},
	]
}
