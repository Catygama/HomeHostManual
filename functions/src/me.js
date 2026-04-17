import { app } from '@azure/functions'
import { getAuthUser } from './lib/auth.js'

app.http('me', {
	route: 'me',
	methods: ['GET'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const user = getAuthUser(request)

		if (!user) {
			return { status: 401, jsonBody: { authenticated: false } }
		}

		const { claims: _claims, ...publicUser } = user
		return { jsonBody: { authenticated: true, ...publicUser } }
	},
})
