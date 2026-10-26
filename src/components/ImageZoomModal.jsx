import React, { useState, useRef } from 'react'

/**
 * ImageZoomModal - Fullscreen or centered popup modal to inspect an image with Zoom & Pan
 */
export const ImageZoomModal = ({ isOpen, src, title = "Uploaded Image Preview", onClose }) => {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  if (!isOpen || !src) return null

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.3, 5))
  }

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.3, 0.5)
      if (next <= 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e) => {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.2, 5))
    } else {
      setScale((prev) => {
        const next = Math.max(prev - 0.2, 0.5)
        if (next <= 1) setPosition({ x: 0, y: 0 })
        return next
      })
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative z-10 w-full max-w-5xl h-[85vh] sm:h-[90vh] bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <h3 className="font-semibold text-sm sm:text-base text-slate-100">{title}</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {Math.round(scale * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-lg p-1">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out (-)"
                disabled={scale <= 0.5}
                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleReset}
                title="Reset zoom"
                className="px-2 h-7 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In (+)"
                disabled={scale >= 5}
                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close viewer (Esc)"
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Zoom Area */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-slate-950/70 ${
            scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
          }`}
        >
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              transformOrigin: 'center center',
            }}
            className="max-w-full max-h-full flex items-center justify-center pointer-events-none"
          >
            <img
              src={src}
              alt="Preview"
              className="max-h-[70vh] sm:max-h-[75vh] object-contain shadow-2xl rounded pointer-events-auto"
              draggable={false}
            />
          </div>

          <div className="absolute bottom-3 left-4 text-xs text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700/60 pointer-events-none flex items-center gap-2">
            <span>Scroll wheel to zoom</span>
            <span>•</span>
            <span>Click & drag to move</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageZoomModal
