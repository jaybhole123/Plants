import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Stock from './pages/Stock'
import ItemTransfer from './pages/ItemTransfer'
import Production from './pages/Production'
import Production2 from './pages/Production2'
import SaudaScale from './pages/SaudaScale'
import SaudaPurchase from './pages/SaudaPurchase'
import MisReport from './pages/MisReport'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          isCollapsed={isCollapsed}
          toggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />

        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
          {/* Mobile menu trigger */}
          <div className="lg:hidden p-3 bg-white border-b border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <span className="text-sm font-bold text-slate-800">Hindustan Datthu Sponge</span>
          </div>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
            <Routes>
              <Route path="/" element={<Stock />} />
              <Route path="/transfer" element={<ItemTransfer />} />
              <Route path="/production" element={<Production />} />
              <Route path="/production2" element={<Production2 />} />
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
