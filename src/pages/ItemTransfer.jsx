import { useState } from 'react'
import { useTransferStore } from '../store/useStore'
import { CsvDropzone } from '../components/CsvDropzone'

const initialIncomingForm = {
  partyName: '',
  materialName: '',
  vehicleNo: '',
  qty: '',
  rate: '',
}

const initialOutgoingForm = {
  partyName: '',
  materialName: '',
  vehicleNo: '',
  qty: '',
  rate: '',
}

const formatNumber = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0.000'
  return Number(value).toFixed(3)
}

const ItemTransfer = () => {
  // --- State Management ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  const { incomingList, setIncomingList, outgoingList, setOutgoingList } = useTransferStore()
  
  const [incomingForm, setIncomingForm] = useState(initialIncomingForm)
  const [editingIncomingId, setEditingIncomingId] = useState(null)

  const [outgoingForm, setOutgoingForm] = useState(initialOutgoingForm)
  const [editingOutgoingId, setEditingOutgoingId] = useState(null)
  const [editIncomingForm, setEditIncomingForm] = useState(initialIncomingForm)
  const [editOutgoingForm, setEditOutgoingForm] = useState(initialOutgoingForm)

  const [toast, setToast] = useState(null)
  const [incomingCsvPreview, setIncomingCsvPreview] = useState([])
  const [outgoingCsvPreview, setOutgoingCsvPreview] = useState([])

  // --- Helper Functions ---
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const resetIncomingForm = () => {
    setIncomingForm(initialIncomingForm)
    setEditingIncomingId(null)
  }

  const resetOutgoingForm = () => {
    setOutgoingForm(initialOutgoingForm)
    setEditingOutgoingId(null)
  }

  // Manual date formatting to match "DD.MM.YY" exactly
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-')
    return `${day}.${month}.${year.slice(-2)}`
  }

  // --- Handlers for Incoming ---
  const handleIncomingSubmit = (e) => {
    e.preventDefault()
    if (!incomingForm.partyName.trim() || !incomingForm.materialName.trim()) {
      showToast('Party Name and Material are required.', 'error')
      return
    }

    if (false) {
    } else {
      setIncomingList(prev => [...prev, { ...incomingForm, id: Date.now() }])
      showToast('Incoming entry added successfully.')
      resetIncomingForm()
    }
  }

  const handleEditIncoming = (id) => {
    const item = incomingList.find(i => i.id === id)
    if (item) {
      setEditIncomingForm(item)
      setEditingIncomingId(id)
    }
  }

  const handleDeleteIncoming = (id) => {
    if (window.confirm('Delete this incoming entry?')) {
      setIncomingList(prev => prev.filter(item => item.id !== id))
      showToast('Incoming entry removed.')
      if (editingIncomingId === id) resetIncomingForm()
    }
  }

  // --- Handlers for Outgoing ---
  const handleOutgoingSubmit = (e) => {
    e.preventDefault()
    if (!outgoingForm.partyName.trim() || !outgoingForm.materialName.trim()) {
      showToast('Party Name and Material are required.', 'error')
      return
    }

    if (false) {
    } else {
      setOutgoingList(prev => [...prev, { ...outgoingForm, id: Date.now() }])
      showToast('Outgoing entry added successfully.')
      resetOutgoingForm()
    }
  }

  const handleEditOutgoing = (id) => {
    const item = outgoingList.find(i => i.id === id)
    if (item) {
      setEditOutgoingForm(item)
      setEditingOutgoingId(id)
    }
  }

  const handleSaveInlineIncoming = () => {
    if (!editIncomingForm.partyName.trim() || !editIncomingForm.materialName.trim()) return showToast('Required fields missing', 'error')
    setIncomingList(prev => prev.map(item => item.id === editingIncomingId ? { ...editIncomingForm, id: item.id } : item))
    showToast('Incoming updated.')
    setEditingIncomingId(null)
  }
  const handleCancelInlineIncoming = () => setEditingIncomingId(null)

  const handleSaveInlineOutgoing = () => {
    if (!editOutgoingForm.partyName.trim() || !editOutgoingForm.materialName.trim()) return showToast('Required fields missing', 'error')
    setOutgoingList(prev => prev.map(item => item.id === editingOutgoingId ? { ...editOutgoingForm, id: item.id } : item))
    showToast('Outgoing updated.')
    setEditingOutgoingId(null)
  }
  const handleCancelInlineOutgoing = () => setEditingOutgoingId(null)

  const handleDeleteOutgoing = (id) => {
    if (window.confirm('Delete this outgoing entry?')) {
      setOutgoingList(prev => prev.filter(item => item.id !== id))
      showToast('Outgoing entry removed.')
      if (editingOutgoingId === id) resetOutgoingForm()
    }
  }

  const handleCsvUpload = (e, type) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n')
      
      const newRows = []
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const columns = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        
        // Skip Header or Section title (INCOMING / OUTGOING)
        if (columns[0] && (columns[0].toUpperCase() === 'S.NO' || columns[0].toUpperCase() === 'INCOMING' || columns[0].toUpperCase() === 'OUTGOING')) {
          continue
        }
        
        // Data rows: S.No (0), Party Name (1), Material Name (2), Vehicle No (3), Qty (4), Rate (5)
        // If CSV only has Party, Material, Vehicle, Qty then Party might be at index 0 or 1
        // We will assume S.No is present.
        const partyName = columns[1] || ''
        const materialName = columns[2] || ''
        const vehicleNo = columns[3] || ''
        const qty = columns[4] || '0'
        const rate = columns[5] || '0'
        
        if (partyName && partyName.toUpperCase() !== 'PARTY NAME') {
          newRows.push({
            id: Date.now() + i + Math.random(),
            partyName: partyName || '',
            materialName: materialName || '',
            vehicleNo: vehicleNo || '',
            qty: qty || '0',
            rate: rate || '0',
          })
        }
      }
      
      if (newRows.length > 0) {
        if (type === 'incoming') {
          setIncomingCsvPreview(newRows)
        } else {
          setOutgoingCsvPreview(newRows)
        }
        showToast(`Ready to preview ${newRows.length} entries.`)
      } else {
        showToast('No valid data found in CSV.', 'error')
      }
    }
    reader.readAsText(file)
    if (e.target && e.target.value !== undefined) {
      e.target.value = '' 
    }
  }

  // --- Render Form (Reusable for Incoming & Outgoing - Updated for White Theme) ---
  const renderForm = (type, form, setForm, handleSubmit, handleReset, isEditing, isPreviewing) => {
    const title = type === 'incoming' ? 'Incoming Entry' : 'Outgoing Entry'
    return (
      <div className="bg-white border border-slate-100 rounded p-5 sm:p-7 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex items-center gap-1.5 mb-6">
          <div className={`w-10 h-10 rounded-md flex items-center justify-center ${type === 'incoming' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {type === 'incoming' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-800">`Add ${title}`</h3>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-5 items-end">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Party Name</label>
            <input
              type="text"
              value={form.partyName}
              onChange={(e) => setForm(prev => ({ ...prev, partyName: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              placeholder="Hindustan Dhaatu Ltd."
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Material Name</label>
            <input
              type="text"
              value={form.materialName}
              onChange={(e) => setForm(prev => ({ ...prev, materialName: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              placeholder="Iron Ore Pellet"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Vehicle No</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.vehicleNo}
              onChange={(e) => setForm(prev => ({ ...prev, vehicleNo: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              placeholder="MH 04 AB 1234"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Qty.</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.qty}
              onChange={(e) => setForm(prev => ({ ...prev, qty: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              placeholder="175.900"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Rate 18%</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.rate}
              onChange={(e) => setForm(prev => ({ ...prev, rate: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              placeholder="8500"
            />
          </div>
          <div className="flex gap-1 items-end col-span-full xl:col-span-2">
            <button type="submit" className={`flex-1 lg:flex-none px-5 py-2.5 ${type === 'incoming' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-medium rounded-md transition-all shadow-sm shadow-blue-500/20 break-words active:scale-[0.98]`}>
              'Add Row'
            </button>
            <CsvDropzone
              onUpload={(e) => handleCsvUpload(e, type)}
              disabled={isPreviewing}
              className={`px-4 py-2.5 border font-medium rounded-md transition-all shadow-sm break-words flex items-center justify-center gap-1 active:scale-[0.98] ${isPreviewing ? 'bg-slate-50 text-slate-400 border-slate-400 cursor-not-allowed' : 'bg-white hover:bg-emerald-50 border-slate-400 text-emerald-600 hover:border-emerald-200 hover:text-emerald-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="hidden sm:inline">CSV</span>
            </CsvDropzone>
            {isEditing && (
              <button type="button" onClick={handleReset} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-md transition-all break-words active:scale-[0.98]">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    )
  }

  // --- Render Table (Reusable) ---
  const renderTable = (type, list, onEdit, onDelete, editForm, setEditForm, onSaveInline, onCancelInline, editingId, isPreview = false) => {
    const title = type === 'incoming' ? 'INCOMING' : 'OUTGOING'
    return (
      <div className="mb-8">
        <div className="overflow-hidden bg-white border border-slate-400 rounded shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className={`px-6 py-4 border-b border-slate-400 flex items-center justify-between ${type === 'incoming' ? 'bg-blue-50/50' : 'bg-indigo-50/50'}`}>
            <h4 className={`font-bold text-xs uppercase tracking-wider ${type === 'incoming' ? 'text-blue-700' : 'text-indigo-700'}`}>
              {title}
            </h4>
            <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-400 shadow-sm">{list.length} Entries</span>
          </div>
          <div className="overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="px-2 py-1.5 w-16 border border-slate-400">#</th>
                  <th className="px-2 py-1.5 min-w-[180px] border border-slate-400">Party Name</th>
                  <th className="px-2 py-1.5 min-w-[150px] border border-slate-400">Material Name</th>
                  <th className="px-2 py-1.5 w-24 border border-slate-400">Vehicle No</th>
                  <th className="px-2 py-1.5 w-24 text-right border border-slate-400">Qty.</th>
                  <th className="px-2 py-1.5 w-24 text-right border border-slate-400">RATE 18%</th>
                  <th className="px-2 py-1.5 w-28 text-center print:hidden border border-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400 bg-white border border-slate-400">
                      <div className="flex flex-row justify-center items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        No {title.toLowerCase()} entries found.
                      </div>
                    </td>
                  </tr>
                ) : (
                  list.map((item, index) => (
                    
                    <tr key={item.id} className="bg-white hover:bg-slate-50/80 transition-colors group">
                      {editingId === item.id ? (
                        <>
                          <td className="px-2 py-1.5 text-slate-400 font-medium border border-slate-400">{index + 1}</td>
                          <td className="px-2 py-1.5 border border-slate-400"><input type="text" value={editForm.partyName} onChange={e => setEditForm({...editForm, partyName: e.target.value})} className="w-full border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none uppercase" /></td>
                          <td className="px-2 py-1.5 border border-slate-400"><input type="text" value={editForm.materialName} onChange={e => setEditForm({...editForm, materialName: e.target.value})} className="w-full border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none uppercase" /></td>
                          <td className="px-2 py-1.5 border border-slate-400"><input type="text" value={editForm.vehicleNo} onChange={e => setEditForm({...editForm, vehicleNo: e.target.value})} className="w-full border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none uppercase" /></td>
                          <td className="px-2 py-1.5 border border-slate-400"><input type="number" value={editForm.qty} onChange={e => setEditForm({...editForm, qty: e.target.value})} className="w-full border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-right" /></td>
                          <td className="px-2 py-1.5 border border-slate-400"><input type="number" value={editForm.rate} onChange={e => setEditForm({...editForm, rate: e.target.value})} className="w-full border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-right" /></td>
                          <td className="px-2 py-1.5 text-center print:hidden border border-slate-400 bg-white align-middle">
                            <div className="flex flex-row justify-center items-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={onSaveInline} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Save">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              </button>
                              <button onClick={onCancelInline} className="p-1 text-rose-500 hover:bg-rose-50 rounded" title="Cancel">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 text-slate-400 font-medium border border-slate-400">{index + 1}</td>
                          <td className="px-2 py-1.5 text-slate-800 font-medium border border-slate-400">{item.partyName}</td>
                          <td className="px-2 py-1.5 text-slate-700 border border-slate-400">{item.materialName}</td>
                          <td className="px-2 py-1.5 text-slate-700 border border-slate-400">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-xs font-medium border border-slate-400">{item.vehicleNo || '-'}</span>
                          </td>
                          <td className="px-2 py-1.5 text-right text-slate-800 font-semibold border border-slate-400">{formatNumber(item.qty)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-700 border border-slate-400">{item.rate || '0'}</td>
                          <td className="px-2 py-1.5 text-center print:hidden border border-slate-400">
                            {!isPreview && (
                              <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(item.id)} className="p-1.5 rounded transition-colors text-blue-500 hover:bg-blue-50" title="Edit">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => onDelete(item.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors" title="Delete">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 pt-4 px-4 sm:px-6 max-w-7xl mx-auto text-slate-800">
      
      {/* Date Header (Modern Gradient Box) */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded p-1 md:px-8 md:py-4 shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-1">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-indigo-400 opacity-20 blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-baseline gap-1.5 sm:gap-1">
          <span className="text-blue-200 text-xs font-semibold tracking-[0.15em] uppercase">Transfer Date</span>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide drop-shadow-md">
            {formatDate(date)}
          </h2>
        </div>
        
        <div className="relative z-10 bg-white/10 p-1 rounded-md backdrop-blur-md border border-white/20 inline-flex items-center shadow-inner">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert hover:bg-white/10 rounded-md transition-colors"
          />
        </div>
      </div>

      {/* --- Incoming Section --- */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 px-2 mb-2">
          <h2 className="text-2xl font-bold text-slate-800">Incoming Setup</h2>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>
        {renderForm('incoming', incomingForm, setIncomingForm, handleIncomingSubmit, resetIncomingForm, !!editingIncomingId, incomingCsvPreview.length > 0)}
        
        {incomingCsvPreview.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded p-6 mb-6 shadow-sm print:hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-1.5">
                <span className="bg-emerald-500 text-white w-8 h-8 rounded-md flex items-center justify-center text-xs shadow-sm">{incomingCsvPreview.length}</span>
                Preview Incoming Data
              </h2>
              <div className="flex gap-1.5">
                <button onClick={() => { setIncomingList(prev => [...prev, ...incomingCsvPreview]); setIncomingCsvPreview([]); showToast('Data saved to incoming successfully.') }} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md transition-all shadow-sm active:scale-[0.98]">Save Data</button>
                <button onClick={() => setIncomingCsvPreview([])} className="px-5 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-100 font-medium rounded-md transition-all active:scale-[0.98]">Cancel</button>
              </div>
            </div>
            {renderTable('incoming', incomingCsvPreview, null, null, null, null, null, null, null, true)}
          </div>
        )}

        {renderTable('incoming', incomingList, handleEditIncoming, handleDeleteIncoming, editIncomingForm, setEditIncomingForm, handleSaveInlineIncoming, handleCancelInlineIncoming, editingIncomingId, false)}
      </div>

      {/* --- Outgoing Section --- */}
      <div className="space-y-2 mt-12">
        <div className="flex items-center gap-1.5 px-2 mb-2">
          <h2 className="text-2xl font-bold text-slate-800">Outgoing Setup</h2>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>
        {renderForm('outgoing', outgoingForm, setOutgoingForm, handleOutgoingSubmit, resetOutgoingForm, !!editingOutgoingId, outgoingCsvPreview.length > 0)}
        
        {outgoingCsvPreview.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded p-6 mb-6 shadow-sm print:hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-1.5">
                <span className="bg-emerald-500 text-white w-8 h-8 rounded-md flex items-center justify-center text-xs shadow-sm">{outgoingCsvPreview.length}</span>
                Preview Outgoing Data
              </h2>
              <div className="flex gap-1.5">
                <button onClick={() => { setOutgoingList(prev => [...prev, ...outgoingCsvPreview]); setOutgoingCsvPreview([]); showToast('Data saved to outgoing successfully.') }} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md transition-all shadow-sm active:scale-[0.98]">Save Data</button>
                <button onClick={() => setOutgoingCsvPreview([])} className="px-5 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-100 font-medium rounded-md transition-all active:scale-[0.98]">Cancel</button>
              </div>
            </div>
            {renderTable('outgoing', outgoingCsvPreview, null, null, null, null, null, null, null, true)}
          </div>
        )}

        {renderTable('outgoing', outgoingList, handleEditOutgoing, handleDeleteOutgoing, editOutgoingForm, setEditOutgoingForm, handleSaveInlineOutgoing, handleCancelInlineOutgoing, editingOutgoingId, false)}
      </div>

      {/* Toast Notification - Updated White Theme Colors */}
      {toast && (
        <div className={`fixed right-4 bottom-4 z-50 rounded-md px-2 py-1.5 shadow-lg border max-w-[90%] sm:max-w-md ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-rose-500 text-white border-rose-600'}`}>
          <p className="text-xs font-semibold">{toast.message}</p>
        </div>
      )}
    </div>
  )
}

export default ItemTransfer