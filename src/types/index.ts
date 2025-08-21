export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'cashier'
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface VATRate {
  id: string
  name: string
  rate: number
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
  vat_rate_id: string
  vat_rate?: VATRate
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_number: string
  customer_id?: string
  customer?: Customer
  user_id: string
  user?: User
  subtotal: number
  vat_amount: number
  total: number
  payment_method: 'cash' | 'card' | 'bank' | 'voucher'
  status: 'pending' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  updated_at: string
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  service_id: string
  service?: Service
  quantity: number
  unit_price: number
  vat_rate: number
  subtotal: number
  vat_amount: number
  total: number
}

export interface CashSession {
  id: string
  user_id: string
  user?: User
  opening_balance: number
  closing_balance?: number
  expected_balance?: number
  difference?: number
  started_at: string
  ended_at?: string
  status: 'open' | 'closed'
}

export interface CashMovement {
  id: string
  cash_session_id: string
  type: 'sale' | 'refund' | 'opening' | 'closing' | 'adjustment'
  amount: number
  description?: string
  order_id?: string
  created_at: string
}