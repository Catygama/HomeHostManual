import { Link } from 'react-router-dom'
import heroImg from '../assets/hero.png'

function Home() {
	return (
		<section className="page page--home">
			<div className="hero-block">
				<img src={heroImg} alt="" className="hero-block__image" width={200} height={210} />
				<h1 className="page-title">HomeHost Manual</h1>
				<p className="page-lead">
					Crie manuais digitais interativos para as suas propriedades. Os hóspedes acedem por link ou QR
					code e encontram instruções por divisão, com fotos anotadas.
				</p>
				<div className="cta-row">
					<Link to="/login" className="btn btn--primary">
						Entrar
					</Link>
					<Link to="/register" className="btn btn--secondary">
						Criar conta
					</Link>
				</div>
			</div>
		</section>
	)
}

export default Home
