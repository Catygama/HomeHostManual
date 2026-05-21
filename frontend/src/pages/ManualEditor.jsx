import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../services/api'
import ImageUpload from '../components/ImageUpload'

const EMOJI_OPTIONS = ['🍳', '🛋️', '🛏️', '🚿', 'ℹ️', '🏠', '🅿️', '🌿', '🏊', '🧺']

function emptyRoom() {
	return {
		id: crypto.randomUUID(),
		name: '',
		icon: '🏠',
		imageUrl: '',
		instructions: [],
	}
}

function emptyInstruction() {
	return { id: crypto.randomUUID(), heading: '', steps: [''] }
}

function ManualEditor() {
	const { id: propertyId } = useParams()
	const [rooms, setRooms] = useState([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState(null)
	const [saved, setSaved] = useState(false)

	useEffect(() => {
		let cancelled = false

		async function fetchManual() {
			try {
				const manual = await api.manuals.getForProperty(propertyId)
				if (cancelled) return
				if (manual) {
					setRooms(
						manual.rooms.map((r) => ({
							...r,
							id: r.id ?? crypto.randomUUID(),
							imageUrl: r.imageUrl ?? '',
							instructions: (r.instructions ?? []).map((inst) => ({
								...inst,
								id: inst.id ?? crypto.randomUUID(),
								steps: inst.steps?.length ? inst.steps : [''],
							})),
						})),
					)
				}
				setLoading(false)
			} catch (err) {
				if (!cancelled) {
					setError(err.message)
					setLoading(false)
				}
			}
		}

		fetchManual()

		return () => { cancelled = true }
	}, [propertyId])

	const handleSave = useCallback(async () => {
		setSaving(true)
		setError(null)
		setSaved(false)
		try {
			const payload = {
				rooms: rooms.map(({ id: rid, name, icon, imageUrl, instructions }) => ({
					id: rid,
					name,
					icon,
					imageUrl: imageUrl || null,
					instructions: instructions.map(({ id: iid, heading, steps }) => ({
						id: iid,
						heading,
						steps: steps.filter(Boolean),
					})),
				})),
			}
			await api.manuals.upsert(propertyId, payload)
			setSaved(true)
			setTimeout(() => setSaved(false), 2500)
		} catch (err) {
			setError(err.message)
		} finally {
			setSaving(false)
		}
	}, [rooms, propertyId])

	const addRoom = () => setRooms((prev) => [...prev, emptyRoom()])

	const removeRoom = (idx) => setRooms((prev) => prev.filter((_, i) => i !== idx))

	const updateRoom = (idx, field, value) =>
		setRooms((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))

	const addInstruction = (roomIdx) =>
		setRooms((prev) =>
			prev.map((r, i) =>
				i === roomIdx
					? { ...r, instructions: [...r.instructions, emptyInstruction()] }
					: r,
			),
		)

	const removeInstruction = (roomIdx, instIdx) =>
		setRooms((prev) =>
			prev.map((r, ri) =>
				ri === roomIdx
					? { ...r, instructions: r.instructions.filter((_, ii) => ii !== instIdx) }
					: r,
			),
		)

	const updateInstruction = (roomIdx, instIdx, field, value) =>
		setRooms((prev) =>
			prev.map((r, ri) =>
				ri === roomIdx
					? {
						...r,
						instructions: r.instructions.map((inst, ii) =>
							ii === instIdx ? { ...inst, [field]: value } : inst,
						),
					}
					: r,
			),
		)

	const updateStep = (roomIdx, instIdx, stepIdx, value) =>
		updateInstruction(roomIdx, instIdx, 'steps',
			rooms[roomIdx].instructions[instIdx].steps.map((s, si) =>
				si === stepIdx ? value : s,
			),
		)

	const addStep = (roomIdx, instIdx) =>
		updateInstruction(roomIdx, instIdx, 'steps', [
			...rooms[roomIdx].instructions[instIdx].steps,
			'',
		])

	const removeStep = (roomIdx, instIdx, stepIdx) =>
		updateInstruction(roomIdx, instIdx, 'steps',
			rooms[roomIdx].instructions[instIdx].steps.filter((_, si) => si !== stepIdx),
		)

	if (loading) return <p className="muted page">A carregar manual…</p>

	return (
		<section className="page">
			<div className="page-header">
				<div>
					<h1 className="page-title">Construtor de manual</h1>
					<p className="page-desc">Propriedade {propertyId}</p>
				</div>
				<div className="page-header__actions">
					<button
						type="button"
						className="btn btn--primary"
						onClick={handleSave}
						disabled={saving}
					>
						{saving ? 'A guardar…' : saved ? '✓ Guardado' : 'Guardar manual'}
					</button>
					<Link to={`/manual/${propertyId}`} className="btn btn--ghost">
						Pré-visualizar
					</Link>
					<a
						href={api.manuals.pdfUrl(propertyId)}
						target="_blank"
						rel="noopener noreferrer"
						className="btn btn--ghost"
					>
						📄 Pré-visualizar PDF
					</a>
				</div>
			</div>

			{error && <p className="error-msg">{error}</p>}

			<div className="me-rooms">
				{rooms.map((room, ri) => (
					<div key={room.id} className="me-room">
						<div className="me-room__header">
							<select
								className="me-room__emoji-picker"
								value={room.icon}
								onChange={(e) => updateRoom(ri, 'icon', e.target.value)}
								aria-label="Ícone da divisão"
							>
								{EMOJI_OPTIONS.map((em) => (
									<option key={em} value={em}>{em}</option>
								))}
							</select>
							<input
								className="me-room__name"
								type="text"
								value={room.name}
								onChange={(e) => updateRoom(ri, 'name', e.target.value)}
								placeholder="Nome da divisão"
							/>
							<button
								type="button"
								className="btn btn--danger btn--small"
								onClick={() => removeRoom(ri)}
							>
								Remover
							</button>
						</div>

						<div className="me-room__image">
							<ImageUpload
								value={room.imageUrl || null}
								onChange={(url) => updateRoom(ri, 'imageUrl', url ?? '')}
								label={`imagem de ${room.name || 'divisão'}`}
								aspect="4/3"
							/>
						</div>

						<div className="me-instructions">
							{room.instructions.map((inst, ii) => (
								<div key={inst.id} className="me-inst">
									<div className="me-inst__header">
										<input
											className="me-inst__title"
											type="text"
											value={inst.heading}
											onChange={(e) => updateInstruction(ri, ii, 'heading', e.target.value)}
											placeholder="Título da instrução"
										/>
										<button
											type="button"
											className="btn btn--ghost btn--small"
											onClick={() => removeInstruction(ri, ii)}
										>
											✕
										</button>
									</div>
									<ol className="me-steps">
										{inst.steps.map((step, si) => (
											<li key={si} className="me-step">
												<span className="me-step__num">{si + 1}</span>
												<input
													type="text"
													className="me-step__input"
													value={step}
													onChange={(e) => updateStep(ri, ii, si, e.target.value)}
													placeholder="Descreva o passo…"
												/>
												<button
													type="button"
													className="me-step__remove"
													onClick={() => removeStep(ri, ii, si)}
													aria-label="Remover passo"
												>
													✕
												</button>
											</li>
										))}
									</ol>
									<button
										type="button"
										className="btn btn--ghost btn--small"
										onClick={() => addStep(ri, ii)}
									>
										+ Passo
									</button>
								</div>
							))}
							<button
								type="button"
								className="btn btn--ghost btn--small"
								onClick={() => addInstruction(ri)}
							>
								+ Instrução
							</button>
						</div>
					</div>
				))}
			</div>

			<button type="button" className="btn btn--secondary me-add-room" onClick={addRoom}>
				+ Nova divisão
			</button>
		</section>
	)
}

export default ManualEditor
