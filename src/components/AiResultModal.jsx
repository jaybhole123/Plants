import React, { useState } from 'react'
import ImageZoomViewer from './ImageZoomViewer'

const BADGE = {
  read: { text: 'Read by AI - please review', cls: 'bg-sky-100 text-sky-800 border-sky-300' },
  verified: { text: 'Verified', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  corrected: { text: 'Corrected by verifier', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  unverified: { text: 'Not verified', cls: 'bg-rose-100 text-rose-800 border-rose-300' },
}

/**
 * Shows the AI read result + verification outcome + uploaded image preview with zoom controls.
 * Props: result ({data, verification}), imageUrl, onApply(data), onClose()
 */
const AiResultModal = ({ result, imageUrl, onApply, onClose }) => {
  const { data, verification: v } = result
  const quality = result.quality || { ok: true, issues: [] }
  const badge = !quality.ok ? BADGE.read : (BADGE[v.status] || BADGE.unverified)
  const rowCount = data?.rows?.length || 0
  const [activeTab, setActiveTab] = useState('split') // 'split' | 'image' | 'details'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`relative z-10 bg-white rounded-2xl shadow-2xl w-full ${imageUrl ? 'max-w-5xl' : 'max-w-lg'} max-h-[92vh] flex flex-col border border-slate-100 overflow-hidden`}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-800 text-lg">Image Read Result</h3>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.cls}`}>{badge.text}</span>
          </div>

          {imageUrl && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'split' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Split View
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'image' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Image Only
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'details' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Data Summary
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          <div className={`grid gap-6 ${imageUrl && activeTab === 'split' ? 'grid-cols-1 lg:grid-cols-2 items-start' : 'grid-cols-1'}`}>
            {/* Image Preview Box (with zoom-in / zoom-out) */}
            {imageUrl && (activeTab === 'split' || activeTab === 'image') && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Uploaded Document</span>
                  <span className="text-xs text-slate-400">Use buttons or scroll to zoom, drag to pan</span>
                </div>
                <ImageZoomViewer 
                  src={imageUrl} 
                  alt="Scanned Document" 
                  className={activeTab === 'image' ? 'min-h-[65vh] h-[65vh]' : 'min-h-[380px] lg:h-[550px]'} 
                />
              </div>
            )}

            {/* AI Result details & warnings */}
            {(!imageUrl || activeTab === 'split' || activeTab === 'details') && (
              <div className="space-y-4 text-sm text-slate-700 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Detection Summary</span>
                  <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full text-xs">
                    {rowCount} {rowCount === 1 ? 'row' : 'rows'} detected
                  </span>
                </div>

                <p className="text-slate-600 leading-relaxed">
                  Review the values on the page after applying; you can inspect the uploaded document on the preview side to verify handwritten or printed figures before saving.
                </p>

                {!quality.ok && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 text-amber-900">
                    <p className="font-semibold mb-1 flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Photo quality warning
                    </p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {quality.issues.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                    <p className="mt-1.5 text-xs text-amber-800">
                      Numbers from a poor photo can look right but be wrong. Zoom into the image to verify.
                    </p>
                  </div>
                )}

                {v.status === 'unverified' && (
                  <p className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-800">
                    The second check could not run{v.message ? ` (${v.message})` : ''}. Please check every value carefully.
                  </p>
                )}

                {v.corrections.length > 0 && (
                  <div>
                    <p className="font-semibold mb-1.5 text-slate-800">Corrections made ({v.corrections.length})</p>
                    <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {v.corrections.map((c, i) => (
                        <li key={i} className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs">
                          Row {c.row + 1}, <em>{c.field}</em>:{' '}
                          <span className="line-through text-slate-500">{c.from || '(empty)'}</span> →{' '}
                          <strong className="text-amber-900">{c.to || '(empty)'}</strong>
                          {c.reason && <span className="block text-[11px] text-slate-500 mt-0.5">{c.reason}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {v.unreadable.length > 0 && (
                  <div>
                    <p className="font-semibold mb-1 text-slate-800">Could not read (left empty)</p>
                    <ul className="list-disc pl-5 text-slate-600 text-xs">
                      {v.unreadable.map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </div>
                )}

                {v.warnings.length > 0 && (
                  <div>
                    <p className="font-semibold mb-1 text-rose-800">Figures that don't add up (check these rows)</p>
                    <ul className="space-y-1 text-xs">
                      {v.warnings.map((w, i) => (
                        <li key={i} className="bg-rose-50 border border-rose-200 rounded-md px-3 py-2 text-rose-800">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  {v.status === 'verified' || v.status === 'corrected'
                    ? '"Verified" means a second AI pass compared the values with the image. It is not a guarantee, so please review before saving.'
                    : 'The values were read directly from the image. The AI can still misread digits, so please review before saving.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            {imageUrl && <span>Image loaded for inspection</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 text-sm font-medium transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onApply(data)}
              disabled={rowCount === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              Apply to page
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AiResultModal
