// End-to-end accuracy test for the AI image reader, through the REAL server handler
// (prompt + model + cleaning + cross-checks). Needs OpenAI credits.
//
//   node tools/ocr-test/suite.mjs [imageDir]            default imageDir = tools/ocr-test/data
//
// imageDir holds  <id>.png|jpg  plus  <id>.<job>.truth.json  (job = stock_raw, stock_coal, sauda_sale,
// sauda_purchase, production, transfer). Key: OPENAI_API_KEY in the environment or in .env.
// Env options: ONLY=regex on "<id>.<job>", POOL=parallel calls (6), IGNORE=top-level truth keys to skip (reportDate),
//              OCR_VERIFY=on to include the optional second pass, MIN=minimum overall % (exit 1 below it).
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')

if (fs.existsSync(path.join(root, '.env'))) {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}
if (!process.env.OPENAI_API_KEY) { console.error('OPENAI_API_KEY is not set (env or .env)'); process.exit(2) }

const { handleOcr } = await import(pathToFileURL(path.join(root, 'server/ocrHandler.js')).href)
const dir = path.resolve(process.argv[2] || path.join(here, 'data'))
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null
const ignore = new Set((process.env.IGNORE ?? 'reportDate').split(',').filter(Boolean))

const tasks = []
for (const f of fs.readdirSync(dir)) {
  const m = f.match(/^(.+?)\.(\w+)\.truth\.json$/)
  if (!m) continue
  const [, id, job] = m
  const img = ['png', 'jpg', 'jpeg'].map((e) => path.join(dir, `${id}.${e}`)).find(fs.existsSync)
  if (img && (!only || only.test(`${id}.${job}`))) tasks.push({ id, job, img, truth: path.join(dir, f) })
}
if (!tasks.length) { console.error(`No image/truth pairs found in ${dir}`); process.exit(2) }

const call = (page, file) => new Promise((resolve) => {
  const ext = /\.jpe?g$/i.test(file) ? 'jpeg' : 'png'
  const image = `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`
  const req = Readable.from([Buffer.from(JSON.stringify({ page, image }))])
  req.method = 'POST'
  const res = { statusCode: 0, setHeader() {}, end(b) { resolve({ status: this.statusCode, body: JSON.parse(b) }) } }
  handleOcr(req, res, process.env)
})

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
const same = (o, t) => norm(o) === norm(t)
const score = (tr, out) => {
  const rows = tr.rows || [], orows = out.rows || [], used = new Set()
  const keys = Object.keys(rows[0] || {})
  const leniency = (o, t) => same(o, t) || norm(o).replace(/[^a-z0-9.]/g, '') === norm(t).replace(/[^a-z0-9.]/g, '')
  let ok = 0, total = 0
  const miss = []
  for (const t of rows) {
    let best = -1, bs = -1
    orows.forEach((o, i) => { if (!used.has(i)) { const s = keys.filter((k) => leniency(o[k], t[k])).length; if (s > bs) { bs = s; best = i } } })
    if (best >= 0) used.add(best)
    const o = best >= 0 ? orows[best] : {}
    for (const k of keys) {
      total++
      if (same(o[k], t[k])) ok++
      else miss.push(`${t.partyName || t.material || t.metricName || t.itemName || ''}.${k}: got "${o[k] ?? ''}" want "${t[k]}"`)
    }
  }
  for (const k of Object.keys(tr).filter((k) => k !== 'rows' && !ignore.has(k))) {
    total++
    if (same(out[k], tr[k])) ok++
    else miss.push(`TOP.${k}: got "${out[k]}" want "${tr[k]}"`)
  }
  return { ok, total, rowsGot: orows.length, rowsWant: rows.length, miss }
}

const results = []
let next = 0
await Promise.all(Array.from({ length: Number(process.env.POOL || 6) }, async () => {
  while (next < tasks.length) {
    const t = tasks[next++]
    const t0 = Date.now()
    const r = await call(t.job, t.img)
    if (r.status !== 200) { results.push({ ...t, err: r.body.error || r.status }); console.log('FAIL', t.id, t.job, String(r.body.error).slice(0, 120)); continue }
    results.push({ ...t, secs: (Date.now() - t0) / 1000, warnings: r.body.verification.warnings, ...score(JSON.parse(fs.readFileSync(t.truth, 'utf8')), r.body.data) })
  }
}))

const byJob = {}
for (const r of results) (byJob[r.job] ??= []).push(r)
let allOk = 0, allTotal = 0
console.log(`\n${results.length} image-jobs from ${dir}`)
for (const [job, rs] of Object.entries(byJob)) {
  const good = rs.filter((r) => !r.err)
  const ok = good.reduce((a, r) => a + r.ok, 0), total = good.reduce((a, r) => a + r.total, 0)
  allOk += ok; allTotal += total
  const perfect = good.filter((r) => r.ok === r.total).length
  const rowMismatch = good.filter((r) => r.rowsGot !== r.rowsWant).length
  const falseWarn = good.filter((r) => r.ok === r.total && r.warnings.length).length
  console.log(`${job.padEnd(15)} cells ${(ok / (total || 1) * 100).toFixed(1)}%  perfect ${perfect}/${rs.length}  row-count mismatches ${rowMismatch}  warnings on perfect images ${falseWarn}  errors ${rs.length - good.length}`)
}
const overall = allOk / (allTotal || 1) * 100
console.log(`OVERALL ${overall.toFixed(1)}%`)
const worst = results.filter((r) => !r.err && r.ok < r.total).sort((a, b) => a.ok / a.total - b.ok / b.total).slice(0, 15)
if (worst.length) console.log('\nWorst images:')
for (const r of worst) console.log(`  ${r.id}.${r.job} ${(r.ok / r.total * 100).toFixed(0)}% rows ${r.rowsGot}/${r.rowsWant} :: ${r.miss.slice(0, 3).join(' | ')}`)
process.exit(overall < Number(process.env.MIN || 0) ? 1 : 0)
