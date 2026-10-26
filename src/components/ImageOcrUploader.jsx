import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { extractFromImage } from '../utils/aiOcr';
import AiResultModal from './AiResultModal';
import ImageZoomModal from './ImageZoomModal';
import { useUploadedImageStore } from '../store/useStore';

// With `aiPage` set, the image is read + verified by the AI endpoint and the structured
// result goes to `onAiResult(data)`. Without it, the old Tesseract text flow is used.
export const ImageOcrUploader = ({ onTextExtracted, aiPage, onAiResult, selectedDate, hideViewButton = false, className, children }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aiResult, setAiResult] = useState(null);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  
  // Use a unique ID for each instance to prevent label conflicts
  const uniqueId = useRef(`ocr-upload-${Math.random().toString(36).substr(2, 9)}`).current;

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const imagesByPageAndDate = useUploadedImageStore((state) => state.imagesByPageAndDate || {});
  const imagesByPage = useUploadedImageStore((state) => state.imagesByPage || {});
  const setPageImage = useUploadedImageStore((state) => state.setPageImage);

  // Strictly match selectedDate's image so that each date displays only its own uploaded image
  const dateKey = selectedDate || new Date().toISOString().split('T')[0];
  const storedImage = aiPage 
    ? (imagesByPageAndDate[`${aiPage}__${dateKey}`] || null) 
    : null;

  const [localImageUrl, setLocalImageUrl] = useState(null);
  const activeImageUrl = storedImage || localImageUrl;

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select or drop an image file (JPG, PNG, WebP, etc.)');
      return;
    }

    // Convert file to Data URL so it can be stored persistently in useUploadedImageStore
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (aiPage) {
        setPageImage(aiPage, dateKey, dataUrl);
      } else {
        setLocalImageUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    setIsProcessing(true);
    setProgress(0);

    if (aiPage) {
      try {
        const res = await extractFromImage(file, aiPage);
        setAiResult(res);
      } catch (error) {
        console.error('AI read error:', error);
        alert(error.message || 'Failed to read the image.');
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      return;
    }

    try {
      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );
      
      onTextExtracted(result.data.text);
    } catch (error) {
      console.error('OCR Error:', error);
      alert('Failed to extract text from image.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  // Support global Ctrl+V paste of images while on the page
  React.useEffect(() => {
    const handleGlobalPaste = (e) => {
      if (isProcessing) return;
      // If user is typing in an input or textarea, don't intercept unless it's a file
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
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [isProcessing]);

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      className="relative inline-flex items-center gap-2 outline-none"
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        id={uniqueId}
      />
      <label
        htmlFor={uniqueId}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title="Click to browse, Drag & Drop image, or Focus & Paste (Ctrl+V) image"
        className={`${className} ${
          isDragging 
            ? 'border-dashed !border-indigo-500 !bg-indigo-100 !text-indigo-800 scale-105 ring-2 ring-indigo-400' 
            : ''
        } cursor-pointer relative overflow-hidden transition-all duration-200 select-none`}
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{aiPage ? 'Reading & verifying…' : `${progress}%`}</span>
          </div>
        ) : isDragging ? (
          <span className="flex items-center gap-1.5 font-bold text-indigo-700 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Drop Image Here
          </span>
        ) : (
          children || (
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Scan Image</span>
            </div>
          )
        )}
      </label>

      {/* Persistent 'View Image' button if an image has been uploaded */}
      {!hideViewButton && activeImageUrl && (
        <button
          type="button"
          onClick={() => setIsZoomModalOpen(true)}
          title="Click to view and zoom uploaded document image"
          className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-700 font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 active:scale-95 text-sm h-10 animate-fadeIn whitespace-nowrap cursor-pointer z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>View Image</span>
        </button>
      )}

      {/* Dedicated Zoom Modal when clicking 'View Image' */}
      <ImageZoomModal
        isOpen={isZoomModalOpen}
        src={activeImageUrl}
        title="Uploaded Document Preview"
        onClose={() => setIsZoomModalOpen(false)}
      />

      {/* Verification & AI Result Modal */}
      {aiResult && (
        <AiResultModal
          result={aiResult}
          imageUrl={activeImageUrl}
          onClose={() => setAiResult(null)}
          onApply={(data) => {
            setAiResult(null);
            onAiResult?.(data);
          }}
        />
      )}
    </div>
  );
};
