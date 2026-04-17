import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getUser, loginUrl, logoutUrl } from '../services/auth'
import './Navbar.css'

function Navbar() {
	const [user, setUser] = useState(null)
	const [loadingUser, setLoadingUser] = useState(true)

	useEffect(() => {
		let cancelled = false
		getUser().then((u) => {
			if (!cancelled) {
				setUser(u)
				setLoadingUser(false)
			}
		})
		return () => {
			cancelled = true
		}
	}, [])

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
					{user && (
						<NavLink to="/dashboard" className="navbar__link">
							Dashboard
						</NavLink>
					)}
					{loadingUser ? null : user ? (
						<>
							<span className="navbar__user">{user.userDetails}</span>
							<a href={logoutUrl()} className="navbar__link">
								Logout
							</a>
						</>
					) : (
						<a href={loginUrl()} className="navbar__link">
							Login com Microsoft
						</a>
					)}
				</nav>
			</div>
		</header>
	)
}

export default Navbar
