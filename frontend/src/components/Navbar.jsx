import { NavLink } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
	return (
		<header className="navbar">
			<div className="navbar__inner">
				<NavLink to="/" className="navbar__brand" end>
					HomeHost Manual
				</NavLink>
				<nav className="navbar__links" aria-label="Principal">
					<NavLink to="/" className="navbar__link" end>
						Home
					</NavLink>
					<NavLink to="/login" className="navbar__link">
						Login
					</NavLink>
					<NavLink to="/dashboard" className="navbar__link">
						Dashboard
					</NavLink>
				</nav>
			</div>
		</header>
	)
}

export default Navbar
