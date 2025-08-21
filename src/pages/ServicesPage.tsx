import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Package, Scissors, AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Service, VATRate, Inventory } from '../types'
import ServiceModal from '../components/ServiceModal'
import StockModal from '../components/StockModal'

export default function ServicesPage() {
  const { user } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [vatRates, setVATRates] = useState<VATRate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'service' | 'product'>('all')

  useEffect(() => {
    loadServices()
    loadVATRates()
  }, [])

  const loadServices = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          vat_rate:vat_rates(*),
          inventory(*)
        `)
        .order('name')

      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error('Error loading services:', error)
      toast.error('Chyba při načítání služeb')
    } finally {
      setLoading(false)
    }
  }

  const loadVATRates = async () => {
    try {
      const { data, error } = await supabase
        .from('vat_rates')
        .select('*')
        .eq('is_active', true)
        .order('rate')

      if (error) throw error
      setVATRates(data || [])
    } catch (error) {
      console.error('Error loading VAT rates:', error)
    }
  }

  const handleEdit = (service: Service) => {
    setSelectedService(service)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedService(null)
    setIsModalOpen(true)
  }

  const handleStockManagement = (service: Service) => {
    setSelectedService(service)
    setIsStockModalOpen(true)
  }

  const handleDelete = async (service: Service) => {
    if (!confirm(`Opravdu chcete smazat ${service.name}?`)) return

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', service.id)

      if (error) throw error
      toast.success('Služba byla smazána')
      loadServices()
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Chyba při mazání služby')
    }
  }

  const handleToggleActive = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)

      if (error) throw error
      toast.success(`Služba byla ${!service.is_active ? 'aktivována' : 'deaktivována'}`)
      loadServices()
    } catch (error) {
      console.error('Error toggling service:', error)
      toast.error('Chyba při změně stavu služby')
    }
  }

  const filteredServices = services.filter(service => {
    if (filter === 'all') return true
    return service.type === filter
  })

  const canManage = user?.role === 'admin' || user?.role === 'manager'

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Služby a produkty</h1>
            <p className="text-gray-600">Správa masážních služeb, produktů a ceníku</p>
          </div>
          {canManage && (
            <button
              onClick={handleAdd}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Přidat novou
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Vše ({services.length})
          </button>
          <button
            onClick={() => setFilter('service')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'service'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Služby ({services.filter(s => s.type === 'service').length})
          </button>
          <button
            onClick={() => setFilter('product')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'product'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Produkty ({services.filter(s => s.type === 'product').length})
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => {
          const inventory = service.inventory?.[0]
          const isLowStock = inventory && inventory.available_stock <= (service.min_stock || 0)
          const margin = service.purchase_price 
            ? ((service.price - service.purchase_price) / service.price * 100)
            : 0

          return (
            <div key={service.id} className="card">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {service.type === 'product' ? (
                      <Package className="h-5 w-5 text-blue-500 mr-2" />
                    ) : (
                      <Scissors className="h-5 w-5 text-green-500 mr-2" />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        service.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {service.is_active ? 'Aktivní' : 'Neaktivní'}
                      </span>
                    </div>
                  </div>
                  {isLowStock && (
                    <AlertTriangle className="h-5 w-5 text-orange-500" title="Nízký stav skladu" />
                  )}
                </div>

                {service.description && (
                  <p className="text-sm text-gray-600 mb-4">{service.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prodejní cena:</span>
                    <span className="font-medium">{service.price.toFixed(0)} Kč</span>
                  </div>
                  
                  {service.purchase_price && service.purchase_price > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nákupní cena:</span>
                        <span>{service.purchase_price.toFixed(0)} Kč</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Marže:</span>
                        <span className={margin > 50 ? 'text-green-600' : margin > 20 ? 'text-yellow-600' : 'text-red-600'}>
                          {margin.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-500">DPH:</span>
                    <span>{service.vat_rate?.rate || 0}%</span>
                  </div>

                  {service.type === 'service' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Doba trvání:</span>
                      <span>{service.duration_minutes} min</span>
                    </div>
                  )}

                  {service.track_inventory && inventory && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sklad:</span>
                      <span className={isLowStock ? 'text-orange-600 font-medium' : ''}>
                        {inventory.available_stock} ks
                      </span>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => handleEdit(service)}
                      className="flex-1 btn btn-secondary text-sm"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Upravit
                    </button>
                    
                    {service.track_inventory && (
                      <button
                        onClick={() => handleStockManagement(service)}
                        className="flex-1 btn btn-secondary text-sm"
                      >
                        <Package className="h-3 w-3 mr-1" />
                        Sklad
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleActive(service)}
                      className={`px-3 py-1 rounded text-sm ${
                        service.is_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {service.is_active ? 'Deaktivovat' : 'Aktivovat'}
                    </button>

                    <button
                      onClick={() => handleDelete(service)}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'Žádné služby ani produkty' : 
             filter === 'service' ? 'Žádné služby' : 'Žádné produkty'}
          </h3>
          <p className="text-gray-500 mb-4">
            {canManage ? 'Začněte přidáním první položky.' : 'Zatím nejsou k dispozici žádné položky.'}
          </p>
          {canManage && (
            <button
              onClick={handleAdd}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Přidat první položku
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {isModalOpen && (
        <ServiceModal
          service={selectedService}
          vatRates={vatRates}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            setIsModalOpen(false)
            loadServices()
          }}
        />
      )}

      {isStockModalOpen && selectedService && (
        <StockModal
          service={selectedService}
          onClose={() => setIsStockModalOpen(false)}
          onSave={() => {
            setIsStockModalOpen(false)
            loadServices()
          }}
        />
      )}
    </div>
  )
}