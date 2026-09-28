// Local-only runner for the ocr-extract function, so it can be tested
// without Docker (the Supabase CLI's `functions serve` needs Docker).
// This is NOT deployed — Supabase deploys index.ts directly.
//
// Usage:
//   deno run --allow-net --allow-env --allow-read supabase/functions/ocr-extract/local-server.ts
//
// Reads OPENAI_API_KEY from supabase/functions/ocr-extract/.env.local
// (gitignored) so the key never needs to be typed into a shell command
// or committed anywhere.

import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts"

const envPath = new URL("./.env.local", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")
const env = await load({ envPath, export: true })

if (!env.OPENAI_API_KEY && !Deno.env.get("OPENAI_API_KEY")) {
  console.error(
    `Missing OPENAI_API_KEY.\nCreate supabase/functions/ocr-extract/.env.local with:\n  OPENAI_API_KEY=sk-...`,
  )
  Deno.exit(1)
}

console.log("Starting local ocr-extract server on http://localhost:8000 ...")
await import("./index.ts")
