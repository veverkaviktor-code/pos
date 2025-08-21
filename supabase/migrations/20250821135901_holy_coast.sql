/*
  # Fix infinite recursion in users table RLS policies

  1. Security Changes
    - Drop existing problematic RLS policies on users table
    - Create simple, non-recursive policies that use auth.uid() directly
    - Ensure users can read their own data without circular references
    - Allow admins to manage all users safely

  2. Policy Structure
    - Users can read their own profile using auth.uid() = id
    - Admins can manage all users (separate policy to avoid recursion)
    - No nested queries that reference the same table
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    -- Check if current user has admin role by looking at auth metadata
    (auth.jwt() ->> 'user_metadata' ->> 'role') = 'admin'
    OR
    -- Or check if they're accessing their own record
    auth.uid() = id
  );

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;