import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useUploadedImageStore } from '../store/useStore'
import ImageZoomModal from './ImageZoomModal'

const pageTitles = {
  '/': 'Stock Management',
  '/transfer': 'Incoming & Outgoing',
  '/production': 'Production',
  '/production2': 'Production 2',
  '/sauda-scale': 'Sauda Scale',
  '/sauda-purchase': 'Sauda Purchase',
  '/mis-report': 'MIS Report',
}

const pathToKeyMap = {
  '/': 'stock_raw',
  '/transfer': 'transfer',
  '/production': 'production',
  '/production2': 'production',
  '/sauda-scale': 'sauda_sale',
  '/sauda-purchase': 'sauda_purchase',
}

const Navbar = ({ onMenuToggle }) => {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Trading Management'
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  const imagesByPage = useUploadedImageStore((state) => state.imagesByPage)
  const pageKey = pathToKeyMap[location.pathname]
  
  // Current page image or fallback to the latest uploaded image across any page
  const pageImage = pageKey ? imagesByPage[pageKey] : null
  const anyImage = pageImage || Object.values(imagesByPage)[0] || null

  return (
    <>
      <header className="flex items-center justify-between gap-4 px-4 py-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Module</p>
            <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {anyImage && (
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm transition-all shadow-sm active:scale-95"
              title="Click to view and zoom the uploaded document image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>View Image</span>
            </button>
          )}

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs uppercase tracking-[0.22em] text-slate-500">User</span>
            <span className="text-sm font-medium text-slate-800">Trading Admin</span>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all">
            <span className="text-slate-500">Live</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]" />
          </button>
        </div>
      </header>

      {anyImage && (
        <ImageZoomModal
          isOpen={isZoomOpen}
          src={anyImage}
          title={`${title} - Document Image Preview`}
          onClose={() => setIsZoomOpen(false)}
        />
      )}
    </>
  )
}

export default Navbar