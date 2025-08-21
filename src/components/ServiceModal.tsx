import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Service, VATRate } from '../types'

interface ServiceModalProps {
  service: Service | null
  vatRates: VATRate[]
  onClose: () => void
  onSave: () => void
}

export default function ServiceModal({ service, vatRates, onClose, onSave }: ServiceModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'service' as 'service' | 'product',
    price: '',
    purchase_price: '',
    duration_minutes: '60',
    vat_rate_id: '',
    track_inventory: false,
    min_stock: '0',
    is_active: true
  })

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || '',
        type: service.type,
        price: service.price.toString(),
        purchase_price: service.purchase_price?.toString() || '',
        duration_minutes: service.duration_minutes.toString(),
        vat_rate_id: service.vat_rate_id,
        track_inventory: service.track_inventory,
        min_stock: service.min_stock?.toString() || '0',
        is_active: service.is_active
      })
    } else {
      // Default VAT rate
      const defaultVatRate = vatRates.find(vat => vat.rate === 21)
      setFormData(prev => ({
        ...prev,
        vat_rate_id: defaultVatRate?.id || vatRates[0]?.id || ''
      }))
    }
  }, [service, vatRates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        price: parseFloat(formData.price),
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        duration_minutes: parseInt(formData.duration_minutes),
        vat_rate_id: formData.vat_rate_id,
        track_inventory: formData.track_inventory,
        min_stock: formData.track_inventory ? parseInt(formData.min_stock) : null,
        is_active: formData.is_active
      }

      if (service) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update(data)
          .eq('id', service.id)

        if (error) throw error
        toast.success('Služba byla aktualizována')
      } else {
        // Create new service
        const { error } = await supabase
          .from('services')
          .insert(data)

        if (error) throw error
        toast.success('Služba byla vytvořena')
      }

      onSave()
    } catch (error) {
      console.error('Error saving service:', error)
      toast.error('Chyba při ukládání služby')
    } finally {
      setLoading(false)
    }
  }

  const calculateMargin = () => {
    const price = parseFloat(formData.price) || 0
    const purchasePrice = parseFloat(formData.purchase_price) || 0
    if (price > 0 && purchasePrice > 0) {
      return ((price - purchasePrice) / price * 100).toFixed(1)
    }
    return '0'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {service ? 'Upravit službu/produkt' : 'Přidat novou službu/produkt'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Název *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input"
                placeholder="Název služby nebo produktu"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Typ *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  type: e.target.value as 'service' | 'product',
                  track_inventory: e.target.value === 'product' ? true : prev.track_inventory
                }))}
                className="input"
              >
                <option value="service">Služba</option>
                <option value="product">Produkt</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Popis
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input"
              rows={3}
              placeholder="Volitelný popis..."
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prodejní cena (Kč) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nákupní cena (Kč)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                className="input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marže
              </label>
              <div className="input bg-gray-50 flex items-center">
                <span className={`font-medium ${
                  parseFloat(calculateMargin()) > 50 ? 'text-green-600' : 
                  parseFloat(calculateMargin()) > 20 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {calculateMargin()}%
                </span>
              </div>
            </div>
          </div>

          {/* Duration and VAT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.type === 'service' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doba trvání (minuty) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  className="input"
                  placeholder="60"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DPH sazba *
              </label>
              <select
                required
                value={formData.vat_rate_id}
                onChange={(e) => setFormData(prev => ({ ...prev, vat_rate_id: e.target.value }))}
                className="input"
              >
                <option value="">Vyberte DPH sazbu</option>
                {vatRates.map((vatRate) => (
                  <option key={vatRate.id} value={vatRate.id}>
                    {vatRate.name} ({vatRate.rate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Inventory Management */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="track_inventory"
                checked={formData.track_inventory}
                onChange={(e) => setFormData(prev => ({ ...prev, track_inventory: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="track_inventory" className="ml-2 text-sm font-medium text-gray-700">
                Sledovat stav skladu
              </label>
            </div>

            {formData.track_inventory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimální stav skladu
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_stock: e.target.value }))}
                  className="input max-w-xs"
                  placeholder="0"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Upozornění při poklesu pod tuto hodnotu
                </p>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
              Aktivní (zobrazit v POS)
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Ukládám...' : service ? 'Aktualizovat' : 'Vytvořit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}