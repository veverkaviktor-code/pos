import React from 'react'
import { BarChart3, Users, Scissors, CreditCard } from 'lucide-react'

const stats = [
  {
    name: 'Dnešní tržby',
    value: '12 450 Kč',
    change: '+12%',
    changeType: 'positive',
    icon: CreditCard,
  },
  {
    name: 'Zákazníci dnes',
    value: '23',
    change: '+5%',
    changeType: 'positive',
    icon: Users,
  },
  {
    name: 'Aktivní služby',
    value: '8',
    change: '0%',
    changeType: 'neutral',
    icon: Scissors,
  },
  {
    name: 'Průměrná objednávka',
    value: '541 Kč',
    change: '+8%',
    changeType: 'positive',
    icon: BarChart3,
  },
]

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Přehled dnešních aktivit</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </div>
                    <div
                      className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'positive'
                          ? 'text-green-600'
                          : stat.changeType === 'negative'
                          ? 'text-red-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {stat.change}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Poslední objednávky</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Objednávka #{1000 + i}
                    </p>
                    <p className="text-sm text-gray-500">
                      Thai masáž 60 min + Olejová masáž
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {800 + i * 50} Kč
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date().toLocaleTimeString('cs-CZ', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Nejoblíbenější služby</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { name: 'Thai masáž 60 min', count: 15, percentage: 35 },
                { name: 'Olejová masáž 90 min', count: 12, percentage: 28 },
                { name: 'Reflexní masáž', count: 8, percentage: 19 },
                { name: 'Sportovní masáž', count: 5, percentage: 12 },
                { name: 'Relaxační masáž', count: 3, percentage: 7 },
              ].map((service) => (
                <div key={service.name}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {service.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {service.count}x
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${service.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}