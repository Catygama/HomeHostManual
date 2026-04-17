import { app } from '@azure/functions'
import { getAuthUser } from './lib/auth.js'
import { getDatabase } from './lib/cosmos.js'

const manuals = () => getDatabase().container('manuals')
const properties = () => getDatabase().container('properties')

function unauthorized() {
	return { status: 401, jsonBody: { error: 'Unauthorized' } }
}

function notFound() {
	return { status: 404, jsonBody: { error: 'Not found' } }
}

async function getPropertyOwnedBy(propertyId, userId) {
	try {
		const { resource } = await properties().item(propertyId, userId).read()
		return resource ?? null
	} catch (err) {
		if (err.code === 404) return null
		throw err
	}
}

async function getManualByPropertyId(propertyId) {
	const { resources } = await manuals().items
		.query({
			query: 'SELECT * FROM c WHERE c.propertyId = @pid',
			parameters: [{ name: '@pid', value: propertyId }],
		})
		.fetchAll()
	return resources[0] ?? null
}

app.http('manual-get-owner', {
	route: 'properties/{propertyId}/manual',
	methods: ['GET'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const user = getAuthUser(request)
		if (!user?.userId) return unauthorized()

		const { propertyId } = request.params
		const property = await getPropertyOwnedBy(propertyId, user.userId)
		if (!property) return notFound()

		const manual = await getManualByPropertyId(propertyId)
		if (!manual) return { status: 404, jsonBody: { error: 'Manual not found' } }
		return { jsonBody: manual }
	},
})

app.http('manual-upsert', {
	route: 'properties/{propertyId}/manual',
	methods: ['PUT'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const user = getAuthUser(request)
		if (!user?.userId) return unauthorized()

		const { propertyId } = request.params
		const property = await getPropertyOwnedBy(propertyId, user.userId)
		if (!property) return notFound()

		let body
		try {
			body = await request.json()
		} catch {
			return { status: 400, jsonBody: { error: 'Invalid JSON' } }
		}
		if (!body || typeof body !== 'object') {
			return { status: 400, jsonBody: { error: 'Invalid body' } }
		}

		const existing = await getManualByPropertyId(propertyId)
		const { rooms } = body

		if (existing) {
			const merged = { ...existing, rooms: rooms ?? existing.rooms ?? [] }
			const { resource } = await manuals().item(existing.id, propertyId).replace(merged)
			return { jsonBody: resource }
		}

		const doc = {
			id: crypto.randomUUID(),
			propertyId,
			rooms: rooms ?? [],
		}
		const { resource } = await manuals().items.create(doc)
		return { status: 201, jsonBody: resource }
	},
})
