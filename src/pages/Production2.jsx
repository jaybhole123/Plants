import React, { useState, useEffect, useRef } from 'react';
import { useProduction2Store } from '../store/useStore';
import { ImageOcrUploader } from '../components/ImageOcrUploader';
import AiResultModal from '../components/AiResultModal';
import { extractFromImage, clean, toIsoDate } from '../utils/aiOcr';
import { FilterBar } from '../components/FilterBar';
import './Production2.css';
import DateFilter from '../components/DateFilter';
import ConfirmModal from '../components/ConfirmModal';


/* ---------- Load pdf.js (classic, non-module build) with CDN fallback chain ---------- */
const PDFJS_SOURCES = [
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js"
];



const PDFJS_WORKER_SOURCES = [
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js"
];

function loadScript(url) {
  return new Promise(function (resolve, reject) {
    const s = document.createElement("script");
    s.src = url;
    s.onload = () => resolve(url);
    s.onerror = () => reject(new Error("Failed to load " + url));
    document.head.appendChild(s);
  });
}

function loadPdfJsWithFallback(sources, index = 0) {
  if (index >= sources.length) {
    return Promise.reject(new Error("Saari CDN sources try kar li, koi kaam nahi kiya. Internet connection check karein."));
  }
  return loadScript(sources[index]).catch(function () {
    return loadPdfJsWithFallback(sources, index + 1);
  });
}

let pdfJsReadyPromise = null;
function ensurePdfJsLoaded() {
  if (pdfJsReadyPromise) return pdfJsReadyPromise;
  pdfJsReadyPromise = loadPdfJsWithFallback(PDFJS_SOURCES).then(function () {
    if (typeof window.pdfjsLib === "undefined") {
      throw new Error("pdf.js script load hui par pdfjsLib global nahi mila.");
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SOURCES[0];
    return window.pdfjsLib;
  });
  return pdfJsReadyPromise;
}

/* ---------- PDF row reconstruction ---------- */
async function extractRows(file) {
  const lib = await ensurePdfJsLoaded();
  const buffer = await file.arrayBuffer();
  const doc = await lib.getDocument({ data: buffer }).promise;
  const allRows = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const items = content.items
      .filter((it) => it.str && it.str.trim().length > 0)
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));

    const rows = [];
    const tolerance = 2.5;
    for (const item of items) {
      let row = rows.find((r) => Math.abs(r.y - item.y) <= tolerance);
      if (!row) { row = { y: item.y, items: [] }; rows.push(row); }
      row.items.push(item);
    }

    rows.sort((a, b) => b.y - a.y);
    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
      const text = row.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
      if (text) allRows.push(text);
    }
  }
  return allRows;
}

/* ---------- Extract ONLY the PRODUCTION section ---------- */
function num(str) {
  if (str === null || str === undefined) return null;
  const n = parseFloat(String(str).replace(/,/g, "").replace(/%$/, "").trim());
  return isNaN(n) ? null : n;
}

function parseRow(row) {
  const tokens = row.trim().split(/\s+/);
  let i = tokens.length;
  const values = [];
  while (i > 0 && /^-?[\d,]+(\.\d+)?%?$/.test(tokens[i - 1])) {
    values.unshift(tokens[i - 1]);
    i--;
  }
  const label = tokens.slice(0, i).join(" ");
  return { label, values };
}

function parseProductionSection(rows) {
  const dateRow = rows.find((r) => r.trim().startsWith("DATE"));
  let date = null;
  if (dateRow) {
    const m = dateRow.match(/DATE\s*:\s*(.+?)\s+KILN/i);
    date = m ? m[1].trim() : null;
  }

  const prodIdx = rows.findIndex((r) => r.trim().toUpperCase() === "PRODUCTION");
  if (prodIdx === -1) {
    return { date, found: false, items: [] };
  }
  const endIdx = rows.findIndex((r, i) => i > prodIdx && /DOWN TIME REMARKS/i.test(r));
  const sectionRows = rows.slice(prodIdx + 1, endIdx === -1 ? rows.length : endIdx);

  const items = [];
  for (const row of sectionRows) {
    const { label, values } = parseRow(row);
    if (!label || values.length === 0) continue;
    if (/^K-\s*\d/i.test(label.trim())) continue;

    let percent = null, kiln1 = null, kiln2 = null, total = null;
    if (values.length === 4) {
      [percent, kiln1, kiln2, total] = values.map(num);
    } else if (values.length === 3) {
      [kiln1, kiln2, total] = values.map(num);
    } else if (values.length === 2) {
      [kiln1, kiln2] = values.map(num);
    } else if (values.length === 1) {
      total = num(values[0]);
    }
    items.push({ label: label.trim(), percent, kiln1, kiln2, total });
  }

  return { date, found: items.length > 0, items };
}

async function parsePdfFile(file) {
  const rows = await extractRows(file);
  const data = parseProductionSection(rows);
  const fileUrl = URL.createObjectURL(file);
  return { ...data, fileName: file.name, fileUrl };
}

/* ---------- Utils ---------- */
function fmt(n) {
  return n === null || n === undefined ? "—" : (Number.isInteger(n) ? n.toFixed(2) : n.toFixed(2));
}
function fmtPct(n) {
  return n === null || n === undefined ? "" : `${n}%`;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
/* ---------- Component ---------- */

export default function Production2Page() {
  const filesData = useProduction2Store(state => state.filesData);
  const setFilesData = useProduction2Store(state => state.setFilesData);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const fileInputRef = useRef(null);
  
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [headerDate, setHeaderDate] = useState(new Date().toISOString().split('T')[0]);

  // Manual Form State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editModeData, setEditModeData] = useState(null);
  const [manualDate, setManualDate] = useState("");
  const [manualItem, setManualItem] = useState('"A" GRADE');
  const [manualPercent, setManualPercent] = useState("");
  const [manualKiln1, setManualKiln1] = useState("");

  // Staged / Pending files (waiting for user to click Save before writing to localStorage)
  const [pendingFiles, setPendingFiles] = useState([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    ensurePdfJsLoaded().catch((err) => {
      console.error("pdf.js preload failed:", err);
      setErrorMsg("pdf.js abhi load nahi ho payi. Internet check karein — file upload par yeh dobara try hoga.");
    });
  }, []);

  // Process image file via OCR
  const processImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setProgressMsg(`Reading image ${file.name || ''}...`);
    setErrorMsg("");

    try {
      setProgressMsg(`Reading & verifying ${file.name || 'image'}...`);
      setAiResult(await extractFromImage(file, 'production'));
    } catch (err) {
      console.error("Image OCR error:", err);
      setErrorMsg(err?.message || "Image read nahi ho payi. Try again with clearer photo.");
    } finally {
      setProgressMsg("");
    }
  };

  // Support global Ctrl+V paste of images while on Production 2 page
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if ((activeTag === 'input' || activeTag === 'textarea') && !e.clipboardData?.files?.length) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handleFiles = async (fileList) => {
    const allFiles = Array.from(fileList || []);
    const pdfFiles = allFiles.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    const imageFiles = allFiles.filter(
      (f) => f.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(f.name)
    );

    if (pdfFiles.length === 0 && imageFiles.length === 0) {
      setErrorMsg("Sirf PDF ya Image file(s) upload karein.");
      return;
    }
    setErrorMsg("");

    // Process image files if dropped
    for (const img of imageFiles) {
      await processImageFile(img);
    }

    // Process PDF files
    if (pdfFiles.length > 0) {
      let done = 0;
      const newFiles = [];
      for (const file of pdfFiles) {
        setProgressMsg(`Reading ${file.name}… (${done + 1}/${pdfFiles.length})`);
        try {
          const result = await parsePdfFile(file);
          if (!result.found) {
            setErrorMsg(`"${file.name}" me PRODUCTION section ka data nahi mila. Format check karein.`);
          } else {
            result.fileUrl = null;
            newFiles.push(result);
          }
        } catch (err) {
          console.error(err);
          setErrorMsg(`"${file.name}" read nahi ho payi. (${err && err.message ? err.message : "unknown error"})`);
        }
        done++;
      }
      setProgressMsg("");
      // Add to pending files (not directly into localStorage)
      setPendingFiles((prev) => [...prev, ...newFiles]);
    }
  };

  // Structured result from the AI image reader -> goes to pending files
  const handleAiResult = (data) => {
    const numOrNull = (v) => { const n = parseFloat(clean(v).replace(/,/g, '').replace(/%$/, '')); return Number.isFinite(n) ? n : null };
    const rawItems = (data.rows || [])
      .filter((r) => clean(r.metricName))
      .map((r) => {
        let label = clean(r.metricName);
        let k1 = numOrNull(r.k1Value);
        let k2 = numOrNull(r.k2Value);
        let tot = numOrNull(r.totalValue);
        let pct = numOrNull(r.percentValue);

        // Normalize when only one number was placed in either k1Value or totalValue
        if (k1 !== null && tot === null) tot = k1;
        if (tot !== null && k1 === null) k1 = tot;

        return {
          label,
          percent: pct,
          kiln1: k1,
          kiln2: k2 ?? 0,
          total: tot,
        };
      });

    // Auto-calculate percent for "A" GRADE and "B" GRADE if missing
    const aItem = rawItems.find(i => i.label.toUpperCase().includes('A') && i.label.toUpperCase().includes('GRADE'));
    const bItem = rawItems.find(i => i.label.toUpperCase().includes('B') && i.label.toUpperCase().includes('GRADE'));
    if (aItem && bItem) {
      const aVal = aItem.kiln1 || aItem.total || 0;
      const bVal = bItem.kiln1 || bItem.total || 0;
      const totalSponge = aVal + bVal;
      if (totalSponge > 0) {
        if (aItem.percent === null) aItem.percent = parseFloat(((aVal / totalSponge) * 100).toFixed(2));
        if (bItem.percent === null) bItem.percent = parseFloat(((bVal / totalSponge) * 100).toFixed(2));
      }
    }

    if (rawItems.length === 0) {
      setErrorMsg('Image me PRODUCTION data nahi mila.');
      return;
    }
    setErrorMsg("");
    // Staged in pending files; will only be saved to local storage upon clicking "Save to Storage"
    setPendingFiles((prev) => [...prev, {
      date: clean(data.date) ? toIsoDate(data.date) : new Date().toISOString().split('T')[0],
      fileName: 'MIS Production Scan',
      found: true,
      items: rawItems,
    }]);
  };

  const handleOcrResult = (text) => {
    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    // 1. Try to extract Date (e.g. "Date: Wednesday 21 October 2026" or "21.10.2026")
    let extractedDate = new Date().toISOString().split('T')[0];
    for (const l of rawLines.slice(0, 10)) {
      // Format: 21 October 2026 or 21-10-2026 or 21.10.2026
      const dMatch = l.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i);
      if (dMatch) {
        const months = {
          january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
          july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
          jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        };
        const day = dMatch[1].padStart(2, '0');
        const month = months[dMatch[2].toLowerCase()] || '10';
        const year = dMatch[3];
        extractedDate = `${year}-${month}-${day}`;
        break;
      }
      const numDateMatch = l.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/);
      if (numDateMatch) {
        const d = numDateMatch[1].padStart(2, '0');
        const m = numDateMatch[2].padStart(2, '0');
        let y = numDateMatch[3];
        if (y.length === 2) y = '20' + y;
        extractedDate = `${y}-${m}-${d}`;
        break;
      }
    }

    // 2. Isolate strictly the "PRODUCTION" section
    // Starts at "PRODUCTION" header and stops at "DOWN TIME REMARKS" / "DOWN TIME" / "FEED LOSS" / "REMARKS"
    const prodIndex = rawLines.findIndex(l => {
      const u = l.toUpperCase().replace(/[^A-Z]/g, '');
      return u === 'PRODUCTION' || u.endsWith('PRODUCTION');
    });

    let productionLines = [];
    if (prodIndex !== -1) {
      for (let i = prodIndex + 1; i < rawLines.length; i++) {
        const u = rawLines[i].toUpperCase();
        if (
          u.includes('DOWN TIME') || 
          u.includes('FEED LOSS') || 
          u.includes('REMARKS') ||
          u.includes('CONSUMPTION') ||
          u.includes('CAMPAIGN')
        ) {
          break;
        }
        productionLines.push(rawLines[i]);
      }
    } else {
      // Fallback: look for known items directly in lines if "PRODUCTION" banner wasn't read
      productionLines = rawLines.filter(l => {
        const u = l.toUpperCase();
        return (
          u.includes('STEAM') || 
          u.includes('SPONGE') || 
          u.includes('GRADE') || 
          u.includes('N.MAG') || 
          u.includes('NMAG') || 
          u.includes('CHAR')
        ) && !u.includes('CONSUMPTION') && !u.includes('COST');
      });
    }

    // 3. Known production item metrics mapping
    const standardMetrics = [
      { key: 'STEAM', aliases: ['STEAM', 'STEAN'] },
      { key: 'SPONGE', aliases: ['SPONGE', 'SPONGE PROD', 'TOTAL SPONGE'] },
      { key: '"A" GRADE', aliases: ['"A" GRADE', 'A GRADE', '"A"GRADE', 'A" GRADE', "'A' GRADE"] },
      { key: '"B" GRADE', aliases: ['"B" GRADE', 'B GRADE', '"B"GRADE', 'B" GRADE', "'B' GRADE"] },
      { key: 'N.MAG (CHAR+DOLO CHAR)', aliases: ['N.MAG', 'NMAG', 'NON MAG', 'NON-MAG', 'CHAR+DOLO CHAR'] }
    ];

    const items = [];
    for (const line of productionLines) {
      const u = line.toUpperCase();
      // Ignore section header itself if repeated
      if (u.replace(/[^A-Z]/g, '') === 'PRODUCTION') continue;

      // Extract numeric values from the line
      const nums = (line.match(/\d+(?:\.\d+)?/g) || []).map(n => parseFloat(n));
      if (nums.length === 0) continue;

      // Match known production metrics
      let matchedLabel = '';
      for (const sm of standardMetrics) {
        if (sm.aliases.some(alias => u.includes(alias))) {
          matchedLabel = sm.key;
          break;
        }
      }

      // If not standard, format text cleanly
      if (!matchedLabel) {
        matchedLabel = line
          .replace(/[\d\.\-,%]/g, '')
          .replace(/[|\[\]_]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (matchedLabel.length < 2) continue;
      }

      // The production value is usually the last number in the row
      const val = nums[nums.length - 1];

      // If percent is present in the line (e.g. 78% or 22%)
      let percent = null;
      const pctMatch = line.match(/(\d+(?:\.\d+)?)\s*%/);
      if (pctMatch) {
        percent = parseFloat(pctMatch[1]);
      }

      items.push({
        label: matchedLabel,
        percent: percent,
        kiln1: val,
        kiln2: 0,
        total: val
      });
    }

    // Auto-compute percent for "A" GRADE and "B" GRADE if total sponge exists
    const aGradeItem = items.find(i => i.label.toUpperCase().includes('A') && i.label.toUpperCase().includes('GRADE'));
    const bGradeItem = items.find(i => i.label.toUpperCase().includes('B') && i.label.toUpperCase().includes('GRADE'));
    if (aGradeItem && bGradeItem) {
      const aVal = aGradeItem.total || aGradeItem.kiln1 || 0;
      const bVal = bGradeItem.total || bGradeItem.kiln1 || 0;
      const sumGrade = aVal + bVal;
      if (sumGrade > 0) {
        if (aGradeItem.percent === null) {
          aGradeItem.percent = parseFloat(((aVal / sumGrade) * 100).toFixed(2));
        }
        if (bGradeItem.percent === null) {
          bGradeItem.percent = parseFloat(((bVal / sumGrade) * 100).toFixed(2));
        }
      }
    }

    if (items.length > 0) {
      setPendingFiles(prev => [...prev, {
        date: extractedDate,
        fileName: 'MIS Production Scan',
        found: true,
        items
      }]);
      setProgressMsg("");
    } else {
      setErrorMsg('Image me "PRODUCTION" section ka data nahi mil paya. Please ensure the image is clear.');
    }
  };

  const removeFile = (idxToRemove) => {
    setFilesData((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const removePendingFile = (idxToRemove) => {
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const clearPendingFiles = () => {
    setPendingFiles([]);
  };

  const handleSavePendingToStorage = () => {
    if (pendingFiles.length === 0) return;
    const nowIso = new Date().toISOString();
    const saveTargetDate = date || nowIso.split('T')[0];
    const filesToSave = pendingFiles.map(f => ({
      ...f,
      date: saveTargetDate,
      submittedDate: saveTargetDate,
      createdAt: nowIso,
      ocrDate: f.date || null
    }));
    setFilesData((prev) => [...prev, ...filesToSave]);
    const count = pendingFiles.length;
    setPendingFiles([]);
    setSaveSuccessMsg(`${count} entry/file(s) successfully saved to Local Storage!`);
    setTimeout(() => {
      setSaveSuccessMsg("");
    }, 4000);
  };

  const handleOcrUpload = (extractedText) => {
    const { rows: ocrRows } = parseProductionOCR(extractedText);
    if (!ocrRows || ocrRows.length === 0) {
      setErrorMsg("Image me PRODUCTION data nahi mila.");
      return;
    }
    
    const mappedItems = ocrRows.map(row => ({
      label: row.metricName,
      percent: parseFloat(row.percentValue) || null,
      kiln1: parseFloat(row.k1Value) || 0,
      kiln2: parseFloat(row.k2Value) || 0,
      total: parseFloat(row.totalValue) || 0
    }));

    const newResult = {
      date: new Date().toISOString().split('T')[0],
      fileName: "Image OCR Entry",
      found: true,
      items: mappedItems
    };
    
    setPendingFiles((prev) => [...prev, newResult]);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualDate || !manualKiln1) {
      setErrorMsg("Please fill out all fields for manual entry.");
      return;
    }
    setErrorMsg("");

    const k1 = parseFloat(manualKiln1);
    const newItem = {
      label: manualItem,
      percent: manualPercent ? parseFloat(manualPercent) : null,
      kiln1: k1,
      kiln2: 0,
      total: k1
    };

    setFilesData((prev) => {
      if (editModeData) {
        return prev.map(f => {
          if (f.date === editModeData.date && f.fileName === editModeData.fileName) {
            const updatedItems = f.items.map(i => i.label === editModeData.oldLabel ? newItem : i);
            return { ...f, items: updatedItems };
          }
          return f;
        });
      }

      const existingIdx = prev.findIndex(f => f.date === manualDate && f.fileName === "Manual Entry");
      if (existingIdx >= 0) {
        const newArr = [...prev];
        const existingItemIdx = newArr[existingIdx].items.findIndex(i => i.label === newItem.label);
        if (existingItemIdx >= 0) {
          const updatedItems = [...newArr[existingIdx].items];
          updatedItems[existingItemIdx] = newItem;
          newArr[existingIdx] = { ...newArr[existingIdx], items: updatedItems };
        } else {
          newArr[existingIdx] = {
            ...newArr[existingIdx],
            items: [...newArr[existingIdx].items, newItem]
          };
        }
        return newArr;
      }
      return [...prev, {
        date: manualDate,
        fileName: "Manual Entry",
        found: true,
        items: [newItem]
      }];
    });

    setEditModeData(null);
    setManualKiln1("");
    setManualPercent("");
    setIsManualModalOpen(false);
  };

  const editSummaryItem = (fileDate, fileName, item) => {
    setEditModeData({ date: fileDate, fileName, oldLabel: item.label });
    setManualDate(fileDate);
    setManualItem(item.label);
    setManualPercent(item.percent !== null ? item.percent : "");
    setManualKiln1(item.kiln1);
    setIsManualModalOpen(true);
  };

  const deleteSummaryItem = (fileDate, fileName, itemLabel) => {
    setFilesData(prev => prev.map(f => {
      if (f.date === fileDate && f.fileName === fileName) {
        return { ...f, items: f.items.filter(item => item.label !== itemLabel) };
      }
      return f;
    }).filter(f => f.items.length > 0));
  };

  const toCSV = () => {
    const rows = [["Date", "Source File", "Item", "Percent", "Kiln-1", "Kiln-2", "Total"]];
    filesData.forEach((f) => {
      f.items.forEach((item) => {
        rows.push([f.date ?? "", f.fileName, item.label, item.percent ?? "", item.kiln1 ?? "", item.kiln2 ?? "", item.total ?? ""]);
      });
    });
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  };

  const handleJsonExport = () => {
    downloadBlob(JSON.stringify(filesData, null, 2), "nspl_production_log.json", "application/json");
  };

  const handleCsvExport = () => {
    downloadBlob(toCSV(), "nspl_production_log.csv", "text/csv");
  };

  const handleClearAll = async () => {
    if (window.confirm(`Delete all data for ${headerDate}?`)) {
      setFilesData([]);
      setErrorMsg("");
    }
  };

  const filteredFiles = filesData.filter((f) => {
    if (date) {
      const fileCreatedDate = f.submittedDate || (f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '');
      const targetFileDate = fileCreatedDate || f.date;
      if (targetFileDate && targetFileDate !== date) {
        return false;
      }
    }
    if (search && !f.fileName.toLowerCase().includes(search.toLowerCase()) && !(f.date && f.date.toLowerCase().includes(search.toLowerCase()))) {
      return false;
    }
    return true;
  });

  const sortedFiles = [...filteredFiles].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return (
    <div className="space-y-6 pb-10 px-2 sm:px-4 w-full text-slate-800">
      {aiResult && (
        <AiResultModal
          result={aiResult}
          onClose={() => setAiResult(null)}
          onApply={(data) => { setAiResult(null); handleAiResult(data); }}
        />
      )}
      
      {/* Top Banner (Modern Gradient) */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 rounded p-4 sm:p-5 mb-6 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-28 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-28 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        
        <div className="z-10 text-center sm:text-left mb-3 sm:mb-0">
          <p className="text-emerald-100 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Module</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Production 2</h1>
        </div>

        <div className="z-10 flex flex-col sm:flex-row items-center sm:items-end gap-3">
          <div className="flex flex-col items-center sm:items-end">
            <label className="text-emerald-100 text-[10px] uppercase tracking-wider font-semibold mb-1">Report Date</label>
            <div className="p-1 flex items-center gap-2">
              <DateFilter date={date} onChange={setDate} />
              <ImageOcrUploader
                aiPage="production"
                onAiResult={handleAiResult}
                onTextExtracted={handleOcrResult}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/50 font-bold rounded-md transition-all shadow-sm flex items-center gap-1.5 active:scale-95 text-sm h-10 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <FilterBar 
          searchQuery={search} 
          setSearchQuery={setSearch} 
          selectedDate={date} 
          setSelectedDate={setDate} 
        />
        <div className="flex items-center gap-2">
          <ImageOcrUploader
            aiPage="production"
            onAiResult={handleAiResult}
            onTextExtracted={handleOcrResult}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold rounded-lg transition-all shadow-sm flex items-center gap-1.5 active:scale-95 text-sm h-[42px]"
          />
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 active:scale-95 text-sm h-[42px]"
            title="Reset All Production 2 Data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Reset Data
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Reset Production 2 Data"
        message="Kya aap sach me Production 2 ka saara saved data delete (reset) karna chahte hain? Yeh action undo nahi kiya ja sakta."
        confirmText="Yes, Reset Production Data"
        onConfirm={() => {
          setFilesData([]);
          setErrorMsg("");
        }}
      />

      <div className="print:hidden">
        <section
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 relative group
            ${isDragging ? "border-emerald-500 bg-emerald-50/50" : "border-slate-300 hover:border-emerald-400 hover:bg-slate-50"}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf,image/*"
            multiple
            hidden
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />
          <div className="text-5xl mb-4 opacity-80 group-hover:scale-110 transition-transform duration-300">🏭</div>
          <p className="text-lg font-semibold text-slate-700 mb-1">Upload Production PDF or Image (2)</p>
          <p className="text-sm text-slate-500">Drag & drop your PDF or Image files here, paste (Ctrl+V), or click to browse</p>
          
          {progressMsg && <p className="mt-4 text-sm font-medium text-blue-600 bg-blue-50 py-2 px-4 rounded-full inline-block">{progressMsg}</p>}
          {errorMsg && <p className="mt-4 text-sm font-medium text-rose-600 bg-rose-50 py-2 px-4 rounded-full inline-block">{errorMsg}</p>}
        </section>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl shadow-sm animate-in fade-in duration-200">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="flex-1 font-semibold text-sm">{saveSuccessMsg}</div>
          <button onClick={() => setSaveSuccessMsg("")} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold uppercase tracking-wider px-2 py-1">Dismiss</button>
        </div>
      )}

      {/* Pending / Staged Data (Direct Upload not saved to LocalStorage yet) */}
      {pendingFiles.length > 0 && (
        <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-4 sm:p-6 shadow-md transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                  Pending Verification
                </span>
                <span className="text-xs text-amber-700 font-medium">
                  ({pendingFiles.length} file/record staged)
                </span>
              </div>
              <h3 className="text-lg font-bold text-amber-950 mt-1">
                Uploaded Data Preview (Not yet in LocalStorage)
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Review below. Click <strong>"Save to Local Storage"</strong> to permanently store and view in Production Data.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearPendingFiles}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg shadow-sm transition-all active:scale-95"
              >
                Discard All
              </button>
              <button
                type="button"
                onClick={handleSavePendingToStorage}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save to Local Storage
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {pendingFiles.map((file, pIdx) => (
              <div key={pIdx} className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-3.5 py-2.5 bg-amber-100/50 border-b border-amber-200 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-[11px] font-bold text-indigo-700 block">{file.date || "No Date"}</span>
                    <span className="text-xs font-medium text-slate-800 truncate block" title={file.fileName}>{file.fileName}</span>
                  </div>
                  <button
                    onClick={() => removePendingFile(pIdx)}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold p-1 hover:bg-rose-50 rounded"
                    title="Remove item"
                  >
                    Remove
                  </button>
                </div>
                <div className="p-2 max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-100 font-semibold">
                        <th className="py-1">Item</th>
                        <th className="py-1 text-right">Kiln-1</th>
                        <th className="py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700 divide-y divide-slate-50">
                      {file.items.map((it, itIdx) => (
                        <tr key={itIdx}>
                          <td className="py-1 pr-1 truncate max-w-[120px]" title={it.label}>{it.label}</td>
                          <td className="py-1 text-right font-mono text-slate-600">{fmt(it.kiln1)}</td>
                          <td className="py-1 text-right font-mono font-medium text-slate-900">{it.total === null ? '—' : fmt(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        <div className="flex justify-between items-center mb-4 mt-8">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Production Data</h2>
          <div className="flex gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors" onClick={() => document.getElementById('filesContainer').scrollBy({ left: -800, behavior: 'smooth' })} title="Scroll Left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors" onClick={() => document.getElementById('filesContainer').scrollBy({ left: 800, behavior: 'smooth' })} title="Scroll Right">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
            <button className="px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors border border-rose-200" onClick={handleClearAll}>Clear All</button>
          </div>
        </div>

        <div id="filesContainer" className="flex overflow-x-auto gap-6 pb-6 snap-x hide-scrollbar scroll-smooth">
          {sortedFiles.length === 0 ? (
            <div className="min-w-full flex-shrink-0 bg-white border border-slate-300 rounded-lg shadow-sm snap-center overflow-hidden flex flex-col">
              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                    <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="px-3 py-2 border-b border-slate-200">Item</th>
                      <th className="px-3 py-2 border-b border-slate-200 text-right">Kiln-1</th>
                      <th className="px-3 py-2 border-b border-slate-200 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="3" className="w-full text-center py-12 bg-slate-50/50">
                        <p className="text-slate-500 font-medium">No data available. Please upload a PDF.</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            sortedFiles.map((f, i) => (
              <div className="min-w-full flex-shrink-0 bg-white border border-slate-300 rounded-lg shadow-sm snap-center overflow-hidden flex flex-col" key={i}>
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{f.date || "Date not found"}</div>
                    <div className="text-sm font-medium text-slate-700 truncate max-w-[250px]">{f.fileName}</div>
                  </div>
                  <button className="text-xs text-rose-500 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors" onClick={() => removeFile(i)}>Remove</button>
                </div>
                <div className="overflow-auto max-h-[60vh]">
                  <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                      <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                        <th className="px-3 py-2 border-b border-slate-200">Item</th>
                        <th className="px-3 py-2 border-b border-slate-200 text-right">Kiln-1</th>
                        <th className="px-3 py-2 border-b border-slate-200 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {f.items.map((item, j) => (
                        <tr key={j} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${item.label.toUpperCase().startsWith('SPONGE PROD') ? 'bg-indigo-50/30 font-semibold' : ''}`}>
                          <td className="px-3 py-2">
                            {item.label}
                            {item.percent !== null && <span className="text-slate-400 ml-1">({fmtPct(item.percent)})</span>}
                          </td>
                          <td className="px-3 py-2 text-right">{fmt(item.kiln1)}</td>
                          <td className="px-3 py-2 text-right">{item.total === null ? "—" : fmt(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between items-center mb-4 mt-10">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Sponge Production Summary</h2>
          <div className="flex gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors" onClick={() => document.getElementById('summaryContainer').scrollBy({ left: -800, behavior: 'smooth' })} title="Scroll Left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors" onClick={() => document.getElementById('summaryContainer').scrollBy({ left: 800, behavior: 'smooth' })} title="Scroll Right">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>

            <button className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm" onClick={() => {
              setEditModeData(null);
              setManualDate("");
              setManualItem('"A" GRADE');
              setManualPercent("");
              setManualKiln1("");
              setIsManualModalOpen(true);
            }}>+ Add Entry</button>
          </div>
        </div>

        {isManualModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsManualModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-indigo-600 text-white">
                <h3 className="font-bold text-lg">{editModeData ? 'Edit Entry' : 'Manual Entry'}</h3>
                <button className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors" onClick={() => setIsManualModalOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <form className="p-6 flex flex-col gap-5 bg-slate-50" onSubmit={handleManualSubmit}>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date</label>
                    <input className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Item Grade</label>
                    <select className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" value={manualItem} onChange={e => setManualItem(e.target.value)}>
                      <option value='"A" GRADE'>"A" GRADE</option>
                      <option value='"B" GRADE'>"B" GRADE</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Percent (%)</label>
                  <input className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" type="number" step="0.01" placeholder="e.g. 80" value={manualPercent} onChange={e => setManualPercent(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Kiln-1 (Mt)</label>
                  <input className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-right" type="number" step="0.01" placeholder="0.00" value={manualKiln1} onChange={e => setManualKiln1(e.target.value)} required />
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors w-full sm:w-auto">Save Entry</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div id="summaryContainer" className="flex overflow-x-auto gap-6 pb-6 snap-x hide-scrollbar scroll-smooth">
          {sortedFiles.length === 0 ? (
            <div className="min-w-full flex-shrink-0 bg-white border border-slate-300 rounded-lg shadow-sm snap-center overflow-hidden flex flex-col">
              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                    <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="px-3 py-2 border-b border-slate-200">Item</th>
                      <th className="px-3 py-2 border-b border-slate-200 text-right">Kiln-1</th>
                      <th className="px-3 py-2 border-b border-slate-200 text-center">Total</th>
                      <th className="px-3 py-2 border-b border-slate-200 text-center">Source File</th>
                      <th className="px-3 py-2 border-b border-slate-200 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="5" className="w-full text-center py-12 bg-slate-50/50">
                        <p className="text-slate-500 font-medium">No data available.</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            sortedFiles.map((f, i) => {
              const filteredItems = f.items.filter(item => {
                const upper = item.label.toUpperCase();
                return upper.includes('"A" GRADE') || upper.includes('"B" GRADE');
              });
              
              if (filteredItems.length === 0) return null;

              return (
                <div className="min-w-full flex-shrink-0 bg-white border border-slate-300 rounded-lg shadow-sm snap-center overflow-hidden flex flex-col" key={`summary-${i}`}>
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{f.date || "Date not found"}</div>
                      <div className="text-sm font-medium text-slate-700 truncate max-w-[250px]">{f.fileName}</div>
                    </div>
                  </div>
                  <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                      <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                        <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                          <th className="px-3 py-2 border-b border-slate-200">Item</th>
                          <th className="px-3 py-2 border-b border-slate-200 text-right">Kiln-1</th>
                          <th className="px-3 py-2 border-b border-slate-200 text-center">Total</th>
                          <th className="px-3 py-2 border-b border-slate-200 text-center">Source File</th>
                          <th className="px-3 py-2 border-b border-slate-200 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {filteredItems.map((item, j) => (
                          <tr key={j} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${item.label.toUpperCase().startsWith('SPONGE PROD') ? 'bg-indigo-50/30 font-semibold' : ''}`}>
                            <td className="px-3 py-2">
                              {item.label}
                              {item.percent !== null && <span className="text-slate-400 ml-1">({fmtPct(item.percent)})</span>}
                            </td>
                            <td className="px-3 py-2 text-right">{fmt(item.kiln1)}</td>
                            <td className="px-3 py-2 text-center align-top">
                              <div>{item.total === null ? "—" : fmt(item.total)}</div>
                              {item.label.toUpperCase().includes('"A" GRADE') && <div className="text-[10px] text-slate-400 font-normal uppercase mt-0.5">A grade total</div>}
                              {item.label.toUpperCase().includes('"B" GRADE') && <div className="text-[10px] text-slate-400 font-normal uppercase mt-0.5">B grade total</div>}
                            </td>
                            <td className="px-3 py-2 text-center text-[11px] text-slate-400">
                              {f.fileUrl ? (
                                <a href={f.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700 font-medium inline-flex items-center gap-1 transition-colors" title="Preview PDF">
                                  PDF
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                </a>
                              ) : (
                                f.fileName
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex justify-center gap-1.5">
                                <button className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" onClick={() => editSummaryItem(f.date, f.fileName, item)} title="Update">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                </button>
                                <button className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors" onClick={() => deleteSummaryItem(f.date, f.fileName, item.label)} title="Delete">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td className="px-3 py-2 font-bold text-slate-800">SUB TOTAL</td>
                          <td className="px-3 py-2 text-right align-bottom">
                            <div className="text-[10px] text-slate-400 font-normal uppercase mb-0.5">Kiln-1 total</div>
                            <strong className="text-slate-800">{fmt(filteredItems.reduce((acc, curr) => acc + (curr.kiln1 || 0), 0))}</strong>
                          </td>
                          <td className="px-3 py-2 text-center align-bottom">
                            <strong className="text-slate-800">{fmt(filteredItems.reduce((acc, curr) => acc + (curr.total || 0), 0))}</strong>
                          </td>
                          <td colSpan="2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
    </div>
  );
}
