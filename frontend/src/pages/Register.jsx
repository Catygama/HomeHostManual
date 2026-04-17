function Register() {
	return (
		<section className="page page--narrow">
			<h1 className="page-title">Criar conta</h1>
			<p className="page-desc">
				Registe-se para criar manuais e partilhar com os hóspedes. Os dados serão guardados no Cosmos DB
				quando a API estiver ligada.
			</p>
			<form className="form-card" onSubmit={(e) => e.preventDefault()}>
				<label className="field">
					<span className="field__label">Nome</span>
					<input type="text" name="name" autoComplete="name" placeholder="O seu nome" />
				</label>
				<label className="field">
					<span className="field__label">Email</span>
					<input type="email" name="email" autoComplete="email" placeholder="voce@email.com" />
				</label>
				<label className="field">
					<span className="field__label">Palavra-passe</span>
					<input type="password" name="password" autoComplete="new-password" />
				</label>
				<button type="submit" className="btn btn--primary btn--block">
					Registar
				</button>
			</form>
		</section>
	)
}

export default Register
