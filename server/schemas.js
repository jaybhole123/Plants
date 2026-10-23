// Page-wise extraction schemas + prompt hints for the AI image reader.
// All leaf values are strings so figures are kept exactly as printed (e.g. "12%", "1,250.500").

const str = { type: 'string' }

const obj = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
})

const table = (rowProps, extra = {}) =>
  obj({ ...extra, rows: { type: 'array', items: obj(rowProps) } })

export const PAGES = {
  stock_raw: {
    schema: table(
      {
        category: str, material: str, openingStock: str, inward: str, consumption: str,
        crushing: str, fines3: str, fines3Qty: str, production: str, dispatch: str, closingStock: str,
      },
      { reportDate: str }
    ),
    hint: `Daily RAW MATERIAL STOCK sheet. Columns left to right: Material, Opening Stock, Inward, Consumption, Crushing %, Fines(-3) %, Fines qty, Production, Dispatch, Closing Stock.
Group headings (e.g. RAW IRON ORE, RAW PELLET ORE, PROCESSED IRON ORE (3-18), IRON FINES (0-3), DOLOMITE, NON MAG) go in "category" for the rows beneath them; they are not rows themselves.
Stop before any COAL DETAILS section. Skip TOTAL / SUB TOTAL rows. "reportDate" is the sheet date as YYYY-MM-DD.`,
  },
  stock_coal: {
    schema: table(
      {
        category: str, material: str, openingStock: str, inward: str, consumption: str,
        fc: str, moistLossPct: str, landedCost: str, dispatch: str, closingStock: str,
      },
      { reportDate: str }
    ),
    hint: `COAL DETAILS section of the stock sheet. Columns: Material, Opening Stock, Inward, Consumption, F/C (fixed carbon), Moisture loss %, Landed Cost, Dispatch, Closing Stock.
Read only the coal section. Skip TOTAL rows. "reportDate" is the sheet date as YYYY-MM-DD.`,
  },
  transfer: {
    schema: table({ entryType: str, partyName: str, materialName: str, vehicleNo: str, qty: str, rate: str }),
    hint: `Incoming / Outgoing material slip, gate pass or register. One row per entry.
"entryType" is "incoming" or "outgoing" if the document says so, otherwise "". "vehicleNo" is the truck number exactly as written (e.g. CG04XX1234).`,
  },
  production: {
    schema: table(
      { metricName: str, percentValue: str, k1Value: str, k2Value: str, totalValue: str },
      { date: str, downTimeRemarks: str }
    ),
    hint: `MIS REPORT / Sponge iron daily PRODUCTION report.
CRITICAL INSTRUCTION:
- Read ONLY the "PRODUCTION" section/table in the sheet. Ignore "IRON ORE CONSUMPTION", "DOLOMITE CONSUMPTION", "COAL CONSUMPTION", "SPECIFIC COST", and "DOWN TIME REMARKS".
- Rows under PRODUCTION typically include:
  * STEAM (e.g. 204)
  * SPONGE (Total sponge e.g. 134.00)
  * "A" GRADE (e.g. 114.00)
  * "B" GRADE (e.g. 20.00)
  * N.MAG (CHAR+DOLO CHAR) (e.g. 50.00)
- In single-kiln / single-total sheets where there is only one quantity column on the right:
  * metricName: The label (e.g. 'STEAM', 'SPONGE', '"A" GRADE', '"B" GRADE', 'N.MAG (CHAR+DOLO CHAR)').
  * For "A" GRADE and "B" GRADE, set k1Value to its quantity (e.g. 114.00 for "A" GRADE, 20.00 for "B" GRADE) and totalValue to the same quantity (e.g. 114.00 and 20.00). If SPONGE is 134.00, percentValue can be calculated or left blank if not written.
  * For STEAM, SPONGE, N.MAG: set totalValue and k1Value to the number shown in that row.
- "date" is the sheet date as YYYY-MM-DD (e.g., from "Date: Wednesday 21 October 2026" -> "2026-10-21").
- Skip empty rows. Do not extract rows outside the PRODUCTION block.`,
  },
  sauda_sale: {
    schema: table({
      date: str, mainHeading: str, itemName: str, partyName: str,
      saudaQuantity: str, rateAmt: str, prvPending: str, qtyDispatch: str, balPending: str,
    }),
    hint: `SAUDA (sales order) sheet or weighbridge slip. One row per party/order. "mainHeading" is the bold item group above the rows (e.g. GASIFIRE ASH, BED MATERIAL, CHAR). Columns: Date, Item, Party, Sauda Qty, Rate, Previous Pending, Qty Dispatched, Balance Pending. Dates as YYYY-MM-DD.`,
  },
  sauda_purchase: {
    schema: table({
      date: str, mainHeading: str, itemName: str, partyName: str,
      orderQuantity: str, rateMt: str, qtyReceived: str, balPending: str,
    }),
    hint: `SAUDA PURCHASE (purchase order) sheet or receipt. One row per party/order. "mainHeading" is the item group heading. Columns: Date, Item, Party, Order Qty, Rate per MT, Qty Received, Balance Pending. Dates as YYYY-MM-DD.`,
  },
}

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

// Arithmetic cross-checks done in code (not by the model). Returned as warnings only.
export const crossChecks = (page, data) => {
  const warnings = []
  const rows = data?.rows || []
  rows.forEach((r, i) => {
    if (page === 'sauda_sale') {
      const s = num(r.saudaQuantity), p = num(r.prvPending), d = num(r.qtyDispatch), b = num(r.balPending)
      if ([s, d, b].every((x) => x !== null) && Math.abs(s + (p || 0) - d - b) > 0.01)
        warnings.push(`Row ${i + 1} (${r.partyName}): Sauda + Prev Pending - Dispatch = ${(s + (p || 0) - d).toFixed(3)} but sheet shows Balance ${b}`)
    }
    if (page === 'sauda_purchase') {
      const o = num(r.orderQuantity), q = num(r.qtyReceived), b = num(r.balPending)
      if ([o, q, b].every((x) => x !== null) && Math.abs(o - q - b) > 0.01)
        warnings.push(`Row ${i + 1} (${r.partyName}): Order - Received = ${(o - q).toFixed(3)} but sheet shows Balance ${b}`)
    }
  })
  return warnings
}
