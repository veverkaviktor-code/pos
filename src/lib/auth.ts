import { supabase } from './supabase'

export async function createTestUser() {
  try {
    // Create a test admin user
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@thaimassage.cz',
      password: 'admin123',
      options: {
        data: {
          full_name: 'Admin Uživatel',
          role: 'admin'
        }
      }
    })

    if (error) {
      console.error('Error creating test user:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error:', error)
    return { success: false, error: 'Unexpected error' }
  }
}

export async function createManagerUser() {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'manager@thaimassage.cz',
      password: 'manager123',
      options: {
        data: {
          full_name: 'Manažer Salonu',
          role: 'manager'
        }
      }
    })

    if (error) {
      console.error('Error creating manager user:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error:', error)
    return { success: false, error: 'Unexpected error' }
  }
}

export async function createCashierUser() {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'pokladni@thaimassage.cz',
      password: 'pokladni123',
      options: {
        data: {
          full_name: 'Pokladní',
          role: 'cashier'
        }
      }
    })

    if (error) {
      console.error('Error creating cashier user:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error:', error)
    return { success: false, error: 'Unexpected error' }
  }
}