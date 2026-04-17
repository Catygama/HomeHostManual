import { app } from '@azure/functions'
import { getAuthUser } from './lib/auth.js'
import { getDatabase } from './lib/cosmos.js'

const container = () => getDatabase().container('properties')

function unauthorized() {
	return { status: 401, jsonBody: { error: 'Unauthorized' } }
}

function requireUser(request) {
	const user = getAuthUser(request)
	if (!user?.userId) return null
	return user
}

function notFound() {
	return { status: 404, jsonBody: { error: 'Not found' } }
}

app.http('properties-list', {
	route: 'properties',
	methods: ['GET'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const user = requireUser(request)
		if (!user) return unauthorized()

		const { resources } = await container().items
			.query({
				query: 'SELECT * FROM c WHERE c.userId = @userId',
				parameters: [{ name: '@userId', value: user.userId }],
			})
			.fetchAll()

		return { jsonBody: resources }
	},
})

app.http('properties-create', {
	route: 'properties',
	methods: ['POST'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const user = requireUser(request)
		if (!user) return unauthorized()

		let body
		try {
			body = await request.json()
		} catch {
			return { status: 400, jsonBody: { error: 'Invalid JSON' } }
		}

		if (!body || typeof body !== 'object' || typeof body.id !== 'string' || !body.id) {
			return { status: 400, jsonBody: { error: 'Missing id' } }
		}

		const { id, ...rest } = body
		const doc = { ...rest, id, userId: user.userId }

		try {
			const { resource } = await container().items.create(doc)
			return { status: 201, jsonBody: resource }
		} catch (err) {
			if (err.code === 409) {
				return { status: 409, jsonBody: { error: 'Property already exists' } }
			}
			throw err
		}
	},
})

app.http('properties-get', {
	route: 'properties/{id}',
	methods: ['GET'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const user = requireUser(request)
		if (!user) return unauthorized()

		const { id } = request.params
		try {
			const { resource } = await container().item(id, user.userId).read()
			return { jsonBody: resource }
		} catch (err) {
			if (err.code === 404) return notFound()
			throw err
		}
	},
})

app.http('properties-patch', {
	route: 'properties/{id}',
	methods: ['PATCH'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const user = requireUser(request)
		if (!user) return unauthorized()

		const { id } = request.params
		let patch
		try {
			patch = await request.json()
		} catch {
			return { status: 400, jsonBody: { error: 'Invalid JSON' } }
		}

		if (!patch || typeof patch !== 'object') {
			return { status: 400, jsonBody: { error: 'Invalid body' } }
		}

		const { id: _dropId, userId: _dropUser, ...safePatch } = patch

		try {
			const { resource: existing } = await container().item(id, user.userId).read()
			const merged = { ...existing, ...safePatch }
			const { resource } = await container().item(id, user.userId).replace(merged)
			return { jsonBody: resource }
		} catch (err) {
			if (err.code === 404) return notFound()
			throw err
		}
	},
})

app.http('properties-delete', {
	route: 'properties/{id}',
	methods: ['DELETE'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const user = requireUser(request)
		if (!user) return unauthorized()

		const { id } = request.params
		try {
			await container().item(id, user.userId).delete()
			return { status: 204 }
		} catch (err) {
			if (err.code === 404) return notFound()
			throw err
		}
	},
})
