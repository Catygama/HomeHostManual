import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

function Dashboard() {
	const [properties, setProperties] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const [retryKey, setRetryKey] = useState(0)

	useEffect(() => {
		let cancelled = false

		async function fetchProperties() {
			try {
				setLoading(true)
				setError(null)
				const result = await api.properties.list()
				if (!cancelled) {
					setProperties(result)
					setLoading(false)
				}
			} catch (err) {
				if (!cancelled) {
					console.error('[Dashboard] load failed:', err)
					setError(err.message ?? 'Erro desconhecido ao carregar propriedades')
					setLoading(false)
				}
			}
		}

		fetchProperties()

		return () => { cancelled = true }
	}, [retryKey])

	const handleDelete = async (id) => {
		if (!confirm('Apagar esta propriedade?')) return
		try {
			await api.properties.delete(id)
			setProperties((prev) => prev.filter((p) => p.id !== id))
		} catch (err) {
			alert(`Erro ao apagar: ${err.message}`)
		}
	}

	return (
		<section className="page">
			<div className="page-header">
				<div>
					<h1 className="page-title">Painel</h1>
					<p className="page-desc">
						Lista das suas propriedades. Crie, edite ou construa o manual de cada uma.
					</p>
				</div>
				<Link to="/property/new" className="btn btn--primary">
					Nova propriedade
				</Link>
			</div>

			{loading && <p className="muted">A carregar propriedades…</p>}

			{error && (
				<div className="error-msg">
					<p>Erro: {error}</p>
					<button
						type="button"
						className="btn btn--ghost btn--small"
						onClick={() => setRetryKey((k) => k + 1)}
					>
						Tentar novamente
					</button>
				</div>
			)}

			{!loading && !error && properties.length === 0 && (
				<p className="muted">Ainda não tem propriedades. Crie a primeira!</p>
			)}

			{!loading && properties.length > 0 && (
				<ul className="card-list">
					{properties.map(({ id, name, address, rules }) => (
						<li key={id} className="card-list__item">
							<div>
								<strong>{name}</strong>
								<p className="muted">{address}</p>
								{rules && <p className="card-rules">{rules}</p>}
							</div>
							<div className="card-list__actions">
								<Link to={`/property/${id}/edit`} className="btn btn--ghost btn--small">
									Editar
								</Link>
								<Link to={`/property/${id}/manual`} className="btn btn--secondary btn--small">
									Manual
								</Link>
								<button
									type="button"
									className="btn btn--danger btn--small"
									onClick={() => handleDelete(id)}
								>
									Apagar
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	)
}

export default Dashboard
