import { Link } from 'react-router-dom'

const placeholderProperties = [
	{ id: 'demo-1', name: 'Apartamento Centro', address: 'Lisboa' },
	{ id: 'demo-2', name: 'Casa da Praia', address: 'Algarve' },
]

function Dashboard() {
	return (
		<section className="page">
			<div className="page-header">
				<div>
					<h1 className="page-title">Painel</h1>
					<p className="page-desc">
						Lista das suas propriedades. Aqui poderá abrir o editor de propriedade ou o construtor de
						manual por divisões.
					</p>
				</div>
				<Link to="/property/new" className="btn btn--primary">
					Nova propriedade
				</Link>
			</div>
			<ul className="card-list">
				{placeholderProperties.map(({ id, name, address }) => (
					<li key={id} className="card-list__item">
						<div>
							<strong>{name}</strong>
							<p className="muted">{address}</p>
						</div>
						<div className="card-list__actions">
							<Link to={`/property/${id}/edit`} className="btn btn--ghost btn--small">
								Editar
							</Link>
							<Link to={`/property/${id}/manual`} className="btn btn--secondary btn--small">
								Manual
							</Link>
						</div>
					</li>
				))}
			</ul>
		</section>
	)
}

export default Dashboard
