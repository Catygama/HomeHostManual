import express from 'express'
import puppeteer from 'puppeteer-core'

const PORT = Number(process.env.PORT ?? 8080)
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '')
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH ?? '/usr/bin/chromium'

if (!PUBLIC_BASE_URL) {
	console.error('PUBLIC_BASE_URL env var is required')
	process.exit(1)
}

const app = express()
app.use(express.json({ limit: '64kb' }))

app.get('/health', (_req, res) => {
	res.json({ status: 'ok', publicBaseUrl: PUBLIC_BASE_URL })
})

app.post('/pdf', async (req, res) => {
	const { propertyId } = req.body ?? {}

	if (!propertyId || typeof propertyId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(propertyId)) {
		return res.status(400).json({ error: 'invalid propertyId' })
	}

	const targetUrl = `${PUBLIC_BASE_URL}/manual/${encodeURIComponent(propertyId)}`
	console.log(`[pdf] generating for ${targetUrl}`)
	const started = Date.now()

	let browser
	try {
		browser = await puppeteer.launch({
			executablePath: CHROME_PATH,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				// Sem estas flags o crashpad_handler do chromium-bookworm aborta com
				// "chrome_crashpad_handler: --database is required" e o browser não arranca.
				'--disable-crash-reporter',
				'--no-crashpad',
				'--disable-breakpad',
			],
		})

		const page = await browser.newPage()
		await page.setViewport({ width: 1024, height: 1400, deviceScaleFactor: 2 })

		await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 })

		// O conteúdo é carregado client-side; esperamos pelo header ou pelo estado de erro
		await page.waitForSelector('.mp-header__title, .mp-empty, .mp-error', { timeout: 15000 })

		// Forçar todas as <section> expandidas para que o PDF não tenha rooms colapsados
		await page.evaluate(() => {
			document.querySelectorAll('.mp-room__panel').forEach((el) => {
				el.style.maxHeight = 'none'
			})
		})

		const pdf = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: { top: '14mm', right: '10mm', bottom: '14mm', left: '10mm' },
		})

		const elapsed = Date.now() - started
		console.log(`[pdf] done ${propertyId} in ${elapsed}ms (${pdf.length} bytes)`)

		res.setHeader('Content-Type', 'application/pdf')
		res.setHeader('Content-Length', String(pdf.length))
		res.end(pdf)
	} catch (err) {
		console.error('[pdf] failed', err)
		res.status(500).json({ error: 'PDF generation failed', detail: err?.message })
	} finally {
		await browser?.close().catch(() => {})
	}
})

app.listen(PORT, () => {
	console.log(`pdf-service listening on :${PORT}`)
	console.log(`PUBLIC_BASE_URL=${PUBLIC_BASE_URL}`)
	console.log(`CHROME_PATH=${CHROME_PATH}`)
})
