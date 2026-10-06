                                          import React, { useState, useMemo } from 'react'
import { useSaudaPurchaseStore } from '../store/useStore'
import { CsvDropzone } from '../components/CsvDropzone'
import { ImageOcrUploader } from '../components/ImageOcrUploader'
import { FilterBar } from '../components/FilterBar'
const initialForm = {
  date: new Date().toISOString().split('T')[0],
  mainHeading: '',
  itemName: '',
  partyName: '',
  orderQuantity: '',
  rateMt: '',
  tcs: '',
  bhada: '',
  landingCost: '',
  gst: '',
  grossRate: '',
  netRate: '',
  qtyReceived: '',
  balPending: '',
}

const formatNumber = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0.000'
  return Number(value).toFixed(3)
}

const SaudaPurchase = () => {
  const [headerDate, setHeaderDate] = useState(new Date().toISOString().split('T')[0])
  const [search, setSearch] = useState('')
  const { entries, setEntries } = useSaudaPurchaseStore()
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

  // Auto-calculate Balance whenever relevant fields change
  const calculatedValues = useMemo(() => {
    const order = Number(form.orderQuantity) || 0
    const received = Number(form.qtyReceived) || 0
    
    const balPending = order - received

    return { balPending }
  }, [form.orderQuantity, form.qtyReceived])

  const filteredEntries = useMemo(() => {
    return entries.filter(item => 
      !search || 
      item.partyName?.toLowerCase().includes(search.toLowerCase()) || 
      item.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      item.mainHeading?.toLowerCase().includes(search.toLowerCase())
    )
  }, [entries, search])

  // --- Form Submit Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.partyName.trim() || !form.itemName.trim()) {
      showToast('Item Name and Party Name are required.', 'error')
      return
    }

    const payload = {
      date: form.date,
      main_heading: form.mainHeading,
      item_name: form.itemName,
      size_mm: form.sizeMm || null,
      party_name: form.partyName,
      order_quantity: Number(form.orderQuantity) || 0,
      rate_mt: Number(form.rateMt) || 0,
      qty_received: Number(form.qtyReceived) || 0,
      bal_pending: calculatedValues.balPending,
      broker: form.broker || null,
      delivery_terms: form.deliveryTerms || null,
      payment_condition: form.paymentCondition || null,
      reference_name: form.referenceName || null,
      remarks: form.remarks || null,
    }

    setIsLoading(true)
    if (editingId) {
      const { error } = await supabase.from('sauda_purchase').update(payload).eq('id', editingId)
      if (error) {
        showToast('Failed to update entry', 'error')
      } else {
        showToast('Purchase entry updated successfully.')
        await fetchPurchaseEntries()
      }
    } else {
      const { error } = await supabase.from('sauda_purchase').insert([payload])
      if (error) {
        showToast('Failed to add entry', 'error')
      } else {
        showToast('Purchase entry added successfully.')
        await fetchPurchaseEntries()
      }
    }
    setIsLoading(false)
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

  const handleDelete = async (id) => {
    if (window.confirm('Delete this purchase entry?')) {
      setIsLoading(true)
      const { error } = await supabase.from('sauda_purchase').delete().eq('id', id)
      if (error) {
        showToast('Failed to delete entry', 'error')
      } else {
        showToast('Purchase entry removed.')
        await fetchPurchaseEntries()
        if (editingId === id) resetForm()
      }
      setIsLoading(false)
    }
  }

  // --- Date Parser Helper for CSV ---
  const parseDateToDB = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    const parts = dateStr.split(/[.\-\/]/);
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      let y = parts[2];
      if (y.length === 2) y = '20' + y;
      return `${y}-${m}-${d}`;
    }
    return new Date().toISOString().split('T')[0];
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
        const columns = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''))
        
        // Skip headers
        if (columns[0] && (columns[0].toUpperCase().includes('MAIN HEADING') || columns[0].toUpperCase().includes('DATE'))) {
          continue
        }
        
        const mainHeading = columns[0] || 'GENERAL'
        const date = columns[1] || new Date().toISOString().split('T')[0]
        const itemName = columns[2] || ''
        const partyNameCheck = columns[3] || ''
        
        if (partyNameCheck && partyNameCheck.toUpperCase() !== 'PARTY NAME') {
          newRows.push({
            id: Date.now() + i + Math.random(),
            date: date,
            mainHeading: mainHeading,
            itemName: itemName,
            partyName: partyNameCheck,
            orderQuantity: columns[4] || '0',
            rateMt: columns[5] || '0',
            tcs: columns[6] || '0',
            bhada: columns[7] || '0',
            landingCost: columns[8] || '0',
            gst: columns[9] || '0',
            grossRate: columns[10] || '0',
            netRate: columns[11] || '0',
            qtyReceived: columns[12] || '0',
            balPending: columns[13] || '0',
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

  const handleOcrResult = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l)
    const newRows = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.match(/\d/)) {
        const parts = line.split(/\s+/)
        const nums = parts.filter(p => !isNaN(parseFloat(p.replace(/,/g, ''))))
        const chars = line.replace(/[\d\.\-,]/g, '').trim()
        
        newRows.push({
          id: Date.now() + i + Math.random(),
          date: new Date().toISOString().split('T')[0],
          mainHeading: form.mainHeading || 'SCANNED DATA',
          itemName: form.itemName || 'Item',
          partyName: chars.substring(0, 30) || 'Scanned Party',
          orderQuantity: nums[0] || '0',
          rateMt: nums[1] || '0',
          tcs: nums[2] || '0',
          bhada: nums[3] || '0',
          landingCost: nums[4] || '0',
          gst: nums[5] || '0',
          grossRate: nums[6] || '0',
          netRate: nums[7] || '0',
          qtyReceived: nums[8] || '0',
          balPending: nums[9] || '0',
        })
      }
    }

    if (newRows.length > 0) {
      setCsvPreview(newRows)
      showToast(`Ready to preview ${newRows.length} scanned entries.`, 'success')
    } else {
      showToast('Could not extract valid data from image.', 'error')
    }
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

  // --- OCR Upload Handler ---
  const handleOcrUpload = (extractedText) => {
    const parsedData = parseSaudaPurchaseOCR(extractedText)
    setForm(prev => ({
      ...prev,
      ...parsedData
    }))
    setIsModalOpen(true)
    showToast('OCR extracted successfully. Please review the details.')
  }

  // --- Render Form Section (Modal Theme) ---
  const renderForm = () => (
    <div className="mb-6 flex gap-2">
      <button 
        onClick={() => { resetForm(); setIsModalOpen(true); }}
        className="px-5 py-2.5 rounded-md text-white font-medium shadow-sm active:scale-[0.98] transition-all flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        <span>Add Purchase Entry</span>
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

      <ImageOcrUploader
        onTextExtracted={handleOcrResult}
        className={`px-4 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 font-medium rounded-md transition-all shadow-sm flex items-center gap-2 active:scale-[0.98]`}
      />

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
              <p className="text-sm text-slate-600 mb-4">Copy the prompt below and paste it into ChatGPT, Claude, or any AI along with an image of your Sauda Purchase table. It will generate a CSV file in the exact format required for upload.</p>
              
              <div className="relative group">
                <pre className="bg-slate-50 border border-slate-200 text-slate-800 text-sm p-4 rounded-xl whitespace-pre-wrap font-mono leading-relaxed h-[300px] overflow-y-auto">
{`Please extract the data from the attached image of the "MATERIAL PURCHASE" or "BALANCE PENDING INCOMING (SAUDA PURCHASE)" table and convert it into a strictly formatted CSV.

Instructions:
1. Use EXACTLY these 14 column headers in this exact order for the first row:
MAIN HEADING, DATE, MATERIAL, PARTY NAME, QUANTITY IN MT, RATE/MT IN RS, TCS, BHADA, LANDING COST, GST, GROSS RATE, NET RATE, QTY RCVD TILL DATE, BALANCE IN MT

2. Ensure all values are separated by commas.
3. If a column is empty or has a hyphen (-) in the image, output an empty string for that field. 
4. For the "MAIN HEADING" column, output the main yellow category header that applies to the row (e.g., 'IRONORE', 'COAL/SID', 'Steam Coal/ Gasifire', 'DOLOCHAR/COAL', 'Dolomite', etc.).
5. Do not include any subtotal rows or main category headers as independent data rows. Only include the actual entry rows with the party names.
6. Make sure numeric values like quantities and rates do not have commas in them (e.g., use 1000.00 instead of 1,000.00).
7. Output ONLY the raw CSV text inside a code block, without any extra explanations or greetings.`}
                </pre>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`Please extract the data from the attached image of the "MATERIAL PURCHASE" or "BALANCE PENDING INCOMING (SAUDA PURCHASE)" table and convert it into a strictly formatted CSV.\n\nInstructions:\n1. Use EXACTLY these 14 column headers in this exact order for the first row:\nMAIN HEADING, DATE, MATERIAL, PARTY NAME, QUANTITY IN MT, RATE/MT IN RS, TCS, BHADA, LANDING COST, GST, GROSS RATE, NET RATE, QTY RCVD TILL DATE, BALANCE IN MT\n\n2. Ensure all values are separated by commas.\n3. If a column is empty or has a hyphen (-) in the image, output an empty string for that field. \n4. For the "MAIN HEADING" column, output the main yellow category header that applies to the row (e.g., 'IRONORE', 'COAL/SID', 'Steam Coal/ Gasifire', 'DOLOCHAR/COAL', 'Dolomite', etc.).\n5. Do not include any subtotal rows or main category headers as independent data rows. Only include the actual entry rows with the party names.\n6. Make sure numeric values like quantities and rates do not have commas in them (e.g., use 1000.00 instead of 1,000.00).\n7. Output ONLY the raw CSV text inside a code block, without any extra explanations or greetings.`);
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {editingId ? 'Edit Sauda Purchase' : 'Add New Sauda Purchase'}
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
              }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                
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
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Party Name</label>
                  <input type="text" value={form.partyName} onChange={(e) => setForm(prev => ({ ...prev, partyName: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm uppercase focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="e.g. HINDUSTAN DHAATU LTD." />
                </div>
                
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Quantity in MT</label>
                  <div className="relative">
                    <input type="number" step="any" min="0" value={form.orderQuantity} onChange={(e) => setForm(prev => ({ ...prev, orderQuantity: e.target.value }))} className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0.000" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">MT</span>
                  </div>
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Rate/MT in Rs</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                    <input type="number" step="any" min="0" value={form.rateMt} onChange={(e) => setForm(prev => ({ ...prev, rateMt: e.target.value }))} className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0" />
                  </div>
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">TCS</label>
                  <input type="number" step="any" min="0" value={form.tcs} onChange={(e) => setForm(prev => ({ ...prev, tcs: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">BHADA</label>
                  <input type="number" step="any" min="0" value={form.bhada} onChange={(e) => setForm(prev => ({ ...prev, bhada: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Landing Cost Incl. Cess & Bhada</label>
                  <input type="number" step="any" min="0" value={form.landingCost} onChange={(e) => setForm(prev => ({ ...prev, landingCost: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">GST</label>
                  <input type="number" step="any" min="0" value={form.gst} onChange={(e) => setForm(prev => ({ ...prev, gst: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Gross Rate</label>
                  <input type="number" step="any" min="0" value={form.grossRate} onChange={(e) => setForm(prev => ({ ...prev, grossRate: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Net Rate</label>
                  <input type="number" step="any" min="0" value={form.netRate} onChange={(e) => setForm(prev => ({ ...prev, netRate: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block transition-colors text-indigo-900/60 group-focus-within:text-indigo-600">Qty. Received To Till Date</label>
                  <input type="number" step="any" min="0" value={form.qtyReceived} onChange={(e) => setForm(prev => ({ ...prev, qtyReceived: e.target.value }))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm text-right focus:border-indigo-400 focus:ring-indigo-500/10" placeholder="0" />
                </div>
                <div className="group">
                  <label className="text-xs uppercase tracking-wider font-bold mb-2 block text-emerald-600">Balance in MT</label>
                  <input type="text" readOnly value={formatNumber(calculatedValues.balPending)} className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold cursor-not-allowed shadow-sm text-right" />
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
                <th className="px-2 py-1.5 break-words border border-slate-400">Material</th>
                <th className="px-2 py-1.5 min-w-[160px] border border-slate-400">Party Name</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Quantity in MT</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Rate/MT in Rs</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">TCS</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">BHADA</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Landing Cost Incl. Cess & Bhada</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">GST</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Gross Rate</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Net Rate</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Qty. Received To Till Date</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Balance in MT</th>
                <th className="px-2 py-1.5 text-center print:hidden border border-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {itemsToRender.length === 0 ? (
                <tr>
                  <td colSpan="14" className="py-12 text-center bg-slate-50/50">
                    <div className="flex flex-col justify-center items-center gap-2 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <p className="text-slate-500 font-medium">No purchase entries to display.</p>
                    </div>
                  </td>
                </tr>
              ) : Object.entries(groupedEntries).map(([mainHeadingName, groupItems], groupIdx) => {
                
                // Calculate group subtotals
                const subOrder = groupItems.reduce((sum, i) => sum + (Number(i.orderQuantity) || 0), 0)
                const subReceived = groupItems.reduce((sum, i) => sum + (Number(i.qtyReceived) || 0), 0)
                const subBal = groupItems.reduce((sum, i) => sum + (Number(i.balPending) || 0), 0)

                return (
                  <React.Fragment key={`group-${groupIdx}`}>
                    {/* Group Header Row */}
                    <tr className="bg-slate-50">
                      <td colSpan="14" className="px-2 py-1.5 text-left font-bold text-slate-800 text-[11px] uppercase tracking-widest text-indigo-600 border border-slate-400">
                        {mainHeadingName}
                      </td>
                    </tr>
                    
                    {/* Item Rows */}
                    {groupItems.map((item) => (
                      
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-700">{new Date(item.date).toLocaleDateString('en-GB')}</td>
                    <td className="border border-slate-400 px-2 py-1.5 font-medium text-slate-900 uppercase">{item.itemName}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-slate-700 uppercase">{item.partyName}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{formatNumber(item.orderQuantity)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{item.rateMt || '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{item.tcs || '0'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{item.bhada || '0'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{item.landingCost || '0'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{item.gst || '0'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{item.grossRate || '0'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{item.netRate || '0'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{formatNumber(item.qtyReceived)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-slate-800 bg-slate-50/50">{formatNumber(item.balPending)}</td>
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
                    <tr className="font-semibold text-slate-800 bg-slate-100">
                      <td colSpan="3" className="px-2 py-1.5 text-right text-[11px] uppercase tracking-wider text-slate-600 border border-slate-400">TOTAL {mainHeadingName} PURCHASE</td>
                      <td className="px-2 py-1.5 text-right border border-slate-400">{formatNumber(subOrder)}</td>
                      <td className="border border-slate-400"></td>
                      <td className="border border-slate-400"></td>
                      <td className="border border-slate-400"></td>
                      <td className="border border-slate-400"></td>
                      <td className="border border-slate-400"></td>
                      <td className="border border-slate-400"></td>
                      <td className="border border-slate-400"></td>
                      <td className="px-2 py-1.5 text-right border border-slate-400">{formatNumber(subReceived)}</td>
                      <td className="px-2 py-1.5 text-right text-slate-900 font-bold border border-slate-400">{formatNumber(subBal)}</td>
                      <td className="border border-slate-400"></td>
                    </tr>
                    
                    {/* Subtotal Verification Row */}
                    {(() => {
                      const expectedSubBal = subOrder - subReceived;
                      const isCorrect = Math.abs(expectedSubBal - subBal) < 0.001;
                      return (
                        <tr className={isCorrect ? "bg-emerald-50/40" : "bg-rose-50/40"}>
                          <td colSpan="7" className={`border border-slate-400 px-2 py-1 text-right text-[10px] font-semibold italic ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isCorrect ? 'Calculation Verified' : 'Calculation Mismatch'}
                          </td>
                          <td className={`border border-slate-400 px-2 py-1 text-right font-bold text-[10px] ${isCorrect ? 'text-emerald-700 bg-emerald-100/50' : 'text-rose-600 bg-rose-100/50'}`}>
                            {isCorrect ? 'Correct' : `Expected: ${formatNumber(expectedSubBal)}`}
                          </td>
                          <td colSpan="6" className="border border-slate-400"></td>
                        </tr>
                      );
                    })()}
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
    <div className="space-y-6 pb-10 px-2 sm:px-4 w-full text-slate-800">
      
      {/* Top Banner (Modern Gradient) */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 rounded p-4 sm:p-5 mb-6 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-28 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-28 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        
        <div className="z-10 text-center sm:text-left mb-3 sm:mb-0">
          <p className="text-emerald-100 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Module</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sauda Purchase</h1>
        </div>
      </div>

      <FilterBar 
        searchQuery={search} 
        setSearchQuery={setSearch} 
        selectedDate={headerDate} 
        setSelectedDate={setHeaderDate} 
      />

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
                onClick={async () => {
                  setIsLoading(true)
                  const payloads = csvPreview.map(item => ({
                    date: item.date,
                    main_heading: item.mainHeading,
                    item_name: item.itemName,
                    size_mm: item.sizeMm || null,
                    party_name: item.partyName,
                    order_quantity: Number(item.orderQuantity) || 0,
                    rate_mt: Number(item.rateMt) || 0,
                    qty_received: Number(item.qtyReceived) || 0,
                    bal_pending: Number(item.balPending) || 0,
                    broker: item.broker || null,
                    delivery_terms: item.deliveryTerms || null,
                    payment_condition: item.paymentCondition || null,
                    reference_name: item.referenceName || null,
                    remarks: item.remarks || null,
                  }))

                  const { error } = await supabase.from('sauda_purchase').insert(payloads)
                  if (error) {
                    showToast('Failed to save bulk data to table', 'error')
                  } else {
                    setCsvPreview([])
                    showToast('Data saved to table successfully.')
                    await fetchPurchaseEntries()
                  }
                  setIsLoading(false)
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
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Balance Pending Incoming (Sauda Purchase)</h2>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>
        {renderTable(filteredEntries, false)}
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

export default SaudaPurchase