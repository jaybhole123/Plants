import React, { useState, useMemo } from 'react'
import { useSaudaPurchaseStore } from '../store/useStore'
import { CsvDropzone } from '../components/CsvDropzone'

const initialForm = {
  date: new Date().toISOString().split('T')[0],
  itemName: '',
  partyName: '',
  orderQuantity: '',
  rateMt: '',
  prvPending: '',
  qtyDisptch: '',
  balPending: '',
  broker: '',
  deliveryTerms: '',
  remarks: '',
  average: '',
}

const formatNumber = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0.000'
  return Number(value).toFixed(3)
}

const SaudaPurchase = () => {
  const [headerDate, setHeaderDate] = useState(new Date().toISOString().split('T')[0])
  const { entries, setEntries } = useSaudaPurchaseStore()
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(initialForm)
  const [toast, setToast] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])

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
    const prv = Number(form.prvPending) || 0
    const dispatch = Number(form.qtyDisptch) || 0
    
    const balPending = (order + prv) - dispatch

    return { balPending }
  }, [form.orderQuantity, form.prvPending, form.qtyDisptch])

  // --- Form Submit Handler ---
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.partyName.trim() || !form.itemName.trim()) {
      showToast('Item Name and Party Name are required.', 'error')
      return
    }

    const newEntry = {
      ...form,
      balPending: calculatedValues.balPending,
    }

    if (false) {
    } else {
      setEntries(prev => [...prev, { ...newEntry, id: Date.now() }])
      showToast('Purchase entry added successfully.')
    }
    resetForm()
  }

  const handleEdit = (id) => {
    const item = entries.find(i => i.id === id)
    if (item) {
      setEditForm(item)
      setEditingId(id)
    }
  }

  const handleSaveInline = () => {
    if (!editForm.partyName.trim() || !editForm.itemName.trim()) {
      showToast('Item Name and Party Name are required.', 'error')
      return
    }
    const order = Number(editForm.orderQuantity) || 0
    const prv = Number(editForm.prvPending) || 0
    const dispatch = Number(editForm.qtyDisptch) || 0
    const balPending = (order + prv) - dispatch

    const updatedEntry = {
      ...editForm,
      balPending
    }

    setEntries(prev => prev.map(item => item.id === editingId ? { ...updatedEntry, id: item.id } : item))
    showToast('Purchase entry updated successfully.')
    setEditingId(null)
  }

  const handleCancelInline = () => {
    setEditingId(null)
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this sauda entry?')) {
      setEntries(prev => prev.filter(item => item.id !== id))
      showToast('Purchase entry removed.')
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
        const partyName = columns[2] || ''
        
        if (partyName && partyName.toUpperCase() !== 'PARTY NAME') {
          newRows.push({
            id: Date.now() + i + Math.random(),
            date: date,
            itemName: itemName,
            partyName: partyName,
            orderQuantity: columns[3] || '0',
            rateMt: columns[4] || '0',
            prvPending: columns[5] || '0',
            qtyDisptch: columns[6] || '0',
            balPending: columns[7] || '0',
            broker: columns[8] || '',
            deliveryTerms: columns[9] || '',
            remarks: columns[10] || '',
            average: columns[11] || '',
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

  // --- Render Form Section (White Theme) ---
  const renderForm = () => (
    <div className="bg-white border border-slate-100 rounded p-6 sm:p-8 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex items-center gap-1.5 mb-6 border-b border-slate-100 pb-5">
        <div className="w-10 h-10 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
        </div>
        <h3 className="text-xl font-bold text-slate-800">
          'Add New Purchase Entry'
        </h3>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Item's Name</label>
          <input type="text" value={form.itemName} onChange={(e) => setForm(prev => ({ ...prev, itemName: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200" placeholder="Iron Ore" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Party Name</label>
          <input type="text" value={form.partyName} onChange={(e) => setForm(prev => ({ ...prev, partyName: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200" placeholder="Hindustan Dhaatu Ltd." />
        </div>
        
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Order Quantity</label>
          <input type="number" step="any" min="0" value={form.orderQuantity} onChange={(e) => setForm(prev => ({ ...prev, orderQuantity: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200" placeholder="1000" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Rate/MT.</label>
          <input type="number" step="any" min="0" value={form.rateMt} onChange={(e) => setForm(prev => ({ ...prev, rateMt: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200" placeholder="8500" />
        </div>
        
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Prv. Pending</label>
          <input type="number" step="any" min="0" value={form.prvPending} onChange={(e) => setForm(prev => ({ ...prev, prvPending: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200" placeholder="0" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Qty. Disptch</label>
          <input type="number" step="any" min="0" value={form.qtyDisptch} onChange={(e) => setForm(prev => ({ ...prev, qtyDisptch: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200" placeholder="0" />
        </div>

        {/* Auto-calculated fields */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-emerald-600 font-semibold mb-1.5 block">Bal. Pending (Auto)</label>
          <input type="text" readOnly value={formatNumber(calculatedValues.balPending)} className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-md text-emerald-700 text-xs font-semibold cursor-not-allowed" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Average</label>
          <input type="text" value={form.average} onChange={(e) => setForm(prev => ({ ...prev, average: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200" placeholder="e.g. Comp." />
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Broker</label>
          <input type="text" value={form.broker} onChange={(e) => setForm(prev => ({ ...prev, broker: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200" placeholder="R.K. Broker" />
        </div>
        <div className="md:col-span-2">
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Delivery Terms</label>
          <input type="text" value={form.deliveryTerms} onChange={(e) => setForm(prev => ({ ...prev, deliveryTerms: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200" placeholder="F.O.R. Plant" />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Remarks</label>
          <input type="text" value={form.remarks} onChange={(e) => setForm(prev => ({ ...prev, remarks: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200" placeholder="Any remarks..." />
        </div>

        <div className="col-span-full flex flex-wrap gap-1.5 pt-4 border-t border-slate-100 mt-2">
          <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-all shadow-sm shadow-indigo-500/20 active:scale-[0.98]">
            'Add Entry'
          </button>

          <CsvDropzone
            onUpload={handleCsvUpload}
            disabled={csvPreview.length > 0}
            className={`px-5 py-2.5 bg-white hover:bg-emerald-50 border border-slate-400 text-emerald-600 hover:border-emerald-200 hover:text-emerald-700 font-medium rounded-md transition-all shadow-sm flex items-center gap-1 active:scale-[0.98] ${csvPreview.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="hidden sm:inline">Upload CSV</span>
          </CsvDropzone>

          <button type="button" onClick={resetForm} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-md transition-all active:scale-[0.98]">
            Reset
          </button>
        </div>
      </form>
    </div>
  )

  // --- Render Table Section ---
  const renderTable = (itemsToRender, isPreview = false) => {
    if (itemsToRender.length === 0) {
      return (
        <div className="py-12 text-center bg-slate-50/50 rounded border border-dashed border-slate-400">
          <div className="flex flex-row justify-center items-center gap-2 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-slate-500 font-medium">No purchase entries to display.</p>
          </div>
        </div>
      )
    }

    // Group entries by itemName
    const groupedEntries = itemsToRender.reduce((acc, curr) => {
      const name = curr.itemName || 'Unknown'
      if (!acc[name]) acc[name] = []
      acc[name].push(curr)
      return acc
    }, {})

    return (
      <div className="overflow-hidden bg-white border border-slate-400 rounded shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                <th className="px-2 py-1.5 break-words border border-slate-400">Date</th>
                <th className="px-2 py-1.5 break-words border border-slate-400">Material Name</th>
                <th className="px-2 py-1.5 min-w-[160px] border border-slate-400">Party Name</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Order Qty.</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Rate/MT.</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Prv. Pending</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Qty. Disptch</th>
                <th className="px-2 py-1.5 text-right border border-slate-400">Bal. Pending</th>
                <th className="px-2 py-1.5 min-w-[90px] border border-slate-400">Broker</th>
                <th className="px-2 py-1.5 min-w-[80px] border border-slate-400">Terms of Delivery</th>
                <th className="px-2 py-1.5 min-w-[80px] border border-slate-400">Remark</th>
                <th className="px-2 py-1.5 text-center print:hidden border border-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {Object.entries(groupedEntries).map(([itemName, groupItems], groupIdx) => {
                
                // Calculate group subtotals
                const subOrder = groupItems.reduce((sum, i) => sum + (Number(i.orderQuantity) || 0), 0)
                const subPrv = groupItems.reduce((sum, i) => sum + (Number(i.prvPending) || 0), 0)
                const subDispatch = groupItems.reduce((sum, i) => sum + (Number(i.qtyDisptch) || 0), 0)
                const subBal = groupItems.reduce((sum, i) => sum + (Number(i.balPending) || 0), 0)

                return (
                  <React.Fragment key={`group-${groupIdx}`}>
                    {/* Group Header Row */}
                    <tr className="bg-slate-50">
                      <td colSpan="12" className="px-2 py-1.5 text-left font-bold text-slate-800 text-[11px] uppercase tracking-widest text-indigo-600 border border-slate-400">
                        {itemName}
                      </td>
                    </tr>
                    
                    {/* Item Rows */}
                    {groupItems.map((item) => (
                      
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                {editingId === item.id ? (
                  <>
                    <td className="border border-slate-400 px-2 py-1 text-center"><input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"/></td>
                    <td className="border border-slate-400 px-2 py-1"><input type="text" value={editForm.itemName} onChange={e => setEditForm({...editForm, itemName: e.target.value})} className="w-full border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none uppercase" placeholder="ITEM" /></td>
                    <td className="border border-slate-400 px-2 py-1"><input type="text" value={editForm.partyName} onChange={e => setEditForm({...editForm, partyName: e.target.value})} className="w-full border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none uppercase" placeholder="PARTY" /></td>
                    <td className="border border-slate-400 px-2 py-1 text-center"><input type="number" value={editForm.orderQuantity} onChange={e => setEditForm({...editForm, orderQuantity: e.target.value})} className="w-20 border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="QTY" /></td>
                    <td className="border border-slate-400 px-2 py-1 text-center"><input type="number" value={editForm.rateMt} onChange={e => setEditForm({...editForm, rateMt: e.target.value})} className="w-16 border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" /></td>
                    <td className="border border-slate-400 px-2 py-1 text-center"><input type="number" value={editForm.prvPending} onChange={e => setEditForm({...editForm, prvPending: e.target.value})} className="w-20 border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" /></td>
                    <td className="border border-slate-400 px-2 py-1 text-center"><input type="number" value={editForm.qtyDisptch} onChange={e => setEditForm({...editForm, qtyDisptch: e.target.value})} className="w-20 border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" /></td>
                    <td className="border border-slate-400 px-2 py-1 text-center font-bold text-slate-800 bg-slate-50">{formatNumber(((Number(editForm.orderQuantity)||0) + (Number(editForm.prvPending)||0)) - (Number(editForm.qtyDisptch)||0))}</td>
                    <td className="border border-slate-400 px-2 py-1 text-center"><input type="text" value={editForm.broker} onChange={e => setEditForm({...editForm, broker: e.target.value})} className="w-20 border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" /></td>
                    <td className="border border-slate-400 px-2 py-1 text-center"><input type="text" value={editForm.deliveryTerms} onChange={e => setEditForm({...editForm, deliveryTerms: e.target.value})} className="w-20 border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" /></td>
                    <td className="border border-slate-400 px-2 py-1 text-center"><input type="text" value={editForm.remarks} onChange={e => setEditForm({...editForm, remarks: e.target.value})} className="w-full border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" /></td>
                    <td className="border border-slate-400 px-2 py-1 text-center bg-white align-middle">
                      <div className="flex flex-row justify-center items-center gap-1.5 transition-opacity">
                        <button onClick={handleSaveInline} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Save">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button onClick={handleCancelInline} className="p-1 text-rose-500 hover:bg-rose-50 rounded" title="Cancel">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-700">{new Date(item.date).toLocaleDateString('en-GB')}</td>
                    <td className="border border-slate-400 px-2 py-1.5 font-medium text-slate-900 uppercase">{item.itemName}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-slate-700 uppercase">{item.partyName}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{formatNumber(item.orderQuantity)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{item.rateMt || '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{formatNumber(item.prvPending)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{formatNumber(item.qtyDisptch)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-slate-800 bg-slate-50/50">{formatNumber(item.balPending)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-600">{item.broker || '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-600">{item.deliveryTerms || '-'}</td>
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
                  </>
                )}
              </tr>

                    ))}

                    {/* Subtotal Row */}
                    <tr className="font-semibold text-slate-700 bg-slate-50/50">
                      <td colSpan="3" className="px-2 py-1.5 text-right text-[11px] uppercase tracking-wider text-slate-500 border border-slate-400">Subtotal</td>
                      <td className="px-2 py-1.5 text-right border border-slate-400">{formatNumber(subOrder)}</td>
                      <td className="px-2 py-1.5 border border-slate-400"></td>
                      <td className="px-2 py-1.5 text-right border border-slate-400">{formatNumber(subPrv)}</td>
                      <td className="px-2 py-1.5 text-right border border-slate-400">{formatNumber(subDispatch)}</td>
                      <td className="px-2 py-1.5 text-right text-slate-800 font-bold border border-slate-400">{formatNumber(subBal)}</td>
                      <td colSpan="4" className="border border-slate-400"></td>
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
    <div className="space-y-6 pb-10 px-2 sm:px-4 w-full max-w-[1200px] mx-auto text-slate-800">
      
      {/* Top Banner (Modern Gradient) */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 rounded p-6 sm:p-8 mb-8 shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-center justify-between text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-28 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-28 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        
        <div className="z-10 text-center sm:text-left mb-4 sm:mb-0">
          <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">Module</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Sauda Purchase</h1>
        </div>
        
        <div className="z-10 flex flex-col items-center sm:items-end">
          <label className="text-emerald-100 text-[10px] uppercase tracking-wider font-semibold mb-1">Report Date</label>
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
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Balance Pending Incoming (Sauda Purchase)</h2>
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

export default SaudaPurchase