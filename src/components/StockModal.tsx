import React, { useState, useEffect } from 'react'
import { X, Plus, Minus, Package, TrendingUp, TrendingDown } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Service, StockMovement, Inventory } from '../types'

interface StockModalProps {
  service: Service
  onClose: () => void
  onSave: () => void
}

export default function StockModal({ service, onClose, onSave }: StockModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [activeTab, setActiveTab] = useState<'adjustment' | 'history'>('adjustment')
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: '',
    notes: ''
  })

  useEffect(() => {
    loadInventory()
    loadMovements()
  }, [service.id])

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('service_id', service.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setInventory(data)
    } catch (error) {
      console.error('Error loading inventory:', error)
    }
  }

  const loadMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          user:users(full_name)
        `)
        .eq('service_id', service.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setMovements(data || [])
    } catch (error) {
      console.error('Error loading movements:', error)
    }
  }

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const quantity = parseInt(adjustmentData.quantity)
      if (isNaN(quantity) || quantity <= 0) {
        toast.error('Zadejte platné množství')
        return
      }

      const { error } = await supabase
        .from('stock_movements')
        .insert({
          service_id: service.id,
          type: adjustmentData.type,
          quantity: adjustmentData.type === 'out' ? -Math.abs(quantity) : Math.abs(quantity),
          reference_type: 'adjustment',
          notes: adjustmentData.notes.trim() || null,
          user_id: user.id
        })

      if (error) throw error

      toast.success('Stav skladu byl upraven')
      setAdjustmentData({ type: 'in', quantity: '', notes: '' })
      loadInventory()
      loadMovements()
    } catch (error) {
      console.error('Error adjusting stock:', error)
      toast.error('Chyba při úpravě skladu')
    } finally {
      setLoading(false)
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
      case 'return':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'out':
      case 'sale':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Package className="h-4 w-4 text-blue-500" />
    }
  }

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'in': return 'Příjem'
      case 'out': return 'Výdej'
      case 'adjustment': return 'Úprava'
      case 'sale': return 'Prodej'
      case 'return': return 'Vrácení'
      default: return type
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Správa skladu - {service.name}
            </h2>
            {inventory && (
              <p className="text-sm text-gray-500 mt-1">
                Aktuální stav: <span className="font-medium">{inventory.available_stock} ks</span>
                {inventory.reserved_stock > 0 && (
                  <span className="text-orange-600 ml-2">
                    (rezervováno: {inventory.reserved_stock} ks)
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('adjustment')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'adjustment'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Úprava stavu
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Historie pohybů
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'adjustment' && (
            <div className="space-y-6">
              {/* Current Stock Info */}
              {inventory && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {inventory.current_stock}
                      </div>
                      <div className="text-sm text-gray-500">Celkový stav</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {inventory.reserved_stock}
                      </div>
                      <div className="text-sm text-gray-500">Rezervováno</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {inventory.available_stock}
                      </div>
                      <div className="text-sm text-gray-500">K dispozici</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Adjustment Form */}
              <form onSubmit={handleAdjustment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Typ pohybu *
                    </label>
                    <select
                      value={adjustmentData.type}
                      onChange={(e) => setAdjustmentData(prev => ({ 
                        ...prev, 
                        type: e.target.value as 'in' | 'out' | 'adjustment' 
                      }))}
                      className="input"
                    >
                      <option value="in">Příjem (+)</option>
                      <option value="out">Výdej (-)</option>
                      <option value="adjustment">Úprava stavu</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Množství *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={adjustmentData.quantity}
                      onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity: e.target.value }))}
                      className="input"
                      placeholder="Zadejte množství"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Poznámka
                  </label>
                  <textarea
                    value={adjustmentData.notes}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, notes: e.target.value }))}
                    className="input"
                    rows={3}
                    placeholder="Volitelná poznámka k pohybu..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Ukládám...' : 'Provést úpravu'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {movements.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Žádné pohyby skladu</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {movements.map((movement) => (
                    <div key={movement.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getMovementIcon(movement.type)}
                          <div>
                            <div className="font-medium text-gray-900">
                              {getMovementLabel(movement.type)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(movement.created_at).toLocaleString('cs-CZ')}
                              {movement.user && ` • ${movement.user.full_name}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${
                            movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity} ks
                          </div>
                        </div>
                      </div>
                      {movement.notes && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                          {movement.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  )
}