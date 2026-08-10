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
    }),
    { name: 'traders-sauda-purchase-storage' }
  )
)
