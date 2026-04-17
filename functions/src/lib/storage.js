import {
	StorageSharedKeyCredential,
	generateBlobSASQueryParameters,
	BlobSASPermissions,
} from '@azure/storage-blob'

const CONTAINER = 'homehost-images'

function parseConnectionString(connStr) {
	const entries = {}
	for (const part of connStr.split(';')) {
		if (!part) continue
		const idx = part.indexOf('=')
		if (idx === -1) continue
		entries[part.slice(0, idx)] = part.slice(idx + 1)
	}
	return {
		accountName: entries.AccountName,
		accountKey: entries.AccountKey,
		endpointSuffix: entries.EndpointSuffix ?? 'core.windows.net',
	}
}

function extensionFor(filename, contentType) {
	const fromName = filename.includes('.') ? filename.split('.').pop() : null
	if (fromName && /^[a-zA-Z0-9]{1,8}$/.test(fromName)) return fromName.toLowerCase()
	const map = {
		'image/png': 'png',
		'image/jpeg': 'jpg',
		'image/jpg': 'jpg',
		'image/webp': 'webp',
		'image/gif': 'gif',
	}
	return map[contentType] ?? 'bin'
}

export function generateUploadSas({ userId, filename, contentType }) {
	const conn = process.env.STORAGE_CONNECTION_STRING
	if (!conn) throw new Error('Missing STORAGE_CONNECTION_STRING app setting')

	const { accountName, accountKey, endpointSuffix } = parseConnectionString(conn)
	if (!accountName || !accountKey) {
		throw new Error('Invalid STORAGE_CONNECTION_STRING (missing AccountName or AccountKey)')
	}

	const credential = new StorageSharedKeyCredential(accountName, accountKey)
	const blobName = `users/${userId}/${crypto.randomUUID()}.${extensionFor(filename, contentType)}`

	const now = new Date()
	const sas = generateBlobSASQueryParameters(
		{
			containerName: CONTAINER,
			blobName,
			permissions: BlobSASPermissions.parse('cw'),
			startsOn: new Date(now.getTime() - 60 * 1000),
			expiresOn: new Date(now.getTime() + 10 * 60 * 1000),
			contentType,
			protocol: 'https',
		},
		credential,
	).toString()

	const baseUrl = `https://${accountName}.blob.${endpointSuffix}/${CONTAINER}/${blobName}`
	return {
		uploadUrl: `${baseUrl}?${sas}`,
		blobUrl: baseUrl,
	}
}
