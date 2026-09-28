import { supabase } from '../supabase'

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

/**
 * Sends an image to the ocr-extract Supabase Edge Function, which calls
 * OpenAI's vision model server-side and returns structured fields for the
 * given docType (see supabase/functions/ocr-extract/index.ts for the list).
 */
export const extractWithAI = async (file, docType) => {
  const image = await fileToDataUrl(file)

  const { data, error } = await supabase.functions.invoke('ocr-extract', {
    body: { image, docType },
  })

  if (error) {
    throw new Error(error.message || 'AI OCR request failed.')
  }
  if (data?.error) {
    throw new Error(data.error)
  }

  return data.data
}
