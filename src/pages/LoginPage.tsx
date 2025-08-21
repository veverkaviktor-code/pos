import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Scissors, UserPlus } from 'lucide-react'
import { createTestUser, createManagerUser, createCashierUser, checkUsersExist } from '../lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [creatingUsers, setCreatingUsers] = useState(false)
  const [checkingUsers, setCheckingUsers] = useState(false)
  const { signIn } = useAuth()

  const handleCheckUsers = async () => {
    setCheckingUsers(true)
    try {
      const result = await checkUsersExist()
      if (result.success) {
        if (result.users && result.users.length > 0) {
          toast.success(`Nalezeno ${result.users.length} uživatelů v databázi`)
          console.log('Existing users:', result.users)
        } else {
          toast.error('Žádní testovací uživatelé nebyli nalezeni. Vytvořte je nejprve.')
        }
      } else {
        toast.error('Chyba při kontrole uživatelů: ' + result.error)
      }
    } catch (error) {
      toast.error('Chyba při kontrole uživatelů')
    } finally {
      setCheckingUsers(false)
    }
  }

  const handleCreateTestUsers = async () => {
    setCreatingUsers(true)
    try {
      const adminResult = await createTestUser()
      const managerResult = await createManagerUser()
      const cashierResult = await createCashierUser()

      if (adminResult.success && managerResult.success && cashierResult.success) {
        toast.success('Testovací uživatelé byli vytvořeni! Zkontrolujte nastavení potvrzení emailu v Supabase.')
      } else {
        const errors = [
          !adminResult.success && `Admin: ${adminResult.error}`,
          !managerResult.success && `Manager: ${managerResult.error}`,
          !cashierResult.success && `Cashier: ${cashierResult.error}`
        ].filter(Boolean).join(', ')
        toast.error('Chyba při vytváření: ' + errors)
      }
    } catch (error) {
      toast.error('Chyba při vytváření uživatelů')
    } finally {
      setCreatingUsers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      toast.success('Úspěšně přihlášen!')
    } catch (error: any) {
      if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
        toast.error('Neplatné přihlašovací údaje. Zkontrolujte nastavení "Confirm email" v Supabase Dashboard → Authentication → Settings a vypněte ho.', {
          duration: 6000
        })
      } else {
        toast.error(error.message || 'Chyba při přihlašování')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-600">
            <Scissors className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Thai Massage POS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Přihlaste se do pokladního systému
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Heslo
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleCheckUsers}
              disabled={checkingUsers}
              className="group relative w-full flex justify-center py-2 px-4 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
            >
              {checkingUsers ? 'Kontroluji...' : 'Zkontrolovat existující uživatele'}
            </button>
            <button
              type="button"
              onClick={handleCreateTestUsers}
              disabled={creatingUsers}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {creatingUsers ? 'Vytváření uživatelů...' : 'Vytvořit testovací uživatele'}
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600 bg-yellow-50 border border-yellow-200 p-3 rounded-md">
            <p className="font-medium mb-2 text-yellow-800">⚠️ Důležité nastavení Supabase:</p>
            <div className="text-yellow-700 mb-2 space-y-2">
              <div>
                <strong>Pro vytvoření testovacích uživatelů:</strong><br/>
                1. Jděte do Supabase Dashboard → Authentication → Settings<br/>
                2. Zapněte "Allow new users to sign up" (toggle na ON)<br/>
                3. Vypněte "Confirm email" (toggle na OFF)<br/>
                4. Klikněte na "Vytvořit testovací uživatele"
              </div>
              <div>
                <strong>Pokud dostáváte chybu "Invalid login credentials":</strong><br/>
                Ujistěte se, že je "Confirm email" vypnuté (viz bod 3 výše)
              </div>
            </div>
            <p className="font-medium mb-2">Testovací přihlašovací údaje:</p>
            <div className="space-y-1">
              <p><strong>Admin:</strong> admin@thaimassage.cz / admin123</p>
              <p><strong>Manažer:</strong> manager@thaimassage.cz / manager123</p>
              <p><strong>Pokladní:</strong> pokladni@thaimassage.cz / pokladni123</p>
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Přihlašování...' : 'Přihlásit se'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}