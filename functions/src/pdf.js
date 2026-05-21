import { app } from '@azure/functions'
import { getDatabase } from './lib/cosmos.js'

const properties = () => getDatabase().container('properties')

const PDF_SERVICE_URL = (process.env.PDF_SERVICE_URL ?? '').replace(/\/$/, '')

function notFound() {
	return { status: 404, jsonBody: { error: 'Not found' } }
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

function safeFilename(name) {
	const base = (name ?? 'manual').toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
	return base.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80) || 'manual'
}

app.http('manual-pdf', {
	route: 'manuals/{id}/pdf',
	methods: ['GET'],
	authLevel: 'anonymous',
	handler: async (request, context) => {
		const { id } = request.params

		if (!PDF_SERVICE_URL) {
			context.error('PDF_SERVICE_URL not configured')
			return { status: 500, jsonBody: { error: 'PDF service not configured' } }
		}

		const property = await findPropertyById(id)
		if (!property) return notFound()

		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), 90_000)

		let pdfRes
		try {
			pdfRes = await fetch(`${PDF_SERVICE_URL}/pdf`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ propertyId: id }),
				signal: controller.signal,
			})
		} catch (err) {
			context.error('PDF service unreachable', err)
			return { status: 502, jsonBody: { error: 'PDF service unreachable' } }
		} finally {
			clearTimeout(timeout)
		}

		if (!pdfRes.ok) {
			const detail = await pdfRes.text().catch(() => '')
			context.error('PDF service returned error', pdfRes.status, detail)
			return { status: 502, jsonBody: { error: 'PDF generation failed' } }
		}

		const buf = Buffer.from(await pdfRes.arrayBuffer())
		const filename = `${safeFilename(property.name)}.pdf`

		return {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="${filename}"`,
				'Cache-Control': 'public, max-age=300',
			},
			body: buf,
		}
	},
})
