import { app } from '@azure/functions'
import { getAuthUser } from './lib/auth.js'
import { generateUploadSas } from './lib/storage.js'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = /^image\/(png|jpe?g|webp|gif)$/i

app.http('uploads-sas', {
	route: 'uploads/sas',
	methods: ['POST'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const user = getAuthUser(request)
		if (!user?.userId) return { status: 401, jsonBody: { error: 'Unauthorized' } }

		let body
		try {
			body = await request.json()
		} catch {
			return { status: 400, jsonBody: { error: 'Invalid JSON' } }
		}

		const filename = typeof body?.filename === 'string' ? body.filename : null
		const contentType = typeof body?.contentType === 'string' ? body.contentType : null

		if (!filename || !contentType) {
			return { status: 400, jsonBody: { error: 'filename and contentType are required' } }
		}
		if (!ALLOWED_TYPES.test(contentType)) {
			return { status: 400, jsonBody: { error: 'Only PNG/JPEG/WEBP/GIF are accepted' } }
		}

		try {
			const { uploadUrl, blobUrl } = generateUploadSas({
				userId: user.userId,
				filename,
				contentType,
			})
			return { jsonBody: { uploadUrl, blobUrl, maxBytes: MAX_BYTES } }
		} catch (err) {
			return { status: 500, jsonBody: { error: err.message } }
		}
	},
})
