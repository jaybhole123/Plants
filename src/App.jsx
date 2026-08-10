import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Stock from './pages/Stock'
import ItemTransfer from './pages/ItemTransfer'
import Production from './pages/Production'
import SaudaScale from './pages/SaudaScale'
import SaudaPurchase from './pages/SaudaPurchase'
import MisReport from './pages/MisReport'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col lg:pl-64">
          <Navbar onMenuToggle={() => setSidebarOpen((open) => !open)} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<Stock />} />
              <Route path="/transfer" element={<ItemTransfer />} />
              <Route path="/production" element={<Production />} />
              <Route path="/sauda-scale" element={<SaudaScale />} />
              <Route path="/sauda-purchase" element={<SaudaPurchase />} />
              <Route path="/mis-report" element={<MisReport />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
