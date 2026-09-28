// Supabase Edge Function: ocr-extract
//
// Receives a base64 image + a docType, asks OpenAI's vision model to read
// the slip and return structured JSON matching the fields that page needs.
// The OpenAI key stays server-side (Supabase secret), never shipped to the browser.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const OPENAI_MODEL = "gpt-4o"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// One schema per page module. Keep field names identical to what the
// frontend's existing ocrParsers.js already returns, so the page code
// that consumes the result doesn't need to change.
const SCHEMAS: Record<string, { description: string; fields: Record<string, string> }> = {
  saudaScale: {
    description: "a weighbridge / Sauda Sale slip",
    fields: {
      date: "date in YYYY-MM-DD, or empty string if not visible",
      mainHeading: "category / group heading text, or empty string",
      itemName: "material name",
      sizeMm: "size in mm, or empty string",
      partyName: "buyer/seller party name",
      consigneeName: "consignee name, or empty string",
      saudaQuantity: "sauda quantity as a plain number string",
      rateAmt: "rate per MT as a plain number string",
      prvPending: "previous pending quantity as a plain number string",
      qtyDispatch: "dispatched quantity as a plain number string",
      balPending: "balance pending quantity as a plain number string",
      broker: "broker name, or empty string",
      deliveryTerms: "delivery terms, or empty string",
      paymentCondition: "payment condition, or empty string",
      referenceName: "reference name, or empty string",
      remarks: "remarks, or empty string",
    },
  },
  saudaPurchase: {
    description: "a Sauda Purchase receipt",
    fields: {
      date: "date in YYYY-MM-DD, or empty string",
      mainHeading: "category / group heading, or empty string",
      itemName: "material name",
      sizeMm: "size in mm, or empty string",
      partyName: "party name",
      orderQuantity: "order quantity as a plain number string",
      rateMt: "rate per MT as a plain number string",
      qtyReceived: "quantity received as a plain number string",
      balPending: "balance pending as a plain number string",
      broker: "broker name, or empty string",
      deliveryTerms: "delivery terms, or empty string",
      paymentCondition: "payment condition, or empty string",
      referenceName: "reference name, or empty string",
      remarks: "remarks, or empty string",
    },
  },
  itemTransfer: {
    description: "an incoming/outgoing gate pass / item transfer slip",
    fields: {
      type: "either \"incoming\" or \"outgoing\"",
      partyName: "party name",
      materialName: "material name",
      vehicleNo: "vehicle registration number, or empty string",
      qty: "quantity as a plain number string",
      rate: "rate as a plain number string",
    },
  },
  rawMaterialStock: {
    description: "a raw material daily stock log sheet",
    fields: {
      material: "material name",
      openingStock: "opening stock as a plain number string",
      inward: "inward quantity as a plain number string",
      consumption: "consumption quantity as a plain number string",
      crushing: "crushing percentage, formatted like \"5%\"",
      fines3: "fines percentage, formatted like \"3%\"",
      fines3Qty: "fines quantity as a plain number string",
      production: "production quantity as a plain number string",
      dispatch: "dispatch quantity as a plain number string",
      closingStock: "closing stock as a plain number string",
      remarks: "remarks, or empty string",
    },
  },
  coalStock: {
    description: "a coal inventory and lab test report",
    fields: {
      material: "coal material name",
      openingStock: "opening stock as a plain number string",
      inward: "inward quantity as a plain number string",
      consumption: "consumption quantity as a plain number string",
      fc: "Fixed Carbon (F/C) value as text",
      moistLossPct: "moisture loss percentage, formatted like \"8%\"",
      dispatch: "dispatch quantity as a plain number string",
      landedCost: "landed cost as a plain number string",
      closingStock: "closing stock as a plain number string",
    },
  },
  production: {
    description:
      "a sponge iron production daily report with a table of metrics/grades and Kiln-1, Kiln-2, Total columns, plus a down time remarks section",
    fields: {
      rows: "an array of objects, one per table row, each with: metricName (string), percentValue (string, may be empty), k1Value (string), k2Value (string), totalValue (string)",
      remarks: "the down time remarks text, or empty string",
    },
  },
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    if (!OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY is not configured on the server." }, 500)
    }

    const { image, docType } = await req.json()

    if (!image || typeof image !== "string") {
      return json({ error: "Missing 'image' (expected a data URL or base64 string)." }, 400)
    }

    const schema = SCHEMAS[docType]
    if (!schema) {
      return json(
        { error: `Unknown docType '${docType}'. Valid values: ${Object.keys(SCHEMAS).join(", ")}` },
        400,
      )
    }

    const imageUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`

    const fieldList = Object.entries(schema.fields)
      .map(([key, desc]) => `- ${key}: ${desc}`)
      .join("\n")

    const prompt = `You are reading ${schema.description} from a photo taken on a factory floor. The photo may be tilted, low light, or partly smudged.

Extract the following fields and respond with ONLY a single valid JSON object (no markdown, no code fences, no explanation) with exactly these keys:
${fieldList}

Rules:
- If a field is not visible or not present, use an empty string "" (or an empty array [] for array fields).
- Do not invent values. Only report what is legible in the image.
- Numbers must be plain digit strings without commas or currency symbols (e.g. "1500.5" not "1,500.50").`

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
        temperature: 0,
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error("OpenAI API error:", errText)
      return json({ error: "OpenAI API request failed.", detail: errText }, 502)
    }

    const completion = await openaiRes.json()
    const content = completion?.choices?.[0]?.message?.content

    if (!content) {
      return json({ error: "OpenAI returned no content." }, 502)
    }

    let extracted
    try {
      extracted = JSON.parse(content)
    } catch {
      return json({ error: "Model did not return valid JSON.", raw: content }, 502)
    }

    return json({ data: extracted })
  } catch (err) {
    console.error("ocr-extract error:", err)
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}
