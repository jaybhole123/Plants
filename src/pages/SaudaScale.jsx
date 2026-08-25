import React, { useState, useMemo } from 'react'
import { useSaudaScaleStore } from '../store/useStore'
import { CsvDropzone } from '../components/CsvDropzone'

const initialForm = {
  date: new Date().toISOString().split('T')[0],
  mainHeading: '',
  itemName: '',
  sizeMm: '',
  partyName: '',
  consigneeName: '',
  saudaQuantity: '',
  rateAmt: '',
  prvPending: '',
  qtyDispatch: '',
  balPending: '',
  broker: '',
  deliveryTerms: '',
  paymentCondition: '',
  referenceName: '',
  remarks: '',
}

const formatNumber = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0.000'
  return Number(value).toFixed(3)
}

const SaudaScale = () => {
  const [headerDate, setHeaderDate] = useState(new Date().toISOString().split('T')[0])
  const { entries, setEntries } = useSaudaScaleStore()
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const resetForm = () => {
    setForm({
      ...initialForm,
      date: new Date().toISOString().split('T')[0]
    })
    setEditingId(null)
  }

  // Auto-calculate Balance Pending whenever relevant fields change
  const calculatedBalance = useMemo(() => {
    const sauda = Number(form.saudaQuantity) || 0
    const prv = Number(form.prvPending) || 0
    const dispatch = Number(form.qtyDispatch) || 0
    return (sauda + prv) - dispatch
  }, [form.saudaQuantity, form.prvPending, form.qtyDispatch])

  // --- Form Submit Handler ---
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.partyName.trim() || !form.itemName.trim()) {
      showToast('Item Name and Party Name are required.', 'error')
      return
    }

    const newEntry = {
      ...form,
      balPending: calculatedBalance, // Set calculated value
    }

    if (editingId) {
      setEntries(prev => prev.map(item => item.id === editingId ? { ...newEntry, id: item.id } : item))
      showToast('Sauda entry updated successfully.')
    } else {
      setEntries(prev => [...prev, { ...newEntry, id: Date.now() }])
      showToast('Sauda entry added successfully.')
    }
    resetForm()
    setIsModalOpen(false)
  }

  const handleEdit = (id) => {
    const item = entries.find(i => i.id === id)
    if (item) {
      setForm(item)
      setEditingId(id)
      setIsModalOpen(true)
    }
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this sauda entry?')) {
      setEntries(prev => prev.filter(item => item.id !== id))
      showToast('Sauda entry removed.')
      if (editingId === id) resetForm()
    }
  }

  // --- CSV Upload Handler ---
  const handleCsvUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').map(l => l.trim()).filter(l => l)
      
      const newRows = []
      
      let currentItemName = ''
      
      for (let i = 0; i < lines.length; i++) {
        const columns = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        
        // Skip headers or subtotal rows
        if (columns[0] && (columns[0].toUpperCase().includes('DATE') || columns[0] === '')) {
          if (!columns[0] && columns[1] && !columns[2]) {
             currentItemName = columns[1]
          }
          continue
        }
        
        const date = columns[0] || new Date().toISOString().split('T')[0]
        const itemName = columns[1] || currentItemName
        const partyNameCheck = columns[3] || ''
        
        if (partyNameCheck && partyNameCheck.toUpperCase() !== 'PARTY NAME') {
          newRows.push({
            id: Date.now() + i + Math.random(),
            date: date,
            mainHeading: currentItemName,
            itemName: itemName,
            sizeMm: columns[2] || '',
            partyName: columns[3] || '',
            consigneeName: columns[4] || '',
            saudaQuantity: columns[5] || '0',
            rateAmt: columns[6] || '0',
            prvPending: '0', // Not in new CSV format
            qtyDispatch: columns[7] || '0',
            balPending: columns[8] || '0',
            broker: columns[9] || '',
            deliveryTerms: columns[10] || '',
            paymentCondition: columns[11] || '',
            referenceName: columns[12] || '',
            remarks: columns[13] || '',
          })
        }
      }
      
      if (newRows.length > 0) {
        setCsvPreview(newRows)
        showToast(`Ready to preview ${newRows.length} entries.`)
      } else {
        showToast('No valid data found in CSV.', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = '' 
  }

  // Format the date for the yellow header (DD.MM.YYYY)
  const formatHeaderDate = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-')
    return `${day}.${month}.${year}`
  }

  // Format row date (e.g., 14.06.26)
  const formatRowDate = (dateString) => {
    if (!dateString || !dateString.includes('-')) return dateString
    const [year, month, day] = dateString.split('-')
    return `${day}.${month}.${year.substring(2)}`
  }

  // --- Render Form Section (Modal Theme) ---
  const renderForm = () => (
    <div className="mb-6 flex gap-2">
      <button 
        onClick={() => { resetForm(); setIsModalOpen(true); }}
        className="px-5 py-2.5 rounded-md text-white font-medium shadow-sm active:scale-[0.98] transition-all flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        <span>Add Sauda Entry</span>
      </button>

      <CsvDropzone
        onUpload={handleCsvUpload}
        disabled={csvPreview.length > 0}
        className={`px-4 py-2.5 border font-medium rounded-md transition-all shadow-sm break-words flex items-center justify-center gap-1 active:scale-[0.98] ${csvPreview.length > 0 ? 'bg-slate-50 text-slate-400 border-slate-400 cursor-not-allowed' : 'bg-white hover:bg-emerald-50 border-slate-400 text-emerald-600 hover:border-emerald-200 hover:text-emerald-700'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span className="hidden sm:inline">CSV</span>
      </CsvDropzone>

      <button 
        onClick={() => setIsPromptModalOpen(true)}
        className="px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 font-medium rounded-md transition-all shadow-sm flex items-center gap-2 active:scale-[0.98]"
        title="Get AI Prompt for CSV"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="hidden sm:inline">AI Prompt</span>
      </button>

      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsPromptModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all relative z-10 border border-slate-100 flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-blue-600 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                AI Prompt for CSV Generation
              </h3>
              <button onClick={() => setIsPromptModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">Copy the prompt below and paste it into ChatGPT, Claude, or any AI along with an image of your Sauda Sale table. It will generate a CSV file in the exact format required for upload.</p>
              
              <div className="relative group">
                <pre className="bg-slate-50 border border-slate-200 text-slate-800 text-sm p-4 rounded-xl whitespace-pre-wrap font-mono leading-relaxed h-[300px] overflow-y-auto">
{`Please extract the data from the attached image of the "BALANCE PENDING OUTGOING (SAUDA SALE)" table and convert it into a strictly formatted CSV.

Instructions:
1. Use EXACTLY these 14 column headers in this exact order for the first row:
DATE, MATERIAL NAME, SIZE (MM), PARTY NAME, CONSIGNEE NAME, SAUDA QTY., RATE/MT., QTY. DISPATCH, BAL. PENDING, BROKER, TERMS OF DELIVERY, PAYMENT CONDITION, REFERENCE NAME, REMARK

2. Ensure all values are separated by commas.
3. If a column is empty or has a hyphen (-) in the image, output an empty string for that field. 
4. Do not include any subtotal rows or main category headers (like "DUST" or "TOTAL DUST") as data rows. Only include the actual entry rows with the party names.
5. Make sure numeric values like quantities and rates do not have commas in them (e.g., use 1000.00 instead of 1,000.00).
6. Output ONLY the raw CSV text inside a code block, without any extra explanations or greetings.`}
                </pre>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`Please extract the data from the attached image of the "BALANCE PENDING OUTGOING (SAUDA SALE)" table and convert it into a strictly formatted CSV.\n\nInstructions:\n1. Use EXACTLY these 14 column headers in this exact order for the first row:\nDATE, MATERIAL NAME, SIZE (MM), PARTY NAME, CONSIGNEE NAME, SAUDA QTY., RATE/MT., QTY. DISPATCH, BAL. PENDING, BROKER, TERMS OF DELIVERY, PAYMENT CONDITION, REFERENCE NAME, REMARK\n\n2. Ensure all values are separated by commas.\n3. If a column is empty or has a hyphen (-) in the image, output an empty string for that field. \n4. Do not include any subtotal rows or main category headers (like "DUST" or "TOTAL DUST") as data rows. Only include the actual entry rows with the party names.\n5. Make sure numeric values like quantities and rates do not have commas in them (e.g., use 1000.00 instead of 1,000.00).\n6. Output ONLY the raw CSV text inside a code block, without any extra explanations or greetings.`);
                    showToast('Prompt copied to clipboard!');
                  }}
                  className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700 flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copy Prompt
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end">
              <button onClick={() => setIsPromptModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all relative z-10 border border-slate-100 flex flex-col">
            
            {/* Header */}
            <div className="px-8 py-5 border-b flex justify-between items-center bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
              <h3 className="font-bold text-xl flex items-center gap-2.5 tracking-wide">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {editingId ? 'Edit Sauda Entry' : 'Add New Sauda Entry'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-8 bg-slate-50/30">
              <form onSubmit={(e) => {
                handleSubmit(e);
                setIsModalOpen(false); // Close modal on submit
              }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-end">
                
                <div className="group md:col-span-2 lg:col-span-3 xl:col-span-4 mb-2 border-b border-indigo-100 pb-4">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Main Heading (Group)</label>
                  <input type="text" value={form.mainHeading} onChange={(e) => setForm(prev => ({ ...prev, mainHeading: e.target.value }))} className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm uppercase focus:border-indigo-400 focus:ring-indigo-500/10 font-bold" placeholder="e.g. DEMO" />
                </div>
                
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm focus:border-indigo-400 focus:ring-indigo-500/10" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Material Name</label>
                  <input type="text" value={form.itemName} onChange={(e) => setForm(prev => ({ ...prev, itemName: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm uppercase focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="e.g. IRON ORE" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Size (MM)</label>
                  <input type="text" value={form.sizeMm} onChange={(e) => setForm(prev => ({ ...prev, sizeMm: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm uppercase focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="e.g. 5-18" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Party Name</label>
                  <input type="text" value={form.partyName} onChange={(e) => setForm(prev => ({ ...prev, partyName: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm uppercase focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="e.g. HINDUSTAN DHAATU LTD." />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Consignee Name</label>
                  <input type="text" value={form.consigneeName} onChange={(e) => setForm(prev => ({ ...prev, consigneeName: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm uppercase focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="e.g. Consignee" />
                </div>
                
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Sauda Qty.</label>
                  <div className="relative">
                    <input type="number" step="any" min="0" value={form.saudaQuantity} onChange={(e) => setForm(prev => ({ ...prev, saudaQuantity: e.target.value }))} className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0.000" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">MT</span>
                  </div>
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Rate/MT.</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                    <input type="number" step="any" min="0" value={form.rateAmt} onChange={(e) => setForm(prev => ({ ...prev, rateAmt: e.target.value }))} className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0" />
                  </div>
                </div>
                
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Prv. Pending</label>
                  <input type="number" step="any" min="0" value={form.prvPending} onChange={(e) => setForm(prev => ({ ...prev, prvPending: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Qty. Dispatch</label>
                  <input type="number" step="any" min="0" value={form.qtyDispatch} onChange={(e) => setForm(prev => ({ ...prev, qtyDispatch: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0" />
                </div>

                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block text-emerald-600">Bal. Pending (Auto)</label>
                  <input type="text" readOnly value={formatNumber(calculatedBalance)} className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold cursor-not-allowed shadow-sm text-right" />
                </div>

                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Broker</label>
                  <input type="text" value={form.broker} onChange={(e) => setForm(prev => ({ ...prev, broker: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="e.g. R.K. Broker" />
                </div>

                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Terms of Delivery</label>
                  <input type="text" value={form.deliveryTerms} onChange={(e) => setForm(prev => ({ ...prev, deliveryTerms: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="e.g. F.O.R. Plant" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Payment Condition</label>
                  <input type="text" value={form.paymentCondition} onChange={(e) => setForm(prev => ({ ...prev, paymentCondition: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="e.g. Advance" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Reference Name</label>
                  <input type="text" value={form.referenceName} onChange={(e) => setForm(prev => ({ ...prev, referenceName: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="e.g. PO Ref." />
                </div>
                <div className="group md:col-span-2 lg:col-span-3 xl:col-span-4">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Remark</label>
                  <input type="text" value={form.remarks} onChange={(e) => setForm(prev => ({ ...prev, remarks: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="Any remarks..." />
                </div>

                <div className="col-span-full flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-600 bg-white hover:bg-slate-100 rounded-xl font-bold transition-all w-full md:w-auto text-xs uppercase tracking-wider flex items-center justify-center border border-slate-200 shadow-sm active:scale-95">
                    Cancel
                  </button>
                  <button type="button" onClick={resetForm} className="px-6 py-3 text-slate-600 bg-white hover:bg-slate-100 rounded-xl font-bold transition-all w-full md:w-auto text-xs uppercase tracking-wider flex items-center justify-center border border-slate-200 shadow-sm active:scale-95">
                    Reset
                  </button>
                  <button type="submit" className="px-6 py-3 text-white rounded-xl font-bold transition-all w-full md:w-auto text-xs uppercase tracking-wider flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-indigo-500/30">
                    Add Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // --- Render Table Section ---
  const renderTable = (itemsToRender, isPreview = false) => {
    if (itemsToRender.length === 0) {
      return (
        <div className="py-12 text-center bg-slate-50/50 rounded border border-dashed border-slate-400">
          <div className="flex flex-row justify-center items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-slate-500 font-medium">No sauda entries to display.</p>
          </div>
        </div>
      )
    }

    // Group entries by mainHeading
    const groupedEntries = itemsToRender.reduce((acc, curr) => {
      const name = curr.mainHeading || curr.itemName || 'Unknown'
      if (!acc[name]) acc[name] = []
      acc[name].push(curr)
      return acc
    }, {})

    return (
      <div className="w-full max-w-full bg-white border border-slate-400 rounded shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="overflow-auto w-full max-w-full max-h-[65vh]">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                <th className="px-2 py-1.5 break-words border border-slate-400">Date</th>
                <th className="px-2 py-1.5 break-words border border-slate-400">Material Name</th>
                <th className="px-2 py-1.5 min-w-[80px] border border-slate-400">Size (MM)</th>
                <th className="px-2 py-1.5 min-w-[160px] border border-slate-400">Party Name</th>
                <th className="px-2 py-1.5 min-w-[120px] border border-slate-400">Consignee Name</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Sauda Qty.</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Rate/MT.</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Prv. Pending</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Qty. Dispatch</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Bal. Pending</th>
                <th className="px-2 py-1.5 min-w-[90px] border border-slate-400">Broker</th>
                <th className="px-2 py-1.5 min-w-[80px] border border-slate-400">Terms of Delivery</th>
                <th className="px-2 py-1.5 min-w-[80px] border border-slate-400">Payment Condition</th>
                <th className="px-2 py-1.5 min-w-[80px] border border-slate-400">Reference Name</th>
                <th className="px-2 py-1.5 min-w-[80px] border border-slate-400">Remark</th>
                <th className="px-2 py-1.5 text-center print:hidden border border-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {Object.entries(groupedEntries).map(([mainHeadingName, groupItems], groupIdx) => {
                
                // Calculate group subtotals
                const subSauda = groupItems.reduce((sum, i) => sum + (Number(i.saudaQuantity) || 0), 0)
                const subPrv = groupItems.reduce((sum, i) => sum + (Number(i.prvPending) || 0), 0)
                const subDispatch = groupItems.reduce((sum, i) => sum + (Number(i.qtyDispatch) || 0), 0)
                const subBal = groupItems.reduce((sum, i) => sum + (Number(i.balPending) || 0), 0)

                return (
                  <React.Fragment key={`group-${groupIdx}`}>
                    {/* Group Header Row */}
                    <tr className="bg-slate-50">
                      <td colSpan="16" className="px-2 py-1.5 text-left font-bold text-slate-800 text-[11px] uppercase tracking-widest text-indigo-600 border border-slate-400">
                        {mainHeadingName}
                      </td>
                    </tr>
                    
                    {/* Item Rows */}
                    {groupItems.map((item) => (
                      
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-700">{new Date(item.date).toLocaleDateString('en-GB')}</td>
                    <td className="border border-slate-400 px-2 py-1.5 font-medium text-slate-900 uppercase">{item.itemName}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-slate-700 uppercase">{item.sizeMm || '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-slate-700 uppercase">{item.partyName}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-slate-700 uppercase">{item.consigneeName || '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{formatNumber(item.saudaQuantity)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{item.rateAmt || '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{formatNumber(item.prvPending)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{formatNumber(item.qtyDispatch)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-slate-800 bg-slate-50/50">{formatNumber(item.balPending)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-600">{item.broker || '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-600">{item.deliveryTerms || '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-600">{item.paymentCondition || '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-600">{item.referenceName || '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-600 break-words" title={item.remarks}>{item.remarks || '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center bg-white align-middle">
                      <div className="flex flex-row justify-center items-center gap-2 transition-opacity">
                        <button onClick={() => handleEdit(item.id)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded" title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
              </tr>
                    ))}

                    {/* Subtotal Row */}
                    <tr className="font-semibold text-slate-700 bg-slate-50/50">
                      <td colSpan="5" className="px-2 py-1.5 text-right text-[11px] uppercase tracking-wider text-slate-500 border border-slate-400">Subtotal</td>
                      <td className="px-2 py-1.5 text-right border border-slate-400">{formatNumber(subSauda)}</td>
                      <td className="px-2 py-1.5 border border-slate-400"></td>
                      <td className="px-2 py-1.5 text-right border border-slate-400">{formatNumber(subPrv)}</td>
                      <td className="px-2 py-1.5 text-right border border-slate-400">{formatNumber(subDispatch)}</td>
                      <td className="px-2 py-1.5 text-right text-slate-800 font-bold border border-slate-400">{formatNumber(subBal)}</td>
                      <td colSpan="6" className="border border-slate-400"></td>
                    </tr>
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // --- Main Layout ---
  return (
    <div className="space-y-6 pb-10 px-2 sm:px-4 max-w-[1400px] mx-auto text-slate-800">
      
      {/* Top Banner (Modern Gradient) */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded p-4 sm:p-5 mb-6 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-28 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-28 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        
        <div className="z-10 text-center sm:text-left mb-3 sm:mb-0">
          <p className="text-blue-100 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Module</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sauda Sale</h1>
        </div>
        
        <div className="z-10 flex flex-col items-center sm:items-end">
          <label className="text-blue-100 text-[10px] uppercase tracking-wider font-semibold mb-1">Report Date</label>
          <div className="flex items-center bg-white/10 backdrop-blur-md rounded-md p-1 border border-white/20 shadow-inner">
            <input
              type="date"
              value={headerDate}
              onChange={(e) => setHeaderDate(e.target.value)}
              className="bg-transparent text-white px-3 py-1.5 focus:outline-none focus:ring-0 rounded-md text-xs font-medium [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="print:hidden">
        {renderForm()}
      </div>

      {/* Preview Section */}
      {csvPreview.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-1 sm:p-6 shadow-sm print:hidden">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-1">
              <span className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{csvPreview.length}</span>
              Preview Uploaded Data
            </h2>
            <div className="flex gap-1">
              <button 
                onClick={() => {
                  setEntries(prev => [...prev, ...csvPreview])
                  setCsvPreview([])
                  showToast('Data saved to table successfully.')
                }} 
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md transition shadow-sm"
              >
                Save Data
              </button>
              <button 
                onClick={() => setCsvPreview([])} 
                className="px-6 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-medium rounded-md transition"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="bg-white shadow-sm p-1 rounded-md">
            {renderTable(csvPreview, true)}
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="mt-8">
        <div className="flex items-center gap-1.5 px-2 mb-4">
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Balance Pending Outgoing (Sauda Sale)</h2>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>
        {renderTable(entries, false)}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed right-4 bottom-4 z-50 rounded-md px-2 py-1.5 shadow-lg border max-w-[90%] sm:max-w-md ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-rose-500 text-white border-rose-600'}`}>
          <p className="text-xs font-semibold">{toast.message}</p>
        </div>
      )}
    </div>
  )
}

export default SaudaScale