import React, { useState, useRef } from 'react'

/**
 * ImageZoomViewer - Interactive image preview with Zoom In, Zoom Out, Reset, and Pan/Drag.
 */
export const ImageZoomViewer = ({ src, alt = "Uploaded document preview", className = "" }) => {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.3, 4))
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
      setScale((prev) => Math.min(prev + 0.2, 4))
    } else {
      setScale((prev) => {
        const next = Math.max(prev - 0.2, 0.5)
        if (next <= 1) setPosition({ x: 0, y: 0 })
        return next
      })
    }
  }

  return (
    <div className={`relative flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-700 select-none ${className}`}>
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <span className="text-xs font-semibold px-2.5 py-1 bg-black/60 backdrop-blur-md text-white rounded-md border border-white/10 pointer-events-auto">
          Preview Image ({Math.round(scale * 100)}%)
        </span>

        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10 pointer-events-auto shadow-lg">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            disabled={scale <= 0.5}
            className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 disabled:opacity-30 rounded-md transition-all text-base font-bold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            title="Reset Zoom (100%)"
            className="px-2 h-8 flex items-center justify-center text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/20 active:bg-white/30 rounded-md transition-all"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In (+)"
            disabled={scale >= 4}
            className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 disabled:opacity-30 rounded-md transition-all text-base font-bold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full min-h-[300px] flex items-center justify-center overflow-hidden p-4 relative ${
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
            alt={alt}
            className="max-h-[50vh] sm:max-h-[60vh] object-contain rounded shadow-2xl pointer-events-auto"
            draggable={false}
          />
        </div>

        {scale > 1 && (
          <div className="absolute bottom-2 left-3 text-[10px] text-white/50 bg-black/40 px-2 py-0.5 rounded pointer-events-none">
            Drag to pan image
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageZoomViewer
