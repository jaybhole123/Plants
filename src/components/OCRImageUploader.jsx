import React, { useState, useRef } from 'react'
import { extractWithAI } from '../utils/aiOcr'

/**
 * Reusable AI-powered Image Uploader Component.
 * Sends the image to the ocr-extract Supabase Edge Function (OpenAI
 * vision model) and returns structured fields for the given docType.
 *
 * Props:
 * - docType: which schema to extract (see supabase/functions/ocr-extract).
 * - onDataExtracted(data): Called with the structured JSON object.
 * - buttonLabel: (optional) Label for the button.
 * - className: (optional) Additional classes for the trigger button.
 */
const OCRImageUploader = ({ docType, onDataExtracted, buttonLabel = 'AI Scan', className = '' }) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, etc.)')
      return
    }

    setPreviewUrl(URL.createObjectURL(file))
    processImage(file)
  }

  const processImage = async (file) => {
    setIsProcessing(true)

    try {
      const data = await extractWithAI(file, docType)
      console.log('[AI OCR] Extracted Data:', data)

      if (onDataExtracted) {
        onDataExtracted(data)
      }
    } catch (error) {
      console.error('[AI OCR] Error:', error)
      alert(`AI scan failed: ${error.message || 'Please try again with a clearer image.'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
      processImage(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={isProcessing}
        className={`px-4 py-2.5 bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 hover:border-violet-300 font-medium rounded-md transition-all shadow-sm flex items-center gap-2 active:scale-[0.98] ${isProcessing ? 'opacity-60 cursor-wait' : ''} ${className}`}
        title="Upload image for OCR text extraction"
      >
        {isProcessing ? (
          <>
            <span className="animate-spin h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full"></span>
            <span className="hidden sm:inline">Processing...</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">{buttonLabel}</span>
          </>
        )}
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={closeModal}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto transform transition-all relative z-10 border border-slate-100 flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-violet-600 to-purple-600 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                AI Image Scanner
              </h3>
              <button onClick={closeModal} className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group
                  ${isProcessing ? 'border-violet-400 bg-violet-50/50' : 'border-slate-300 hover:border-violet-400 hover:bg-violet-50/30'}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  hidden
                />
                
                {previewUrl ? (
                  <div className="space-y-4">
                    <img src={previewUrl} alt="Uploaded preview" className="max-h-[250px] mx-auto rounded-lg shadow-md object-contain" />
                    
                    {isProcessing && (
                      <div className="space-y-2">
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-gradient-to-r from-violet-500 to-purple-500 h-2.5 rounded-full animate-pulse w-full"></div>
                        </div>
                        <p className="text-sm font-medium text-violet-600 animate-pulse">
                          Asking AI to read the image...
                        </p>
                      </div>
                    )}

                    {!isProcessing && (
                      <p className="text-sm text-emerald-600 font-semibold flex items-center justify-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Text extracted successfully! Check the form fields.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-700">Upload Receipt / Table Image</p>
                      <p className="text-sm text-slate-500 mt-1">Drag & drop, click to browse, or use camera</p>
                    </div>
                    <p className="text-xs text-slate-400">Supports JPG, PNG, WEBP</p>
                  </div>
                )}
              </div>

              {/* Tip */}
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-amber-800">
                  <strong>Tip:</strong> For best results, use a clear, well-lit photo of the document or table. The extracted text will automatically fill the form fields. You can review and edit the values before saving.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-2">
              {previewUrl && !isProcessing && (
                <button 
                  onClick={() => {
                    setPreviewUrl(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }} 
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors text-sm"
                >
                  Upload Another
                </button>
              )}
              <button onClick={closeModal} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default OCRImageUploader
