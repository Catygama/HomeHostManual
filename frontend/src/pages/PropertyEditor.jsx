import { Link, useParams } from 'react-router-dom'

function PropertyEditor() {
	const { id } = useParams()
	const isNew = !id

	return (
		<section className="page page--narrow">
			<h1 className="page-title">{isNew ? 'Nova propriedade' : 'Editar propriedade'}</h1>
			<p className="page-desc">
				{isNew
					? 'Defina nome, morada e regras da casa. Os dados serão persistidos no Cosmos DB (container properties) quando a API existir.'
					: `A editar propriedade com id: ${id}. Atualize os campos e guarde.`}
			</p>
			<form className="form-card" onSubmit={(e) => e.preventDefault()}>
				<label className="field">
					<span className="field__label">Nome</span>
					<input type="text" name="name" placeholder="Ex.: Loft com vista rio" />
				</label>
				<label className="field">
					<span className="field__label">Morada</span>
					<input type="text" name="address" placeholder="Morada completa" />
				</label>
				<label className="field">
					<span className="field__label">Regras da casa</span>
					<textarea name="rules" rows={4} placeholder="Check-in, animais, lixo…" />
				</label>
				<div className="form-actions">
					<button type="submit" className="btn btn--primary">
						Guardar
					</button>
					{!isNew && (
						<Link to={`/property/${id}/manual`} className="btn btn--secondary">
							Ir para o manual
						</Link>
					)}
				</div>
			</form>
		</section>
	)
}

export default PropertyEditor
