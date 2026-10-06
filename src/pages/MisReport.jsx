import React, { useState, useMemo, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  useStockStore,
  useProductionStore,
  useProduction2Store
} from '../store/useStore'
import { FilterBar } from '../components/FilterBar'

const formatNumber = (value) => {
  if (value === undefined || value === null || isNaN(Number(value))) return '0.000'
  return Math.round(Number(value)).toFixed(3)
}

const MisReport = () => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [search, setSearch] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const reportRef = useRef(null)

  const [hiddenRows, setHiddenRows] = useState(new Set())
  const handleHideRow = (key) => setHiddenRows(prev => new Set([...prev, key]))

  const HideButton = ({ rowKey }) => (
    <button 
      onClick={() => handleHideRow(rowKey)} 
      className="absolute right-1 top-1/2 -translate-y-1/2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity print:hidden cursor-pointer z-10"
      title="Hide Row"
      data-html2canvas-ignore="true"
      contentEditable={false}
    >
      ✕
    </button>
  )

  // Get data from all stores
  const [stockItems, setStockItems] = useState([])
  
  const [incomingList, setIncomingList] = useState([])
  const [outgoingList, setOutgoingList] = useState([])
  const [saudaSaleEntries, setSaudaSaleEntries] = useState([])
  const [saudaPurchaseEntries, setSaudaPurchaseEntries] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Raw Material Stock
      const { data: rawData } = await supabase
        .from('raw_material_stock')
        .select('*')
        .gte('created_at', `${reportDate}T00:00:00+05:30`)
        .lte('created_at', `${reportDate}T23:59:59+05:30`)
        
      // Fetch Coal Stock
      const { data: coalData } = await supabase
        .from('coal_stock')
        .select('*')
        .gte('created_at', `${reportDate}T00:00:00+05:30`)
        .lte('created_at', `${reportDate}T23:59:59+05:30`)

      let mappedStocks = []
      if (rawData) {
        mappedStocks = [...mappedStocks, ...rawData.map(item => ({
          type: 'raw_material',
          category: item.category,
          material: item.material,
          closingStock: item.closing_stock
        }))]
      }
      if (coalData) {
        mappedStocks = [...mappedStocks, ...coalData.map(item => ({
          type: 'coal_detail',
          category: item.category,
          material: item.material,
          closingStock: item.closing_stock
        }))]
      }
      setStockItems(mappedStocks)

      // Fetch item transfers
      const { data: transfers, error: transferError } = await supabase
        .from('item_transfers')
        .select('*')
        .gte('created_at', `${reportDate}T00:00:00+05:30`)
        .lte('created_at', `${reportDate}T23:59:59+05:30`)
        
      if (!transferError && transfers) {
        const incoming = transfers.filter(d => d.entry_type === 'incoming').map(item => ({
          id: item.id,
          partyName: item.party_name,
          materialName: item.material_name,
          vehicleNo: item.vehicle_no,
          qty: item.qty,
          rate: item.rate
        }))
        const outgoing = transfers.filter(d => d.entry_type === 'outgoing').map(item => ({
          id: item.id,
          partyName: item.party_name,
          materialName: item.material_name,
          vehicleNo: item.vehicle_no,
          qty: item.qty,
          rate: item.rate
        }))
        setIncomingList(incoming)
        setOutgoingList(outgoing)
      }

      // Fetch Sauda Sale
      const { data: saleData } = await supabase.from('sauda_sale').select('*')
      if (saleData) {
        setSaudaSaleEntries(saleData.map(item => ({
          mainHeading: item.main_heading,
          itemName: item.item_name,
          balPending: item.bal_pending
        })))
      }

      // Fetch Sauda Purchase
      const { data: purchaseData } = await supabase.from('sauda_purchase').select('*')
      if (purchaseData) {
        setSaudaPurchaseEntries(purchaseData.map(item => ({
          mainHeading: item.main_heading,
          itemName: item.item_name,
          balPending: item.bal_pending
        })))
      }
    }
    fetchData()
  }, [reportDate])

  const production2FilesData = useProduction2Store(state => state.filesData)

  // 1. STOCK AGGREGATION — split into Raw Material and Coal Detail
  const rawMaterialSummary = useMemo(() => {
    const summary = {}
    const categoryLabels = {
      '': 'RAW IRON ORE',
      'rawPelletOre': 'RAW PELLET ORE',
      'processedIronOre': 'PROCESSED IRON ORE (3-18)',
      'ironFines': 'IRON FINES (0-3)'
    }
    stockItems.forEach(item => {
      if (item.type === 'coal_detail') return // skip coal
      
      const mat = (item.material || '').toUpperCase().trim()
      const catVal = (item.category || '').toUpperCase().trim()
      const specialMats = ['SPONGE PELLET', 'DOLOMITE', 'NON MAG', 'SPONGE IRON']
      const isSpecial = specialMats.find(sm => mat.includes(sm) || catVal.includes(sm))

      if (isSpecial) {
        const key = isSpecial === 'NON MAG' ? 'NON MAG (CHAR + DOLOCHAR)' : isSpecial
        summary[key] = (summary[key] || 0) + (Number(item.closingStock) || 0)
      } else {
        let cat = item.category === undefined ? 'UNKNOWN' : item.category
        if (categoryLabels[cat] !== undefined) cat = categoryLabels[cat]
        let key = cat.toUpperCase().trim() || 'RAW IRON ORE'
        
        // Merge DRCLO IRON S.A into PROCESSED IRON ORE
        if (key.includes('DRCLO IRON')) {
          key = 'PROCESSED IRON ORE (3-18)'
        }
        
        summary[key] = (summary[key] || 0) + (Number(item.closingStock) || 0)
      }
    })
    return summary
  }, [stockItems])

  const coalStockSummary = useMemo(() => {
    const summary = {}
    stockItems.forEach(item => {
      if (item.type !== 'coal_detail') return // only coal
      
      const mat = (item.material || '').toUpperCase().trim()
      const catVal = (item.category || '').toUpperCase().trim()
      const specialMats = ['SPONGE PELLET', 'DOLOMITE', 'NON MAG', 'SPONGE IRON']
      const isSpecial = specialMats.find(sm => mat.includes(sm) || catVal.includes(sm))

      if (isSpecial) {
        const key = isSpecial === 'NON MAG' ? 'NON MAG (CHAR + DOLOCHAR)' : isSpecial
        summary[key] = (summary[key] || 0) + (Number(item.closingStock) || 0)
      } else {
        const key = 'COAL'
        summary[key] = (summary[key] || 0) + (Number(item.closingStock) || 0)
      }
    })

    let coalTotal = 0
    const finalSummary = {}
    
    const coalIdentifiers = [
      'COAL',
      'KOHINOOR',
      'LOYAL TRADING',
      'JBT(JAGANNATHPUR)',
      'SUNSHINE ENTE'
    ];

    Object.entries(summary).forEach(([key, val]) => {
      const isCoalType = coalIdentifiers.some(identifier => key.includes(identifier));
      if (isCoalType) {
        if (val > 0) {
          coalTotal += val
        }
      } else {
        finalSummary[key] = val
      }
    })
    
    const orderedSummary = {}
    if (coalTotal > 0) {
      orderedSummary['COAL'] = coalTotal
    }
    Object.assign(orderedSummary, finalSummary)

    return orderedSummary
  }, [stockItems])

  // 2. INCOMING AGGREGATION
  const incomingSummary = useMemo(() => {
    const summary = {}
    incomingList.forEach(item => {
      const material = item.materialName?.toUpperCase().trim() || 'UNKNOWN'
      summary[material] = (summary[material] || 0) + (Number(item.qty) || 0)
    })
    return summary
  }, [incomingList])

  // 3. OUTGOING AGGREGATION
  const outgoingSummary = useMemo(() => {
    const summary = {}
    outgoingList.forEach(item => {
      const material = item.materialName?.toUpperCase().trim() || 'UNKNOWN'
      summary[material] = (summary[material] || 0) + (Number(item.qty) || 0)
    })
    return summary
  }, [outgoingList])

  // 4. PRODUCTION AGGREGATION
  const productionSummary = useMemo(() => {
    // Track raw totals and the most recent percent per grade key
    const rawData = {
      '"A" GRADE': { k1: 0, k2: 0, total: 0, percent: null },
      '"B" GRADE': { k1: 0, k2: 0, total: 0, percent: null },
    }

    production2FilesData.forEach(f => {
      f.items.forEach(item => {
        const label = item.label.toUpperCase().trim()
        let gradeKey = null
        if (label.includes('"A" GRADE')) gradeKey = '"A" GRADE'
        else if (label.includes('"B" GRADE')) gradeKey = '"B" GRADE'

        if (gradeKey) {
          rawData[gradeKey].k1 += Number(item.kiln1) || 0
          rawData[gradeKey].k2 += Number(item.kiln2) || 0
          rawData[gradeKey].total += Number(item.total) || 0
          // Use most recent percent (overwrite each file so last file wins)
          if (item.percent !== null && item.percent !== undefined) {
            rawData[gradeKey].percent = item.percent
          }
        }
      })
    })

    // Build final summary with dynamic percentage label
    const summary = {}
    Object.entries(rawData).forEach(([gradeKey, val]) => {
      if (val.total > 0 || val.k1 > 0 || val.k2 > 0) {
        const pct = val.percent !== null ? `${val.percent}%` : ''
        const finalLabel = pct ? `${gradeKey} (${pct})` : gradeKey
        summary[finalLabel] = { k1: val.k1, k2: val.k2, total: val.total }
      }
    })

    return summary
  }, [production2FilesData])

  // Calculate totals for production
  const prodTotalK1 = Object.values(productionSummary).reduce((sum, val) => sum + val.k1, 0)
  const prodTotalK2 = Object.values(productionSummary).reduce((sum, val) => sum + val.k2, 0)
  const prodTotalAll = Object.values(productionSummary).reduce((sum, val) => sum + val.total, 0)


  // 5. SAUDA SALE AGGREGATION
  const saudaSaleSummary = useMemo(() => {
    const summary = {}
    saudaSaleEntries.forEach(item => {
      const material = (item.mainHeading || item.itemName)?.toUpperCase().trim() || 'UNKNOWN'
      summary[material] = (summary[material] || 0) + (Number(item.balPending) || 0)
    })
    // Convert object to array for easier rendering
    return Object.entries(summary).map(([itemName, balPending]) => ({
      itemName,
      balPending
    }))
  }, [saudaSaleEntries])

  // 6. SAUDA PURCHASE AGGREGATION
  const saudaPurchaseSummary = useMemo(() => {
    const summary = {}
    saudaPurchaseEntries.forEach(item => {
      const material = (item.mainHeading || item.itemName)?.toUpperCase().trim() || 'UNKNOWN'
      if (!summary[material]) summary[material] = 0
      summary[material] += Number(item.balPending) || 0
    })

    // Convert object to array for easier rendering
    return Object.entries(summary).map(([itemName, balPending]) => ({
      itemName,
      balPending
    }))
  }, [saudaPurchaseEntries])

  // Filtered Lists for Hiding Rows and Search
  const matchesSearch = (str) => !search || str.toLowerCase().includes(search.toLowerCase())

  const filteredRawStock = Object.entries(rawMaterialSummary).filter(([m]) => !hiddenRows.has(`rawstock-${m}`) && matchesSearch(m))
  const filteredCoalStock = Object.entries(coalStockSummary).filter(([m]) => !hiddenRows.has(`coalstock-${m}`) && matchesSearch(m))
  
  const incomingSummaryArr = Object.entries(incomingSummary).map(([material, qty]) => ({ material, qty }))
  const filteredIncoming = incomingSummaryArr.filter(item => !hiddenRows.has(`inc-${item.material}`) && matchesSearch(item.material))
  
  const outgoingSummaryArr = Object.entries(outgoingSummary).map(([material, qty]) => ({ material, qty }))
  const filteredOutgoing = outgoingSummaryArr.filter(item => !hiddenRows.has(`out-${item.material}`) && matchesSearch(item.material))
  
  const filteredProduction = Object.entries(productionSummary).filter(([m]) => !hiddenRows.has(`prod-${m}`) && matchesSearch(m))
  const prodTotalK1Filtered = filteredProduction.reduce((sum, [, val]) => sum + val.k1, 0)
  const prodTotalK2Filtered = filteredProduction.reduce((sum, [, val]) => sum + val.k2, 0)
  const prodTotalAllFiltered = filteredProduction.reduce((sum, [, val]) => sum + val.total, 0)
  
  const filteredSaudaSale = saudaSaleSummary.filter((item, idx) => !hiddenRows.has(`sale-${item.itemName || idx}`) && matchesSearch(item.itemName || ''))
  const filteredSaudaPurchase = saudaPurchaseSummary.filter((item, idx) => !hiddenRows.has(`pur-${item.itemName || idx}`) && matchesSearch(item.itemName || ''))

  // Local ordered states
  const [orderedRawStock, setOrderedRawStock] = useState(filteredRawStock)
  const [orderedCoalStock, setOrderedCoalStock] = useState(filteredCoalStock)
  const [orderedIncoming, setOrderedIncoming] = useState(filteredIncoming)
  const [orderedOutgoing, setOrderedOutgoing] = useState(filteredOutgoing)
  const [orderedProduction, setOrderedProduction] = useState(filteredProduction)
  const [orderedSaudaSale, setOrderedSaudaSale] = useState(filteredSaudaSale)
  const [orderedSaudaPurchase, setOrderedSaudaPurchase] = useState(filteredSaudaPurchase)

  useEffect(() => setOrderedRawStock(filteredRawStock), [JSON.stringify(filteredRawStock)])
  useEffect(() => setOrderedCoalStock(filteredCoalStock), [JSON.stringify(filteredCoalStock)])
  useEffect(() => setOrderedIncoming(filteredIncoming), [JSON.stringify(filteredIncoming)])
  useEffect(() => setOrderedOutgoing(filteredOutgoing), [JSON.stringify(filteredOutgoing)])
  useEffect(() => setOrderedProduction(filteredProduction), [JSON.stringify(filteredProduction)])
  useEffect(() => setOrderedSaudaSale(filteredSaudaSale), [JSON.stringify(filteredSaudaSale)])
  useEffect(() => setOrderedSaudaPurchase(filteredSaudaPurchase), [JSON.stringify(filteredSaudaPurchase)])

  const [draggedRow, setDraggedRow] = useState(null)

  const handleDragStart = (e, index, listType) => {
    setDraggedRow({ index, listType })
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e, targetIndex, listType, list, setList) => {
    e.preventDefault()
    if (!draggedRow || draggedRow.listType !== listType) return
    if (draggedRow.index === targetIndex) return

    const newList = [...list]
    const item = newList[draggedRow.index]
    newList.splice(draggedRow.index, 1)
    newList.splice(targetIndex, 0, item)
    
    setList(newList)
    setDraggedRow(null)
  }

  // Formatting date for header
  const formattedDate = new Date(reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')

  const downloadPDF = async () => {
    const element = reportRef.current
    if (!element) return

    setIsDownloading(true)
    try {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        logging: false 
      })
      
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      const imgProps = pdf.getImageProperties(imgData)
      const margin = 10
      const availableWidth = pdfWidth - (margin * 2)
      
      const imgHeight = (imgProps.height * availableWidth) / imgProps.width
      const availableHeight = pdfHeight - (margin * 2)
      
      let finalWidth = availableWidth
      let finalHeight = imgHeight
      
      if (imgHeight > availableHeight) {
        finalHeight = availableHeight
        finalWidth = (imgProps.width * availableHeight) / imgProps.height
      }
      
      const xOffset = margin + (availableWidth - finalWidth) / 2
      
      pdf.addImage(imgData, 'PNG', xOffset, margin, finalWidth, finalHeight)
      pdf.save(`Hindustan_Dhaatu_Sponge_Report_${formattedDate}.pdf`)
      
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF.")
    } finally {
      setIsDownloading(false)
    }
  }

  // UI based on image provided
  return (
    <div className="w-full my-8 pb-10 bg-white min-h-screen text-slate-800 font-sans shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded overflow-hidden border border-slate-400">
      
      {/* Date Header */}
      <div className="p-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-400 flex justify-between items-center print:hidden shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">MIS Report Settings</h1>
        <div className="flex gap-1">
          <button 
            onClick={downloadPDF} 
            disabled={isDownloading}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 shadow flex items-center gap-1 font-medium disabled:opacity-70"
          >
            {isDownloading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            )}
            Download PDF
          </button>
          {hiddenRows.size > 0 && (
            <button onClick={() => setHiddenRows(new Set())} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-md hover:bg-rose-200 shadow flex items-center gap-1 font-medium print:hidden">
              Show All Rows
            </button>
          )}
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 shadow flex items-center gap-1 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print Report
          </button>
        </div>
      </div>

      <div className="px-5 pt-5 print:hidden">
        <FilterBar 
          searchQuery={search} 
          setSearchQuery={setSearch} 
          selectedDate={reportDate} 
          setSelectedDate={setReportDate} 
        />
      </div>

      {/* The Report (Printable Area) */}
      <div className="p-1 sm:p-8" ref={reportRef}>
        <table className="w-full border-collapse border-2 border-black text-[13px] font-bold text-black bg-white">
          
          {/* Main Header */}
          <thead>
            <tr>
              <th contentEditable suppressContentEditableWarning colSpan="2" className="bg-[#FFFF00] text-black py-2 px-2 text-center font-extrabold text-[16px] border-2 border-black uppercase tracking-wide">
                HINDUSTAN DHAATU REPORT (SPONGE)
              </th>
              <th contentEditable suppressContentEditableWarning className="bg-[#FFFF00] text-black py-2 px-2 text-right font-extrabold text-[16px] border-2 border-black w-[150px]">
                {formattedDate}
              </th>
            </tr>
          </thead>
          
          <tbody>
            {/* STOCK SECTION */}
            {orderedRawStock.map(([material, qty], idx) => (
              <tr key={`rawstock-${material}`} className="group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'rawstock')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'rawstock', orderedRawStock, setOrderedRawStock)}>
                {idx === 0 && (
                  <td contentEditable suppressContentEditableWarning rowSpan={orderedRawStock.length + orderedCoalStock.length} className="font-bold border-2 border-black p-1 align-top w-[140px] uppercase">
                    STOCK
                  </td>
                )}
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 uppercase relative w-[60%]">
                  <HideButton rowKey={`rawstock-${material}`} />
                  {material}
                </td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 text-right">{formatNumber(qty)}</td>
              </tr>
            ))}
            
            {orderedCoalStock.map(([material, qty], idx) => (
              <tr key={`coalstock-${material}`} className="group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'coalstock')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'coalstock', orderedCoalStock, setOrderedCoalStock)}>
                {orderedRawStock.length === 0 && idx === 0 && (
                  <td contentEditable suppressContentEditableWarning rowSpan={orderedCoalStock.length} className="font-bold border-2 border-black p-1 align-top w-[140px] uppercase">
                    STOCK
                  </td>
                )}
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 uppercase relative w-[60%]">
                  <HideButton rowKey={`coalstock-${material}`} />
                  {material}
                </td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 text-right">{formatNumber(qty)}</td>
              </tr>
            ))}
            
            {orderedRawStock.length === 0 && orderedCoalStock.length === 0 && (
              <tr>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 align-top w-[140px] uppercase">STOCK</td>
                <td contentEditable suppressContentEditableWarning className="border-2 border-black p-1 uppercase"></td>
                <td contentEditable suppressContentEditableWarning className="border-2 border-black p-1 text-right">0.000</td>
              </tr>
            )}

            {/* SEPARATOR */}
            <tr>
              <td colSpan="3" className="border-2 border-black bg-slate-300 h-[6px]"></td>
            </tr>

            {/* YESTERDAY INCOMING MATERIALS */}
            <tr>
              <td contentEditable suppressContentEditableWarning colSpan="3" className="bg-[#FFFF00] text-black font-bold text-center p-1 border-2 border-black uppercase">
                YESTERDAY INCOMING MATERIALS
              </td>
            </tr>
            {orderedIncoming.map((item, idx) => (
              <tr key={`inc-${item.material}`} className="group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'incoming')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'incoming', orderedIncoming, setOrderedIncoming)}>
                <td contentEditable suppressContentEditableWarning colSpan="2" className="border-2 border-black p-1 font-bold uppercase relative">
                  <HideButton rowKey={`inc-${item.material}`} />
                  {item.material}
                </td>
                <td contentEditable suppressContentEditableWarning className="border-2 border-black p-1 text-right font-bold">{formatNumber(item.qty)}</td>
              </tr>
            ))}
            {orderedIncoming.length === 0 && (
              <tr>
                <td contentEditable suppressContentEditableWarning colSpan="2" className="border-2 border-black p-1 font-bold uppercase">NO INCOMING</td>
                <td contentEditable suppressContentEditableWarning className="border-2 border-black p-1 text-right font-bold">0.000</td>
              </tr>
            )}

            {/* SEPARATOR */}
            <tr>
              <td colSpan="3" className="border-2 border-black bg-slate-300 h-[6px]"></td>
            </tr>

            {/* YESTERDAY OUTGOING MATERIALS */}
            <tr>
              <td contentEditable suppressContentEditableWarning colSpan="3" className="bg-[#FFFF00] text-black font-bold text-center p-1 border-2 border-black uppercase">
                YESTERDAY OUTGOING MATERIALS
              </td>
            </tr>
            {orderedOutgoing.map((item, idx) => (
              <tr key={`out-${item.material}`} className="group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'outgoing')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'outgoing', orderedOutgoing, setOrderedOutgoing)}>
                <td contentEditable suppressContentEditableWarning colSpan="2" className="border-2 border-black p-1 font-bold uppercase relative">
                  <HideButton rowKey={`out-${item.material}`} />
                  {item.material}
                </td>
                <td contentEditable suppressContentEditableWarning className="border-2 border-black p-1 text-right font-bold">{formatNumber(item.qty)}</td>
              </tr>
            ))}
            {orderedOutgoing.length === 0 && (
              <tr>
                <td contentEditable suppressContentEditableWarning colSpan="2" className="border-2 border-black p-1 font-bold uppercase">NO OUTGOING</td>
                <td contentEditable suppressContentEditableWarning className="border-2 border-black p-1 text-right font-bold">0.000</td>
              </tr>
            )}

            {/* SEPARATOR */}
            <tr>
              <td colSpan="3" className="border-2 border-black bg-slate-300 h-[6px]"></td>
            </tr>

            {/* TOTAL PRODUCTION IN 24HR */}
            <tr>
              <td contentEditable suppressContentEditableWarning colSpan="3" className="bg-[#FFFF00] text-black font-bold text-center p-1 border-2 border-black uppercase">
                TOTAL PRODUCTION IN 24HR
              </td>
            </tr>
            {orderedProduction.map(([metric, values], idx) => {
              let gradeStr = metric.replace(/"/g, '')
              let matStr = "SPONGE IRON"
              if (gradeStr.includes(' GRADE')) {
                const parts = gradeStr.split(' GRADE')
                gradeStr = parts[0] + ' Grade'
                matStr = parts[1] || 'SPONGE IRON'
              }
              return (
                <tr key={`prod-${metric}`} className="group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'production')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'production', orderedProduction, setOrderedProduction)}>
                  <td contentEditable suppressContentEditableWarning className="border-2 border-black p-1 uppercase text-center relative w-[140px]">
                    <HideButton rowKey={`prod-${metric}`} />
                    {gradeStr}
                  </td>
                  <td contentEditable suppressContentEditableWarning className="border-2 border-black p-1 uppercase relative w-[60%]">
                    {matStr}
                  </td>
                  <td contentEditable suppressContentEditableWarning className="border-2 border-black p-1 text-right font-bold">{formatNumber(values.total)}</td>
                </tr>
              )
            })}
            {orderedProduction.length === 0 && (
              <tr>
                <td contentEditable suppressContentEditableWarning colSpan="2" className="border-2 border-black p-1 text-center font-bold uppercase">NO PRODUCTION</td>
                <td contentEditable suppressContentEditableWarning className="border-2 border-black p-1 text-right font-bold">0.000</td>
              </tr>
            )}
            {/* Total Row */}
            <tr>
              <td contentEditable suppressContentEditableWarning colSpan="2" className="border-2 border-black font-bold p-1 text-center uppercase">TOTAL</td>
              <td contentEditable suppressContentEditableWarning className="bg-[#FFFF00] border-2 border-black font-bold p-1 text-right">
                {formatNumber(prodTotalAllFiltered)}
              </td>
            </tr>

            {/* SEPARATOR */}
            <tr>
              <td colSpan="3" className="border-2 border-black bg-slate-300 h-[6px]"></td>
            </tr>

            {/* BALANCE PENDING OUTGOING (SAUDA SALE) */}
            <tr>
              <td contentEditable suppressContentEditableWarning colSpan="3" className="bg-[#FFFF00] text-black font-bold text-center p-1 border-2 border-black uppercase">
                BALANCE PENDING OUTGOING (SAUDA SALE)
              </td>
            </tr>
            {orderedSaudaSale.map((item, idx) => (
              <tr key={`sale-${item.itemName || idx}`} className="group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'saudaSale')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'saudaSale', orderedSaudaSale, setOrderedSaudaSale)}>
                <td className="border-2 border-black p-1"></td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 uppercase relative">
                  <HideButton rowKey={`sale-${item.itemName || idx}`} />
                  {item.itemName}
                </td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 text-right">{formatNumber(item.balPending)}</td>
              </tr>
            ))}
            {orderedSaudaSale.length > 0 && (
              <tr>
                <td className="border-2 border-black p-1"></td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 text-center uppercase">TOTAL</td>
                <td contentEditable suppressContentEditableWarning className="bg-[#FFFF00] border-2 border-black font-bold p-1 text-right">
                  {formatNumber(orderedSaudaSale.reduce((sum, item) => sum + Number(item.balPending), 0))}
                </td>
              </tr>
            )}
            {orderedSaudaSale.length === 0 && (
              <tr>
                <td className="border-2 border-black p-1"></td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 uppercase"></td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 text-right">0.000</td>
              </tr>
            )}

            {/* SEPARATOR */}
            <tr>
              <td colSpan="3" className="border-2 border-black bg-slate-300 h-[6px]"></td>
            </tr>

            {/* BALANCE PENDING INCOMING (SAUDA PURCHASE) */}
            <tr>
              <td contentEditable suppressContentEditableWarning colSpan="3" className="bg-[#FFFF00] text-black font-bold text-center p-1 border-2 border-black uppercase">
                BALANCE PENDING INCOMING (SAUDA PURCHASE)
              </td>
            </tr>
            {orderedSaudaPurchase.map((item, idx) => (
              <tr key={`pur-${item.itemName || idx}`} className="group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'saudaPurchase')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'saudaPurchase', orderedSaudaPurchase, setOrderedSaudaPurchase)}>
                <td className="border-2 border-black p-1"></td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 uppercase relative">
                  <HideButton rowKey={`pur-${item.itemName || idx}`} />
                  {item.itemName}
                </td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 text-right">{formatNumber(item.balPending)}</td>
              </tr>
            ))}
            {orderedSaudaPurchase.length > 0 && (
              <tr>
                <td className="border-2 border-black p-1"></td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 text-center uppercase">TOTAL</td>
                <td contentEditable suppressContentEditableWarning className="bg-[#FFFF00] border-2 border-black font-bold p-1 text-right">
                  {formatNumber(orderedSaudaPurchase.reduce((sum, item) => sum + Number(item.balPending), 0))}
                </td>
              </tr>
            )}
            {orderedSaudaPurchase.length === 0 && (
              <tr>
                <td className="border-2 border-black p-1"></td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 uppercase"></td>
                <td contentEditable suppressContentEditableWarning className="font-bold border-2 border-black p-1 text-right">0.000</td>
               </tr>
            )}

            {/* NOTES SECTION */}
            <tr>
              <td contentEditable suppressContentEditableWarning className="bg-slate-100 text-slate-800 font-bold p-1.5 border border-slate-400 uppercase tracking-wide align-top w-[120px]">
                NOTES:
              </td>
              <td contentEditable suppressContentEditableWarning colSpan="2" className="border border-slate-400 p-2 text-slate-800 font-bold text-sm min-h-[60px] align-top outline-none focus:bg-slate-50 transition-colors break-words break-all whitespace-pre-wrap max-w-[100px]" placeholder="Type your notes here...">
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MisReport
