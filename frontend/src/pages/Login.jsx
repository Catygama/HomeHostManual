import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getUser, loginUrl } from '../services/auth'

function Login() {
	const [user, setUser] = useState(null)
	const [checking, setChecking] = useState(true)

	useEffect(() => {
		getUser().then((u) => {
			setUser(u)
			setChecking(false)
		})
	}, [])

	if (checking) {
		return (
			<section className="page page--narrow">
				<p className="page-desc">A verificar sessão…</p>
			</section>
		)
	}

	if (user) return <Navigate to="/dashboard" replace />

	return (
		<section className="page page--narrow">
			<h1 className="page-title">Iniciar sessão</h1>
			<p className="page-desc">
				Autentique-se com a sua conta Microsoft para gerir propriedades e manuais.
			</p>
			<a
				href={loginUrl(`${window.location.origin}/dashboard`)}
				className="btn btn--primary btn--block"
			>
				Entrar com Microsoft
			</a>
		</section>
	)
}

export default Login
