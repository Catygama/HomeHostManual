import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getManualByPropertyId, getPropertyByIdPublic } from '../services/cosmosdb'
import './ManualPublic.css'

const DEFAULT_ICONS = {
	cozinha: '🍳',
	sala: '🛋️',
	quarto: '🛏️',
	'casa de banho': '🚿',
	default: '🏠',
}

function iconFor(room) {
	if (room.icon) return room.icon
	const key = room.name?.toLowerCase()
	return DEFAULT_ICONS[key] ?? DEFAULT_ICONS.default
}

function ManualPublic() {
	const { id: propertyId } = useParams()
	const [property, setProperty] = useState(null)
	const [rooms, setRooms] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	const [openRooms, setOpenRooms] = useState({})
	const [copied, setCopied] = useState(false)
	const contentRefs = useRef({})

	useEffect(() => {
		let cancelled = false

		async function fetchData() {
			try {
				const [manual, prop] = await Promise.all([
					getManualByPropertyId(propertyId),
					getPropertyByIdPublic(propertyId),
				])
				if (cancelled) return
				if (prop) setProperty(prop)
				if (manual?.rooms?.length) {
					setRooms(manual.rooms)
					setOpenRooms({ [manual.rooms[0].id ?? manual.rooms[0].name]: true })
				}
				setLoading(false)
			} catch (err) {
				if (!cancelled) {
					setError(err.message)
					setLoading(false)
				}
			}
		}

		fetchData()

		return () => { cancelled = true }
	}, [propertyId])

	const toggle = useCallback((roomId) => {
		setOpenRooms((prev) => ({ ...prev, [roomId]: !prev[roomId] }))
	}, [])

	const copyWifi = useCallback(async () => {
		if (!property?.wifiPassword) return
		try {
			await navigator.clipboard.writeText(property.wifiPassword)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch { /* clipboard blocked */ }
	}, [property])

	if (loading) {
		return <div className="mp"><p className="mp-loading">A carregar manual…</p></div>
	}

	if (error) {
		return <div className="mp"><p className="mp-error">Erro: {error}</p></div>
	}

	if (!property && rooms.length === 0) {
		return (
			<div className="mp">
				<div className="mp-empty">
					<p>Manual não encontrado para esta propriedade.</p>
				</div>
			</div>
		)
	}

	return (
		<div className="mp">
			{property && (
				<header className="mp-header">
					<div className="mp-header__top">
						<h1 className="mp-header__title">{property.name}</h1>
						<p className="mp-header__address">{property.address}</p>
					</div>

					<div className="mp-quickinfo">
						{property.wifiName && (
							<div className="mp-quickinfo__card">
								<span className="mp-quickinfo__label">Wi-Fi</span>
								<span className="mp-quickinfo__value">{property.wifiName}</span>
								{property.wifiPassword && (
									<button
										type="button"
										className={`mp-copy ${copied ? 'mp-copy--done' : ''}`}
										onClick={copyWifi}
										aria-label="Copiar password Wi-Fi"
									>
										<span className="mp-copy__icon">{copied ? '✓' : '📋'}</span>
										<span className="mp-copy__text">
											{copied ? 'Copiado!' : property.wifiPassword}
										</span>
									</button>
								)}
							</div>
						)}
						<div className="mp-quickinfo__times">
							{property.checkin && (
								<div className="mp-quickinfo__card">
									<span className="mp-quickinfo__label">Check-in</span>
									<span className="mp-quickinfo__value mp-quickinfo__value--big">
										{property.checkin}
									</span>
								</div>
							)}
							{property.checkout && (
								<div className="mp-quickinfo__card">
									<span className="mp-quickinfo__label">Check-out</span>
									<span className="mp-quickinfo__value mp-quickinfo__value--big">
										{property.checkout}
									</span>
								</div>
							)}
						</div>

						{property.rules && (
							<div className="mp-quickinfo__card mp-rules">
								<span className="mp-quickinfo__label">Regras da casa</span>
								<p className="mp-rules__text">{property.rules}</p>
							</div>
						)}
					</div>
				</header>
			)}

			{rooms.length > 0 && (
				<>
					<nav className="mp-nav" aria-label="Divisões">
						{rooms.map((room) => {
							const key = room.id ?? room.name
							return (
								<a key={key} href={`#${key}`} className="mp-nav__pill">
									<span className="mp-nav__emoji">{iconFor(room)}</span>
									<span>{room.name}</span>
								</a>
							)
						})}
					</nav>

					<div className="mp-rooms">
						{rooms.map((room) => {
							const key = room.id ?? room.name
							const isOpen = !!openRooms[key]
							return (
								<section key={key} id={key} className="mp-room">
									<button
										type="button"
										className="mp-room__toggle"
										onClick={() => toggle(key)}
										aria-expanded={isOpen}
										aria-controls={`panel-${key}`}
									>
										<span className="mp-room__emoji">{iconFor(room)}</span>
										<span className="mp-room__title">{room.name}</span>
										<span className={`mp-room__chevron ${isOpen ? 'mp-room__chevron--open' : ''}`}>
											&#8250;
										</span>
									</button>
									<div
										id={`panel-${key}`}
										className="mp-room__panel"
										ref={(el) => (contentRefs.current[key] = el)}
										style={{
											maxHeight: isOpen
												? (contentRefs.current[key]?.scrollHeight ?? 2000) + 'px'
												: '0px',
										}}
									>
										<div className="mp-room__content">
											{(room.instructions ?? []).map((inst, idx) => (
												<div key={inst.id ?? idx} className="mp-instruction">
													<h3 className="mp-instruction__heading">{inst.heading}</h3>
													<ol className="mp-steps">
														{(inst.steps ?? []).map((step, i) => (
															<li key={i} className="mp-steps__item">
																<span className="mp-steps__num">{i + 1}</span>
																<span>{step}</span>
															</li>
														))}
													</ol>
												</div>
											))}
										</div>
									</div>
								</section>
							)
						})}
					</div>
				</>
			)}

			<footer className="mp-footer">
				<p>
					Manual gerado com <strong>HomeHost Manual</strong>
				</p>
			</footer>
		</div>
	)
}

export default ManualPublic
