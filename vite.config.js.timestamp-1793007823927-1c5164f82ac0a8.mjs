// vite.config.js
import { defineConfig, loadEnv } from "file:///C:/Users/acer/Desktop/new_hindustan_dattahu/Plants/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/acer/Desktop/new_hindustan_dattahu/Plants/node_modules/@vitejs/plugin-react/dist/index.js";

// server/schemas.js
var str = { type: "string" };
var obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false
});
var table = (rowProps, extra = {}) => obj({ ...extra, rows: { type: "array", items: obj(rowProps) } });
var FIELDS = {
  stock_raw: {
    numeric: ["openingStock", "inward", "consumption", "fines3Qty", "production", "dispatch", "closingStock"],
    pct: ["crushing", "fines3"],
    date: ["reportDate"]
  },
  stock_coal: {
    numeric: ["openingStock", "inward", "consumption", "fc", "landedCost", "dispatch", "closingStock"],
    pct: ["moistLossPct"],
    date: ["reportDate"]
  },
  transfer: { numeric: ["qty", "rate"], pct: [], date: [] },
  production: { numeric: ["k1Value", "k2Value", "totalValue"], pct: ["percentValue"], date: ["date"] },
  sauda_sale: {
    numeric: ["saudaQuantity", "rateAmt", "prvPending", "qtyDispatch", "balPending"],
    pct: [],
    date: ["date"]
  },
  sauda_purchase: {
    numeric: ["orderQuantity", "rateMt", "tcs", "bhada", "landingCost", "gst", "grossRate", "netRate", "qtyReceived", "balPending"],
    pct: [],
    date: ["date"]
  }
};
var PAGES = {
  stock_raw: {
    schema: table(
      {
        category: str,
        material: str,
        openingStock: str,
        inward: str,
        consumption: str,
        crushing: str,
        fines3: str,
        fines3Qty: str,
        production: str,
        dispatch: str,
        closingStock: str
      },
      { reportDate: str }
    ),
    hint: `RAW MATERIAL STOCK sheet (table of materials with stock columns). Typical columns left to right: Material, Opening Stock, Inward, Consumption, Crushing/Screen, Fines %, Fines qty, Production, Dispatch, Closing Stock; headers may be worded slightly differently or be in a different order - match each value to the column header printed above it.
Copy every digit of long numbers carefully (do not drop a digit from 4-digit integer parts such as 1234.567).
Group heading rows (bold/centered rows with no figures, e.g. "RAW IRON ORE") go in "category" for the rows beneath them; each material row gets its own parent heading. Headings are not data rows.
Read only the raw-material part: stop before any COAL section and ignore TOTAL / SUB TOTAL / GRAND TOTAL rows.
"reportDate" = the "AS ON DATE" date if the sheet prints one, otherwise the main date at the top of the sheet. Blank cells stay "".`
  },
  stock_coal: {
    schema: table(
      {
        category: str,
        material: str,
        openingStock: str,
        inward: str,
        consumption: str,
        fc: str,
        moistLossPct: str,
        landedCost: str,
        dispatch: str,
        closingStock: str
      },
      { reportDate: str }
    ),
    hint: `COAL DETAILS section of a stock sheet, including any extra item rows printed below the coal TOTAL row down to the end of the table (e.g. other materials listed after "TOTAL COAL"). Typical columns: Material, Opening Stock, Inward, Consumption (net cons.), F/C (fixed carbon), Moisture loss, Landed Cost, Dispatch, Closing Stock; match each value to the header printed above it.
Read all coal rows and also the item rows after the coal TOTAL row; skip only TOTAL rows. "category": the coal section heading for coal rows, and the row's own heading/label for extra item rows after the total.
"fc" = the number only. Read the Landed Cost column carefully and never leave it empty when a value is printed there. Dispatch/Production-type figures printed in the extra rows go in their matching columns.
"reportDate" = the "AS ON DATE" date if the sheet prints one, otherwise the main date at the top. Blank cells stay "".`
  },
  transfer: {
    schema: table({ entryType: str, partyName: str, materialName: str, vehicleNo: str, qty: str, rate: str }),
    hint: `Incoming / outgoing material record: a register, gate pass, slip, or a chat message (e.g. WhatsApp/Telegram screenshot). One row per entry.
"entryType": "incoming" or "outgoing" - take it from the heading/label that applies to the lines below it ("" if not stated). "materialName" and "partyName" are separate: material = what was moved, party = the company/person. Words like "advance payment" or "loading payment" are not part of either. "qty" = the quantity number only (no unit). A number in brackets after the quantity (like "Mt(3)") is a trip/vehicle count, NOT the quantity. "rate" = the price number only (drop @, /-, Rs, currency). "vehicleNo" = vehicle number exactly as written, else "".`
  },
  production: {
    schema: table(
      { metricName: str, percentValue: str, k1Value: str, k2Value: str, totalValue: str },
      { date: str, downTimeRemarks: str }
    ),
    hint: `Daily PRODUCTION report (it may be one section of a bigger MIS page - ignore all other sections such as consumption tables, costs and down-time). Read only the production table: each row is a grade/metric with some of these value columns: percent, kiln 1, kiln 2, total. Put each number under the column header it sits below.
If the table has just ONE value column, that single quantity is the row's total: put it in "totalValue" AND in "k1Value", and leave percentValue and k2Value "". Never calculate a percentage; leave percentValue "" unless it is printed.
"downTimeRemarks" = the text written in the remarks box next to the "REMARKS" label (not the label itself, not other captions such as "feed loss time"); if only a dash is written, return "-". "date" = the report date.`
  },
  sauda_sale: {
    schema: table({
      date: str,
      mainHeading: str,
      itemName: str,
      partyName: str,
      saudaQuantity: str,
      rateAmt: str,
      prvPending: str,
      qtyDispatch: str,
      balPending: str
    }),
    hint: `SAUDA (sales order) sheet. One row per order/party. "mainHeading" = the bold group heading above a set of rows. Typical columns: Date, Item, Party, Sauda Quantity, Rate, Previous Pending, Qty Dispatched, Balance Pending - match each value to its column header. Skip TOTAL rows.`
  },
  sauda_purchase: {
    schema: table({
      date: str,
      mainHeading: str,
      itemName: str,
      partyName: str,
      orderQuantity: str,
      rateMt: str,
      tcs: str,
      bhada: str,
      landingCost: str,
      gst: str,
      grossRate: str,
      netRate: str,
      qtyReceived: str,
      balPending: str
    }),
    hint: `SAUDA PURCHASE / MATERIAL PURCHASE sheet. One row per entry; skip TOTAL rows. "mainHeading" = the coloured/bold group heading above a set of rows. Typical columns: Date, Material, Party Name, Quantity (MT), Rate/MT, Tcs, Bhada, Landing Cost, GST, Gross Rate, Net Rate, Qty Received till date, Balance (MT) - match each value to its column header; blank cells stay "".`
  }
};
var LOOKALIKE = { \u0430: "a", \u0435: "e", \u043E: "o", \u0440: "p", \u0441: "c", \u0445: "x", \u0443: "y", \u0456: "i", \u0458: "j", \u0410: "A", \u0412: "B", \u0415: "E", \u041A: "K", \u041C: "M", \u041D: "H", \u041E: "O", \u0420: "P", \u0421: "C", \u0422: "T", \u0425: "X" };
var cleanText = (v) => String(v ?? "").replace(/[Ѐ-ӿ]/g, (c) => LOOKALIKE[c] ?? c).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
var cleanNumber = (v, allowPct = false) => {
  const s = String(v ?? "").replace(/,/g, "").replace(/[−–]/g, "-");
  const m = s.match(/-?\d+(?:\.\d+)?|-?\.\d+/);
  if (!m)
    return "";
  const hasPct = allowPct && new RegExp(`${m[0].replace(".", "\\.")}\\s*%`).test(s);
  return m[0] + (hasPct ? "%" : "");
};
var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
var pad = (n) => String(n).padStart(2, "0");
var cleanDate = (v) => {
  const s = String(v ?? "").trim();
  if (!s)
    return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s))
    return s;
  let m = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (m)
    return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/(\d{1,2})[.\-/ ]+([A-Za-z]{3,9})[.\-/ ,]+(\d{2,4})/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${pad(MONTHS[m[2].slice(0, 3).toLowerCase()])}-${pad(m[1])}`;
  }
  m = s.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
  if (m)
    return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return "";
};
var sanitize = (page, data) => {
  const f = FIELDS[page];
  const fix = (obj2) => {
    const out = {};
    for (const [k, v] of Object.entries(obj2)) {
      if (k === "rows")
        continue;
      if (f.numeric.includes(k))
        out[k] = cleanNumber(v);
      else if (f.pct.includes(k))
        out[k] = cleanNumber(v, true);
      else if (f.date.includes(k))
        out[k] = cleanDate(v);
      else
        out[k] = cleanText(v);
    }
    return out;
  };
  let rows = ((data == null ? void 0 : data.rows) || []).map(fix);
  if (page === "production") {
    rows = rows.map((r) => {
      if (r.percentValue === "" && r.k2Value === "") {
        if (r.totalValue !== "" && r.k1Value === "")
          return { ...r, k1Value: r.totalValue };
        if (r.k1Value !== "" && r.totalValue === "")
          return { ...r, totalValue: r.k1Value };
      }
      return r;
    });
  }
  return { ...fix(data || {}), rows };
};
var num = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
var near = (a, b, tol = 0.011) => Math.abs(a - b) <= tol;
var crossChecks = (page, data) => {
  const warnings = [];
  ((data == null ? void 0 : data.rows) || []).forEach((r, i) => {
    const who = r.partyName || r.material || r.metricName || "";
    const label = `Row ${i + 1}${who ? ` (${who})` : ""}`;
    if (page === "sauda_sale") {
      const s = num(r.saudaQuantity), p = num(r.prvPending), d = num(r.qtyDispatch), b = num(r.balPending);
      if (b === null || d === null)
        return;
      const ok = [p !== null ? p - d : null, s !== null && p !== null ? s + p - d : null, s !== null ? s - d : null].some((x) => x !== null && near(x, b));
      if (!ok)
        warnings.push(`${label}: Balance ${b} does not match Prev Pending - Dispatch (or Sauda - Dispatch).`);
    }
    if (page === "sauda_purchase") {
      const o = num(r.orderQuantity), q = num(r.qtyReceived), b = num(r.balPending);
      if (o !== null && q !== null && b !== null && !near(o - q, b))
        warnings.push(`${label}: Order - Received = ${(o - q).toFixed(3)} but Balance shows ${b}.`);
    }
    if (page === "stock_raw") {
      const o = num(r.openingStock), c = num(r.closingStock);
      if (o === null || c === null || num(r.production) || num(r.dispatch))
        return;
      const exp = o + (num(r.inward) || 0) - (num(r.consumption) || 0);
      if (!near(exp, c))
        warnings.push(`${label}: Opening + Inward - Consumption = ${exp.toFixed(3)} but Closing shows ${c}.`);
    }
    if (page === "stock_coal") {
      const o = num(r.openingStock), c = num(r.closingStock);
      if (o === null || c === null || num(r.dispatch))
        return;
      const base = o + (num(r.inward) || 0) - (num(r.consumption) || 0);
      const moist = num(r.moistLossPct);
      if (!near(base, c) && !(moist !== null && near(base - moist, c)))
        warnings.push(`${label}: Opening + Inward - Consumption = ${base.toFixed(3)} but Closing shows ${c}.`);
    }
    if (page === "production") {
      const a = num(r.k1Value), b = num(r.k2Value), t = num(r.totalValue);
      if (a !== null && b !== null && t !== null && !near(a + b, t, 0.02))
        warnings.push(`${label}: Kiln1 + Kiln2 = ${(a + b).toFixed(3)} but Total shows ${t}.`);
    }
  });
  return warnings;
};

// server/ocrHandler.js
var API_URL = "https://api.openai.com/v1/chat/completions";
var MAX_BODY = 20 * 1024 * 1024;
var TIMEOUT_MS = 120 * 1e3;
var readBody = (req) => new Promise((resolve, reject) => {
  let size = 0;
  const chunks = [];
  req.on("data", (c) => {
    size += c.length;
    if (size > MAX_BODY) {
      reject(new Error("Image too large"));
      req.destroy();
    } else
      chunks.push(c);
  });
  req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  req.on("error", reject);
});
var send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};
async function callModel({ key, model, name, schema, system, userText, image, effort }) {
  var _a, _b, _c;
  const body = {
    model,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: image, detail: "high" } }
        ]
      }
    ],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }
  };
  if (effort)
    body.reasoning_effort = effort;
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(((_a = json == null ? void 0 : json.error) == null ? void 0 : _a.message) || `OpenAI error ${r.status}`);
  const msg = (_c = (_b = json.choices) == null ? void 0 : _b[0]) == null ? void 0 : _c.message;
  if (msg == null ? void 0 : msg.refusal)
    throw new Error(`Model refused: ${msg.refusal}`);
  return JSON.parse((msg == null ? void 0 : msg.content) || "{}");
}
var EXTRACT_SYSTEM = `You read photos/scans of plant paperwork and return the data as JSON.
Rules:
- Copy values exactly as printed. Never calculate, estimate or "fix" numbers. Copy names letter by letter, keep original spelling.
- If a cell is blank, illegible or you are not sure, return "" for it. Do not guess digits.
- Keep the original row order. Skip TOTAL / SUB TOTAL rows and column headers.
- Numeric cells contain ONLY digits and one optional decimal point: remove thousands commas, units (Mt, FC), currency and symbols (@, /-, *). Keep a trailing % only for percentage cells.
- Dates: YYYY-MM-DD (dd.mm.yy means day.month.year).`;
var VERIFY_SYSTEM = `You are a careful checker. You get an image and data another reader extracted from it.
Compare every value against the image, digit by digit: watch for dropped or extra digits in long numbers. Change a value ONLY if you are CERTAIN the image shows something different (a wrong digit, wrong row/column, missed or extra row). Do NOT reformat, normalise, re-space or "improve" text or numbers; the cleaning rules (numbers only, no units/symbols, dates YYYY-MM-DD) must be preserved.
If unsure, leave the value as is. Return the full data in "data" and one "corrections" entry per value you changed.`;
var verifySchema = (dataSchema) => ({
  type: "object",
  properties: {
    data: dataSchema,
    corrections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          row: { type: "integer" },
          field: { type: "string" },
          from: { type: "string" },
          to: { type: "string" },
          reason: { type: "string" }
        },
        required: ["row", "field", "from", "to", "reason"],
        additionalProperties: false
      }
    },
    unreadable: { type: "array", items: { type: "string" } }
  },
  required: ["data", "corrections", "unreadable"],
  additionalProperties: false
});
async function handleOcr(req, res, env) {
  if (req.method !== "POST")
    return send(res, 405, { error: "POST only" });
  const key = env.OPENAI_API_KEY;
  if (!key)
    return send(res, 500, { error: "OPENAI_API_KEY is not set on the server (.env)" });
  let payload;
  try {
    if (req.body && typeof req.body === "object") {
      payload = req.body;
    } else if (typeof req.body === "string") {
      payload = JSON.parse(req.body);
    } else {
      payload = JSON.parse(await readBody(req));
    }
  } catch (e) {
    return send(res, 400, { error: e.message });
  }
  const { page, image } = payload || {};
  const cfg = PAGES[page];
  if (!cfg)
    return send(res, 400, { error: `Unknown page "${page}"` });
  if (typeof image !== "string" || !image.startsWith("data:image/"))
    return send(res, 400, { error: "image must be a data:image URL" });
  const extractModel = env.OCR_MODEL || "gpt-5.6-sol";
  const verifyModel = env.OCR_VERIFY_MODEL || "gpt-5.6-terra";
  const effort = env.OCR_EFFORT || void 0;
  const doVerify = String(env.OCR_VERIFY || "").toLowerCase() === "on";
  try {
    const extracted = await callModel({
      key,
      model: extractModel,
      name: `${page}_extract`,
      schema: cfg.schema,
      system: EXTRACT_SYSTEM,
      userText: cfg.hint,
      image,
      effort
    });
    let data = extracted;
    let verification = { status: "read", corrections: [], unreadable: [], warnings: [] };
    if (doVerify) {
      try {
        const v = await callModel({
          key,
          model: verifyModel,
          name: `${page}_verify`,
          schema: verifySchema(cfg.schema),
          system: VERIFY_SYSTEM,
          userText: `${cfg.hint}

Extracted data to check:
${JSON.stringify(extracted)}`,
          image,
          effort
        });
        data = v.data;
        verification.corrections = v.corrections;
        verification.unreadable = v.unreadable;
        verification.status = v.corrections.length || v.unreadable.length ? "corrected" : "verified";
      } catch (e) {
        verification = { status: "unverified", corrections: [], unreadable: [], warnings: [], message: e.message };
      }
    }
    data = sanitize(page, data);
    verification.warnings = crossChecks(page, data);
    return send(res, 200, { data, verification, models: { extractModel, verifyModel: doVerify ? verifyModel : null } });
  } catch (e) {
    console.error("[ocr]", e.message);
    return send(res, 502, { error: e.name === "TimeoutError" ? "The AI took too long. Please try again." : e.message });
  }
}

// vite.config.js
var ocrApi = (env) => ({
  name: "ocr-api",
  configureServer(server) {
    server.middlewares.use("/api/ocr", (req, res) => handleOcr(req, res, env));
  },
  configurePreviewServer(server) {
    server.middlewares.use("/api/ocr", (req, res) => handleOcr(req, res, env));
  }
});
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), ocrApi(env)],
    server: {
      port: 5175
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAic2VydmVyL3NjaGVtYXMuanMiLCAic2VydmVyL29jckhhbmRsZXIuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhY2VyXFxcXERlc2t0b3BcXFxcbmV3X2hpbmR1c3Rhbl9kYXR0YWh1XFxcXFBsYW50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYWNlclxcXFxEZXNrdG9wXFxcXG5ld19oaW5kdXN0YW5fZGF0dGFodVxcXFxQbGFudHNcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2FjZXIvRGVza3RvcC9uZXdfaGluZHVzdGFuX2RhdHRhaHUvUGxhbnRzL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5pbXBvcnQgeyBoYW5kbGVPY3IgfSBmcm9tICcuL3NlcnZlci9vY3JIYW5kbGVyLmpzJ1xyXG5cclxuLy8gU2VydmVzIFBPU1QgL2FwaS9vY3IgZnJvbSB0aGUgZGV2L3ByZXZpZXcgc2VydmVyIHNvIHRoZSBPcGVuQUkga2V5IHN0YXlzIHNlcnZlci1zaWRlLlxyXG5jb25zdCBvY3JBcGkgPSAoZW52KSA9PiAoe1xyXG4gIG5hbWU6ICdvY3ItYXBpJyxcclxuICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XHJcbiAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL29jcicsIChyZXEsIHJlcykgPT4gaGFuZGxlT2NyKHJlcSwgcmVzLCBlbnYpKVxyXG4gIH0sXHJcbiAgY29uZmlndXJlUHJldmlld1NlcnZlcihzZXJ2ZXIpIHtcclxuICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9hcGkvb2NyJywgKHJlcSwgcmVzKSA9PiBoYW5kbGVPY3IocmVxLCByZXMsIGVudikpXHJcbiAgfSxcclxufSlcclxuXHJcbi8vIGh0dHBzOi8vdml0ZS5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XHJcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJykgLy8gYWxsIHZhcnMgaW5jbC4gbm9uLVZJVEVfIG9uZXMgKG5ldmVyIHNlbnQgdG8gYnJvd3NlcilcclxuICByZXR1cm4ge1xyXG4gICAgcGx1Z2luczogW3JlYWN0KCksIG9jckFwaShlbnYpXSxcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICBwb3J0OiA1MTc1LFxyXG4gICAgfSxcclxuICB9XHJcbn0pXHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYWNlclxcXFxEZXNrdG9wXFxcXG5ld19oaW5kdXN0YW5fZGF0dGFodVxcXFxQbGFudHNcXFxcc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhY2VyXFxcXERlc2t0b3BcXFxcbmV3X2hpbmR1c3Rhbl9kYXR0YWh1XFxcXFBsYW50c1xcXFxzZXJ2ZXJcXFxcc2NoZW1hcy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYWNlci9EZXNrdG9wL25ld19oaW5kdXN0YW5fZGF0dGFodS9QbGFudHMvc2VydmVyL3NjaGVtYXMuanNcIjsvLyBQYWdlLXdpc2UgZXh0cmFjdGlvbiBzY2hlbWFzLCBwcm9tcHQgaGludHMsIG91dHB1dCBjbGVhbmluZyBhbmQgYXJpdGhtZXRpYyBjcm9zcy1jaGVja3NcclxuLy8gZm9yIHRoZSBBSSBpbWFnZSByZWFkZXIuIEFsbCBsZWFmIHZhbHVlcyBhcmUgc3RyaW5nczsgY2xlYW5pbmcgdHVybnMgdGhlbSBpbnRvIGFwcC1yZWFkeSB2YWx1ZXMuXHJcblxyXG5jb25zdCBzdHIgPSB7IHR5cGU6ICdzdHJpbmcnIH1cclxuXHJcbmNvbnN0IG9iaiA9IChwcm9wZXJ0aWVzKSA9PiAoe1xyXG4gIHR5cGU6ICdvYmplY3QnLFxyXG4gIHByb3BlcnRpZXMsXHJcbiAgcmVxdWlyZWQ6IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLFxyXG4gIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBmYWxzZSxcclxufSlcclxuXHJcbmNvbnN0IHRhYmxlID0gKHJvd1Byb3BzLCBleHRyYSA9IHt9KSA9PlxyXG4gIG9iaih7IC4uLmV4dHJhLCByb3dzOiB7IHR5cGU6ICdhcnJheScsIGl0ZW1zOiBvYmoocm93UHJvcHMpIH0gfSlcclxuXHJcbi8vIG51bWVyaWM6IGRpZ2l0cyArIG9wdGlvbmFsIGRlY2ltYWwgcG9pbnQgKGFuZCBhIHRyYWlsaW5nICUgd2hlcmUgdGhlIGNlbGwgaXMgYSBwZXJjZW50YWdlKVxyXG4vLyBwY3Q6ICAgICBudW1lcmljIGNlbGxzIHRoYXQgbWF5IGxlZ2l0aW1hdGVseSBjYXJyeSBhIHRyYWlsaW5nICVcclxuLy8gZGF0ZTogICAgbm9ybWFsaXNlZCB0byBZWVlZLU1NLUREXHJcbmNvbnN0IEZJRUxEUyA9IHtcclxuICBzdG9ja19yYXc6IHtcclxuICAgIG51bWVyaWM6IFsnb3BlbmluZ1N0b2NrJywgJ2lud2FyZCcsICdjb25zdW1wdGlvbicsICdmaW5lczNRdHknLCAncHJvZHVjdGlvbicsICdkaXNwYXRjaCcsICdjbG9zaW5nU3RvY2snXSxcclxuICAgIHBjdDogWydjcnVzaGluZycsICdmaW5lczMnXSxcclxuICAgIGRhdGU6IFsncmVwb3J0RGF0ZSddLFxyXG4gIH0sXHJcbiAgc3RvY2tfY29hbDoge1xyXG4gICAgbnVtZXJpYzogWydvcGVuaW5nU3RvY2snLCAnaW53YXJkJywgJ2NvbnN1bXB0aW9uJywgJ2ZjJywgJ2xhbmRlZENvc3QnLCAnZGlzcGF0Y2gnLCAnY2xvc2luZ1N0b2NrJ10sXHJcbiAgICBwY3Q6IFsnbW9pc3RMb3NzUGN0J10sXHJcbiAgICBkYXRlOiBbJ3JlcG9ydERhdGUnXSxcclxuICB9LFxyXG4gIHRyYW5zZmVyOiB7IG51bWVyaWM6IFsncXR5JywgJ3JhdGUnXSwgcGN0OiBbXSwgZGF0ZTogW10gfSxcclxuICBwcm9kdWN0aW9uOiB7IG51bWVyaWM6IFsnazFWYWx1ZScsICdrMlZhbHVlJywgJ3RvdGFsVmFsdWUnXSwgcGN0OiBbJ3BlcmNlbnRWYWx1ZSddLCBkYXRlOiBbJ2RhdGUnXSB9LFxyXG4gIHNhdWRhX3NhbGU6IHtcclxuICAgIG51bWVyaWM6IFsnc2F1ZGFRdWFudGl0eScsICdyYXRlQW10JywgJ3BydlBlbmRpbmcnLCAncXR5RGlzcGF0Y2gnLCAnYmFsUGVuZGluZyddLFxyXG4gICAgcGN0OiBbXSxcclxuICAgIGRhdGU6IFsnZGF0ZSddLFxyXG4gIH0sXHJcbiAgc2F1ZGFfcHVyY2hhc2U6IHtcclxuICAgIG51bWVyaWM6IFsnb3JkZXJRdWFudGl0eScsICdyYXRlTXQnLCAndGNzJywgJ2JoYWRhJywgJ2xhbmRpbmdDb3N0JywgJ2dzdCcsICdncm9zc1JhdGUnLCAnbmV0UmF0ZScsICdxdHlSZWNlaXZlZCcsICdiYWxQZW5kaW5nJ10sXHJcbiAgICBwY3Q6IFtdLFxyXG4gICAgZGF0ZTogWydkYXRlJ10sXHJcbiAgfSxcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IFBBR0VTID0ge1xyXG4gIHN0b2NrX3Jhdzoge1xyXG4gICAgc2NoZW1hOiB0YWJsZShcclxuICAgICAge1xyXG4gICAgICAgIGNhdGVnb3J5OiBzdHIsIG1hdGVyaWFsOiBzdHIsIG9wZW5pbmdTdG9jazogc3RyLCBpbndhcmQ6IHN0ciwgY29uc3VtcHRpb246IHN0cixcclxuICAgICAgICBjcnVzaGluZzogc3RyLCBmaW5lczM6IHN0ciwgZmluZXMzUXR5OiBzdHIsIHByb2R1Y3Rpb246IHN0ciwgZGlzcGF0Y2g6IHN0ciwgY2xvc2luZ1N0b2NrOiBzdHIsXHJcbiAgICAgIH0sXHJcbiAgICAgIHsgcmVwb3J0RGF0ZTogc3RyIH1cclxuICAgICksXHJcbiAgICBoaW50OiBgUkFXIE1BVEVSSUFMIFNUT0NLIHNoZWV0ICh0YWJsZSBvZiBtYXRlcmlhbHMgd2l0aCBzdG9jayBjb2x1bW5zKS4gVHlwaWNhbCBjb2x1bW5zIGxlZnQgdG8gcmlnaHQ6IE1hdGVyaWFsLCBPcGVuaW5nIFN0b2NrLCBJbndhcmQsIENvbnN1bXB0aW9uLCBDcnVzaGluZy9TY3JlZW4sIEZpbmVzICUsIEZpbmVzIHF0eSwgUHJvZHVjdGlvbiwgRGlzcGF0Y2gsIENsb3NpbmcgU3RvY2s7IGhlYWRlcnMgbWF5IGJlIHdvcmRlZCBzbGlnaHRseSBkaWZmZXJlbnRseSBvciBiZSBpbiBhIGRpZmZlcmVudCBvcmRlciAtIG1hdGNoIGVhY2ggdmFsdWUgdG8gdGhlIGNvbHVtbiBoZWFkZXIgcHJpbnRlZCBhYm92ZSBpdC5cclxuQ29weSBldmVyeSBkaWdpdCBvZiBsb25nIG51bWJlcnMgY2FyZWZ1bGx5IChkbyBub3QgZHJvcCBhIGRpZ2l0IGZyb20gNC1kaWdpdCBpbnRlZ2VyIHBhcnRzIHN1Y2ggYXMgMTIzNC41NjcpLlxyXG5Hcm91cCBoZWFkaW5nIHJvd3MgKGJvbGQvY2VudGVyZWQgcm93cyB3aXRoIG5vIGZpZ3VyZXMsIGUuZy4gXCJSQVcgSVJPTiBPUkVcIikgZ28gaW4gXCJjYXRlZ29yeVwiIGZvciB0aGUgcm93cyBiZW5lYXRoIHRoZW07IGVhY2ggbWF0ZXJpYWwgcm93IGdldHMgaXRzIG93biBwYXJlbnQgaGVhZGluZy4gSGVhZGluZ3MgYXJlIG5vdCBkYXRhIHJvd3MuXHJcblJlYWQgb25seSB0aGUgcmF3LW1hdGVyaWFsIHBhcnQ6IHN0b3AgYmVmb3JlIGFueSBDT0FMIHNlY3Rpb24gYW5kIGlnbm9yZSBUT1RBTCAvIFNVQiBUT1RBTCAvIEdSQU5EIFRPVEFMIHJvd3MuXHJcblwicmVwb3J0RGF0ZVwiID0gdGhlIFwiQVMgT04gREFURVwiIGRhdGUgaWYgdGhlIHNoZWV0IHByaW50cyBvbmUsIG90aGVyd2lzZSB0aGUgbWFpbiBkYXRlIGF0IHRoZSB0b3Agb2YgdGhlIHNoZWV0LiBCbGFuayBjZWxscyBzdGF5IFwiXCIuYCxcclxuICB9LFxyXG4gIHN0b2NrX2NvYWw6IHtcclxuICAgIHNjaGVtYTogdGFibGUoXHJcbiAgICAgIHtcclxuICAgICAgICBjYXRlZ29yeTogc3RyLCBtYXRlcmlhbDogc3RyLCBvcGVuaW5nU3RvY2s6IHN0ciwgaW53YXJkOiBzdHIsIGNvbnN1bXB0aW9uOiBzdHIsXHJcbiAgICAgICAgZmM6IHN0ciwgbW9pc3RMb3NzUGN0OiBzdHIsIGxhbmRlZENvc3Q6IHN0ciwgZGlzcGF0Y2g6IHN0ciwgY2xvc2luZ1N0b2NrOiBzdHIsXHJcbiAgICAgIH0sXHJcbiAgICAgIHsgcmVwb3J0RGF0ZTogc3RyIH1cclxuICAgICksXHJcbiAgICBoaW50OiBgQ09BTCBERVRBSUxTIHNlY3Rpb24gb2YgYSBzdG9jayBzaGVldCwgaW5jbHVkaW5nIGFueSBleHRyYSBpdGVtIHJvd3MgcHJpbnRlZCBiZWxvdyB0aGUgY29hbCBUT1RBTCByb3cgZG93biB0byB0aGUgZW5kIG9mIHRoZSB0YWJsZSAoZS5nLiBvdGhlciBtYXRlcmlhbHMgbGlzdGVkIGFmdGVyIFwiVE9UQUwgQ09BTFwiKS4gVHlwaWNhbCBjb2x1bW5zOiBNYXRlcmlhbCwgT3BlbmluZyBTdG9jaywgSW53YXJkLCBDb25zdW1wdGlvbiAobmV0IGNvbnMuKSwgRi9DIChmaXhlZCBjYXJib24pLCBNb2lzdHVyZSBsb3NzLCBMYW5kZWQgQ29zdCwgRGlzcGF0Y2gsIENsb3NpbmcgU3RvY2s7IG1hdGNoIGVhY2ggdmFsdWUgdG8gdGhlIGhlYWRlciBwcmludGVkIGFib3ZlIGl0LlxyXG5SZWFkIGFsbCBjb2FsIHJvd3MgYW5kIGFsc28gdGhlIGl0ZW0gcm93cyBhZnRlciB0aGUgY29hbCBUT1RBTCByb3c7IHNraXAgb25seSBUT1RBTCByb3dzLiBcImNhdGVnb3J5XCI6IHRoZSBjb2FsIHNlY3Rpb24gaGVhZGluZyBmb3IgY29hbCByb3dzLCBhbmQgdGhlIHJvdydzIG93biBoZWFkaW5nL2xhYmVsIGZvciBleHRyYSBpdGVtIHJvd3MgYWZ0ZXIgdGhlIHRvdGFsLlxyXG5cImZjXCIgPSB0aGUgbnVtYmVyIG9ubHkuIFJlYWQgdGhlIExhbmRlZCBDb3N0IGNvbHVtbiBjYXJlZnVsbHkgYW5kIG5ldmVyIGxlYXZlIGl0IGVtcHR5IHdoZW4gYSB2YWx1ZSBpcyBwcmludGVkIHRoZXJlLiBEaXNwYXRjaC9Qcm9kdWN0aW9uLXR5cGUgZmlndXJlcyBwcmludGVkIGluIHRoZSBleHRyYSByb3dzIGdvIGluIHRoZWlyIG1hdGNoaW5nIGNvbHVtbnMuXHJcblwicmVwb3J0RGF0ZVwiID0gdGhlIFwiQVMgT04gREFURVwiIGRhdGUgaWYgdGhlIHNoZWV0IHByaW50cyBvbmUsIG90aGVyd2lzZSB0aGUgbWFpbiBkYXRlIGF0IHRoZSB0b3AuIEJsYW5rIGNlbGxzIHN0YXkgXCJcIi5gLFxyXG4gIH0sXHJcbiAgdHJhbnNmZXI6IHtcclxuICAgIHNjaGVtYTogdGFibGUoeyBlbnRyeVR5cGU6IHN0ciwgcGFydHlOYW1lOiBzdHIsIG1hdGVyaWFsTmFtZTogc3RyLCB2ZWhpY2xlTm86IHN0ciwgcXR5OiBzdHIsIHJhdGU6IHN0ciB9KSxcclxuICAgIGhpbnQ6IGBJbmNvbWluZyAvIG91dGdvaW5nIG1hdGVyaWFsIHJlY29yZDogYSByZWdpc3RlciwgZ2F0ZSBwYXNzLCBzbGlwLCBvciBhIGNoYXQgbWVzc2FnZSAoZS5nLiBXaGF0c0FwcC9UZWxlZ3JhbSBzY3JlZW5zaG90KS4gT25lIHJvdyBwZXIgZW50cnkuXHJcblwiZW50cnlUeXBlXCI6IFwiaW5jb21pbmdcIiBvciBcIm91dGdvaW5nXCIgLSB0YWtlIGl0IGZyb20gdGhlIGhlYWRpbmcvbGFiZWwgdGhhdCBhcHBsaWVzIHRvIHRoZSBsaW5lcyBiZWxvdyBpdCAoXCJcIiBpZiBub3Qgc3RhdGVkKS4gXCJtYXRlcmlhbE5hbWVcIiBhbmQgXCJwYXJ0eU5hbWVcIiBhcmUgc2VwYXJhdGU6IG1hdGVyaWFsID0gd2hhdCB3YXMgbW92ZWQsIHBhcnR5ID0gdGhlIGNvbXBhbnkvcGVyc29uLiBXb3JkcyBsaWtlIFwiYWR2YW5jZSBwYXltZW50XCIgb3IgXCJsb2FkaW5nIHBheW1lbnRcIiBhcmUgbm90IHBhcnQgb2YgZWl0aGVyLiBcInF0eVwiID0gdGhlIHF1YW50aXR5IG51bWJlciBvbmx5IChubyB1bml0KS4gQSBudW1iZXIgaW4gYnJhY2tldHMgYWZ0ZXIgdGhlIHF1YW50aXR5IChsaWtlIFwiTXQoMylcIikgaXMgYSB0cmlwL3ZlaGljbGUgY291bnQsIE5PVCB0aGUgcXVhbnRpdHkuIFwicmF0ZVwiID0gdGhlIHByaWNlIG51bWJlciBvbmx5IChkcm9wIEAsIC8tLCBScywgY3VycmVuY3kpLiBcInZlaGljbGVOb1wiID0gdmVoaWNsZSBudW1iZXIgZXhhY3RseSBhcyB3cml0dGVuLCBlbHNlIFwiXCIuYCxcclxuICB9LFxyXG4gIHByb2R1Y3Rpb246IHtcclxuICAgIHNjaGVtYTogdGFibGUoXHJcbiAgICAgIHsgbWV0cmljTmFtZTogc3RyLCBwZXJjZW50VmFsdWU6IHN0ciwgazFWYWx1ZTogc3RyLCBrMlZhbHVlOiBzdHIsIHRvdGFsVmFsdWU6IHN0ciB9LFxyXG4gICAgICB7IGRhdGU6IHN0ciwgZG93blRpbWVSZW1hcmtzOiBzdHIgfVxyXG4gICAgKSxcclxuICAgIGhpbnQ6IGBEYWlseSBQUk9EVUNUSU9OIHJlcG9ydCAoaXQgbWF5IGJlIG9uZSBzZWN0aW9uIG9mIGEgYmlnZ2VyIE1JUyBwYWdlIC0gaWdub3JlIGFsbCBvdGhlciBzZWN0aW9ucyBzdWNoIGFzIGNvbnN1bXB0aW9uIHRhYmxlcywgY29zdHMgYW5kIGRvd24tdGltZSkuIFJlYWQgb25seSB0aGUgcHJvZHVjdGlvbiB0YWJsZTogZWFjaCByb3cgaXMgYSBncmFkZS9tZXRyaWMgd2l0aCBzb21lIG9mIHRoZXNlIHZhbHVlIGNvbHVtbnM6IHBlcmNlbnQsIGtpbG4gMSwga2lsbiAyLCB0b3RhbC4gUHV0IGVhY2ggbnVtYmVyIHVuZGVyIHRoZSBjb2x1bW4gaGVhZGVyIGl0IHNpdHMgYmVsb3cuXHJcbklmIHRoZSB0YWJsZSBoYXMganVzdCBPTkUgdmFsdWUgY29sdW1uLCB0aGF0IHNpbmdsZSBxdWFudGl0eSBpcyB0aGUgcm93J3MgdG90YWw6IHB1dCBpdCBpbiBcInRvdGFsVmFsdWVcIiBBTkQgaW4gXCJrMVZhbHVlXCIsIGFuZCBsZWF2ZSBwZXJjZW50VmFsdWUgYW5kIGsyVmFsdWUgXCJcIi4gTmV2ZXIgY2FsY3VsYXRlIGEgcGVyY2VudGFnZTsgbGVhdmUgcGVyY2VudFZhbHVlIFwiXCIgdW5sZXNzIGl0IGlzIHByaW50ZWQuXHJcblwiZG93blRpbWVSZW1hcmtzXCIgPSB0aGUgdGV4dCB3cml0dGVuIGluIHRoZSByZW1hcmtzIGJveCBuZXh0IHRvIHRoZSBcIlJFTUFSS1NcIiBsYWJlbCAobm90IHRoZSBsYWJlbCBpdHNlbGYsIG5vdCBvdGhlciBjYXB0aW9ucyBzdWNoIGFzIFwiZmVlZCBsb3NzIHRpbWVcIik7IGlmIG9ubHkgYSBkYXNoIGlzIHdyaXR0ZW4sIHJldHVybiBcIi1cIi4gXCJkYXRlXCIgPSB0aGUgcmVwb3J0IGRhdGUuYCxcclxuICB9LFxyXG4gIHNhdWRhX3NhbGU6IHtcclxuICAgIHNjaGVtYTogdGFibGUoe1xyXG4gICAgICBkYXRlOiBzdHIsIG1haW5IZWFkaW5nOiBzdHIsIGl0ZW1OYW1lOiBzdHIsIHBhcnR5TmFtZTogc3RyLFxyXG4gICAgICBzYXVkYVF1YW50aXR5OiBzdHIsIHJhdGVBbXQ6IHN0ciwgcHJ2UGVuZGluZzogc3RyLCBxdHlEaXNwYXRjaDogc3RyLCBiYWxQZW5kaW5nOiBzdHIsXHJcbiAgICB9KSxcclxuICAgIGhpbnQ6IGBTQVVEQSAoc2FsZXMgb3JkZXIpIHNoZWV0LiBPbmUgcm93IHBlciBvcmRlci9wYXJ0eS4gXCJtYWluSGVhZGluZ1wiID0gdGhlIGJvbGQgZ3JvdXAgaGVhZGluZyBhYm92ZSBhIHNldCBvZiByb3dzLiBUeXBpY2FsIGNvbHVtbnM6IERhdGUsIEl0ZW0sIFBhcnR5LCBTYXVkYSBRdWFudGl0eSwgUmF0ZSwgUHJldmlvdXMgUGVuZGluZywgUXR5IERpc3BhdGNoZWQsIEJhbGFuY2UgUGVuZGluZyAtIG1hdGNoIGVhY2ggdmFsdWUgdG8gaXRzIGNvbHVtbiBoZWFkZXIuIFNraXAgVE9UQUwgcm93cy5gLFxyXG4gIH0sXHJcbiAgc2F1ZGFfcHVyY2hhc2U6IHtcclxuICAgIHNjaGVtYTogdGFibGUoe1xyXG4gICAgICBkYXRlOiBzdHIsIG1haW5IZWFkaW5nOiBzdHIsIGl0ZW1OYW1lOiBzdHIsIHBhcnR5TmFtZTogc3RyLCBvcmRlclF1YW50aXR5OiBzdHIsIHJhdGVNdDogc3RyLFxyXG4gICAgICB0Y3M6IHN0ciwgYmhhZGE6IHN0ciwgbGFuZGluZ0Nvc3Q6IHN0ciwgZ3N0OiBzdHIsIGdyb3NzUmF0ZTogc3RyLCBuZXRSYXRlOiBzdHIsXHJcbiAgICAgIHF0eVJlY2VpdmVkOiBzdHIsIGJhbFBlbmRpbmc6IHN0cixcclxuICAgIH0pLFxyXG4gICAgaGludDogYFNBVURBIFBVUkNIQVNFIC8gTUFURVJJQUwgUFVSQ0hBU0Ugc2hlZXQuIE9uZSByb3cgcGVyIGVudHJ5OyBza2lwIFRPVEFMIHJvd3MuIFwibWFpbkhlYWRpbmdcIiA9IHRoZSBjb2xvdXJlZC9ib2xkIGdyb3VwIGhlYWRpbmcgYWJvdmUgYSBzZXQgb2Ygcm93cy4gVHlwaWNhbCBjb2x1bW5zOiBEYXRlLCBNYXRlcmlhbCwgUGFydHkgTmFtZSwgUXVhbnRpdHkgKE1UKSwgUmF0ZS9NVCwgVGNzLCBCaGFkYSwgTGFuZGluZyBDb3N0LCBHU1QsIEdyb3NzIFJhdGUsIE5ldCBSYXRlLCBRdHkgUmVjZWl2ZWQgdGlsbCBkYXRlLCBCYWxhbmNlIChNVCkgLSBtYXRjaCBlYWNoIHZhbHVlIHRvIGl0cyBjb2x1bW4gaGVhZGVyOyBibGFuayBjZWxscyBzdGF5IFwiXCIuYCxcclxuICB9LFxyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tIGNsZWFuaW5nIC0tLS0tLS0tLS1cclxuXHJcbi8vIENvbW1vbiBDeXJpbGxpYy9HcmVlayBsb29rLWFsaWtlcyB0aGUgbW9kZWwgb2NjYXNpb25hbGx5IGVtaXRzIGluc2lkZSBMYXRpbiB0ZXh0XHJcbmNvbnN0IExPT0tBTElLRSA9IHsgXHUwNDMwOiAnYScsIFx1MDQzNTogJ2UnLCBcdTA0M0U6ICdvJywgXHUwNDQwOiAncCcsIFx1MDQ0MTogJ2MnLCBcdTA0NDU6ICd4JywgXHUwNDQzOiAneScsIFx1MDQ1NjogJ2knLCBcdTA0NTg6ICdqJywgXHUwNDEwOiAnQScsIFx1MDQxMjogJ0InLCBcdTA0MTU6ICdFJywgXHUwNDFBOiAnSycsIFx1MDQxQzogJ00nLCBcdTA0MUQ6ICdIJywgXHUwNDFFOiAnTycsIFx1MDQyMDogJ1AnLCBcdTA0MjE6ICdDJywgXHUwNDIyOiAnVCcsIFx1MDQyNTogJ1gnIH1cclxuXHJcbmNvbnN0IGNsZWFuVGV4dCA9ICh2KSA9PlxyXG4gIFN0cmluZyh2ID8/ICcnKVxyXG4gICAgLnJlcGxhY2UoL1tcdTA0MDAtXHUwNEZGXS9nLCAoYykgPT4gTE9PS0FMSUtFW2NdID8/IGMpXHJcbiAgICAucmVwbGFjZSgvW1x1MjAxOFx1MjAxOV0vZywgXCInXCIpXHJcbiAgICAucmVwbGFjZSgvW1x1MjAxQ1x1MjAxRF0vZywgJ1wiJylcclxuICAgIC5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICAgIC50cmltKClcclxuXHJcbi8vIFwiMTIzLjYwMCBNdCg1KVwiIC0+IFwiMTIzLjYwMFwiLCBcIkAzMzAvLVwiIC0+IFwiMzMwXCIsIFwiMzAsMDExXCIgLT4gXCIzMDAxMVwiLCBcIjkxMDAqXCIgLT4gXCI5MTAwXCIsIFwiNTIgRkNcIiAtPiBcIjUyXCIsIFwiLVwiIC0+IFwiXCJcclxuZXhwb3J0IGNvbnN0IGNsZWFuTnVtYmVyID0gKHYsIGFsbG93UGN0ID0gZmFsc2UpID0+IHtcclxuICBjb25zdCBzID0gU3RyaW5nKHYgPz8gJycpLnJlcGxhY2UoLywvZywgJycpLnJlcGxhY2UoL1tcdTIyMTJcdTIwMTNdL2csICctJylcclxuICBjb25zdCBtID0gcy5tYXRjaCgvLT9cXGQrKD86XFwuXFxkKyk/fC0/XFwuXFxkKy8pXHJcbiAgaWYgKCFtKSByZXR1cm4gJydcclxuICBjb25zdCBoYXNQY3QgPSBhbGxvd1BjdCAmJiBuZXcgUmVnRXhwKGAke21bMF0ucmVwbGFjZSgnLicsICdcXFxcLicpfVxcXFxzKiVgKS50ZXN0KHMpXHJcbiAgcmV0dXJuIG1bMF0gKyAoaGFzUGN0ID8gJyUnIDogJycpXHJcbn1cclxuXHJcbmNvbnN0IE1PTlRIUyA9IHsgamFuOiAxLCBmZWI6IDIsIG1hcjogMywgYXByOiA0LCBtYXk6IDUsIGp1bjogNiwganVsOiA3LCBhdWc6IDgsIHNlcDogOSwgb2N0OiAxMCwgbm92OiAxMSwgZGVjOiAxMiB9XHJcbmNvbnN0IHBhZCA9IChuKSA9PiBTdHJpbmcobikucGFkU3RhcnQoMiwgJzAnKVxyXG5cclxuZXhwb3J0IGNvbnN0IGNsZWFuRGF0ZSA9ICh2KSA9PiB7XHJcbiAgY29uc3QgcyA9IFN0cmluZyh2ID8/ICcnKS50cmltKClcclxuICBpZiAoIXMpIHJldHVybiAnJ1xyXG4gIGlmICgvXlxcZHs0fS1cXGR7Mn0tXFxkezJ9JC8udGVzdChzKSkgcmV0dXJuIHNcclxuICBsZXQgbSA9IHMubWF0Y2goL14oXFxkezR9KVsuXFwtL10oXFxkezEsMn0pWy5cXC0vXShcXGR7MSwyfSkkLylcclxuICBpZiAobSkgcmV0dXJuIGAke21bMV19LSR7cGFkKG1bMl0pfS0ke3BhZChtWzNdKX1gXHJcbiAgbSA9IHMubWF0Y2goLyhcXGR7MSwyfSlbLlxcLS8gXSsoW0EtWmEtel17Myw5fSlbLlxcLS8gLF0rKFxcZHsyLDR9KS8pXHJcbiAgaWYgKG0gJiYgTU9OVEhTW21bMl0uc2xpY2UoMCwgMykudG9Mb3dlckNhc2UoKV0pIHtcclxuICAgIGNvbnN0IHkgPSBtWzNdLmxlbmd0aCA9PT0gMiA/ICcyMCcgKyBtWzNdIDogbVszXVxyXG4gICAgcmV0dXJuIGAke3l9LSR7cGFkKE1PTlRIU1ttWzJdLnNsaWNlKDAsIDMpLnRvTG93ZXJDYXNlKCldKX0tJHtwYWQobVsxXSl9YFxyXG4gIH1cclxuICBtID0gcy5tYXRjaCgvKFxcZHsxLDJ9KVsuXFwtL10oXFxkezEsMn0pWy5cXC0vXShcXGR7Miw0fSkvKVxyXG4gIGlmIChtKSByZXR1cm4gYCR7bVszXS5sZW5ndGggPT09IDIgPyAnMjAnICsgbVszXSA6IG1bM119LSR7cGFkKG1bMl0pfS0ke3BhZChtWzFdKX1gXHJcbiAgcmV0dXJuICcnXHJcbn1cclxuXHJcbi8vIFJldHVybnMgYSBjbGVhbmVkIGNvcHkgb2YgdGhlIG1vZGVsIG91dHB1dC4gTmV2ZXIgaW52ZW50cyB2YWx1ZXM6IHVucGFyc2VhYmxlIG51bWJlcnMgYmVjb21lIFwiXCIuXHJcbmV4cG9ydCBjb25zdCBzYW5pdGl6ZSA9IChwYWdlLCBkYXRhKSA9PiB7XHJcbiAgY29uc3QgZiA9IEZJRUxEU1twYWdlXVxyXG4gIGNvbnN0IGZpeCA9IChvYmopID0+IHtcclxuICAgIGNvbnN0IG91dCA9IHt9XHJcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhvYmopKSB7XHJcbiAgICAgIGlmIChrID09PSAncm93cycpIGNvbnRpbnVlXHJcbiAgICAgIGlmIChmLm51bWVyaWMuaW5jbHVkZXMoaykpIG91dFtrXSA9IGNsZWFuTnVtYmVyKHYpXHJcbiAgICAgIGVsc2UgaWYgKGYucGN0LmluY2x1ZGVzKGspKSBvdXRba10gPSBjbGVhbk51bWJlcih2LCB0cnVlKVxyXG4gICAgICBlbHNlIGlmIChmLmRhdGUuaW5jbHVkZXMoaykpIG91dFtrXSA9IGNsZWFuRGF0ZSh2KVxyXG4gICAgICBlbHNlIG91dFtrXSA9IGNsZWFuVGV4dCh2KVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG91dFxyXG4gIH1cclxuICBsZXQgcm93cyA9IChkYXRhPy5yb3dzIHx8IFtdKS5tYXAoZml4KVxyXG4gIGlmIChwYWdlID09PSAncHJvZHVjdGlvbicpIHtcclxuICAgIC8vIFNpbmdsZSB2YWx1ZSBjb2x1bW4gKG9ubHkgYSBxdWFudGl0eSBwcmludGVkIG9uIHRoZSByaWdodCk6IHRoZSBhcHAgd2FudHMgaXQgYXMgYm90aCBLaWxuIDEgYW5kIFRvdGFsLFxyXG4gICAgLy8gcmVnYXJkbGVzcyBvZiB3aGljaCBvZiB0aGUgdHdvIHRoZSBtb2RlbCBmaWxsZWQuXHJcbiAgICByb3dzID0gcm93cy5tYXAoKHIpID0+IHtcclxuICAgICAgaWYgKHIucGVyY2VudFZhbHVlID09PSAnJyAmJiByLmsyVmFsdWUgPT09ICcnKSB7XHJcbiAgICAgICAgaWYgKHIudG90YWxWYWx1ZSAhPT0gJycgJiYgci5rMVZhbHVlID09PSAnJykgcmV0dXJuIHsgLi4uciwgazFWYWx1ZTogci50b3RhbFZhbHVlIH1cclxuICAgICAgICBpZiAoci5rMVZhbHVlICE9PSAnJyAmJiByLnRvdGFsVmFsdWUgPT09ICcnKSByZXR1cm4geyAuLi5yLCB0b3RhbFZhbHVlOiByLmsxVmFsdWUgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByXHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4geyAuLi5maXgoZGF0YSB8fCB7fSksIHJvd3MgfVxyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tIGFyaXRobWV0aWMgY3Jvc3MtY2hlY2tzIChkb25lIGluIGNvZGUsIG5vdCBieSB0aGUgbW9kZWwpIC0tLS0tLS0tLS1cclxuXHJcbmNvbnN0IG51bSA9ICh2KSA9PiB7XHJcbiAgY29uc3QgbiA9IHBhcnNlRmxvYXQoU3RyaW5nKHYgPz8gJycpLnJlcGxhY2UoLywvZywgJycpKVxyXG4gIHJldHVybiBOdW1iZXIuaXNGaW5pdGUobikgPyBuIDogbnVsbFxyXG59XHJcbmNvbnN0IG5lYXIgPSAoYSwgYiwgdG9sID0gMC4wMTEpID0+IE1hdGguYWJzKGEgLSBiKSA8PSB0b2xcclxuXHJcbi8vIFdhcm5pbmdzIG9ubHk7IGEgd2FybmluZyBtZWFucyBcInRoZXNlIGZpZ3VyZXMgZG9uJ3QgYWRkIHVwLCBjaGVjayB0aGUgcGhvdG9cIiwgbm90IFwid3JvbmdcIi5cclxuZXhwb3J0IGNvbnN0IGNyb3NzQ2hlY2tzID0gKHBhZ2UsIGRhdGEpID0+IHtcclxuICBjb25zdCB3YXJuaW5ncyA9IFtdXHJcbiAgOyhkYXRhPy5yb3dzIHx8IFtdKS5mb3JFYWNoKChyLCBpKSA9PiB7XHJcbiAgICBjb25zdCB3aG8gPSByLnBhcnR5TmFtZSB8fCByLm1hdGVyaWFsIHx8IHIubWV0cmljTmFtZSB8fCAnJ1xyXG4gICAgY29uc3QgbGFiZWwgPSBgUm93ICR7aSArIDF9JHt3aG8gPyBgICgke3dob30pYCA6ICcnfWBcclxuXHJcbiAgICBpZiAocGFnZSA9PT0gJ3NhdWRhX3NhbGUnKSB7XHJcbiAgICAgIGNvbnN0IHMgPSBudW0oci5zYXVkYVF1YW50aXR5KSwgcCA9IG51bShyLnBydlBlbmRpbmcpLCBkID0gbnVtKHIucXR5RGlzcGF0Y2gpLCBiID0gbnVtKHIuYmFsUGVuZGluZylcclxuICAgICAgaWYgKGIgPT09IG51bGwgfHwgZCA9PT0gbnVsbCkgcmV0dXJuXHJcbiAgICAgIGNvbnN0IG9rID0gW3AgIT09IG51bGwgPyBwIC0gZCA6IG51bGwsIHMgIT09IG51bGwgJiYgcCAhPT0gbnVsbCA/IHMgKyBwIC0gZCA6IG51bGwsIHMgIT09IG51bGwgPyBzIC0gZCA6IG51bGxdXHJcbiAgICAgICAgLnNvbWUoKHgpID0+IHggIT09IG51bGwgJiYgbmVhcih4LCBiKSlcclxuICAgICAgaWYgKCFvaykgd2FybmluZ3MucHVzaChgJHtsYWJlbH06IEJhbGFuY2UgJHtifSBkb2VzIG5vdCBtYXRjaCBQcmV2IFBlbmRpbmcgLSBEaXNwYXRjaCAob3IgU2F1ZGEgLSBEaXNwYXRjaCkuYClcclxuICAgIH1cclxuXHJcbiAgICBpZiAocGFnZSA9PT0gJ3NhdWRhX3B1cmNoYXNlJykge1xyXG4gICAgICBjb25zdCBvID0gbnVtKHIub3JkZXJRdWFudGl0eSksIHEgPSBudW0oci5xdHlSZWNlaXZlZCksIGIgPSBudW0oci5iYWxQZW5kaW5nKVxyXG4gICAgICBpZiAobyAhPT0gbnVsbCAmJiBxICE9PSBudWxsICYmIGIgIT09IG51bGwgJiYgIW5lYXIobyAtIHEsIGIpKVxyXG4gICAgICAgIHdhcm5pbmdzLnB1c2goYCR7bGFiZWx9OiBPcmRlciAtIFJlY2VpdmVkID0gJHsobyAtIHEpLnRvRml4ZWQoMyl9IGJ1dCBCYWxhbmNlIHNob3dzICR7Yn0uYClcclxuICAgIH1cclxuXHJcbiAgICBpZiAocGFnZSA9PT0gJ3N0b2NrX3JhdycpIHtcclxuICAgICAgY29uc3QgbyA9IG51bShyLm9wZW5pbmdTdG9jayksIGMgPSBudW0oci5jbG9zaW5nU3RvY2spXHJcbiAgICAgIGlmIChvID09PSBudWxsIHx8IGMgPT09IG51bGwgfHwgbnVtKHIucHJvZHVjdGlvbikgfHwgbnVtKHIuZGlzcGF0Y2gpKSByZXR1cm5cclxuICAgICAgY29uc3QgZXhwID0gbyArIChudW0oci5pbndhcmQpIHx8IDApIC0gKG51bShyLmNvbnN1bXB0aW9uKSB8fCAwKVxyXG4gICAgICBpZiAoIW5lYXIoZXhwLCBjKSkgd2FybmluZ3MucHVzaChgJHtsYWJlbH06IE9wZW5pbmcgKyBJbndhcmQgLSBDb25zdW1wdGlvbiA9ICR7ZXhwLnRvRml4ZWQoMyl9IGJ1dCBDbG9zaW5nIHNob3dzICR7Y30uYClcclxuICAgIH1cclxuXHJcbiAgICBpZiAocGFnZSA9PT0gJ3N0b2NrX2NvYWwnKSB7XHJcbiAgICAgIGNvbnN0IG8gPSBudW0oci5vcGVuaW5nU3RvY2spLCBjID0gbnVtKHIuY2xvc2luZ1N0b2NrKVxyXG4gICAgICBpZiAobyA9PT0gbnVsbCB8fCBjID09PSBudWxsIHx8IG51bShyLmRpc3BhdGNoKSkgcmV0dXJuXHJcbiAgICAgIGNvbnN0IGJhc2UgPSBvICsgKG51bShyLmlud2FyZCkgfHwgMCkgLSAobnVtKHIuY29uc3VtcHRpb24pIHx8IDApXHJcbiAgICAgIGNvbnN0IG1vaXN0ID0gbnVtKHIubW9pc3RMb3NzUGN0KVxyXG4gICAgICAvLyBjbG9zaW5nIG1heSBvciBtYXkgbm90IGhhdmUgdGhlIG1vaXN0dXJlLWxvc3MgcXVhbnRpdHkgZGVkdWN0ZWRcclxuICAgICAgaWYgKCFuZWFyKGJhc2UsIGMpICYmICEobW9pc3QgIT09IG51bGwgJiYgbmVhcihiYXNlIC0gbW9pc3QsIGMpKSlcclxuICAgICAgICB3YXJuaW5ncy5wdXNoKGAke2xhYmVsfTogT3BlbmluZyArIElud2FyZCAtIENvbnN1bXB0aW9uID0gJHtiYXNlLnRvRml4ZWQoMyl9IGJ1dCBDbG9zaW5nIHNob3dzICR7Y30uYClcclxuICAgIH1cclxuXHJcbiAgICBpZiAocGFnZSA9PT0gJ3Byb2R1Y3Rpb24nKSB7XHJcbiAgICAgIGNvbnN0IGEgPSBudW0oci5rMVZhbHVlKSwgYiA9IG51bShyLmsyVmFsdWUpLCB0ID0gbnVtKHIudG90YWxWYWx1ZSlcclxuICAgICAgaWYgKGEgIT09IG51bGwgJiYgYiAhPT0gbnVsbCAmJiB0ICE9PSBudWxsICYmICFuZWFyKGEgKyBiLCB0LCAwLjAyKSlcclxuICAgICAgICB3YXJuaW5ncy5wdXNoKGAke2xhYmVsfTogS2lsbjEgKyBLaWxuMiA9ICR7KGEgKyBiKS50b0ZpeGVkKDMpfSBidXQgVG90YWwgc2hvd3MgJHt0fS5gKVxyXG4gICAgfVxyXG4gIH0pXHJcbiAgcmV0dXJuIHdhcm5pbmdzXHJcbn1cclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhY2VyXFxcXERlc2t0b3BcXFxcbmV3X2hpbmR1c3Rhbl9kYXR0YWh1XFxcXFBsYW50c1xcXFxzZXJ2ZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFjZXJcXFxcRGVza3RvcFxcXFxuZXdfaGluZHVzdGFuX2RhdHRhaHVcXFxcUGxhbnRzXFxcXHNlcnZlclxcXFxvY3JIYW5kbGVyLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9hY2VyL0Rlc2t0b3AvbmV3X2hpbmR1c3Rhbl9kYXR0YWh1L1BsYW50cy9zZXJ2ZXIvb2NySGFuZGxlci5qc1wiO2ltcG9ydCB7IFBBR0VTLCBzYW5pdGl6ZSwgY3Jvc3NDaGVja3MgfSBmcm9tICcuL3NjaGVtYXMuanMnXHJcblxyXG5jb25zdCBBUElfVVJMID0gJ2h0dHBzOi8vYXBpLm9wZW5haS5jb20vdjEvY2hhdC9jb21wbGV0aW9ucydcclxuY29uc3QgTUFYX0JPRFkgPSAyMCAqIDEwMjQgKiAxMDI0XHJcbmNvbnN0IFRJTUVPVVRfTVMgPSAxMjAgKiAxMDAwXHJcblxyXG5jb25zdCByZWFkQm9keSA9IChyZXEpID0+XHJcbiAgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgbGV0IHNpemUgPSAwXHJcbiAgICBjb25zdCBjaHVua3MgPSBbXVxyXG4gICAgcmVxLm9uKCdkYXRhJywgKGMpID0+IHtcclxuICAgICAgc2l6ZSArPSBjLmxlbmd0aFxyXG4gICAgICBpZiAoc2l6ZSA+IE1BWF9CT0RZKSB7IHJlamVjdChuZXcgRXJyb3IoJ0ltYWdlIHRvbyBsYXJnZScpKTsgcmVxLmRlc3Ryb3koKSB9XHJcbiAgICAgIGVsc2UgY2h1bmtzLnB1c2goYylcclxuICAgIH0pXHJcbiAgICByZXEub24oJ2VuZCcsICgpID0+IHJlc29sdmUoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGY4JykpKVxyXG4gICAgcmVxLm9uKCdlcnJvcicsIHJlamVjdClcclxuICB9KVxyXG5cclxuY29uc3Qgc2VuZCA9IChyZXMsIHN0YXR1cywgYm9keSkgPT4ge1xyXG4gIHJlcy5zdGF0dXNDb2RlID0gc3RhdHVzXHJcbiAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoYm9keSkpXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGNhbGxNb2RlbCh7IGtleSwgbW9kZWwsIG5hbWUsIHNjaGVtYSwgc3lzdGVtLCB1c2VyVGV4dCwgaW1hZ2UsIGVmZm9ydCB9KSB7XHJcbiAgY29uc3QgYm9keSA9IHtcclxuICAgIG1vZGVsLFxyXG4gICAgbWVzc2FnZXM6IFtcclxuICAgICAgeyByb2xlOiAnc3lzdGVtJywgY29udGVudDogc3lzdGVtIH0sXHJcbiAgICAgIHtcclxuICAgICAgICByb2xlOiAndXNlcicsXHJcbiAgICAgICAgY29udGVudDogW1xyXG4gICAgICAgICAgeyB0eXBlOiAndGV4dCcsIHRleHQ6IHVzZXJUZXh0IH0sXHJcbiAgICAgICAgICB7IHR5cGU6ICdpbWFnZV91cmwnLCBpbWFnZV91cmw6IHsgdXJsOiBpbWFnZSwgZGV0YWlsOiAnaGlnaCcgfSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICBdLFxyXG4gICAgcmVzcG9uc2VfZm9ybWF0OiB7IHR5cGU6ICdqc29uX3NjaGVtYScsIGpzb25fc2NoZW1hOiB7IG5hbWUsIHN0cmljdDogdHJ1ZSwgc2NoZW1hIH0gfSxcclxuICB9XHJcbiAgaWYgKGVmZm9ydCkgYm9keS5yZWFzb25pbmdfZWZmb3J0ID0gZWZmb3J0XHJcbiAgY29uc3QgciA9IGF3YWl0IGZldGNoKEFQSV9VUkwsIHtcclxuICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7a2V5fWAsICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpLFxyXG4gICAgc2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KFRJTUVPVVRfTVMpLFxyXG4gIH0pXHJcbiAgY29uc3QganNvbiA9IGF3YWl0IHIuanNvbigpLmNhdGNoKCgpID0+ICh7fSkpXHJcbiAgaWYgKCFyLm9rKSB0aHJvdyBuZXcgRXJyb3IoanNvbj8uZXJyb3I/Lm1lc3NhZ2UgfHwgYE9wZW5BSSBlcnJvciAke3Iuc3RhdHVzfWApXHJcbiAgY29uc3QgbXNnID0ganNvbi5jaG9pY2VzPy5bMF0/Lm1lc3NhZ2VcclxuICBpZiAobXNnPy5yZWZ1c2FsKSB0aHJvdyBuZXcgRXJyb3IoYE1vZGVsIHJlZnVzZWQ6ICR7bXNnLnJlZnVzYWx9YClcclxuICByZXR1cm4gSlNPTi5wYXJzZShtc2c/LmNvbnRlbnQgfHwgJ3t9JylcclxufVxyXG5cclxuY29uc3QgRVhUUkFDVF9TWVNURU0gPSBgWW91IHJlYWQgcGhvdG9zL3NjYW5zIG9mIHBsYW50IHBhcGVyd29yayBhbmQgcmV0dXJuIHRoZSBkYXRhIGFzIEpTT04uXHJcblJ1bGVzOlxyXG4tIENvcHkgdmFsdWVzIGV4YWN0bHkgYXMgcHJpbnRlZC4gTmV2ZXIgY2FsY3VsYXRlLCBlc3RpbWF0ZSBvciBcImZpeFwiIG51bWJlcnMuIENvcHkgbmFtZXMgbGV0dGVyIGJ5IGxldHRlciwga2VlcCBvcmlnaW5hbCBzcGVsbGluZy5cclxuLSBJZiBhIGNlbGwgaXMgYmxhbmssIGlsbGVnaWJsZSBvciB5b3UgYXJlIG5vdCBzdXJlLCByZXR1cm4gXCJcIiBmb3IgaXQuIERvIG5vdCBndWVzcyBkaWdpdHMuXHJcbi0gS2VlcCB0aGUgb3JpZ2luYWwgcm93IG9yZGVyLiBTa2lwIFRPVEFMIC8gU1VCIFRPVEFMIHJvd3MgYW5kIGNvbHVtbiBoZWFkZXJzLlxyXG4tIE51bWVyaWMgY2VsbHMgY29udGFpbiBPTkxZIGRpZ2l0cyBhbmQgb25lIG9wdGlvbmFsIGRlY2ltYWwgcG9pbnQ6IHJlbW92ZSB0aG91c2FuZHMgY29tbWFzLCB1bml0cyAoTXQsIEZDKSwgY3VycmVuY3kgYW5kIHN5bWJvbHMgKEAsIC8tLCAqKS4gS2VlcCBhIHRyYWlsaW5nICUgb25seSBmb3IgcGVyY2VudGFnZSBjZWxscy5cclxuLSBEYXRlczogWVlZWS1NTS1ERCAoZGQubW0ueXkgbWVhbnMgZGF5Lm1vbnRoLnllYXIpLmBcclxuXHJcbmNvbnN0IFZFUklGWV9TWVNURU0gPSBgWW91IGFyZSBhIGNhcmVmdWwgY2hlY2tlci4gWW91IGdldCBhbiBpbWFnZSBhbmQgZGF0YSBhbm90aGVyIHJlYWRlciBleHRyYWN0ZWQgZnJvbSBpdC5cclxuQ29tcGFyZSBldmVyeSB2YWx1ZSBhZ2FpbnN0IHRoZSBpbWFnZSwgZGlnaXQgYnkgZGlnaXQ6IHdhdGNoIGZvciBkcm9wcGVkIG9yIGV4dHJhIGRpZ2l0cyBpbiBsb25nIG51bWJlcnMuIENoYW5nZSBhIHZhbHVlIE9OTFkgaWYgeW91IGFyZSBDRVJUQUlOIHRoZSBpbWFnZSBzaG93cyBzb21ldGhpbmcgZGlmZmVyZW50IChhIHdyb25nIGRpZ2l0LCB3cm9uZyByb3cvY29sdW1uLCBtaXNzZWQgb3IgZXh0cmEgcm93KS4gRG8gTk9UIHJlZm9ybWF0LCBub3JtYWxpc2UsIHJlLXNwYWNlIG9yIFwiaW1wcm92ZVwiIHRleHQgb3IgbnVtYmVyczsgdGhlIGNsZWFuaW5nIHJ1bGVzIChudW1iZXJzIG9ubHksIG5vIHVuaXRzL3N5bWJvbHMsIGRhdGVzIFlZWVktTU0tREQpIG11c3QgYmUgcHJlc2VydmVkLlxyXG5JZiB1bnN1cmUsIGxlYXZlIHRoZSB2YWx1ZSBhcyBpcy4gUmV0dXJuIHRoZSBmdWxsIGRhdGEgaW4gXCJkYXRhXCIgYW5kIG9uZSBcImNvcnJlY3Rpb25zXCIgZW50cnkgcGVyIHZhbHVlIHlvdSBjaGFuZ2VkLmBcclxuXHJcbmNvbnN0IHZlcmlmeVNjaGVtYSA9IChkYXRhU2NoZW1hKSA9PiAoe1xyXG4gIHR5cGU6ICdvYmplY3QnLFxyXG4gIHByb3BlcnRpZXM6IHtcclxuICAgIGRhdGE6IGRhdGFTY2hlbWEsXHJcbiAgICBjb3JyZWN0aW9uczoge1xyXG4gICAgICB0eXBlOiAnYXJyYXknLFxyXG4gICAgICBpdGVtczoge1xyXG4gICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgIHJvdzogeyB0eXBlOiAnaW50ZWdlcicgfSxcclxuICAgICAgICAgIGZpZWxkOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICBmcm9tOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICB0bzogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgcmVhc29uOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICByZXF1aXJlZDogWydyb3cnLCAnZmllbGQnLCAnZnJvbScsICd0bycsICdyZWFzb24nXSxcclxuICAgICAgICBhZGRpdGlvbmFsUHJvcGVydGllczogZmFsc2UsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgdW5yZWFkYWJsZTogeyB0eXBlOiAnYXJyYXknLCBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9IH0sXHJcbiAgfSxcclxuICByZXF1aXJlZDogWydkYXRhJywgJ2NvcnJlY3Rpb25zJywgJ3VucmVhZGFibGUnXSxcclxuICBhZGRpdGlvbmFsUHJvcGVydGllczogZmFsc2UsXHJcbn0pXHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlT2NyKHJlcSwgcmVzLCBlbnYpIHtcclxuICBpZiAocmVxLm1ldGhvZCAhPT0gJ1BPU1QnKSByZXR1cm4gc2VuZChyZXMsIDQwNSwgeyBlcnJvcjogJ1BPU1Qgb25seScgfSlcclxuICBjb25zdCBrZXkgPSBlbnYuT1BFTkFJX0FQSV9LRVlcclxuICBpZiAoIWtleSkgcmV0dXJuIHNlbmQocmVzLCA1MDAsIHsgZXJyb3I6ICdPUEVOQUlfQVBJX0tFWSBpcyBub3Qgc2V0IG9uIHRoZSBzZXJ2ZXIgKC5lbnYpJyB9KVxyXG5cclxuICBsZXQgcGF5bG9hZFxyXG4gIHRyeSB7XHJcbiAgICBpZiAocmVxLmJvZHkgJiYgdHlwZW9mIHJlcS5ib2R5ID09PSAnb2JqZWN0Jykge1xyXG4gICAgICBwYXlsb2FkID0gcmVxLmJvZHlcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHJlcS5ib2R5ID09PSAnc3RyaW5nJykge1xyXG4gICAgICBwYXlsb2FkID0gSlNPTi5wYXJzZShyZXEuYm9keSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHBheWxvYWQgPSBKU09OLnBhcnNlKGF3YWl0IHJlYWRCb2R5KHJlcSkpXHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZSkgeyByZXR1cm4gc2VuZChyZXMsIDQwMCwgeyBlcnJvcjogZS5tZXNzYWdlIH0pIH1cclxuICBjb25zdCB7IHBhZ2UsIGltYWdlIH0gPSBwYXlsb2FkIHx8IHt9XHJcbiAgY29uc3QgY2ZnID0gUEFHRVNbcGFnZV1cclxuICBpZiAoIWNmZykgcmV0dXJuIHNlbmQocmVzLCA0MDAsIHsgZXJyb3I6IGBVbmtub3duIHBhZ2UgXCIke3BhZ2V9XCJgIH0pXHJcbiAgaWYgKHR5cGVvZiBpbWFnZSAhPT0gJ3N0cmluZycgfHwgIWltYWdlLnN0YXJ0c1dpdGgoJ2RhdGE6aW1hZ2UvJykpIHJldHVybiBzZW5kKHJlcywgNDAwLCB7IGVycm9yOiAnaW1hZ2UgbXVzdCBiZSBhIGRhdGE6aW1hZ2UgVVJMJyB9KVxyXG5cclxuICBjb25zdCBleHRyYWN0TW9kZWwgPSBlbnYuT0NSX01PREVMIHx8ICdncHQtNS42LXNvbCdcclxuICBjb25zdCB2ZXJpZnlNb2RlbCA9IGVudi5PQ1JfVkVSSUZZX01PREVMIHx8ICdncHQtNS42LXRlcnJhJ1xyXG4gIGNvbnN0IGVmZm9ydCA9IGVudi5PQ1JfRUZGT1JUIHx8IHVuZGVmaW5lZFxyXG4gIC8vIEEgc2Vjb25kIEFJIHBhc3MgYWRkZWQgbGl0dGxlIGFjY3VyYWN5IGluIHRlc3RpbmcgKGFuZCBkb3VibGVkIHRpbWUpLCBzbyBpdCBpcyBvcHQtaW46IE9DUl9WRVJJRlk9b25cclxuICBjb25zdCBkb1ZlcmlmeSA9IFN0cmluZyhlbnYuT0NSX1ZFUklGWSB8fCAnJykudG9Mb3dlckNhc2UoKSA9PT0gJ29uJ1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgZXh0cmFjdGVkID0gYXdhaXQgY2FsbE1vZGVsKHtcclxuICAgICAga2V5LCBtb2RlbDogZXh0cmFjdE1vZGVsLCBuYW1lOiBgJHtwYWdlfV9leHRyYWN0YCwgc2NoZW1hOiBjZmcuc2NoZW1hLFxyXG4gICAgICBzeXN0ZW06IEVYVFJBQ1RfU1lTVEVNLCB1c2VyVGV4dDogY2ZnLmhpbnQsIGltYWdlLCBlZmZvcnQsXHJcbiAgICB9KVxyXG5cclxuICAgIGxldCBkYXRhID0gZXh0cmFjdGVkXHJcbiAgICBsZXQgdmVyaWZpY2F0aW9uID0geyBzdGF0dXM6ICdyZWFkJywgY29ycmVjdGlvbnM6IFtdLCB1bnJlYWRhYmxlOiBbXSwgd2FybmluZ3M6IFtdIH1cclxuICAgIGlmIChkb1ZlcmlmeSkge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHYgPSBhd2FpdCBjYWxsTW9kZWwoe1xyXG4gICAgICAgICAga2V5LCBtb2RlbDogdmVyaWZ5TW9kZWwsIG5hbWU6IGAke3BhZ2V9X3ZlcmlmeWAsIHNjaGVtYTogdmVyaWZ5U2NoZW1hKGNmZy5zY2hlbWEpLFxyXG4gICAgICAgICAgc3lzdGVtOiBWRVJJRllfU1lTVEVNLFxyXG4gICAgICAgICAgdXNlclRleHQ6IGAke2NmZy5oaW50fVxcblxcbkV4dHJhY3RlZCBkYXRhIHRvIGNoZWNrOlxcbiR7SlNPTi5zdHJpbmdpZnkoZXh0cmFjdGVkKX1gLFxyXG4gICAgICAgICAgaW1hZ2UsIGVmZm9ydCxcclxuICAgICAgICB9KVxyXG4gICAgICAgIGRhdGEgPSB2LmRhdGFcclxuICAgICAgICB2ZXJpZmljYXRpb24uY29ycmVjdGlvbnMgPSB2LmNvcnJlY3Rpb25zXHJcbiAgICAgICAgdmVyaWZpY2F0aW9uLnVucmVhZGFibGUgPSB2LnVucmVhZGFibGVcclxuICAgICAgICB2ZXJpZmljYXRpb24uc3RhdHVzID0gdi5jb3JyZWN0aW9ucy5sZW5ndGggfHwgdi51bnJlYWRhYmxlLmxlbmd0aCA/ICdjb3JyZWN0ZWQnIDogJ3ZlcmlmaWVkJ1xyXG4gICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgdmVyaWZpY2F0aW9uID0geyBzdGF0dXM6ICd1bnZlcmlmaWVkJywgY29ycmVjdGlvbnM6IFtdLCB1bnJlYWRhYmxlOiBbXSwgd2FybmluZ3M6IFtdLCBtZXNzYWdlOiBlLm1lc3NhZ2UgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZGF0YSA9IHNhbml0aXplKHBhZ2UsIGRhdGEpXHJcbiAgICB2ZXJpZmljYXRpb24ud2FybmluZ3MgPSBjcm9zc0NoZWNrcyhwYWdlLCBkYXRhKVxyXG4gICAgcmV0dXJuIHNlbmQocmVzLCAyMDAsIHsgZGF0YSwgdmVyaWZpY2F0aW9uLCBtb2RlbHM6IHsgZXh0cmFjdE1vZGVsLCB2ZXJpZnlNb2RlbDogZG9WZXJpZnkgPyB2ZXJpZnlNb2RlbCA6IG51bGwgfSB9KVxyXG4gIH0gY2F0Y2ggKGUpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1tvY3JdJywgZS5tZXNzYWdlKVxyXG4gICAgcmV0dXJuIHNlbmQocmVzLCA1MDIsIHsgZXJyb3I6IGUubmFtZSA9PT0gJ1RpbWVvdXRFcnJvcicgPyAnVGhlIEFJIHRvb2sgdG9vIGxvbmcuIFBsZWFzZSB0cnkgYWdhaW4uJyA6IGUubWVzc2FnZSB9KVxyXG4gIH1cclxufVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9WLFNBQVMsY0FBYyxlQUFlO0FBQzFYLE9BQU8sV0FBVzs7O0FDRWxCLElBQU0sTUFBTSxFQUFFLE1BQU0sU0FBUztBQUU3QixJQUFNLE1BQU0sQ0FBQyxnQkFBZ0I7QUFBQSxFQUMzQixNQUFNO0FBQUEsRUFDTjtBQUFBLEVBQ0EsVUFBVSxPQUFPLEtBQUssVUFBVTtBQUFBLEVBQ2hDLHNCQUFzQjtBQUN4QjtBQUVBLElBQU0sUUFBUSxDQUFDLFVBQVUsUUFBUSxDQUFDLE1BQ2hDLElBQUksRUFBRSxHQUFHLE9BQU8sTUFBTSxFQUFFLE1BQU0sU0FBUyxPQUFPLElBQUksUUFBUSxFQUFFLEVBQUUsQ0FBQztBQUtqRSxJQUFNLFNBQVM7QUFBQSxFQUNiLFdBQVc7QUFBQSxJQUNULFNBQVMsQ0FBQyxnQkFBZ0IsVUFBVSxlQUFlLGFBQWEs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
