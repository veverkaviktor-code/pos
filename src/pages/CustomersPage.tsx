import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, User, Phone, Mail, Search } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Customer } from '../types'
import CustomerModal from '../components/CustomerModal'

export default function CustomersPage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    // Filter customers based on search term
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers)
    } else {
      const filtered = customers.filter(customer =>
        customer.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm)
      )
      setFilteredCustomers(filtered)
    }
  }, [customers, searchTerm])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('first_name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error loading customers:', error)
      toast.error('Chyba při načítání zákazníků')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedCustomer(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Opravdu chcete smazat zákazníka ${customer.first_name} ${customer.last_name}?`)) return

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id)

      if (error) throw error
      toast.success('Zákazník byl smazán')
      loadCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('Chyba při mazání zákazníka')
    }
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Zákazníci</h1>
            <p className="text-gray-600">Evidence klientů a jejich historie</p>
          </div>
          <button
            onClick={handleAdd}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Přidat zákazníka
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Hledat zákazníka..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="card">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">
                      {customer.first_name} {customer.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Zákazník od {new Date(customer.created_at).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {customer.email && (
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                
                {customer.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{customer.phone}</span>
                  </div>
                )}

                {customer.notes && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                    {customer.notes}
                  </div>
                )}
              </div>

              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => handleEdit(customer)}
                  className="flex-1 btn btn-secondary text-sm"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Upravit
                </button>
                
                {canManage && (
                  <button
                    onClick={() => handleDelete(customer)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Žádní zákazníci nenalezeni' : 'Žádní zákazníci'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm 
              ? `Zkuste upravit vyhledávací výraz "${searchTerm}"`
              : 'Začněte přidáním prvního zákazníka.'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={handleAdd}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Přidat prvního zákazníka
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            setIsModalOpen(false)
            loadCustomers()
          }}
        />
      )}
    </div>
  )
}