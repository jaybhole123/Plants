# AI image reader: setup and testing

Image upload on Stock, Incoming/Outgoing, Production, Production 2, Sauda Scale and Sauda Purchase goes to
`POST /api/ocr` (`server/ocrHandler.js`), which calls OpenAI with a per-page JSON schema (`server/schemas.js`).
The OpenAI key is only ever on the server.

## Environment variables (server side, never `VITE_`-prefixed)
| Name | Default | Meaning |
|---|---|---|
| `OPENAI_API_KEY` | required | OpenAI key |
| `OCR_MODEL` | `gpt-5.6-sol` | model that reads the image |
| `OCR_EFFORT` | unset | optional `reasoning_effort` (e.g. `low`) if calls are too slow |
| `OCR_VERIFY` | off | `on` adds a second AI pass (`OCR_VERIFY_MODEL`, default `gpt-5.6-terra`). In our tests it added little accuracy and doubled time, so it is off by default |

## Running
- Local: `npm run dev` (the Vite dev server serves `/api/ocr`; restart after changing `.env`).
- Vercel: `api/ocr.js` + `vercel.json` (`maxDuration` 60 s; the AI call takes 10-25 s, longer on poor photos).
  The browser downsizes uploads to stay under the ~4.5 MB request limit.
- Other hosting: `node server/index.js` (port 8787) and proxy `/api/ocr` to it.

## What the code does besides calling the model
- `sanitize()` cleans model output: numbers only (`123.600 Mt(5)` -> `123.600`, `@330/-` -> `330`, `30,011` -> `30011`),
  dates -> `YYYY-MM-DD`, look-alike Cyrillic letters -> Latin. Production rows with a single value column get it as both Kiln 1 and Total.
- `crossChecks()` returns warnings when figures do not add up (stock closing, coal closing, Sauda balances, kiln totals).
  They catch some misreads but not all.
- The browser checks blur / resolution / contrast before upload (`src/utils/imageQuality.js`) and warns on poor photos.
  Digits read from a blurry photo can look right and be wrong, so the review modal never claims more than "Read by AI - please review".

## Testing
1. Offline (no key): `npm run test:ocr:offline`.
2. With credits: `npm run test:ocr` runs 54 synthetic sheets (`tools/ocr-test/data`, with exact truth files) through the real handler
   and prints cell accuracy per page plus the worst images.
   - Use `ONLY='^sale0' npm run test:ocr` to run a subset, `OCR_VERIFY=on` to include the verifier, `IGNORE=` to also score `reportDate`.
   - `reportDate` is ignored by default: the synthetic stock truth uses the top-left sheet date while the prompt currently asks for the
     "AS ON DATE" date. Decide one rule, then change the prompt or the truth files.
   - `tools/ocr-test/degrade.ps1 -src <dir> -out <dir>` (Windows) writes blurred / low-quality / tilted copies to test poor photos.
3. Always try a few real photos from the plant, not only screenshots.

## Open decisions
- Which date is the stock `reportDate` (top-left sheet date or "AS ON DATE").
- Where the extra rows below TOTAL COAL (sponge pellet, dolomite, non mag, sponge iron) belong (currently read with the coal tab).
