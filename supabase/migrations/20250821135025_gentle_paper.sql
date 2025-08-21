/*
  # Thai Massage POS Database Schema

  1. New Tables
    - `users` - System users with roles (admin, manager, cashier)
    - `customers` - Salon clients
    - `vat_rates` - Czech VAT rates (21%, 12%, 0%)
    - `services` - Massage services offered
    - `orders` - Transaction records
    - `order_items` - Individual services in orders
    - `cash_sessions` - Cash register sessions
    - `cash_movements` - Cash flow tracking

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
    - Secure user data access

  3. Initial Data
    - Default admin user
    - Czech VAT rates
    - Sample massage services
*/

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create VAT rates table (Czech rates)
CREATE TABLE IF NOT EXISTS vat_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate decimal(5,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create services table (massage services)
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  vat_rate_id uuid REFERENCES vat_rates(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table (transactions)
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  user_id uuid REFERENCES users(id) NOT NULL,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  vat_amount decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank', 'voucher')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  vat_rate decimal(5,2) NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  vat_amount decimal(10,2) NOT NULL,
  total decimal(10,2) NOT NULL
);

-- Create cash sessions table
CREATE TABLE IF NOT EXISTS cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  opening_balance decimal(10,2) NOT NULL DEFAULT 0,
  closing_balance decimal(10,2),
  expected_balance decimal(10,2),
  difference decimal(10,2),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- Create cash movements table
CREATE TABLE IF NOT EXISTS cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id uuid REFERENCES cash_sessions(id),
  type text NOT NULL CHECK (type IN ('sale', 'refund', 'opening', 'closing', 'adjustment')),
  amount decimal(10,2) NOT NULL,
  description text,
  order_id uuid REFERENCES orders(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Users policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Customers policies
CREATE POLICY "Authenticated users can read customers" ON customers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage customers" ON customers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- VAT rates policies
CREATE POLICY "Everyone can read VAT rates" ON vat_rates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage VAT rates" ON vat_rates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Services policies
CREATE POLICY "Everyone can read services" ON services
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage services" ON services
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Orders policies
CREATE POLICY "Users can read all orders" ON orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Cashiers can create orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier')
    )
  );

CREATE POLICY "Managers and admins can manage orders" ON orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Order items policies
CREATE POLICY "Users can read order items" ON order_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Cashiers can manage order items" ON order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier')
    )
  );

-- Cash sessions policies
CREATE POLICY "Users can read own cash sessions" ON cash_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own cash sessions" ON cash_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers can read all cash sessions" ON cash_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Cash movements policies
CREATE POLICY "Users can read cash movements for their sessions" ON cash_movements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cash_sessions 
      WHERE id = cash_session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage cash movements for their sessions" ON cash_movements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cash_sessions 
      WHERE id = cash_session_id AND user_id = auth.uid()
    )
  );

-- Insert Czech VAT rates
INSERT INTO vat_rates (name, rate, is_active) VALUES
  ('Standardní sazba', 21.00, true),
  ('Snížená sazba', 12.00, true),
  ('Nulová sazba', 0.00, true)
ON CONFLICT DO NOTHING;

-- Insert sample massage services
INSERT INTO services (name, description, price, duration_minutes, vat_rate_id, is_active)
SELECT 
  service_name,
  service_description,
  service_price,
  service_duration,
  vr.id,
  true
FROM (
  VALUES 
    ('Thai masáž 60 min', 'Tradiční thajská masáž celého těla', 800.00, 60),
    ('Thai masáž 90 min', 'Prodloužená thajská masáž s důrazem na problémové partie', 1200.00, 90),
    ('Olejová masáž 60 min', 'Relaxační masáž s aromatickými oleji', 900.00, 60),
    ('Olejová masáž 90 min', 'Prodloužená olejová masáž pro maximální relaxaci', 1300.00, 90),
    ('Reflexní masáž chodidel', 'Terapeutická masáž reflexních bodů na chodidlech', 600.00, 45),
    ('Sportovní masáž', 'Masáž zaměřená na regeneraci po sportovní aktivitě', 1000.00, 60),
    ('Masáž zad a šíje', 'Cílená masáž problémových partií', 650.00, 45),
    ('Párová masáž', 'Současná masáž pro dva v jedné místnosti', 1600.00, 60)
) AS services_data(service_name, service_description, service_price, service_duration)
CROSS JOIN vat_rates vr
WHERE vr.name = 'Standardní sazba'
ON CONFLICT DO NOTHING;

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();