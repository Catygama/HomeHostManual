import { app } from '@azure/functions'

app.http('health', {
	route: 'health',
	methods: ['GET'],
	authLevel: 'anonymous',
	handler: async () => ({
		jsonBody: {
			status: 'ok',
			timestamp: new Date().toISOString(),
		},
	}),
})
