/**
 * OCR Text Parsers for each page module.
 * These functions take raw OCR text and extract structured data
 * to auto-fill form fields.
 */

// --- Common Helpers ---
const cleanNumber = (str) => {
  if (!str) return ''
  // Remove everything except digits, dots, and minus
  const cleaned = str.replace(/[^0-9.\-]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? '' : String(num)
}

const extractDate = (text) => {
  // Try to find date patterns: DD.MM.YY, DD/MM/YYYY, DD-MM-YY, etc.
  const datePatterns = [
    /(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})/,
    /(\d{4})[.\/\-](\d{1,2})[.\/\-](\d{1,2})/  // YYYY-MM-DD
  ]
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      let d, m, y
      if (match[1].length === 4) {
        // YYYY-MM-DD format
        y = match[1]
        m = match[2].padStart(2, '0')
        d = match[3].padStart(2, '0')
      } else {
        d = match[1].padStart(2, '0')
        m = match[2].padStart(2, '0')
        y = match[3]
        if (y.length === 2) y = '20' + y
      }
      return `${y}-${m}-${d}`
    }
  }
  return new Date().toISOString().split('T')[0]
}

const findLineContaining = (lines, keyword) => {
  return lines.find(l => l.toUpperCase().includes(keyword.toUpperCase())) || ''
}

const extractValueAfterKeyword = (text, keyword) => {
  const regex = new RegExp(keyword + '[:\\s]*([^\\n]+)', 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

// ==========================================
// 1. SAUDA SCALE (Sale) Parser
// ==========================================
export const parseSaudaScaleOCR = (rawText) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l)
  
  const result = {
    date: extractDate(rawText),
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

  // Try to find known keywords in text
  result.partyName = extractValueAfterKeyword(rawText, 'party\\s*name') || 
                     extractValueAfterKeyword(rawText, 'party')
  result.itemName = extractValueAfterKeyword(rawText, 'material\\s*name') || 
                    extractValueAfterKeyword(rawText, 'material') ||
                    extractValueAfterKeyword(rawText, 'item')
  result.sizeMm = extractValueAfterKeyword(rawText, 'size')
  result.broker = extractValueAfterKeyword(rawText, 'broker')
  result.deliveryTerms = extractValueAfterKeyword(rawText, 'delivery') || 
                         extractValueAfterKeyword(rawText, 'terms')
  result.paymentCondition = extractValueAfterKeyword(rawText, 'payment')
  result.referenceName = extractValueAfterKeyword(rawText, 'reference')
  result.remarks = extractValueAfterKeyword(rawText, 'remark')
  result.consigneeName = extractValueAfterKeyword(rawText, 'consignee')

  // Extract numbers from the text for quantity fields
  const numbers = rawText.match(/\d+(?:\.\d+)?/g) || []
  const largeNumbers = numbers.filter(n => parseFloat(n) > 10).map(n => cleanNumber(n))
  
  if (largeNumbers.length >= 1) result.saudaQuantity = largeNumbers[0] || ''
  if (largeNumbers.length >= 2) result.rateAmt = largeNumbers[1] || ''
  if (largeNumbers.length >= 3) result.qtyDispatch = largeNumbers[2] || ''
  if (largeNumbers.length >= 4) result.balPending = largeNumbers[3] || ''

  return result
}

// ==========================================
// 2. SAUDA PURCHASE Parser
// ==========================================
export const parseSaudaPurchaseOCR = (rawText) => {
  const result = {
    date: extractDate(rawText),
    mainHeading: '',
    itemName: '',
    sizeMm: '',
    partyName: '',
    orderQuantity: '',
    rateMt: '',
    qtyReceived: '',
    balPending: '',
    broker: '',
    deliveryTerms: '',
    paymentCondition: '',
    referenceName: '',
    remarks: '',
  }

  result.partyName = extractValueAfterKeyword(rawText, 'party\\s*name') || 
                     extractValueAfterKeyword(rawText, 'party')
  result.itemName = extractValueAfterKeyword(rawText, 'material\\s*name') || 
                    extractValueAfterKeyword(rawText, 'material') ||
                    extractValueAfterKeyword(rawText, 'item')
  result.sizeMm = extractValueAfterKeyword(rawText, 'size')
  result.broker = extractValueAfterKeyword(rawText, 'broker')
  result.deliveryTerms = extractValueAfterKeyword(rawText, 'delivery') || 
                         extractValueAfterKeyword(rawText, 'terms')
  result.paymentCondition = extractValueAfterKeyword(rawText, 'payment')
  result.referenceName = extractValueAfterKeyword(rawText, 'reference')
  result.remarks = extractValueAfterKeyword(rawText, 'remark')

  const numbers = rawText.match(/\d+(?:\.\d+)?/g) || []
  const largeNumbers = numbers.filter(n => parseFloat(n) > 10).map(n => cleanNumber(n))
  
  if (largeNumbers.length >= 1) result.orderQuantity = largeNumbers[0] || ''
  if (largeNumbers.length >= 2) result.rateMt = largeNumbers[1] || ''
  if (largeNumbers.length >= 3) result.qtyReceived = largeNumbers[2] || ''
  if (largeNumbers.length >= 4) result.balPending = largeNumbers[3] || ''

  return result
}

// ==========================================
// 3. ITEM TRANSFER Parser
// ==========================================
export const parseItemTransferOCR = (rawText) => {
  const result = {
    type: 'incoming',
    mainHeading: '',
    partyName: '',
    materialName: '',
    vehicleNo: '',
    qty: '',
    rate: '',
  }

  // Detect type from text
  if (rawText.toUpperCase().includes('OUTGOING') || rawText.toUpperCase().includes('DISPATCH')) {
    result.type = 'outgoing'
  }

  result.partyName = extractValueAfterKeyword(rawText, 'party\\s*name') || 
                     extractValueAfterKeyword(rawText, 'party')
  result.materialName = extractValueAfterKeyword(rawText, 'material\\s*name') || 
                        extractValueAfterKeyword(rawText, 'material') ||
                        extractValueAfterKeyword(rawText, 'item')
  
  // Vehicle number pattern: XX 00 XX 0000
  const vehicleMatch = rawText.match(/[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,2}\s?\d{4}/i)
  if (vehicleMatch) result.vehicleNo = vehicleMatch[0]

  result.rate = extractValueAfterKeyword(rawText, 'rate')
  
  const numbers = rawText.match(/\d+(?:\.\d+)?/g) || []
  const largeNumbers = numbers.filter(n => parseFloat(n) > 5 && parseFloat(n) < 100000).map(n => cleanNumber(n))
  if (largeNumbers.length >= 1) result.qty = largeNumbers[0] || ''
  if (largeNumbers.length >= 2 && !result.rate) result.rate = largeNumbers[1] || ''

  return result
}

// ==========================================
// 4. STOCK Parser (Raw Material)
// ==========================================
export const parseStockOCR = (rawText) => {
  const result = {
    material: '',
    openingStock: '',
    inward: '',
    consumption: '',
    crushing: '0%',
    fines3: '0%',
    fines3Qty: '0',
    production: '',
    dispatch: '',
    closingStock: '',
    unit: 'ton',
    remarks: '',
  }

  result.material = extractValueAfterKeyword(rawText, 'material') || 
                    extractValueAfterKeyword(rawText, 'item')
  result.remarks = extractValueAfterKeyword(rawText, 'remark')

  // Look for specific stock keywords
  const openingMatch = rawText.match(/opening[:\s]*stock[:\s]*([\d,.]+)/i)
  if (openingMatch) result.openingStock = cleanNumber(openingMatch[1])

  const closingMatch = rawText.match(/closing[:\s]*stock[:\s]*([\d,.]+)/i)
  if (closingMatch) result.closingStock = cleanNumber(closingMatch[1])

  const inwardMatch = rawText.match(/inward[:\s]*([\d,.]+)/i)
  if (inwardMatch) result.inward = cleanNumber(inwardMatch[1])

  const consumptionMatch = rawText.match(/consumption[:\s]*([\d,.]+)/i)
  if (consumptionMatch) result.consumption = cleanNumber(consumptionMatch[1])

  const dispatchMatch = rawText.match(/dispatch[:\s]*([\d,.]+)/i)
  if (dispatchMatch) result.dispatch = cleanNumber(dispatchMatch[1])

  const productionMatch = rawText.match(/production[:\s]*([\d,.]+)/i)
  if (productionMatch) result.production = cleanNumber(productionMatch[1])

  // If keyword-based extraction didn't work, fallback to sequential numbers
  if (!result.openingStock) {
    const numbers = rawText.match(/\d+(?:\.\d+)?/g) || []
    const stockNumbers = numbers.filter(n => parseFloat(n) > 0).map(n => cleanNumber(n))
    if (stockNumbers.length >= 1) result.openingStock = stockNumbers[0]
    if (stockNumbers.length >= 2) result.inward = stockNumbers[1]
    if (stockNumbers.length >= 3) result.consumption = stockNumbers[2]
    if (stockNumbers.length >= 4) result.dispatch = stockNumbers[3]
    if (stockNumbers.length >= 5) result.closingStock = stockNumbers[4]
  }

  return result
}

// ==========================================
// 5. STOCK Parser (Coal Detail)
// ==========================================
export const parseCoalStockOCR = (rawText) => {
  const result = {
    material: '',
    openingStock: '',
    inward: '',
    consumption: '',
    fc: '',
    moistLossPct: '',
    dispatch: '',
    landedCost: '',
    closingStock: '',
  }

  result.material = extractValueAfterKeyword(rawText, 'material') || 
                    extractValueAfterKeyword(rawText, 'coal')

  const openingMatch = rawText.match(/opening[:\s]*([\d,.]+)/i)
  if (openingMatch) result.openingStock = cleanNumber(openingMatch[1])

  const closingMatch = rawText.match(/closing[:\s]*([\d,.]+)/i)
  if (closingMatch) result.closingStock = cleanNumber(closingMatch[1])

  const inwardMatch = rawText.match(/inward[:\s]*([\d,.]+)/i)
  if (inwardMatch) result.inward = cleanNumber(inwardMatch[1])

  const consumptionMatch = rawText.match(/consumption[:\s]*([\d,.]+)/i)
  if (consumptionMatch) result.consumption = cleanNumber(consumptionMatch[1])

  const fcMatch = rawText.match(/f\.?c\.?[:\s]*([\d,.]+)/i)
  if (fcMatch) result.fc = fcMatch[1]

  const moistMatch = rawText.match(/moist[:\s]*([\d,.]+)%?/i)
  if (moistMatch) result.moistLossPct = moistMatch[1] + '%'

  const costMatch = rawText.match(/landed[:\s]*cost[:\s]*([\d,.]+)/i) || rawText.match(/cost[:\s]*([\d,.]+)/i)
  if (costMatch) result.landedCost = cleanNumber(costMatch[1])

  return result
}

// ==========================================
// 6. PRODUCTION Parser
// ==========================================
export const parseProductionOCR = (rawText) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l)
  
  const rows = []
  let remarks = ''

  for (const line of lines) {
    // Check for remarks
    if (line.toUpperCase().includes('REMARK') || line.toUpperCase().includes('DOWN TIME')) {
      remarks = line.replace(/.*remarks?\s*:?\s*/i, '').trim()
      continue
    }

    // Try to parse data rows: "Label Number Number Number Number"
    const tokens = line.split(/\s+/)
    const numberTokens = tokens.filter(t => /^-?[\d,]+(\.\d+)?%?$/.test(t))

    // Skip header/title lines (no numeric data on the line)
    if (numberTokens.length === 0 && (
        line.toUpperCase().includes('PRODUCTION') ||
        line.toUpperCase().includes('METRIC') ||
        (line.toUpperCase().includes('GRADE') && line.toUpperCase().includes('K-')))) {
      continue
    }

    if (numberTokens.length >= 2) {
      const labelTokens = tokens.filter(t => !/^-?[\d,]+(\.\d+)?%?$/.test(t))
      const label = labelTokens.join(' ') || line

      rows.push({
        id: Date.now() + Math.random(),
        metricName: label,
        percentValue: numberTokens.length >= 4 ? numberTokens[0].replace('%', '') : '',
        k1Value: numberTokens.length >= 4 ? cleanNumber(numberTokens[1]) : cleanNumber(numberTokens[0]),
        k2Value: numberTokens.length >= 4 ? cleanNumber(numberTokens[2]) : (numberTokens.length >= 2 ? cleanNumber(numberTokens[1]) : ''),
        totalValue: numberTokens.length >= 4 ? cleanNumber(numberTokens[3]) : (numberTokens.length >= 3 ? cleanNumber(numberTokens[2]) : ''),
      })
    }
  }

  return { rows, remarks }
}
