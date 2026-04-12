import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PropertyEditor from './pages/PropertyEditor'
import ManualEditor from './pages/ManualEditor'
import ManualPublic from './pages/ManualPublic'
import './App.css'

function App() {
	return (
		<>
			<Navbar />
			<main className="app-main">
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/property/new" element={<PropertyEditor />} />
					<Route path="/property/:id/edit" element={<PropertyEditor />} />
					<Route path="/property/:id/manual" element={<ManualEditor />} />
					<Route path="/manual/:id" element={<ManualPublic />} />
				</Routes>
			</main>
		</>
	)
}

export default App
