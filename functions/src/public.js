import { app } from '@azure/functions'
import { getDatabase } from './lib/cosmos.js'

const properties = () => getDatabase().container('properties')
const manuals = () => getDatabase().container('manuals')

function notFound() {
	return { status: 404, jsonBody: { error: 'Not found' } }
}

function sanitizeProperty(p) {
	const { _rid, _self, _etag, _attachments, _ts, userId, ...rest } = p
	return rest
}

async function findPropertyById(id) {
	const { resources } = await properties().items
		.query({
			query: 'SELECT * FROM c WHERE c.id = @id',
			parameters: [{ name: '@id', value: id }],
		})
		.fetchAll()
	return resources[0] ?? null
}

app.http('public-property-get', {
	route: 'public/properties/{id}',
	methods: ['GET'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const { id } = request.params
		const property = await findPropertyById(id)
		if (!property) return notFound()
		return { jsonBody: sanitizeProperty(property) }
	},
})

app.http('public-manual-get', {
	route: 'public/properties/{propertyId}/manual',
	methods: ['GET'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const { propertyId } = request.params
		const property = await findPropertyById(propertyId)
		if (!property) return notFound()

		const { resources } = await manuals().items
			.query({
				query: 'SELECT * FROM c WHERE c.propertyId = @pid',
				parameters: [{ name: '@pid', value: propertyId }],
			})
			.fetchAll()

		const manual = resources[0]
		if (!manual) return notFound()
		const { _rid, _self, _etag, _attachments, _ts, ...rest } = manual
		return { jsonBody: rest }
	},
})
