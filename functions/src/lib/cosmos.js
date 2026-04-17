import { CosmosClient } from '@azure/cosmos'

let database

export function getDatabase() {
	if (!database) {
		const { COSMOS_DB_ENDPOINT, COSMOS_DB_KEY, COSMOS_DB_DATABASE } = process.env
		if (!COSMOS_DB_ENDPOINT || !COSMOS_DB_KEY || !COSMOS_DB_DATABASE) {
			throw new Error('Missing COSMOS_DB_* app settings')
		}
		const client = new CosmosClient({
			endpoint: COSMOS_DB_ENDPOINT,
			key: COSMOS_DB_KEY,
		})
		database = client.database(COSMOS_DB_DATABASE)
	}
	return database
}
