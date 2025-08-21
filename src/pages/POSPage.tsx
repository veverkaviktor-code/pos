import React, { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, User, Package, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Service, Customer, Order, OrderItem, VATRate } from '../types';
import { useAuth } from '../hooks/useAuth';
import CustomerModal from '../components/CustomerModal';

interface CartItem extends OrderItem {
  service: Service;
}

export default function POSPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vatRates, setVATRates] = useState<VATRate[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank' | 'voucher'>('cash');
  const [loading, setLoading] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchCustomers();
    fetchVATRates();
  }, []);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        vat_rates (
          id,
          name,
          rate
        ),
        inventory (
          current_stock,
          reserved_stock,
          available_stock
        )
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching services:', error);
    } else {
      setServices(data || []);
    }
  };

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('first_name');

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data || []);
    }
  };

  const fetchVATRates = async () => {
    const { data, error } = await supabase
      .from('vat_rates')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching VAT rates:', error);
    } else {
      setVATRates(data || []);
    }
  };

  const addToCart = (service: Service) => {
    const inventory = service.inventory?.[0];
    const isOutOfStock = service.track_inventory && inventory && inventory.available_stock <= 0;
    
    if (isOutOfStock) {
      alert('Tento produkt není skladem');
      return;
    }

    const existingItem = cart.find(item => item.service_id === service.id);
    const vatRate = service.vat_rates?.rate || 0;
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      const maxQuantity = service.track_inventory && inventory ? inventory.available_stock : Infinity;
      
      if (newQuantity > maxQuantity) {
        alert(`Maximální dostupné množství: ${maxQuantity}`);
        return;
      }

      const subtotal = newQuantity * service.price;
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;

      setCart(cart.map(item =>
        item.service_id === service.id
          ? {
              ...item,
              quantity: newQuantity,
              subtotal,
              vat_amount: vatAmount,
              total
            }
          : item
      ));
    } else {
      const subtotal = service.price;
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;

      const newItem: CartItem = {
        id: crypto.randomUUID(),
        order_id: null,
        service_id: service.id,
        quantity: 1,
        unit_price: service.price,
        vat_rate: vatRate,
        subtotal,
        vat_amount: vatAmount,
        total,
        service
      };

      setCart([...cart, newItem]);
    }
  };

  const removeFromCart = (serviceId: string) => {
    const existingItem = cart.find(item => item.service_id === serviceId);
    
    if (existingItem && existingItem.quantity > 1) {
      const newQuantity = existingItem.quantity - 1;
      const subtotal = newQuantity * existingItem.unit_price;
      const vatAmount = subtotal * (existingItem.vat_rate / 100);
      const total = subtotal + vatAmount;

      setCart(cart.map(item =>
        item.service_id === serviceId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal,
              vat_amount: vatAmount,
              total
            }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.service_id !== serviceId));
    }
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const vatAmount = cart.reduce((sum, item) => sum + item.vat_amount, 0);
    const total = subtotal + vatAmount;

    return { subtotal, vatAmount, total };
  };

  const generateOrderNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const time = now.getTime().toString().slice(-6);
    
    return `${year}${month}${day}-${time}`;
  };

  const processOrder = async () => {
    if (cart.length === 0) {
      alert('Košík je prázdný');
      return;
    }

    if (!user) {
      alert('Nejste přihlášeni');
      return;
    }

    setLoading(true);

    try {
      const { subtotal, vatAmount, total } = calculateTotals();
      const orderNumber = generateOrderNumber();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: selectedCustomer?.id || null,
          user_id: user.id,
          subtotal,
          vat_amount: vatAmount,
          total,
          payment_method: paymentMethod,
          status: 'completed'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        service_id: item.service_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        subtotal: item.subtotal,
        vat_amount: item.vat_amount,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update inventory for products
      for (const item of cart) {
        if (item.service.track_inventory) {
          const { error: stockError } = await supabase.rpc('update_stock', {
            p_service_id: item.service_id,
            p_quantity: -item.quantity,
            p_type: 'sale',
            p_description: `Prodej - objednávka ${orderNumber}`
          });

          if (stockError) {
            console.error('Error updating stock:', stockError);
          }
        }
      }

      alert(`Objednávka ${orderNumber} byla úspěšně vytvořena!`);
      clearCart();
      fetchServices(); // Refresh services to update stock levels

    } catch (error) {
      console.error('Error processing order:', error);
      alert('Chyba při zpracování objednávky');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, vatAmount, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Pokladna (POS)</h1>
          <p className="text-gray-600">Prodej služeb a produktů</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Services/Products Grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Služby a produkty</h2>
              
              {services.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Žádné služby nebo produkty</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services.map((service) => {
                    const inventory = service.inventory?.[0];
                    const isOutOfStock = service.track_inventory && inventory && inventory.available_stock <= 0;
                    const isLowStock = service.track_inventory && inventory && inventory.available_stock <= (service.min_stock || 0) && inventory.available_stock > 0;

                    return (
                      <div
                        key={service.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isOutOfStock
                            ? 'bg-red-50 border-red-200 cursor-not-allowed'
                            : isLowStock
                            ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => !isOutOfStock && addToCart(service)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className={`font-medium ${isOutOfStock ? 'text-red-600' : 'text-gray-900'}`}>
                            {service.name}
                          </h3>
                          <div className="flex items-center space-x-1">
                            {service.type === 'product' && (
                              <Package className="w-4 h-4 text-gray-400" />
                            )}
                            {isOutOfStock && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                            {isLowStock && (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-lg font-semibold ${isOutOfStock ? 'text-red-600' : 'text-green-600'}`}>
                          {service.price.toLocaleString('cs-CZ')} Kč
                        </p>
                        
                        {service.track_inventory && inventory && (
                          <p className={`text-sm mt-1 ${
                            isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-gray-500'
                          }`}>
                            {isOutOfStock ? 'Vyprodáno' : `Skladem: ${inventory.available_stock}`}
                          </p>
                        )}
                        
                        {service.vat_rates && (
                          <p className="text-xs text-gray-400 mt-1">
                            DPH: {service.vat_rates.rate}%
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Košík ({cart.length})
              </h2>

              {/* Customer Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zákazník
                </label>
                <div className="flex space-x-2">
                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => {
                      const customer = customers.find(c => c.id === e.target.value);
                      setSelectedCustomer(customer || null);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Vyberte zákazníka</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Košík je prázdný</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.service_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.service.name}</h4>
                        <p className="text-sm text-gray-500">
                          {item.unit_price.toLocaleString('cs-CZ')} Kč × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => removeFromCart(item.service_id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-medium">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item.service)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Method */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Způsob platby
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Hotovost</option>
                  <option value="card">Karta</option>
                  <option value="bank">Bankovní převod</option>
                  <option value="voucher">Poukázka</option>
                </select>
              </div>

              {/* Totals */}
              {cart.length > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Mezisoučet:</span>
                    <span>{subtotal.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>DPH:</span>
                    <span>{vatAmount.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Celkem:</span>
                    <span>{total.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 space-y-2">
                <button
                  onClick={processOrder}
                  disabled={cart.length === 0 || loading}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Zpracovávám...' : 'Dokončit prodej'}
                </button>
                
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700"
                  >
                    Vymazat košík
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <CustomerModal
          customer={null}
          onSave={(customer) => {
            setCustomers([...customers, customer]);
            setSelectedCustomer(customer);
            setShowCustomerModal(false);
          }}
          onClose={() => setShowCustomerModal(false)}
        />
      )}
    </div>
  );
}