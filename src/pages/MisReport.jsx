import React, { useState, useMemo, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  useStockStore,
  useTransferStore,
  useProductionStore,
  useProduction2Store,
  useSaudaScaleStore,
  useSaudaPurchaseStore
} from '../store/useStore'

const formatNumber = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0.000'
  return Number(value).toFixed(3)
}

const MisReport = () => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
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
  const stockItems = useStockStore(state => state.items)
  const { incomingList, outgoingList } = useTransferStore()
  const production2FilesData = useProduction2Store(state => state.filesData)
  const saudaScaleEntries = useSaudaScaleStore(state => state.entries)
  const saudaPurchaseEntries = useSaudaPurchaseStore(state => state.entries)

  // 1. STOCK AGGREGATION
  const stockSummary = useMemo(() => {
    const summary = {}
    
    const categoryLabels = {
      '': 'RAW IRON ORE',
      'rawPelletOre': 'RAW PELLET ORE',
      'processedIronOre': 'PROCESSED IRON ORE (3-18)',
      'ironFines': 'IRON FINES (0-3)'
    }

    stockItems.forEach(item => {
      let key;
      if (item.type === 'coal_detail') {
        key = item.material?.toUpperCase().trim() || 'COAL MATERIAL'
      } else {
        let cat = item.category === undefined ? 'UNKNOWN' : item.category
        if (categoryLabels[cat] !== undefined) {
          cat = categoryLabels[cat]
        }
        key = cat.toUpperCase().trim() || 'RAW IRON ORE'
      }

      summary[key] = (summary[key] || 0) + (Number(item.closingStock) || 0)
    })
    return summary
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
    saudaScaleEntries.forEach(item => {
      const material = (item.mainHeading || item.itemName)?.toUpperCase().trim() || 'UNKNOWN'
      summary[material] = (summary[material] || 0) + (Number(item.balPending) || 0)
    })
    // Convert object to array for easier rendering
    return Object.entries(summary).map(([itemName, balPending]) => ({
      itemName,
      balPending
    }))
  }, [saudaScaleEntries])

  // 6. SAUDA PURCHASE AGGREGATION
  const saudaPurchaseSummary = useMemo(() => {
    const summary = {}
    saudaPurchaseEntries.forEach(item => {
      const material = (item.mainHeading || item.itemName)?.toUpperCase().trim() || 'UNKNOWN'
      if (!summary[material]) summary[material] = 0
      summary[material] += Number(item.balPending) || 0
    })

    // Merge all COAL variants into a single "COAL" row
    let coalTotal = 0
    const nonCoalSummary = {}
    Object.entries(summary).forEach(([key, val]) => {
      if (key.includes('COAL')) {
        coalTotal += val
      } else {
        nonCoalSummary[key] = val
      }
    })
    if (coalTotal > 0) {
      nonCoalSummary['COAL'] = coalTotal
    }
    
    // Convert object to array for easier rendering
    return Object.entries(nonCoalSummary).map(([itemName, balPending]) => ({
      itemName,
      balPending
    }))
  }, [saudaPurchaseEntries])

  // Filtered Lists for Hiding Rows
  const filteredStock = Object.entries(stockSummary).filter(([m]) => !hiddenRows.has(`stock-${m}`))
  const filteredIncoming = incomingList.filter((item, idx) => !hiddenRows.has(`inc-${item.id || idx}`))
  const filteredOutgoing = outgoingList.filter((item, idx) => !hiddenRows.has(`out-${item.id || idx}`))
  const filteredProduction = Object.entries(productionSummary).filter(([m]) => !hiddenRows.has(`prod-${m}`))
  const prodTotalK1Filtered = filteredProduction.reduce((sum, [, val]) => sum + val.k1, 0)
  const prodTotalK2Filtered = filteredProduction.reduce((sum, [, val]) => sum + val.k2, 0)
  const prodTotalAllFiltered = filteredProduction.reduce((sum, [, val]) => sum + val.total, 0)
  const filteredSaudaSale = saudaSaleSummary.filter((item, idx) => !hiddenRows.has(`sale-${item.itemName || idx}`))
  const filteredSaudaPurchase = saudaPurchaseSummary.filter((item, idx) => !hiddenRows.has(`pur-${item.itemName || idx}`))

  // Local ordered states
  const [orderedStock, setOrderedStock] = useState(filteredStock)
  const [orderedIncoming, setOrderedIncoming] = useState(filteredIncoming)
  const [orderedOutgoing, setOrderedOutgoing] = useState(filteredOutgoing)
  const [orderedProduction, setOrderedProduction] = useState(filteredProduction)
  const [orderedSaudaSale, setOrderedSaudaSale] = useState(filteredSaudaSale)
  const [orderedSaudaPurchase, setOrderedSaudaPurchase] = useState(filteredSaudaPurchase)

  useEffect(() => setOrderedStock(filteredStock), [JSON.stringify(filteredStock)])
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
      pdf.save(`Nandan_Smelters_Report_${formattedDate}.pdf`)
      
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF.")
    } finally {
      setIsDownloading(false)
    }
  }

  // UI based on image provided
  return (
    <div className="max-w-[1100px] mx-auto my-8 pb-10 bg-white min-h-screen text-slate-800 font-sans shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded overflow-hidden border border-slate-400">
      
      {/* Date Header */}
      <div className="p-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-400 flex justify-between items-center print:hidden shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">MIS Report Settings</h1>
        <div className="flex gap-1">
          <input 
            type="date" 
            value={reportDate} 
            onChange={(e) => setReportDate(e.target.value)}
            className="border border-slate-400 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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

      {/* The Report (Printable Area) */}
      <div className="p-1 sm:p-8" ref={reportRef}>
        <table className="w-full border-collapse border border-slate-400 text-[13px] sm:text-xs text-slate-800 bg-white shadow-sm">
          
          {/* Main Header */}
          <thead>
            <tr>
              <th contentEditable suppressContentEditableWarning colSpan="2" className="bg-gradient-to-r from-indigo-700 to-blue-800 text-white py-3 text-center font-bold text-lg border border-indigo-900 uppercase tracking-widest shadow-inner">
                NANDAN SMELTERS REPORT
              </th>
              <th contentEditable suppressContentEditableWarning className="bg-blue-800 text-white py-3 text-center font-bold text-lg border border-indigo-900 w-[180px] shadow-inner">
                {formattedDate}
              </th>
            </tr>
          </thead>
          
          <tbody>
            {/* STOCK SECTION */}
            {orderedStock.length > 0 && (
              <>
                {orderedStock.map(([material, qty], idx) => (
                  <tr key={`stock-${material}`} className="group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'stock')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'stock', orderedStock, setOrderedStock)}>
                    {idx === 0 && (
                      <td contentEditable suppressContentEditableWarning rowSpan={orderedStock.length} className="font-bold border border-slate-400 p-1 align-top w-[120px]">
                        STOCK
                      </td>
                    )}
                    <td contentEditable suppressContentEditableWarning className="font-bold border border-slate-400 p-1 relative">
                      <HideButton rowKey={`stock-${material}`} />
                      {material}
                    </td>
                    <td contentEditable suppressContentEditableWarning className="font-bold border border-slate-400 p-1 text-right">{formatNumber(qty)}</td>
                  </tr>
                ))}
              </>
            )}
            {filteredStock.length === 0 && (
              <tr>
                <td contentEditable suppressContentEditableWarning className="font-bold border border-slate-400 p-1 align-top w-[120px]">STOCK</td>
                <td contentEditable suppressContentEditableWarning className="border border-slate-400 p-1 text-center text-slate-500">No stock data found.</td>
                <td contentEditable suppressContentEditableWarning className="border border-slate-400 p-1"></td>
              </tr>
            )}

            {/* YESTERDAY INCOMING MATERIALS */}
            <tr>
              <td contentEditable suppressContentEditableWarning colSpan="3" className="bg-indigo-50 text-indigo-900 font-bold text-center p-1.5 border border-slate-400 uppercase tracking-wide">
                YESTERDAY INCOMING MATERIALS
              </td>
            </tr>
            {filteredIncoming.length > 0 ? (
              <tr>
                <td contentEditable suppressContentEditableWarning colSpan="3" className="p-0 border border-slate-400">
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-center bg-white w-[50px]">S.No</th>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-left bg-white">Party Name</th>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-left bg-white">Material Name</th>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-center bg-white w-[120px]">Vehicle No</th>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-center bg-white w-[120px]">Qty.</th>
                        <th contentEditable suppressContentEditableWarning className="border-b border-slate-400 font-bold p-1 text-center bg-white w-[120px]">RATE 18 %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedIncoming.map((item, idx) => (
                        <tr key={`inc-${item.id || idx}`} className="border-b border-slate-400 last:border-b-0 hover:bg-indigo-50/50 transition-colors group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'incoming')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'incoming', orderedIncoming, setOrderedIncoming)}>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 p-1 text-center font-bold relative">
                            <HideButton rowKey={`inc-${item.id || idx}`} />
                            {idx + 1}
                          </td>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 p-1 font-bold">{item.partyName}</td>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 p-1 font-bold">{item.materialName}</td>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 p-1 text-center font-bold">{item.vehicleNo}</td>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 p-1 text-center font-bold">{formatNumber(item.qty)}</td>
                          <td contentEditable suppressContentEditableWarning className="p-1 text-center font-bold">{item.rate || '0'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            ) : (
              <tr><td contentEditable suppressContentEditableWarning colSpan="3" className="border border-slate-400 p-1 text-center text-slate-500">No incoming materials found.</td></tr>
            )}

            {/* YESTERDAY OUTGOING MATERIALS */}
            <tr>
              <td contentEditable suppressContentEditableWarning colSpan="3" className="bg-indigo-50 text-indigo-900 font-bold text-center p-1.5 border border-slate-400 uppercase tracking-wide">
                YESTERDAY OUTGOING MATERIALS
              </td>
            </tr>
            {filteredOutgoing.length > 0 ? (
              <tr>
                <td contentEditable suppressContentEditableWarning colSpan="3" className="p-0 border border-slate-400">
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-center bg-white w-[50px]">S.No</th>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-left bg-white">Party Name</th>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-left bg-white">Material Name</th>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-center bg-white w-[120px]">Vehicle No</th>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-center bg-white w-[120px]">Qty.</th>
                        <th contentEditable suppressContentEditableWarning className="border-b border-slate-400 font-bold p-1 text-center bg-white w-[120px]">RATE 18 %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedOutgoing.map((item, idx) => (
                        <tr key={`out-${item.id || idx}`} className="border-b border-slate-400 last:border-b-0 hover:bg-indigo-50/50 transition-colors group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'outgoing')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'outgoing', orderedOutgoing, setOrderedOutgoing)}>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 p-1 text-center font-bold relative">
                            <HideButton rowKey={`out-${item.id || idx}`} />
                            {idx + 1}
                          </td>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 p-1 font-bold">{item.partyName}</td>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 p-1 font-bold">{item.materialName}</td>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 p-1 text-center font-bold">{item.vehicleNo}</td>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 p-1 text-center font-bold">{formatNumber(item.qty)}</td>
                          <td contentEditable suppressContentEditableWarning className="p-1 text-center font-bold">{item.rate || '0'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            ) : (
              <tr><td contentEditable suppressContentEditableWarning colSpan="3" className="border border-slate-400 p-1 text-center text-slate-500">No outgoing materials found.</td></tr>
            )}

            {/* TOTAL PRODUCTION IN 24HR */}
            <tr>
              <td contentEditable suppressContentEditableWarning colSpan="3" className="bg-indigo-50 text-indigo-900 font-bold text-center p-1.5 border border-slate-400 uppercase tracking-wide">
                TOTAL PRODUCTION IN 24HR
              </td>
            </tr>
            {filteredProduction.length > 0 ? (
              <tr>
                <td contentEditable suppressContentEditableWarning colSpan="3" className="p-0 border border-slate-400">
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-center bg-white">GRADE</th>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-center w-[120px] bg-white">KILN 1</th>
                        <th contentEditable suppressContentEditableWarning className="border-b-[2px] border-r border-slate-400 font-bold p-1 text-center w-[120px] bg-white">KILN 2</th>
                        <th contentEditable suppressContentEditableWarning className="border-b border-slate-400 font-bold p-1 text-center w-[120px] bg-white">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedProduction.map(([metric, values], idx) => (
                        <tr key={`prod-${metric}`} className="group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'production')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'production', orderedProduction, setOrderedProduction)}>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 font-bold p-1 uppercase relative">
                            <HideButton rowKey={`prod-${metric}`} />
                            {metric}
                          </td>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 font-bold p-1 text-center">{formatNumber(values.k1)}</td>
                          <td contentEditable suppressContentEditableWarning className="border-r border-slate-400 font-bold p-1 text-center">{formatNumber(values.k2)}</td>
                          <td contentEditable suppressContentEditableWarning className="font-bold p-1 text-center">
                            <div>{formatNumber(values.total)}</div>
                            {metric.includes('"A" GRADE') && <div className="text-[9px] text-slate-500 font-normal uppercase mt-0.5">A GRADE TOTAL</div>}
                            {metric.includes('"B" GRADE') && <div className="text-[9px] text-slate-500 font-normal uppercase mt-0.5">B GRADE TOTAL</div>}
                          </td>
                        </tr>
                      ))}
                      {/* Sub-total for production */}
                      <tr className="bg-[#B4C6E7]" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                        <td contentEditable suppressContentEditableWarning className="border-t-[2px] border-r border-slate-400 font-bold py-2 px-1 text-center uppercase">Sponge Total</td>
                        <td contentEditable suppressContentEditableWarning className="border-t-[2px] border-r border-slate-400 font-bold py-2 px-1 text-center">
                          <div className="text-[9px] text-slate-600 font-normal uppercase leading-tight">KILN-1 TOTAL</div>
                          {formatNumber(prodTotalK1Filtered)}
                        </td>
                        <td contentEditable suppressContentEditableWarning className="border-t-[2px] border-r border-slate-400 font-bold py-2 px-1 text-center">
                          <div className="text-[9px] text-slate-600 font-normal uppercase leading-tight">KILN-2 TOTAL</div>
                          {formatNumber(prodTotalK2Filtered)}
                        </td>
                        <td contentEditable suppressContentEditableWarning className="border-t-[2px] border-slate-400 font-bold py-2 px-1 text-center">
                          {formatNumber(prodTotalAllFiltered)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            ) : (
              <tr><td contentEditable suppressContentEditableWarning colSpan="3" className="border border-slate-400 p-1 text-center text-slate-500">No production entries found.</td></tr>
            )}

            {/* BALANCE PENDING OUTGOING (SAUDA SALE) */}
            <tr>
              <td contentEditable suppressContentEditableWarning colSpan="3" className="bg-indigo-50 text-indigo-900 font-bold text-center p-1.5 border border-slate-400 uppercase tracking-wide">
                BALANCE PENDING OUTGOING (SAUDA SALE)
              </td>
            </tr>
            <tr>
              <td contentEditable suppressContentEditableWarning className="bg-indigo-50 text-indigo-900 font-bold text-center p-1.5 border border-slate-400 uppercase tracking-wide w-[120px]">TYPE</td>
              <td contentEditable suppressContentEditableWarning className="bg-indigo-50 text-indigo-900 font-bold text-center p-1.5 border border-slate-400 uppercase tracking-wide">ITEM'S</td>
              <td contentEditable suppressContentEditableWarning className="bg-indigo-50 text-indigo-900 font-bold text-center p-1.5 border border-slate-400 uppercase tracking-wide">BAL. PENDING</td>
            </tr>
            {orderedSaudaSale.map((item, idx) => (
              <tr key={`sale-${item.itemName || idx}`} className="group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'saudaSale')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'saudaSale', orderedSaudaSale, setOrderedSaudaSale)}>
                {idx === 0 && <td contentEditable suppressContentEditableWarning rowSpan={Math.max(1, orderedSaudaSale.length)} className="font-bold border border-slate-400 p-1 align-top uppercase">SALE</td>}
                <td contentEditable suppressContentEditableWarning className="font-bold border border-slate-400 p-1 uppercase relative">
                  <HideButton rowKey={`sale-${item.itemName || idx}`} />
                  {item.itemName}
                </td>
                <td contentEditable suppressContentEditableWarning className="font-bold border border-slate-400 p-1 text-right">{formatNumber(item.balPending)}</td>
              </tr>
            ))}
            {filteredSaudaSale.length === 0 && (
              <tr>
                <td contentEditable suppressContentEditableWarning className="font-bold border border-slate-400 p-1 align-top w-[120px] uppercase">SALE</td>
                <td contentEditable suppressContentEditableWarning className="border border-slate-400 p-1 text-center text-slate-500">No pending sales found.</td>
                <td contentEditable suppressContentEditableWarning className="border border-slate-400 p-1"></td>
              </tr>
            )}

            {/* BALANCE PENDING INCOMING (SAUDA PURCHASE) */}
            <tr>
              <td contentEditable suppressContentEditableWarning colSpan="3" className="bg-indigo-50 text-indigo-900 font-bold text-center p-1.5 border border-slate-400 uppercase tracking-wide">
                BALANCE PENDING INCOMING (SAUDA PURCHASE)
              </td>
            </tr>
            <tr>
              <td contentEditable suppressContentEditableWarning className="bg-indigo-50 text-indigo-900 font-bold text-center p-1.5 border border-slate-400 uppercase tracking-wide w-[120px]">TYPE</td>
              <td contentEditable suppressContentEditableWarning className="bg-indigo-50 text-indigo-900 font-bold text-center p-1.5 border border-slate-400 uppercase tracking-wide">ITEM'S</td>
              <td contentEditable suppressContentEditableWarning className="bg-indigo-50 text-indigo-900 font-bold text-center p-1.5 border border-slate-400 uppercase tracking-wide">BAL. PENDING</td>
            </tr>
            {orderedSaudaPurchase.map((item, idx) => (
              <tr key={`pur-${item.itemName || idx}`} className="group cursor-move" draggable onDragStart={(e) => handleDragStart(e, idx, 'saudaPurchase')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx, 'saudaPurchase', orderedSaudaPurchase, setOrderedSaudaPurchase)}>
                {idx === 0 && <td contentEditable suppressContentEditableWarning rowSpan={Math.max(1, orderedSaudaPurchase.length)} className="font-bold border border-slate-400 p-1 align-top uppercase">PURCHASE</td>}
                <td contentEditable suppressContentEditableWarning className="font-bold border border-slate-400 p-1 uppercase relative">
                  <HideButton rowKey={`pur-${item.itemName || idx}`} />
                  {item.itemName}
                </td>
                <td contentEditable suppressContentEditableWarning className="font-bold border border-slate-400 p-1 text-right">{formatNumber(item.balPending)}</td>
              </tr>
            ))}
            {filteredSaudaPurchase.length === 0 && (
              <tr>
                <td contentEditable suppressContentEditableWarning className="font-bold border border-slate-400 p-1 align-top w-[120px] uppercase">PURCHASE</td>
                <td contentEditable suppressContentEditableWarning className="border border-slate-400 p-1 text-center text-slate-500">No pending purchases found.</td>
                <td contentEditable suppressContentEditableWarning className="border border-slate-400 p-1"></td>
              </tr>
            )}

          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MisReport
