const base = (import.meta.env.VITE_FUNCTION_URL ?? '').replace(/\/$/, '')

async function request(path, opts = {}) {
	const { headers: hdrs, ...rest } = opts
	const res = await fetch(`${base}/api${path}`, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...hdrs,
		},
		...rest,
	})

	if (res.status === 204) return null

	const text = await res.text()
	if (!res.ok) {
		if (res.status === 404) return null
		let msg = text
		try {
			const j = JSON.parse(text)
			msg = j.error ?? j.message ?? text
		} catch {
			/* use text */
		}
		throw new Error(`${res.status}: ${msg}`)
	}

	if (!text) return null
	return JSON.parse(text)
}

export const api = {
	properties: {
		list: () => request('/properties', { method: 'GET' }),
		get: (id) => request(`/properties/${encodeURIComponent(id)}`, { method: 'GET' }),
		create: (payload) =>
			request('/properties', { method: 'POST', body: JSON.stringify(payload) }),
		update: (id, patch) =>
			request(`/properties/${encodeURIComponent(id)}`, {
				method: 'PATCH',
				body: JSON.stringify(patch),
			}),
		delete: (id) =>
			request(`/properties/${encodeURIComponent(id)}`, { method: 'DELETE' }),
	},
	manuals: {
		getForProperty: (propertyId) =>
			request(`/properties/${encodeURIComponent(propertyId)}/manual`, {
				method: 'GET',
			}),
		upsert: (propertyId, payload) =>
			request(`/properties/${encodeURIComponent(propertyId)}/manual`, {
				method: 'PUT',
				body: JSON.stringify(payload),
			}),
	},
	public: {
		getProperty: (id) =>
			request(`/public/properties/${encodeURIComponent(id)}`, { method: 'GET' }),
		getManual: (propertyId) =>
			request(`/public/properties/${encodeURIComponent(propertyId)}/manual`, {
				method: 'GET',
			}),
	},
}
