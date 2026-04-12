function Login() {
	return (
		<section className="page page--narrow">
			<h1 className="page-title">Iniciar sessão</h1>
			<p className="page-desc">
				Aceda ao painel do anfitrião para gerir propriedades e manuais. Em breve: autenticação com o
				backend.
			</p>
			<form className="form-card" onSubmit={(e) => e.preventDefault()}>
				<label className="field">
					<span className="field__label">Email</span>
					<input type="email" name="email" autoComplete="email" placeholder="voce@email.com" />
				</label>
				<label className="field">
					<span className="field__label">Palavra-passe</span>
					<input type="password" name="password" autoComplete="current-password" />
				</label>
				<button type="submit" className="btn btn--primary btn--block">
					Entrar
				</button>
			</form>
		</section>
	)
}

export default Login
