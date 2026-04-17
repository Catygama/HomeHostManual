const FUNCTION_URL = import.meta.env.VITE_FUNCTION_URL

export async function getUser() {
	try {
		const res = await fetch(`${FUNCTION_URL}/api/me`, { credentials: 'include' })
		if (!res.ok) return null
		const data = await res.json()
		if (!data?.authenticated) return null
		return data
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
