import { Link, useParams } from 'react-router-dom'

const placeholderRooms = ['Cozinha', 'Quarto', 'Casa de banho']

function ManualEditor() {
	const { id } = useParams()

	return (
		<section className="page">
			<h1 className="page-title">Construtor de manual</h1>
			<p className="page-desc">
				Propriedade <code className="inline-code">{id}</code>. Organize instruções por divisão e anexe
				fotos (Blob Storage). Em produção, os dados vêm do container manuals no Cosmos DB.
			</p>
			<ul className="card-list">
				{placeholderRooms.map((room) => (
					<li key={room} className="card-list__item">
						<div>
							<strong>{room}</strong>
							<p className="muted">Instruções e imagens anotadas (placeholder)</p>
						</div>
						<button type="button" className="btn btn--ghost btn--small">
							Editar divisão
						</button>
					</li>
				))}
			</ul>
			<p className="page-foot">
				<Link to={`/manual/${id ?? 'preview'}`} className="link">
					Pré-visualizar manual público
				</Link>
			</p>
		</section>
	)
}

export default ManualEditor
