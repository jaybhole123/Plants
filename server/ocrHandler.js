import { PAGES, crossChecks } from './schemas.js'

const API_URL = 'https://api.openai.com/v1/chat/completions'
const MAX_BODY = 20 * 1024 * 1024

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) { reject(new Error('Image too large')); req.destroy() }
      else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })

const send = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function callModel({ key, model, name, schema, system, userText, image }) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: image, detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
    }),
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json?.error?.message || `OpenAI error ${r.status}`)
  const msg = json.choices?.[0]?.message
  if (msg?.refusal) throw new Error(`Model refused: ${msg.refusal}`)
  return JSON.parse(msg?.content || '{}')
}

const EXTRACT_SYSTEM = `You read photos/scans of plant paperwork and return the data as JSON.
Rules:
- Copy values exactly as printed or written. Never calculate, estimate or "fix" numbers.
- If a cell is blank, illegible or you are not sure, return "" for it. Do not guess.
- Keep the original row order. Skip TOTAL / SUB TOTAL rows and column headers.
- Numbers: no thousands separators; keep a trailing % if printed. Dates: YYYY-MM-DD.`

const VERIFY_SYSTEM = `You are a strict checker. You get an image and data that another reader extracted from it.
Compare EVERY value against the image, cell by cell. Fix any value that does not match what is printed.
Double check digits: watch out for missing digits in numbers with decimals (e.g. check if a 4-digit number was accidentally extracted with 3 digits like "317.529" instead of "3157.529").
If a value cannot be read confidently, set it to "" and list it in "unreadable". Never invent or calculate numbers.
Return the full corrected data in "data", and one entry in "corrections" for every value you changed.`

const verifySchema = (dataSchema) => ({
  type: 'object',
  properties: {
    data: dataSchema,
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          row: { type: 'integer' },
          field: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['row', 'field', 'from', 'to', 'reason'],
        additionalProperties: false,
      },
    },
    unreadable: { type: 'array', items: { type: 'string' } },
  },
  required: ['data', 'corrections', 'unreadable'],
  additionalProperties: false,
})

export async function handleOcr(req, res, env) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' })
  const key = env.OPENAI_API_KEY
  if (!key) return send(res, 500, { error: 'OPENAI_API_KEY is not set on the server (.env)' })

  let payload
  try {
    if (req.body && typeof req.body === 'object') {
      payload = req.body
    } else if (typeof req.body === 'string') {
      payload = JSON.parse(req.body)
    } else {
      payload = JSON.parse(await readBody(req))
    }
  } catch (e) { return send(res, 400, { error: e.message }) }
  const { page, image } = payload || {}
  const cfg = PAGES[page]
  if (!cfg) return send(res, 400, { error: `Unknown page "${page}"` })
  if (typeof image !== 'string' || !image.startsWith('data:image/')) return send(res, 400, { error: 'image must be a data:image URL' })

  const extractModel = env.OCR_MODEL || 'gpt-5.6-sol'
  const verifyModel = env.OCR_VERIFY_MODEL || 'gpt-5.6-terra'

  try {
    const extracted = await callModel({
      key, model: extractModel, name: `${page}_extract`, schema: cfg.schema,
      system: EXTRACT_SYSTEM, userText: cfg.hint, image,
    })

    let data = extracted
    let verification = { status: 'verified', corrections: [], unreadable: [], warnings: [] }
    try {
      const v = await callModel({
        key, model: verifyModel, name: `${page}_verify`, schema: verifySchema(cfg.schema),
        system: VERIFY_SYSTEM,
        userText: `${cfg.hint}\n\nExtracted data to check:\n${JSON.stringify(extracted)}`,
        image,
      })
      data = v.data
      verification.corrections = v.corrections
      verification.unreadable = v.unreadable
      verification.status = v.corrections.length || v.unreadable.length ? 'corrected' : 'verified'
    } catch (e) {
      verification = { status: 'unverified', corrections: [], unreadable: [], warnings: [], message: e.message }
    }
    verification.warnings = crossChecks(page, data)
    return send(res, 200, { data, verification, models: { extractModel, verifyModel } })
  } catch (e) {
    console.error('[ocr]', e.message)
    return send(res, 502, { error: e.message })
  }
}
