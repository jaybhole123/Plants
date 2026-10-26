import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const generateId = () => `stock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export const useStockStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            { ...item, id: generateId(), createdAt: new Date().toISOString() },
          ],
        })),

      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),

      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      clearAllItems: () => set({ items: [] }),

      getStats: () => {
        const { items } = get()
        return {
          totalItems: items.length,
          totalOpening: items.reduce((sum, i) => sum + (Number(i.openingStock) || 0), 0),
          totalInward: items.reduce((sum, i) => sum + (Number(i.inward) || 0), 0),
          totalConsumption: items.reduce((sum, i) => sum + (Number(i.consumption) || 0), 0),
          totalClosing: items.reduce((sum, i) => sum + (Number(i.closingStock) || 0), 0),
        }
      },
    }),
    {
      name: 'traders-stock-storage',
    }
  )
)

export const useTransferStore = create(
  persist(
    (set, get) => ({
      incomingList: [],
      outgoingList: [],
      setIncomingList: (listOrFn) => set((state) => ({ 
        incomingList: typeof listOrFn === 'function' ? listOrFn(state.incomingList) : listOrFn 
      })),
      setOutgoingList: (listOrFn) => set((state) => ({ 
        outgoingList: typeof listOrFn === 'function' ? listOrFn(state.outgoingList) : listOrFn 
      })),
      clearAll: () => set({ incomingList: [], outgoingList: [] }),
    }),
    { name: 'traders-transfer-storage' }
  )
)

export const useProductionStore = create(
  persist(
    (set, get) => ({
      entries: [],
      setEntries: (listOrFn) => set((state) => ({
        entries: typeof listOrFn === 'function' ? listOrFn(state.entries) : listOrFn
      })),
      clearAll: () => set({ entries: [] }),
    }),
    { name: 'traders-production-storage' }
  )
)

export const useSaudaScaleStore = create(
  persist(
    (set, get) => ({
      entries: [],
      setEntries: (listOrFn) => set((state) => ({
        entries: typeof listOrFn === 'function' ? listOrFn(state.entries) : listOrFn
      })),
      clearAll: () => set({ entries: [] }),
    }),
    { name: 'traders-sauda-scale-storage' }
  )
)

export const useSaudaPurchaseStore = create(
  persist(
    (set, get) => ({
      entries: [],
      setEntries: (listOrFn) => set((state) => ({
        entries: typeof listOrFn === 'function' ? listOrFn(state.entries) : listOrFn
      })),
      clearAll: () => set({ entries: [] }),
    }),
    { name: 'traders-sauda-purchase-storage' }
  )
)

export const useProduction2Store = create(
  persist(
    (set, get) => ({
      filesData: [],
      setFilesData: (listOrFn) => set((state) => ({
        filesData: typeof listOrFn === 'function' ? listOrFn(state.filesData) : listOrFn
      })),
      clearAll: () => set({ filesData: [] }),
    }),
    { name: 'traders-production2-storage' }
  )
)

export const useUploadedImageStore = create(
  persist(
    (set, get) => ({
      imagesByPageAndDate: {}, // { `${pageKey}__${date}`: dataUrl, [pageKey]: dataUrl }
      imagesByPage: {},
      setPageImage: (pageKey, dateKeyOrDataUrl, maybeDataUrl) =>
        set((state) => {
          let dateKey = null
          let dataUrl = null
          if (maybeDataUrl !== undefined) {
            dateKey = dateKeyOrDataUrl
            dataUrl = maybeDataUrl
          } else {
            dataUrl = dateKeyOrDataUrl
          }
          if (!dataUrl) return state

          const newImagesByPageAndDate = {
            ...(state.imagesByPageAndDate || {}),
            [pageKey]: dataUrl, // fallback to latest
          }
          if (dateKey) {
            newImagesByPageAndDate[`${pageKey}__${dateKey}`] = dataUrl
          }
          const newImagesByPage = {
            ...(state.imagesByPage || {}),
            [pageKey]: dataUrl,
          }
          return {
            imagesByPageAndDate: newImagesByPageAndDate,
            imagesByPage: newImagesByPage,
          }
        }),
      getPageImage: (pageKey, dateKey) => {
        const { imagesByPageAndDate, imagesByPage } = get()
        if (dateKey && imagesByPageAndDate?.[`${pageKey}__${dateKey}`]) {
          return imagesByPageAndDate[`${pageKey}__${dateKey}`]
        }
        return imagesByPageAndDate?.[pageKey] || imagesByPage?.[pageKey] || null
      },
      clearPageImage: (pageKey, dateKey) =>
        set((state) => {
          const newMap = { ...(state.imagesByPageAndDate || {}) }
          const newOldMap = { ...(state.imagesByPage || {}) }
          if (dateKey) delete newMap[`${pageKey}__${dateKey}`]
          delete newMap[pageKey]
          delete newOldMap[pageKey]
          return { imagesByPageAndDate: newMap, imagesByPage: newOldMap }
        }),
    }),
    { name: 'traders-uploaded-images-storage' }
  )
)
