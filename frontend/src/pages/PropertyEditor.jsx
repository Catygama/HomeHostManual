import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { createProperty, getPropertyById, updateProperty } from '../services/cosmosdb'

const USER_ID = 'user-test-001'

const EMPTY = {
	name: '',
	address: '',
	rules: '',
	wifiName: '',
	wifiPassword: '',
	checkin: '',
	checkout: '',
}

function PropertyEditor() {
	const { id } = useParams()
	const navigate = useNavigate()
	const isNew = !id

	const [form, setForm] = useState(EMPTY)
	const [loading, setLoading] = useState(!isNew)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState(null)

	useEffect(() => {
		if (isNew) return
		let cancelled = false

		async function fetchProperty() {
			try {
				const data = await getPropertyById(id, USER_ID)
				if (!cancelled && data) {
					setForm({
						name: data.name ?? '',
						address: data.address ?? '',
						rules: data.rules ?? '',
						wifiName: data.wifiName ?? '',
						wifiPassword: data.wifiPassword ?? '',
						checkin: data.checkin ?? '',
						checkout: data.checkout ?? '',
					})
					setLoading(false)
				}
			} catch (err) {
				if (!cancelled) {
					setError(err.message)
					setLoading(false)
				}
			}
		}

		fetchProperty()

		return () => { cancelled = true }
	}, [id, isNew])

	const handleChange = (e) => {
		const { name, value } = e.target
		setForm((prev) => ({ ...prev, [name]: value }))
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		setSaving(true)
		setError(null)
		try {
			if (isNew) {
				await createProperty({
					id: crypto.randomUUID(),
					...form,
					userId: USER_ID,
				})
			} else {
				await updateProperty(id, USER_ID, form)
			}
			navigate('/dashboard')
		} catch (err) {
			setError(err.message)
		} finally {
			setSaving(false)
		}
	}

	if (loading) return <p className="muted page">A carregar…</p>

	return (
		<section className="page page--narrow">
			<h1 className="page-title">{isNew ? 'Nova propriedade' : 'Editar propriedade'}</h1>
			{error && <p className="error-msg">{error}</p>}

			<form className="form-card" onSubmit={handleSubmit}>
				<label className="field">
					<span className="field__label">Nome</span>
					<input
						type="text"
						name="name"
						value={form.name}
						onChange={handleChange}
						placeholder="Ex.: Loft com vista rio"
						required
					/>
				</label>
				<label className="field">
					<span className="field__label">Morada</span>
					<input
						type="text"
						name="address"
						value={form.address}
						onChange={handleChange}
						placeholder="Morada completa"
					/>
				</label>
				<label className="field">
					<span className="field__label">Regras da casa</span>
					<textarea
						name="rules"
						rows={3}
						value={form.rules}
						onChange={handleChange}
						placeholder="Check-in, animais, lixo…"
					/>
				</label>

				<div className="field-row">
					<label className="field">
						<span className="field__label">Rede Wi-Fi</span>
						<input
							type="text"
							name="wifiName"
							value={form.wifiName}
							onChange={handleChange}
							placeholder="Nome da rede"
						/>
					</label>
					<label className="field">
						<span className="field__label">Password Wi-Fi</span>
						<input
							type="text"
							name="wifiPassword"
							value={form.wifiPassword}
							onChange={handleChange}
							placeholder="Password"
						/>
					</label>
				</div>

				<div className="field-row">
					<label className="field">
						<span className="field__label">Check-in</span>
						<input
							type="text"
							name="checkin"
							value={form.checkin}
							onChange={handleChange}
							placeholder="Ex.: 15h"
						/>
					</label>
					<label className="field">
						<span className="field__label">Check-out</span>
						<input
							type="text"
							name="checkout"
							value={form.checkout}
							onChange={handleChange}
							placeholder="Ex.: 11h"
						/>
					</label>
				</div>

				<div className="form-actions">
					<button type="submit" className="btn btn--primary" disabled={saving}>
						{saving ? 'A guardar…' : 'Guardar'}
					</button>
					{!isNew && (
						<Link to={`/property/${id}/manual`} className="btn btn--secondary">
							Ir para o manual
						</Link>
					)}
					<Link to="/dashboard" className="btn btn--ghost">
						Cancelar
					</Link>
				</div>
			</form>
		</section>
	)
}

export default PropertyEditor
