import { useRef, useState } from 'react'
import { uploadImage } from '../services/uploads'
import './ImageUpload.css'

function ImageUpload({ value, onChange, label = 'Imagem', aspect = '16/9' }) {
	const inputRef = useRef(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState(null)

	const pick = () => inputRef.current?.click()

	const handleFile = async (e) => {
		const file = e.target.files?.[0]
		if (!file) return
		setBusy(true)
		setError(null)
		try {
			const url = await uploadImage(file)
			onChange(url)
		} catch (err) {
			setError(err.message)
		} finally {
			setBusy(false)
			if (inputRef.current) inputRef.current.value = ''
		}
	}

	return (
		<div className="img-upload">
			<button
				type="button"
				className="img-upload__dropzone"
				style={{ aspectRatio: aspect }}
				onClick={pick}
				disabled={busy}
				aria-label={value ? `Substituir ${label}` : `Carregar ${label}`}
			>
				{value ? (
					<img src={value} alt={label} className="img-upload__preview" />
				) : (
					<span className="img-upload__empty">
						{busy ? 'A enviar…' : `+ ${label}`}
					</span>
				)}
				{busy && <span className="img-upload__overlay">A enviar…</span>}
			</button>
			<div className="img-upload__actions">
				<button
					type="button"
					className="btn btn--ghost btn--small"
					onClick={pick}
					disabled={busy}
				>
					{value ? 'Substituir' : 'Carregar'}
				</button>
				{value && !busy && (
					<button
						type="button"
						className="btn btn--ghost btn--small"
						onClick={() => onChange(null)}
					>
						Remover
					</button>
				)}
			</div>
			<input
				ref={inputRef}
				type="file"
				accept="image/png,image/jpeg,image/webp,image/gif"
				onChange={handleFile}
				hidden
			/>
			{error && <p className="img-upload__error">{error}</p>}
		</div>
	)
}

export default ImageUpload
