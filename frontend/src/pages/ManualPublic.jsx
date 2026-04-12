import { useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import './ManualPublic.css'

const property = {
	name: 'Apartamento Sol de Lisboa',
	address: 'Rua Augusta 42, Lisboa',
	wifi: { network: 'SolLisboa_5G', password: 'bem-vindo2024' },
	checkIn: '15h',
	checkOut: '11h',
}

const rooms = [
	{
		id: 'cozinha',
		emoji: '🍳',
		title: 'Cozinha',
		instructions: [
			{
				heading: 'Máquina de café Nespresso',
				steps: [
					'Encha o depósito de água na parte de trás até à marca máxima.',
					'Insira a cápsula, feche a alavanca e coloque a chávena por baixo.',
					'Prima o botão grande (café longo) ou pequeno (expresso) e aguarde.',
				],
				image: 'nespresso.jpg',
			},
			{
				heading: 'Ligar o forno',
				steps: [
					'Rode o botão esquerdo para selecionar o modo (ventilado recomendado).',
					'Rode o botão direito para a temperatura desejada — a luz apaga quando atingir.',
				],
				image: 'forno.jpg',
			},
			{
				heading: 'Loiça e talheres',
				steps: [
					'Pratos e tigelas no armário por cima do lava-loiça.',
					'Talheres na gaveta à direita do fogão.',
					'Copos e canecas no armário junto ao frigorífico.',
				],
			},
		],
	},
	{
		id: 'sala',
		emoji: '🛋️',
		title: 'Sala',
		instructions: [
			{
				heading: 'TV e Chromecast',
				steps: [
					'Ligue a TV com o comando preto (botão vermelho no topo).',
					'O Chromecast liga automaticamente — escolha a entrada HDMI 2.',
					'Para fazer cast, abra qualquer app no telemóvel e toque no ícone de cast.',
				],
				image: 'tv-sala.jpg',
			},
			{
				heading: 'Streaming',
				steps: [
					'Netflix disponível — perfil "Hóspedes".',
					'Password do streaming: SolLisboa2024',
				],
			},
		],
	},
	{
		id: 'quarto',
		emoji: '🛏️',
		title: 'Quarto',
		instructions: [
			{
				heading: 'Cobertores extra',
				steps: [
					'Encontra cobertores e almofadas extra no armário superior (porta da direita).',
				],
				image: 'armario-quarto.jpg',
			},
			{
				heading: 'Ar condicionado',
				steps: [
					'Use o comando branco na mesinha de cabeceira.',
					'Para arrefecer: MODE → Cool, defina a temperatura desejada.',
					'Para aquecer: MODE → Heat. Recomendamos 22 °C para conforto.',
				],
				image: 'ac-quarto.jpg',
			},
		],
	},
	{
		id: 'casa-de-banho',
		emoji: '🚿',
		title: 'Casa de Banho',
		instructions: [
			{
				heading: 'Esquentador',
				steps: [
					'O esquentador liga automaticamente ao abrir água quente.',
					'Se a água não aquecer, verifique se o botão está na posição "I" (painel na cozinha).',
				],
				image: 'esquentador.jpg',
			},
			{
				heading: 'Toalhas extra',
				steps: [
					'Toalhas de banho e rosto extra estão debaixo do lavatório, na caixa branca.',
				],
			},
		],
	},
	{
		id: 'geral',
		emoji: 'ℹ️',
		title: 'Informações Gerais',
		instructions: [
			{
				heading: 'Acesso ao prédio',
				steps: ['Código do portão principal: #4521'],
			},
			{
				heading: 'Lixo',
				steps: [
					'Dia de recolha: terça e sexta.',
					'Contentores no pátio traseiro — separe reciclagem (amarelo) e lixo comum (verde).',
				],
			},
			{
				heading: 'Contactos',
				steps: [
					'Anfitrião (Ana): +351 912 345 678',
					'Emergências (Portugal): 112',
				],
			},
		],
	},
]

function ManualPublic() {
	const { id } = useParams()
	const [openRooms, setOpenRooms] = useState({ [rooms[0].id]: true })
	const [copied, setCopied] = useState(false)
	const contentRefs = useRef({})

	const toggle = useCallback((roomId) => {
		setOpenRooms((prev) => ({ ...prev, [roomId]: !prev[roomId] }))
	}, [])

	const copyWifi = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(property.wifi.password)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			/* clipboard blocked — no-op */
		}
	}, [])

	return (
		<div className="mp">
			<header className="mp-header">
				<div className="mp-header__top">
					<h1 className="mp-header__title">{property.name}</h1>
					<p className="mp-header__address">{property.address}</p>
				</div>

				<div className="mp-quickinfo">
					<div className="mp-quickinfo__card">
						<span className="mp-quickinfo__label">Wi-Fi</span>
						<span className="mp-quickinfo__value">{property.wifi.network}</span>
						<button
							type="button"
							className={`mp-copy ${copied ? 'mp-copy--done' : ''}`}
							onClick={copyWifi}
							aria-label="Copiar password Wi-Fi"
						>
							<span className="mp-copy__icon">{copied ? '✓' : '📋'}</span>
							<span className="mp-copy__text">
								{copied ? 'Copiado!' : property.wifi.password}
							</span>
						</button>
					</div>
					<div className="mp-quickinfo__times">
						<div className="mp-quickinfo__card">
							<span className="mp-quickinfo__label">Check-in</span>
							<span className="mp-quickinfo__value mp-quickinfo__value--big">
								{property.checkIn}
							</span>
						</div>
						<div className="mp-quickinfo__card">
							<span className="mp-quickinfo__label">Check-out</span>
							<span className="mp-quickinfo__value mp-quickinfo__value--big">
								{property.checkOut}
							</span>
						</div>
					</div>
				</div>
			</header>

			<nav className="mp-nav" aria-label="Divisões">
				{rooms.map(({ id: roomId, emoji, title }) => (
					<a key={roomId} href={`#${roomId}`} className="mp-nav__pill">
						<span className="mp-nav__emoji">{emoji}</span>
						<span>{title}</span>
					</a>
				))}
			</nav>

			<div className="mp-rooms">
				{rooms.map(({ id: roomId, emoji, title, instructions }) => {
					const isOpen = !!openRooms[roomId]
					return (
						<section key={roomId} id={roomId} className="mp-room">
							<button
								type="button"
								className="mp-room__toggle"
								onClick={() => toggle(roomId)}
								aria-expanded={isOpen}
								aria-controls={`panel-${roomId}`}
							>
								<span className="mp-room__emoji">{emoji}</span>
								<span className="mp-room__title">{title}</span>
								<span className={`mp-room__chevron ${isOpen ? 'mp-room__chevron--open' : ''}`}>
									&#8250;
								</span>
							</button>
							<div
								id={`panel-${roomId}`}
								className="mp-room__panel"
								ref={(el) => (contentRefs.current[roomId] = el)}
								style={{
									maxHeight: isOpen
										? (contentRefs.current[roomId]?.scrollHeight ?? 2000) + 'px'
										: '0px',
								}}
							>
								<div className="mp-room__content">
									{instructions.map(({ heading, steps, image }) => (
										<div key={heading} className="mp-instruction">
											<h3 className="mp-instruction__heading">{heading}</h3>
											<ol className="mp-steps">
												{steps.map((step, i) => (
													<li key={i} className="mp-steps__item">
														<span className="mp-steps__num">{i + 1}</span>
														<span>{step}</span>
													</li>
												))}
											</ol>
											{image && (
												<div className="mp-imgplaceholder" aria-label={`Foto: ${heading}`}>
													<span className="mp-imgplaceholder__icon">📷</span>
													<span className="mp-imgplaceholder__text">{image}</span>
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						</section>
					)
				})}
			</div>

			<footer className="mp-footer">
				<p>
					Manual gerado com <strong>HomeHost Manual</strong>
				</p>
			</footer>
		</div>
	)
}

export default ManualPublic
