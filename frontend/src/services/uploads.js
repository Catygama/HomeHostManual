import { api } from './api'

export async function uploadImage(file) {
	if (!file) throw new Error('Nenhum ficheiro selecionado')
	if (!file.type.startsWith('image/')) throw new Error('Só são aceites imagens')

	const { uploadUrl, blobUrl, maxBytes } = await api.uploads.getSas({
		filename: file.name,
		contentType: file.type,
	})

	if (maxBytes && file.size > maxBytes) {
		throw new Error(`Ficheiro muito grande (máx ${Math.round(maxBytes / 1024 / 1024)} MB)`)
	}

	const res = await fetch(uploadUrl, {
		method: 'PUT',
		headers: {
			'x-ms-blob-type': 'BlockBlob',
			'Content-Type': file.type,
		},
		body: file,
	})

	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(`Upload falhou (${res.status}): ${text}`)
	}

	return blobUrl
}
