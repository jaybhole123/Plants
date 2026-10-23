import React from 'react'

/**
 * Modern, professional confirmation modal for data resets and destructive actions.
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Reset Data",
  message = "Kya aap sach me saara data reset (delete) karna chahte hain? Yeh action undo nahi kiya ja sakta.",
  confirmText = "Yes, Reset Everything",
  cancelText = "Cancel",
  type = "danger" // danger | warning
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div 
        className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Warning / Trash Icon */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                {title}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors active:scale-95 shadow-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-semibold text-sm shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
