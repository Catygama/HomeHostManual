import { CosmosClient } from '@azure/cosmos'

const endpoint = import.meta.env.VITE_COSMOS_ENDPOINT
const key = import.meta.env.VITE_COSMOS_KEY
const database = import.meta.env.VITE_COSMOS_DATABASE

if (!endpoint || !key || !database) {
	console.error('[CosmosDB] Missing env vars:', { endpoint: !!endpoint, key: !!key, database: !!database })
}

const client = new CosmosClient({ endpoint, key })
const db = client.database(database)

const containers = {
	users: db.container('users'),
	properties: db.container('properties'),
	manuals: db.container('manuals'),
	analytics: db.container('analytics'),
}

// ── Users ────────────────────────────────────────────────────────────

export async function createUser(user) {
	const { resource } = await containers.users.items.create(user)
	return resource
}

export async function getUserByEmail(email) {
	const { resources } = await containers.users.items
		.query({
			query: 'SELECT * FROM c WHERE c.email = @email',
			parameters: [{ name: '@email', value: email }],
		})
		.fetchAll()
	return resources[0] ?? null
}

// ── Properties ───────────────────────────────────────────────────────

export async function createProperty(property) {
	console.log('[CosmosDB] createProperty', property.id)
	try {
		const { resource } = await containers.properties.items.create(property)
		return resource
	} catch (err) {
		console.error('[CosmosDB] createProperty failed:', err)
		throw err
	}
}

export async function getPropertiesByUserId(userId) {
	console.log('[CosmosDB] getPropertiesByUserId', userId)
	try {
		const { resources } = await containers.properties.items
			.query({
				query: 'SELECT * FROM c WHERE c.userId = @userId',
				parameters: [{ name: '@userId', value: userId }],
			})
			.fetchAll()
		console.log('[CosmosDB] getPropertiesByUserId returned', resources.length, 'items')
		return resources
	} catch (err) {
		console.error('[CosmosDB] getPropertiesByUserId failed:', err)
		throw err
	}
}

export async function getPropertyById(id, userId) {
	console.log('[CosmosDB] getPropertyById', id, userId)
	try {
		const { resource } = await containers.properties.item(id, userId).read()
		return resource
	} catch (err) {
		console.error('[CosmosDB] getPropertyById failed:', err)
		throw err
	}
}

export async function updateProperty(id, userId, data) {
	console.log('[CosmosDB] updateProperty', id)
	try {
		const { resource: existing } = await containers.properties.item(id, userId).read()
		const merged = { ...existing, ...data }
		const { resource } = await containers.properties.item(id, userId).replace(merged)
		return resource
	} catch (err) {
		console.error('[CosmosDB] updateProperty failed:', err)
		throw err
	}
}

export async function deleteProperty(id, userId) {
	console.log('[CosmosDB] deleteProperty', id)
	try {
		await containers.properties.item(id, userId).delete()
	} catch (err) {
		console.error('[CosmosDB] deleteProperty failed:', err)
		throw err
	}
}

export async function getPropertyByIdPublic(id) {
	console.log('[CosmosDB] getPropertyByIdPublic', id)
	try {
		const { resources } = await containers.properties.items
			.query({
				query: 'SELECT * FROM c WHERE c.id = @id',
				parameters: [{ name: '@id', value: id }],
			})
			.fetchAll()
		return resources[0] ?? null
	} catch (err) {
		console.error('[CosmosDB] getPropertyByIdPublic failed:', err)
		throw err
	}
}

// ── Manuals ──────────────────────────────────────────────────────────

export async function createManual(manual) {
	console.log('[CosmosDB] createManual', manual.id)
	try {
		const { resource } = await containers.manuals.items.create(manual)
		return resource
	} catch (err) {
		console.error('[CosmosDB] createManual failed:', err)
		throw err
	}
}

export async function getManualByPropertyId(propertyId) {
	console.log('[CosmosDB] getManualByPropertyId', propertyId)
	try {
		const { resources } = await containers.manuals.items
			.query({
				query: 'SELECT * FROM c WHERE c.propertyId = @propertyId',
				parameters: [{ name: '@propertyId', value: propertyId }],
			})
			.fetchAll()
		return resources[0] ?? null
	} catch (err) {
		console.error('[CosmosDB] getManualByPropertyId failed:', err)
		throw err
	}
}

export async function updateManual(id, propertyId, data) {
	console.log('[CosmosDB] updateManual', id)
	try {
		const { resource: existing } = await containers.manuals.item(id, propertyId).read()
		const merged = { ...existing, ...data }
		const { resource } = await containers.manuals.item(id, propertyId).replace(merged)
		return resource
	} catch (err) {
		console.error('[CosmosDB] updateManual failed:', err)
		throw err
	}
}

// ── Analytics ────────────────────────────────────────────────────────

export async function createAnalyticsEvent(event) {
	console.log('[CosmosDB] createAnalyticsEvent')
	try {
		const { resource } = await containers.analytics.items.create(event)
		return resource
	} catch (err) {
		console.error('[CosmosDB] createAnalyticsEvent failed:', err)
		throw err
	}
}

export async function getAnalyticsByPropertyId(propertyId) {
	console.log('[CosmosDB] getAnalyticsByPropertyId', propertyId)
	try {
		const { resources } = await containers.analytics.items
			.query({
				query: 'SELECT * FROM c WHERE c.propertyId = @propertyId ORDER BY c.timestamp DESC',
				parameters: [{ name: '@propertyId', value: propertyId }],
			})
			.fetchAll()
		return resources
	} catch (err) {
		console.error('[CosmosDB] getAnalyticsByPropertyId failed:', err)
		throw err
	}
}
