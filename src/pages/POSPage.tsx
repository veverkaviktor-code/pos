import React, { useState, useEffect } from 'react'
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Receipt, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Service, Customer, Order, OrderItem } from '../types'

interface CartItem {
  service: Service
  quantity: number
  subtotal: number
  vatAmount: number
  total: number
}

export default function POSPage() {
  const { user } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank' | 'voucher'>('cash')
  const [loading, setLoading] = useState(false)
  const [servicesLoading, setServicesLoading] = useState(true)

  useEffect(() => {
    loadServices()
    loadCustomers()
  }, [])

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          vat_rate:vat_rates(*)
        `)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error('Error loading services:', error)
      toast.error('Chyba při načítání služeb')
    } finally {
      setServicesLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('first_name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const addToCart = (service: Service) => {
    const existingItem = cart.find(item => item.service.id === service.id)
    
    if (existingItem) {
      updateQuantity(service.id, existingItem.quantity + 1)
    } else {
      const vatRate = service.vat_rate?.rate || 0
      const subtotal = service.price
      const vatAmount = (subtotal * vatRate) / 100
      const total = subtotal + vatAmount

      const newItem: CartItem = {
        service,
        quantity: 1,
        subtotal,
        vatAmount,
        total
      }
      setCart([...cart, newItem])
    }
  }

  const updateQuantity = (serviceId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(serviceId)
      return
    }

    setCart(cart.map(item => {
      if (item.service.id === serviceId) {
        const subtotal = item.service.price * newQuantity
        const vatRate = item.service.vat_rate?.rate || 0
        const vatAmount = (subtotal * vatRate) / 100
        const total = subtotal + vatAmount

        return {
          ...item,
          quantity: newQuantity,
          subtotal,
          vatAmount,
          total
        }
      }
      return item
    }))
  }

  const removeFromCart = (serviceId: string) => {
    setCart(cart.filter(item => item.service.id !== serviceId))
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
  }

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
    const vatAmount = cart.reduce((sum, item) => sum + item.vatAmount, 0)
    const total = cart.reduce((sum, item) => sum + item.total, 0)

    return { subtotal, vatAmount, total }
  }

  const generateOrderNumber = () => {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const time = now.getTime().toString().slice(-6)
    return `${year}${month}${day}-${time}`
  }

  const processOrder = async () => {
    if (cart.length === 0) {
      toast.error('Košík je prázdný')
      return
    }

    if (!user) {
      toast.error('Uživatel není přihlášen')
      return
    }

    setLoading(true)

    try {
      const totals = calculateTotals()
      const orderNumber = generateOrderNumber()

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: selectedCustomer?.id || null,
          user_id: user.id,
          subtotal: totals.subtotal,
          vat_amount: totals.vatAmount,
          total: totals.total,
          payment_method: paymentMethod,
          status: 'completed'
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        service_id: item.service.id,
        quantity: item.quantity,
        unit_price: item.service.price,
        vat_rate: item.service.vat_rate?.rate || 0,
        subtotal: item.subtotal,
        vat_amount: item.vatAmount,
        total: item.total
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      toast.success(`Objednávka ${orderNumber} byla úspěšně vytvořena!`)
      clearCart()
      
      // Here you could trigger receipt printing
      printReceipt(order, cart, totals)

    } catch (error) {
      console.error('Error processing order:', error)
      toast.error('Chyba při zpracování objednávky')
    } finally {
      setLoading(false)
    }
  }

  const printReceipt = (order: any, cartItems: CartItem[], totals: any) => {
    // Simple receipt printing to console for now
    console.log('=== ÚČTENKA ===')
    console.log(`Číslo: ${order.order_number}`)
    console.log(`Datum: ${new Date().toLocaleString('cs-CZ')}`)
    console.log(`Obsluha: ${user?.full_name}`)
    if (selectedCustomer) {
      console.log(`Zákazník: ${selectedCustomer.first_name} ${selectedCustomer.last_name}`)
    }
    console.log('================')
    cartItems.forEach(item => {
      console.log(`${item.service.name} x${item.quantity} - ${item.total.toFixed(2)} Kč`)
    })
    console.log('================')
    console.log(`Celkem bez DPH: ${totals.subtotal.toFixed(2)} Kč`)
    console.log(`DPH: ${totals.vatAmount.toFixed(2)} Kč`)
    console.log(`Celkem: ${totals.total.toFixed(2)} Kč`)
    console.log(`Platba: ${paymentMethod}`)
    console.log('================')
    
    toast.success('Účtenka byla vytisknuta (zkontrolujte konzoli)')
  }

  const totals = calculateTotals()

  if (servicesLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">POS - Pokladna</h1>
        <p className="text-gray-600">Zpracování objednávek a plateb</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Služby</h3>
            </div>
            <div className="p-6">
              {services.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Žádné aktivní služby nejsou k dispozici
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 cursor-pointer transition-colors"
                      onClick={() => addToCart(service)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{service.name}</h4>
                        <span className="text-lg font-bold text-primary-600">
                          {service.price.toFixed(0)} Kč
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-500 mb-2">{service.description}</p>
                      )}
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{service.duration_minutes} min</span>
                        <span>DPH {service.vat_rate?.rate || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart & Checkout */}
        <div className="space-y-6">
          {/* Customer Selection */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Zákazník
              </h3>
            </div>
            <div className="p-4">
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const customer = customers.find(c => c.id === e.target.value)
                  setSelectedCustomer(customer || null)
                }}
                className="input"
              >
                <option value="">Bez zákazníka</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.first_name} {customer.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Košík ({cart.length})
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Vymazat vše
                  </button>
                )}
              </div>
            </div>
            <div className="p-4">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Košík je prázdný</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.service.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.service.name}</h4>
                        <p className="text-sm text-gray-500">
                          {item.service.price.toFixed(0)} Kč × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.service.id, item.quantity - 1)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.service.id, item.quantity + 1)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.service.id)}
                          className="p-1 text-red-400 hover:text-red-600 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-medium">{item.total.toFixed(2)} Kč</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          {cart.length > 0 && (
            <div className="card">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Způsob platby</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'cash'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Banknote className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm">Hotovost</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm">Karta</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('bank')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'bank'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm">Převod</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('voucher')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'voucher'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm">Poukaz</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Totals & Checkout */}
          {cart.length > 0 && (
            <div className="card">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Celkem</h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Bez DPH:</span>
                  <span>{totals.subtotal.toFixed(2)} Kč</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>DPH:</span>
                  <span>{totals.vatAmount.toFixed(2)} Kč</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Celkem:</span>
                  <span>{totals.total.toFixed(2)} Kč</span>
                </div>
                <button
                  onClick={processOrder}
                  disabled={loading}
                  className="w-full btn btn-primary mt-4 flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Receipt className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Zpracovávám...' : 'Zaplatit a vytisknout'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}