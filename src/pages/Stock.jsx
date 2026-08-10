import React, { useEffect, useMemo, useState } from 'react'
import { useStockStore } from '../store/useStore'
import { FileUploader } from '../components/FileUploader'
import { CsvDropzone } from '../components/CsvDropzone'

const initialForm = {
  category: '',
  material: '',
  openingStock: '',
  inward: '',
  consumption: '',
  crushing: '',
  fines3: '',
  fines3Qty: '',
  production: '',
  dispatch: '',
  closingStock: '',
  unit: 'ton',
  remarks: '',
}

const categoryOptions = [
  { value: '', label: 'RAW IRON ORE' },
  { value: 'rawPelletOre', label: 'RAW PELLET ORE' },
  { value: 'processedIronOre', label: 'PROCESSED IRON ORE (3-18)' },
  { value: 'ironFines', label: 'IRON FINES (0-3)' },
]

const unitOptions = ['kg', 'ton', 'mt', 'pcs', 'bag', 'packet']

const validateForm = ({ material, openingStock, unit }) => {
  if (!material.trim()) return 'Material name is required.'
  if (!openingStock || Number(openingStock) < 0) return 'Opening stock must be 0 or greater.'
  if (!unit) return 'Unit is required.'
  return ''
}

const formatNumber = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0.000'
  return Number(value).toFixed(3)
}

const parsePercentValue = (value) => {
  if (value === undefined || value === null) return 0
  const stringValue = String(value).replace('%', '').trim()
  return stringValue === '' ? 0 : Number(stringValue) || 0
}

const formatPercentValue = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0%'
  return `${Number(value).toFixed(3)}%`
}

const getCategoryLabel = (category) => {
  const found = categoryOptions.find(opt => opt.value === category)
  return found ? found.label : category
}

const Stock = () => {
  const items = useStockStore((state) => state.items)
  const addItem = useStockStore((state) => state.addItem)
  const updateItem = useStockStore((state) => state.updateItem)
  const deleteItem = useStockStore((state) => state.deleteItem)

  const [form, setForm] = useState(initialForm)
  const [rows, setRows] = useState([initialForm])
  const [rowsCategory, setRowsCategory] = useState('')
  const [attachments, setAttachments] = useState([])
  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(initialForm)
  const [search, setSearch] = useState('')
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState('raw_material')

  const [coalRows, setCoalRows] = useState([{ material: '', openingStock: '', inward: '', consumption: '', fc: '', moistLossPct: '3.5%', moistLossQty: '', landedCost: '', closingStock: '' }])
  const [coalCategory, setCoalCategory] = useState('COAL DETAILS')

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  // Filter items based on search
  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    let filtered = items.filter((item) => {
      const isCoal = item.type === 'coal_detail'
      if (activeTab === 'coal_detail' && !isCoal) return false
      if (activeTab === 'raw_material' && isCoal) return false

      return item.material.toLowerCase().includes(normalized) ||
             item.category.toLowerCase().includes(normalized)
    })
    
    // Sort by Category, then by Material
    return filtered.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return a.material.localeCompare(b.material)
    })
  }, [items, search, activeTab])

  const resetForm = () => {
    setForm(initialForm)
    setAttachments([])
    setSelectedId(null)
    setError('')
  }

  const resetRows = () => {
    setRows([initialForm])
    setAttachments([])
    setError('')
  }

  const addRow = () => setRows((s) => ([...s, { ...initialForm, category: rowsCategory }]))

  const removeRow = (idx) => setRows((s) => s.filter((_, i) => i !== idx))

  const updateRow = (idx, key, value) => {
    setRows((s) => s.map((r, i) => {
      if (i !== idx) return r
      const newRow = { ...r, [key]: value }
      
      // Auto-calculation for Fines Qty and Closing Stock
      if (['openingStock', 'inward', 'consumption', 'fines3', 'fines3Qty', 'production', 'dispatch'].includes(key)) {
        let op = Number(newRow.openingStock) || 0
        let inw = Number(newRow.inward) || 0
        let cons = Number(newRow.consumption) || 0
        let finesPct = parsePercentValue(newRow.fines3) / 100
        let finesQ = Number(newRow.fines3Qty) || 0
        let prod = Number(newRow.production) || 0
        let dis = Number(newRow.dispatch) || 0

        if ((key === 'fines3' || key === 'consumption') && finesPct > 0 && finesPct < 1 && cons > 0) {
            finesQ = (cons / (1 - finesPct)) * finesPct
            newRow.fines3Qty = finesQ.toFixed(3)
        } else if (key === 'fines3Qty') {
            finesQ = Number(value) || 0
        }

        let closing = op + inw - cons - finesQ + prod - dis
        newRow.closingStock = closing.toFixed(3)
      }

      return newRow
    }))
  }

  const handleCsvUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').map(l => l.trim()).filter(l => l)
      
      const newRows = []
      let currentCategory = rowsCategory || ''

      let startIndex = 0
      if (lines.length > 0 && lines[0].toLowerCase().includes('material')) {
        startIndex = 1
      }

      for (let i = startIndex; i < lines.length; i++) {
        // Handle basic CSV splitting
        const columns = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        
        // If row is a TOTAL row, skip it
        if (columns[0] && columns[0].toLowerCase().includes('total')) {
           continue
        }

        // Subheading detection: If only the first column has text and others are empty/zero
        const hasDataInOtherCols = columns.slice(1).some(c => c && c !== '0' && c !== '0.00' && c !== '0.000')
        if (columns[0] && !hasDataInOtherCols && !columns[0].match(/^[0-9.-]+$/)) {
           currentCategory = columns[0]
           continue
        }
        
        if (columns.length >= 2 && columns[0]) {
          newRows.push({
            ...initialForm,
            category: currentCategory,
            material: columns[0] || '',
            openingStock: columns[1] || '0',
            inward: columns[2] || '0',
            consumption: columns[3] || '0',
            crushing: columns[4] || '0%',
            fines3: columns[5] || '0%',
            fines3Qty: columns[6] || '0',
            production: columns[7] || '0',
            dispatch: columns[8] || '0',
            closingStock: columns[9] || '0',
          })
        }
      }
      
      if (newRows.length > 0) {
        setRows(newRows)
        setToast({ type: 'success', message: `Imported ${newRows.length} rows from CSV.` })
      } else {
        setToast({ type: 'error', message: 'No valid data found in CSV.' })
      }
    }
    reader.readAsText(file)
    e.target.value = '' 
  }

  const handleCoalCsvUpload = (e) => {
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
        
        // Skip header and totals
        if (columns[0] && (columns[0].toUpperCase() === 'MATERIAL' || columns[0].toUpperCase().includes('TOTAL'))) {
          continue
        }
        
        if (columns[0]) {
          newRows.push({
            material: columns[0] || '',
            openingStock: columns[1] || '0',
            inward: columns[2] || '0',
            consumption: columns[3] || '0',
            fc: columns[4] || '-',
            moistLossPct: columns[5] || '0%',
            moistLossQty: columns[6] || '0',
            landedCost: columns[7] || '0',
            closingStock: columns[8] || '0',
          })
        }
      }
      
      if (newRows.length > 0) {
        setCoalRows(newRows)
        setToast({ type: 'success', message: `Imported ${newRows.length} coal rows from CSV.` })
      } else {
        setToast({ type: 'error', message: 'No valid data found in CSV.' })
      }
    }
    reader.readAsText(file)
    e.target.value = '' 
  }

  const addCoalRow = () => setCoalRows((s) => ([...s, { material: '', openingStock: '', inward: '', consumption: '', fc: '', moistLossPct: '3.5%', moistLossQty: '', landedCost: '', closingStock: '' }]))
  const removeCoalRow = (idx) => setCoalRows((s) => s.filter((_, i) => i !== idx))
  
  const updateCoalRow = (idx, key, value) => {
    setCoalRows((s) => s.map((r, i) => {
      if (i !== idx) return r
      const newRow = { ...r, [key]: value }
      if (['openingStock', 'inward', 'consumption'].includes(key)) {
        let op = Number(newRow.openingStock) || 0
        let inw = Number(newRow.inward) || 0
        let cons = Number(newRow.consumption) || 0
        let closing = op + inw - cons
        newRow.closingStock = closing.toFixed(3)
      }
      return newRow
    }))
  }

  const handleSaveCoalRows = (e) => {
    e.preventDefault()
    for (let i = 0; i < coalRows.length; i++) {
      const r = coalRows[i]
      if (!r.material) continue
      const preparedItem = {
        id: crypto.randomUUID(),
        type: 'coal_detail',
        category: coalCategory || 'COAL DETAILS',
        material: r.material,
        openingStock: Number(r.openingStock) || 0,
        inward: Number(r.inward) || 0,
        consumption: Number(r.consumption) || 0,
        fc: r.fc || '',
        moistLossPct: r.moistLossPct || '',
        moistLossQty: Number(r.moistLossQty) || 0,
        landedCost: Number(r.landedCost) || 0,
        closingStock: Number(r.closingStock) || 0,
        reportDate,
        updatedAt: new Date().toISOString(),
      }
      addItem(preparedItem)
    }
    setCoalRows([{ material: '', openingStock: '', inward: '', consumption: '', fc: '', moistLossPct: '3.5%', moistLossQty: '', landedCost: '', closingStock: '' }])
    setToast({ type: 'success', message: 'Coal items saved successfully!' })
  }

  const handleSaveRows = (e) => {
    e.preventDefault()
    for (let i = 0; i < rows.length; i++) {
      const validationError = validateForm(rows[i])
      if (validationError) {
        setError(`Row ${i + 1}: ${validationError}`)
        return
      }
    }

    rows.forEach((r) => {
      const preparedItem = {
        category: r.category || rowsCategory || '',
        material: r.material.trim(),
        openingStock: Number(r.openingStock) || 0,
        inward: Number(r.inward) || 0,
        consumption: Number(r.consumption) || 0,
        crushing: r.crushing || '0%',
        fines3: parsePercentValue(r.fines3),
        fines3Qty: Number(r.fines3Qty) || 0,
        production: Number(r.production) || 0,
        dispatch: Number(r.dispatch) || 0,
        closingStock: Number(r.closingStock) || 0,
        unit: r.unit,
        remarks: r.remarks ? r.remarks.trim() : '',
        attachments,
        reportDate,
        updatedAt: new Date().toISOString(),
      }
      addItem(preparedItem)
    })

    setToast({ type: 'success', message: `${rows.length} stock row(s) added.` })
    resetRows()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const validationError = validateForm(form)
    if (validationError) {
      setError(validationError)
      return
    }

    const preparedItem = {
      category: form.category,
      material: form.material.trim(),
      openingStock: Number(form.openingStock) || 0,
      inward: Number(form.inward) || 0,
      consumption: Number(form.consumption) || 0,
      crushing: form.crushing || '0%',
      fines3: parsePercentValue(form.fines3),
      fines3Qty: Number(form.fines3Qty) || 0,
      production: Number(form.production) || 0,
      dispatch: Number(form.dispatch) || 0,
      closingStock: Number(form.closingStock) || 0,
      unit: form.unit,
      remarks: form.remarks.trim(),
      attachments,
      reportDate,
      updatedAt: new Date().toISOString(),
    }

    if (selectedId) {
      updateItem(selectedId, preparedItem)
      setToast({ type: 'success', message: 'Stock entry updated successfully.' })
    } else {
      addItem(preparedItem)
      setToast({ type: 'success', message: 'Stock entry added successfully.' })
    }

    resetForm()
  }

  const handleEdit = (item) => {
    setEditForm(item)
    setEditingId(item.id)
    setError('')
  }

  const handleSaveInline = () => {
    if (!editForm.material.trim()) return showToast('Material name is required', 'error')
    
    // Auto calculate closing
    let op = Number(editForm.openingStock) || 0
    let inw = Number(editForm.inward) || 0
    let cons = Number(editForm.consumption) || 0
    let finesPct = parsePercentValue(editForm.fines3) / 100
    let finesQ = Number(editForm.fines3Qty) || 0
    let prod = Number(editForm.production) || 0
    let dis = Number(editForm.dispatch) || 0
    if (finesPct > 0 && finesPct < 1 && cons > 0 && !editForm.fines3Qty) {
        finesQ = (cons / (1 - finesPct)) * finesPct
        editForm.fines3Qty = finesQ.toFixed(3)
    }
    let closing = op + inw - cons - finesQ + prod - dis
    editForm.closingStock = closing.toFixed(3)

    updateItem(editingId, editForm)
    setToast({ type: 'success', message: 'Stock entry updated inline.' })
    setEditingId(null)
  }
  const handleCancelInline = () => setEditingId(null)

  const handleDelete = (id) => {
    if (window.confirm('Delete this stock entry?')) {
      deleteItem(id)
      setToast({ type: 'success', message: 'Stock entry removed.' })
    }
  }

  // --- Helper to Group and Calculate Totals ---
  const groupedAndTotals = useMemo(() => {
    const groups = {}
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = {
          label: getCategoryLabel(item.category),
          rows: [],
          totals: { opening: 0, inward: 0, consumption: 0, fines3: 0, fines3Qty: 0, production: 0, dispatch: 0, closing: 0, moistLossQty: 0, landedCost: 0 }
        }
      }
      groups[item.category].rows.push(item)
      
      // Aggregate totals for the Category
      groups[item.category].totals.opening += Number(item.openingStock) || 0
      groups[item.category].totals.inward += Number(item.inward) || 0
      groups[item.category].totals.consumption += Number(item.consumption) || 0
      groups[item.category].totals.fines3 += Number(item.fines3) || 0
      groups[item.category].totals.fines3Qty += Number(item.fines3Qty) || 0
      groups[item.category].totals.production += Number(item.production) || 0
      groups[item.category].totals.dispatch += Number(item.dispatch) || 0
      groups[item.category].totals.closing += Number(item.closingStock) || 0
      
      groups[item.category].totals.moistLossQty += Number(item.moistLossQty) || 0
      groups[item.category].totals.landedCost += Number(item.landedCost) || 0
    })
    return groups
  }, [filteredItems])

  return (
    <div className="space-y-6 pb-10 px-2 sm:px-4 max-w-6xl mx-auto">
      
      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-400 pt-2">
        <button 
          onClick={() => setActiveTab('raw_material')}
          className={`pb-3 px-1 text-[15px] font-semibold border-b-2 transition-colors ${activeTab === 'raw_material' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-400'}`}
        >
          Raw Material Stock (NSPL)
        </button>
        <button 
          onClick={() => setActiveTab('coal_detail')}
          className={`pb-3 px-1 text-[15px] font-semibold border-b-2 transition-colors ${activeTab === 'coal_detail' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-400'}`}
        >
          Coal Detail
        </button>
      </div>

      {activeTab === 'raw_material' ? (
        <>
          {/* Top Form Section - Premium Theme */}
      <div className="bg-white border border-slate-400/80 rounded-[1.5rem] p-5 sm:p-7 shadow-sm relative overflow-hidden">
        {/* Subtle background gradient accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-1.5 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              Stock Management
            </p>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">'Add New Stock Item'</h2>
          </div>
          <div className="flex items-center gap-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Report Date</label>
              <input 
                type="date" 
                value={reportDate} 
                onChange={(e) => setReportDate(e.target.value)} 
                className="px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all shadow-sm" 
              />
            </div>
            {selectedId && (
              <button
                onClick={resetForm}
                className="px-5 py-2.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-all duration-300 self-end"
                type="button"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {selectedId ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Edit existing single item (keep old layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            <div>
              <label className="form-label text-xs font-medium text-slate-700 block mb-1" htmlFor="category">Category (Main Heading)</label>
              <input
                id="category"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-400 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                placeholder="Enter category"
              />
            </div>
            <div>
              <label className="form-label text-xs font-medium text-slate-700 block mb-1" htmlFor="material">Material Name</label>
              <input
                id="material"
                value={form.material}
                onChange={(e) => setForm((prev) => ({ ...prev, material: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-400 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                placeholder="Ex. Iron Ore (10-40)"
              />
            </div>
            <div>
              <label className="form-label text-xs font-medium text-slate-700 block mb-1" htmlFor="unit">Unit</label>
              <select
                id="unit"
                value={form.unit}
                onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-400 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
            <div>
              <label className="form-label text-xs text-slate-500 block mb-1" htmlFor="openingStock">Opening</label>
              <input
                id="openingStock"
                type="text"
                inputMode="decimal"
                value={form.openingStock}
                onChange={(e) => setForm((prev) => ({ ...prev, openingStock: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-400 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition text-xs"
                placeholder="0"
              />
            </div>
            <div>
              <label className="form-label text-xs text-slate-500 block mb-1" htmlFor="inward">Inward</label>
              <input
                id="inward"
                type="text"
                inputMode="decimal"
                value={form.inward}
                onChange={(e) => setForm((prev) => ({ ...prev, inward: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-400 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition text-xs"
                placeholder="0"
              />
            </div>
            <div>
              <label className="form-label text-xs text-slate-500 block mb-1" htmlFor="consumption">Cons</label>
              <input
                id="consumption"
                type="text"
                inputMode="decimal"
                value={form.consumption}
                onChange={(e) => setForm((prev) => ({ ...prev, consumption: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-400 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition text-xs"
                placeholder="0"
              />
            </div>
            <div>
              <label className="form-label text-xs text-slate-500 block mb-1" htmlFor="crushing">Crushing Screen (+3)</label>
              <input
                id="crushing"
                value={form.crushing}
                onChange={(e) => setForm((prev) => ({ ...prev, crushing: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-400 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition text-xs"
                placeholder="0%"
              />
            </div>
            <div>
              <label className="form-label text-xs text-slate-500 block mb-1" htmlFor="fines3">Fines(-3%)</label>
              <input
                id="fines3"
                type="text"
                inputMode="decimal"
                value={form.fines3}
                onChange={(e) => setForm((prev) => ({ ...prev, fines3: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-400 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition text-xs"
                placeholder="0%"
              />
            </div>
            <div>
              <label className="form-label text-xs text-slate-500 block mb-1" htmlFor="fines3Qty">Fines(-3)Qty</label>
              <input
                id="fines3Qty"
                type="text"
                inputMode="decimal"
                value={form.fines3Qty}
                onChange={(e) => setForm((prev) => ({ ...prev, fines3Qty: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-400 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition text-xs"
                placeholder="0"
              />
            </div>
            <div>
              <label className="form-label text-xs text-slate-500 block mb-1" htmlFor="production">Prod</label>
              <input
                id="production"
                type="text"
                inputMode="decimal"
                value={form.production}
                onChange={(e) => setForm((prev) => ({ ...prev, production: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-400 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition text-xs"
                placeholder="0"
              />
            </div>
            <div>
              <label className="form-label text-xs text-slate-500 block mb-1" htmlFor="dispatch">Dis</label>
              <input
                id="dispatch"
                type="text"
                inputMode="decimal"
                value={form.dispatch}
                onChange={(e) => setForm((prev) => ({ ...prev, dispatch: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-400 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition text-xs"
                placeholder="0"
              />
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-2">
              <label className="form-label text-xs text-slate-500 block mb-1" htmlFor="closingStock">Closing Stock</label>
              <input
                id="closingStock"
                type="text"
                inputMode="decimal"
                value={form.closingStock}
                onChange={(e) => setForm((prev) => ({ ...prev, closingStock: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-400 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 items-end">
            <div>
              <label className="form-label text-xs text-slate-500 block mb-1" htmlFor="remarks">Remarks</label>
              <textarea
                id="remarks"
                rows="2"
                value={form.remarks}
                onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-400 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition resize-none"
                placeholder="Optional notes"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div>
                <p className="text-xs text-slate-500 mb-2">Attach Documents</p>
                <FileUploader
                  files={attachments}
                  onChange={setAttachments}
                  onError={(message) => setToast({ type: 'error', message })}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white font-medium rounded-md transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                  {selectedId ? 'Update Stock' : 'Add Stock'}
                </button>
                <button type="button" onClick={resetForm} className="px-8 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-all duration-300">
                  Reset
                </button>
              </div>
            </div>
          </div>

        </form>
        ) : (
        <form onSubmit={handleSaveRows} className="space-y-6">
          {/* Multi-row layout for adding many rows */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50/50 rounded border border-slate-100">
            <div className="w-full sm:w-1/3">
              <label className="form-label text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Category (Main Heading)</label>
              <input value={rowsCategory} onChange={(e) => setRowsCategory(e.target.value)} placeholder="e.g. RAW IRON ORE" className="w-full px-4 py-2.5 bg-white border border-slate-400 shadow-sm rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-300" />
            </div>
            <div className="flex items-end mt-0 sm:mt-[22px]">
              <button type="button" onClick={() => setRows((s) => s.map(r => ({ ...r, category: rowsCategory })))} className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-md transition-all duration-300 border border-indigo-100 shadow-sm active:scale-95">Apply to all rows</button>
            </div>
          </div>
          
          <div className="overflow-hidden pb-4 -mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="min-w-[1050px] flex flex-col gap-1.5 mt-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <div className="col-span-2">Material</div>
                <div className="col-span-1 text-center">Opening</div>
                <div className="col-span-1 text-center">Inward</div>
                <div className="col-span-1 text-center">Cons</div>
                <div className="col-span-1 text-center">Crushing</div>
                <div className="col-span-1 text-center">Fines%</div>
                <div className="col-span-1 text-center">FinesQty</div>
                <div className="col-span-1 text-center">Prod</div>
                <div className="col-span-1 text-center">Dis</div>
                <div className="col-span-2 flex justify-between px-1">
                  <span>Closing</span>
                  <span>Action</span>
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {rows.map((r, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center px-4 py-2 bg-white relative group">
                    <div className="col-span-2">
                      <input value={r.material} onChange={(e) => updateRow(idx, 'material', e.target.value)} placeholder="Material" className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs" />
                    </div>
                    <div className="col-span-1">
                      <input value={r.openingStock} onChange={(e) => updateRow(idx, 'openingStock', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-center" />
                    </div>
                    <div className="col-span-1">
                      <input value={r.inward} onChange={(e) => updateRow(idx, 'inward', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-center" />
                    </div>
                    <div className="col-span-1">
                      <input value={r.consumption} onChange={(e) => updateRow(idx, 'consumption', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-center" />
                    </div>
                    <div className="col-span-1">
                      <input value={r.crushing} onChange={(e) => updateRow(idx, 'crushing', e.target.value)} placeholder="0%" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-center" />
                    </div>
                    <div className="col-span-1">
                      <input value={r.fines3} onChange={(e) => updateRow(idx, 'fines3', e.target.value)} placeholder="0%" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-center" />
                    </div>
                    <div className="col-span-1">
                      <input value={r.fines3Qty} onChange={(e) => updateRow(idx, 'fines3Qty', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-center" />
                    </div>
                    <div className="col-span-1">
                      <input value={r.production} onChange={(e) => updateRow(idx, 'production', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-center" />
                    </div>
                    <div className="col-span-1">
                      <input value={r.dispatch} onChange={(e) => updateRow(idx, 'dispatch', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-center" />
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-1">
                      <input value={r.closingStock} onChange={(e) => updateRow(idx, 'closingStock', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-center font-semibold text-indigo-700" />
                      <button type="button" onClick={() => removeRow(idx)} className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" title="Remove Row">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <button type="button" onClick={addRow} className="px-5 py-2.5 bg-white border border-slate-400 shadow-sm hover:shadow hover:border-slate-400 text-slate-700 font-medium rounded-md transition-all duration-300 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Row
            </button>
            
            <CsvDropzone
              onUpload={handleCsvUpload}
              className="px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-sm text-emerald-700 font-medium rounded-md transition-all duration-300 flex items-center gap-1 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Upload CSV
            </CsvDropzone>

            <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white shadow-md hover:shadow-lg font-medium rounded-md transition-all duration-300 transform hover:-translate-y-0.5 ml-auto">Save All</button>
            <button type="button" onClick={resetRows} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-md transition-all duration-300">Reset</button>
          </div>
        </form>
        )}

          {error && <p className="text-xs text-rose-500 mt-2">{error}</p>}
      </div>
      </>
      ) : (
        <div className="bg-white border border-slate-400/80 rounded-[1.5rem] p-5 sm:p-7 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 mb-6">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                </svg>
                Coal Management
              </p>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Add Coal Detail</h2>
            </div>
          </div>

          <form onSubmit={handleSaveCoalRows} className="space-y-4">
            <div className="bg-slate-50/50 p-1 rounded-md border border-slate-100 shadow-sm">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Category (Main Heading)</label>
              <input value={coalCategory} onChange={(e) => setCoalCategory(e.target.value)} placeholder="e.g. COAL DETAILS" className="w-full sm:w-1/3 px-4 py-2.5 bg-white border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all text-xs shadow-sm" />
            </div>

            <div className="overflow-hidden pb-4 -mx-4 sm:mx-0 px-4 sm:px-0 mt-4">
              <div className="min-w-[950px] flex flex-col gap-1.5">
                <div className="grid grid-cols-12 gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <div className="col-span-2">Material</div>
                  <div className="col-span-1 text-center">Opening</div>
                  <div className="col-span-1 text-center">Inward</div>
                  <div className="col-span-1 text-center">Cons</div>
                  <div className="col-span-1 text-center">F/C</div>
                  <div className="col-span-1 text-center">Moist%</div>
                  <div className="col-span-1 text-center">MoistQty</div>
                  <div className="col-span-1 text-center">LandedCost</div>
                  <div className="col-span-3 flex justify-between px-1">
                    <span>Closing</span>
                    <span>Action</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {coalRows.map((r, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1.5 items-center px-4 py-2 bg-white relative group">
                      <div className="col-span-2">
                        <input value={r.material} onChange={(e) => updateCoalRow(idx, 'material', e.target.value)} placeholder="Material" className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs" />
                      </div>
                      <div className="col-span-1">
                        <input value={r.openingStock} onChange={(e) => updateCoalRow(idx, 'openingStock', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-center" />
                      </div>
                      <div className="col-span-1">
                        <input value={r.inward} onChange={(e) => updateCoalRow(idx, 'inward', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-center" />
                      </div>
                      <div className="col-span-1">
                        <input value={r.consumption} onChange={(e) => updateCoalRow(idx, 'consumption', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-center" />
                      </div>
                      <div className="col-span-1">
                        <input value={r.fc} onChange={(e) => updateCoalRow(idx, 'fc', e.target.value)} placeholder="-" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-center" />
                      </div>
                      <div className="col-span-1">
                        <input value={r.moistLossPct} onChange={(e) => updateCoalRow(idx, 'moistLossPct', e.target.value)} placeholder="0%" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-center" />
                      </div>
                      <div className="col-span-1">
                        <input value={r.moistLossQty} onChange={(e) => updateCoalRow(idx, 'moistLossQty', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-center" />
                      </div>
                      <div className="col-span-1">
                        <input value={r.landedCost} onChange={(e) => updateCoalRow(idx, 'landedCost', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-center" />
                      </div>
                      <div className="col-span-3 flex items-center justify-between gap-1">
                        <input value={r.closingStock} onChange={(e) => updateCoalRow(idx, 'closingStock', e.target.value)} placeholder="0" inputMode="decimal" className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-center font-semibold text-emerald-700" />
                        <button type="button" onClick={() => removeCoalRow(idx)} className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" title="Remove Row">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <button type="button" onClick={addCoalRow} className="px-5 py-2.5 bg-white border border-slate-400 shadow-sm hover:shadow hover:border-slate-400 text-slate-700 font-medium rounded-md transition-all duration-300 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Row
              </button>
              <CsvDropzone
                onUpload={handleCoalCsvUpload}
                className="px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm hover:shadow hover:bg-emerald-100 font-medium rounded-md transition-all duration-300 flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload CSV
              </CsvDropzone>
              <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-md hover:shadow-lg font-medium rounded-md transition-all duration-300 transform hover:-translate-y-0.5 ml-auto">Save Coal Detail</button>
            </div>
          </form>
        </div>
      )}

      {/* Table Section - Exact Grid Layout with Category Headers */}
      <div className="bg-white border border-slate-400 rounded p-1 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-[0.24em]">Inventory List</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-800">Stock Items</h2>
          </div>
          <div className="flex flex-wrap gap-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="px-4 py-2 bg-slate-50 border border-slate-400 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition text-xs w-full sm:w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {Object.keys(groupedAndTotals).length === 0 ? (
            <p className="text-center py-8 text-slate-500">No stock items found. Use the form above to add data.</p>
          ) : (
            <table className="w-full text-xs text-left border-collapse border border-slate-400 [&_th]:border [&_th]:border-slate-400 [&_td]:border [&_td]:border-slate-400">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-3 py-1.5 break-words">Material</th>
                  <th className="px-3 py-1.5 text-right break-words">Opening Stock</th>
                  <th className="px-3 py-1.5 text-right break-words">Inward</th>
                  <th className="px-3 py-1.5 text-right break-words">Cons.</th>
                  {activeTab === 'raw_material' ? (
                    <>
                      <th className="px-3 py-1.5 text-right break-words">Crushing/ Screen (+3)</th>
                      <th className="px-3 py-1.5 text-right break-words">Fines(-3) %</th>
                      <th className="px-3 py-1.5 text-right break-words">Fines(-3) Qty.</th>
                      <th className="px-3 py-1.5 text-right break-words">Prod.</th>
                      <th className="px-3 py-1.5 text-right break-words">Dis.</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-1.5 text-right break-words">F/C</th>
                      <th className="px-3 py-1.5 text-right break-words">Moist.%</th>
                      <th className="px-3 py-1.5 text-right break-words">Moist.Qty</th>
                      <th className="px-3 py-1.5 text-right break-words">Landed Cost</th>
                    </>
                  )}
                  <th className="px-3 py-1.5 text-right break-words">Closing Stock</th>
                  <th className="px-3 py-1.5 text-center break-words">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(groupedAndTotals).map((categoryKey) => {
                  const group = groupedAndTotals[categoryKey]
                  return (
                    <React.Fragment key={categoryKey}>
                      {/* 1. CATEGORY MAIN HEADER */}
                      <tr className="bg-slate-50/50 border-y border-slate-100">
                        <td colSpan={activeTab === 'raw_material' ? "11" : "10"} className="px-6 py-3 font-bold text-slate-800 text-[11px] uppercase tracking-widest text-indigo-600">
                          {group.label}
                        </td>
                      </tr>

                      {/* 2. DATA ROWS */}
                      {group.rows.map((item) => (
                        
                        <tr key={item.id} className="bg-white hover:bg-slate-50/80 transition-colors group">
                          {editingId === item.id ? (
                            <>
                              <td className="px-3 py-1.5 text-slate-800 font-medium break-words">
                                <input value={editForm.material} onChange={e => setEditForm({...editForm, material: e.target.value})} className="w-full border rounded px-1 py-0.5 text-xs focus:outline-none" />
                              </td>
                              <td className="px-3 py-1.5"><input type="number" value={editForm.openingStock} onChange={e => setEditForm({...editForm, openingStock: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                              <td className="px-3 py-1.5"><input type="number" value={editForm.inward} onChange={e => setEditForm({...editForm, inward: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                              <td className="px-3 py-1.5"><input type="number" value={editForm.consumption} onChange={e => setEditForm({...editForm, consumption: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                              {activeTab === 'raw_material' ? (
                                <>
                                  <td className="px-3 py-1.5"><input type="text" value={editForm.crushing} onChange={e => setEditForm({...editForm, crushing: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                                  <td className="px-3 py-1.5"><input type="text" value={editForm.fines3} onChange={e => setEditForm({...editForm, fines3: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                                  <td className="px-3 py-1.5"><input type="number" value={editForm.fines3Qty} onChange={e => setEditForm({...editForm, fines3Qty: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                                  <td className="px-3 py-1.5"><input type="number" value={editForm.production} onChange={e => setEditForm({...editForm, production: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                                  <td className="px-3 py-1.5"><input type="number" value={editForm.dispatch} onChange={e => setEditForm({...editForm, dispatch: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-1.5"><input type="text" value={editForm.fc} onChange={e => setEditForm({...editForm, fc: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                                  <td className="px-3 py-1.5"><input type="text" value={editForm.moistLossPct} onChange={e => setEditForm({...editForm, moistLossPct: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                                  <td className="px-3 py-1.5"><input type="number" value={editForm.moistLossQty} onChange={e => setEditForm({...editForm, moistLossQty: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                                  <td className="px-3 py-1.5"><input type="number" value={editForm.landedCost} onChange={e => setEditForm({...editForm, landedCost: e.target.value})} className="w-full text-right border rounded px-1 py-0.5 text-xs focus:outline-none" /></td>
                                </>
                              )}
                              <td className="px-3 py-1.5 text-slate-800 text-right font-semibold bg-slate-50">{formatNumber(((Number(editForm.openingStock)||0) + (Number(editForm.inward)||0) - (Number(editForm.consumption)||0) - (Number(editForm.fines3Qty)||0) + (Number(editForm.production)||0) - (Number(editForm.dispatch)||0)))}</td>
                              <td className="px-3 py-1.5 text-center align-middle bg-white">
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
                              <td className="px-3 py-1.5 text-slate-800 font-medium break-words">
                                {item.material}
                              </td>
                              <td className="px-3 py-1.5 text-slate-600 text-right">{formatNumber(item.openingStock)}</td>
                              <td className="px-3 py-1.5 text-slate-600 text-right">{formatNumber(item.inward)}</td>
                              <td className="px-3 py-1.5 text-slate-600 text-right">{formatNumber(item.consumption)}</td>
                              {activeTab === 'raw_material' ? (
                                <>
                                  <td className="px-3 py-1.5 text-slate-600 text-right">{item.crushing || '0%'}</td>
                                  <td className="px-3 py-1.5 text-slate-600 text-right">{formatPercentValue(item.fines3)}</td>
                                  <td className="px-3 py-1.5 text-slate-600 text-right">{formatNumber(item.fines3Qty)}</td>
                                  <td className="px-3 py-1.5 text-slate-600 text-right">{formatNumber(item.production)}</td>
                                  <td className="px-3 py-1.5 text-slate-600 text-right">{formatNumber(item.dispatch)}</td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-1.5 text-slate-600 text-right">{item.fc || '-'}</td>
                                  <td className="px-3 py-1.5 text-slate-600 text-right">{item.moistLossPct || '0%'}</td>
                                  <td className="px-3 py-1.5 text-slate-600 text-right">{formatNumber(item.moistLossQty)}</td>
                                  <td className="px-3 py-1.5 text-slate-600 text-right">{formatNumber(item.landedCost)}</td>
                                </>
                              )}
                              <td className="px-3 py-1.5 text-slate-800 text-right font-semibold">{formatNumber(item.closingStock)}</td>
                              <td className="px-3 py-1.5 text-center">
                                <div className="flex justify-center gap-1 transition-opacity">
                                    <button onClick={() => handleEdit(item)} className="p-1.5 rounded transition-colors text-blue-500 hover:bg-blue-50" title="Edit">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors" title="Delete">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}

                      {/* 3. CATEGORY TOTALS ROW */}
                      <tr className="bg-slate-50/50 font-semibold text-slate-700 border-t border-slate-100">
                        <td className="px-3 py-1.5 break-words text-[11px] uppercase tracking-wider text-slate-500">Total {group.label}</td>
                        <td className="px-3 py-1.5 text-right">{formatNumber(group.totals.opening)}</td>
                        <td className="px-3 py-1.5 text-right">{formatNumber(group.totals.inward)}</td>
                        <td className="px-3 py-1.5 text-right">{formatNumber(group.totals.consumption)}</td>
                        {activeTab === 'raw_material' ? (
                          <>
                            <td className="px-3 py-1.5 text-right"></td>
                            <td className="px-3 py-1.5 text-right">{formatNumber(group.totals.fines3)}</td>
                            <td className="px-3 py-1.5 text-right">{formatNumber(group.totals.fines3Qty)}</td>
                            <td className="px-3 py-1.5 text-right">{formatNumber(group.totals.production)}</td>
                            <td className="px-3 py-1.5 text-right">{formatNumber(group.totals.dispatch)}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-1.5 text-right"></td>
                            <td className="px-3 py-1.5 text-right"></td>
                            <td className="px-3 py-1.5 text-right">{formatNumber(group.totals.moistLossQty)}</td>
                            <td className="px-3 py-1.5 text-right">{formatNumber(group.totals.landedCost)}</td>
                          </>
                        )}
                        <td className="px-3 py-1.5 text-right text-slate-800 font-bold">{formatNumber(group.totals.closing)}</td>
                        <td className="px-3 py-1.5 text-center"></td>
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed right-4 bottom-4 z-50 rounded px-2 py-1.5 sm:px-5 sm:py-4 shadow-lg border max-w-[90%] sm:max-w-md ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-rose-500 text-white border-rose-600'}`}>
          <p className="text-xs font-semibold">{toast.message}</p>
        </div>
      )}
    </div>
  )
}

export default Stock
