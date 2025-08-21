/*
  # Rozšíření pro správu skladu a produktů

  1. Změny v tabulkách
    - Přidání nákupní ceny do services
    - Přidání typu (service/product) do services
    - Přidání skladových informací
  
  2. Nové tabulky
    - stock_movements pro pohyby skladu
    - inventory pro aktuální stavy skladu

  3. Bezpečnost
    - RLS politiky pro nové tabulky
*/

-- Přidání sloupců do services tabulky
DO $$
BEGIN
  -- Přidání purchase_price (nákupní cena)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'purchase_price'
  ) THEN
    ALTER TABLE services ADD COLUMN purchase_price numeric(10,2) DEFAULT 0;
  END IF;

  -- Přidání type (service/product)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'type'
  ) THEN
    ALTER TABLE services ADD COLUMN type text DEFAULT 'service' CHECK (type IN ('service', 'product'));
  END IF;

  -- Přidání track_inventory (sledovat sklad)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'track_inventory'
  ) THEN
    ALTER TABLE services ADD COLUMN track_inventory boolean DEFAULT false;
  END IF;

  -- Přidání min_stock (minimální sklad)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'min_stock'
  ) THEN
    ALTER TABLE services ADD COLUMN min_stock integer DEFAULT 0;
  END IF;
END $$;

-- Tabulka pro aktuální stavy skladu
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  current_stock integer DEFAULT 0,
  reserved_stock integer DEFAULT 0,
  available_stock integer GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
  updated_at timestamptz DEFAULT now()
);

-- Tabulka pro pohyby skladu
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'sale', 'return')),
  quantity integer NOT NULL,
  reference_type text CHECK (reference_type IN ('order', 'adjustment', 'purchase', 'return')),
  reference_id uuid,
  notes text,
  user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS pro inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read inventory"
  ON inventory
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage inventory"
  ON inventory
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = uid() AND users.role IN ('admin', 'manager')
    )
  );

-- RLS pro stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read stock movements"
  ON stock_movements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage stock movements"
  ON stock_movements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = uid() AND users.role IN ('admin', 'manager')
    )
  );

-- Trigger pro automatické vytvoření inventory záznamu
CREATE OR REPLACE FUNCTION create_inventory_record()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.track_inventory = true THEN
    INSERT INTO inventory (service_id, current_stock)
    VALUES (NEW.id, 0)
    ON CONFLICT (service_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_inventory
  AFTER INSERT OR UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION create_inventory_record();

-- Trigger pro aktualizaci inventory při stock_movements
CREATE OR REPLACE FUNCTION update_inventory_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventory
  SET 
    current_stock = current_stock + 
      CASE 
        WHEN NEW.type IN ('in', 'return', 'adjustment') THEN NEW.quantity
        WHEN NEW.type IN ('out', 'sale') THEN -NEW.quantity
        ELSE 0
      END,
    updated_at = now()
  WHERE service_id = NEW.service_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_on_movement();

-- Unique constraint pro inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inventory_service_id_key'
  ) THEN
    ALTER TABLE inventory ADD CONSTRAINT inventory_service_id_key UNIQUE (service_id);
  END IF;
END $$;