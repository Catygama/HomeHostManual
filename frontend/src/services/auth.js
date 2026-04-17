const FUNCTION_URL = import.meta.env.VITE_FUNCTION_URL

export async function getUser() {
	try {
		const res = await fetch(`${FUNCTION_URL}/.auth/me`, { credentials: 'include' })
		if (!res.ok) return null
		const data = await res.json()

		if (data?.clientPrincipal) return data.clientPrincipal

		if (Array.isArray(data) && data.length > 0) {
			const entry = data[0]
			const claims = Object.fromEntries(
				(entry.user_claims ?? []).map((c) => [c.typ, c.val]),
			)
			return {
				userId: entry.user_id,
				userDetails:
					claims['preferred_username'] ??
					claims['email'] ??
					claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ??
					entry.user_id,
				identityProvider: entry.provider_name,
				userRoles: entry.user_roles ?? [],
			}
		}

		return null
	} catch {
		return null
	}
}

export function loginUrl(returnTo = window.location.href) {
	return `${FUNCTION_URL}/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(returnTo)}`
}

export function logoutUrl(returnTo = window.location.origin) {
	return `${FUNCTION_URL}/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(returnTo)}`
}
