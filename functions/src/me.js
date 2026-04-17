import { app } from '@azure/functions'

function parseClientPrincipal(header) {
	if (!header) return null
	try {
		const decoded = Buffer.from(header, 'base64').toString('utf8')
		const principal = JSON.parse(decoded)

		const claims = Object.fromEntries(
			(principal.claims ?? []).map((c) => [c.typ, c.val]),
		)

		return {
			userId: principal.userId ?? claims.sub ?? null,
			userDetails:
				principal.userDetails ??
				claims.preferred_username ??
				claims.email ??
				claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ??
				claims.name ??
				null,
			identityProvider: principal.identityProvider ?? principal.auth_typ ?? null,
			userRoles: principal.userRoles ?? [],
			name:
				claims.name ??
				claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ??
				null,
		}
	} catch {
		return null
	}
}

app.http('me', {
	route: 'me',
	methods: ['GET'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const header = request.headers.get('x-ms-client-principal')
		const user = parseClientPrincipal(header)

		if (!user) {
			return { status: 401, jsonBody: { authenticated: false } }
		}

		return { jsonBody: { authenticated: true, ...user } }
	},
})
