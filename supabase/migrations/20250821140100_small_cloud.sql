/*
  # Zjednodušení RLS politik pro users tabulku

  1. Bezpečnost
    - Odstraní všechny existující politiky
    - Vytvoří jednoduché politiky bez rekurze
    - Umožní čtení vlastního profilu
    - Umožní adminům spravovat uživatele přes auth metadata

  2. Poznámky
    - Používá pouze auth.uid() pro kontrolu identity
    - Neobsahuje žádné vnořené dotazy na users tabulku
*/

-- Odstranit všechny existující politiky
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage users via metadata" ON users;

-- Vytvořit jednoduché politiky
CREATE POLICY "Enable read for own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politika pro adminy - používá pouze auth metadata, ne dotaz na tabulku
CREATE POLICY "Enable all for admins"
  ON users
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );