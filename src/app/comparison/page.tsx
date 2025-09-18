'use client'

import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { LeaveEntry, AppSettings, PublicHoliday, CarryoverLeave } from '../../types'
import { leaveStorage } from '../../utils/storage'
import { calculateMonthlyLeaveSummarySeparated } from '../../utils/leaveUtils'
import MainLayout from '../../components/MainLayout'

export default function ComparisonPage() {
  const [leaves, setLeaves] = useState<LeaveEntry[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [carryovers, setCarryovers] = useState<CarryoverLeave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const leavesData = await leaveStorage.getLeaves()
      const settingsData = await leaveStorage.getSettings()
      const holidaysData = await leaveStorage.getHolidays()
      const carryoversData = await leaveStorage.getCarryoverLeaves()
      
      setLeaves(leavesData)
      setSettings(settingsData)
      setHolidays(holidaysData)
      setCarryovers(carryoversData)
      setIsLoading(false)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    // Charger les données de feuille de paie depuis localStorage
    let payrollData = {}
    try {
      const savedPayrollData = localStorage.getItem('payrollDataByMonth')
      if (savedPayrollData) {
        payrollData = JSON.parse(savedPayrollData)
      }
    } catch (error) {
      console.log('Erreur lors du chargement des données de feuille de paie:', error)
    }

    const data = {
      leaves,
      settings,
      holidays,
      carryovers,
      payrollData,
      exportDate: new Date().toISOString(),
      version: '1.1'
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comparison-data-${currentYear}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Données exportées avec succès')
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (data.leaves) await leaveStorage.saveLeaves(data.leaves)
      if (data.settings) await leaveStorage.saveSettings(data.settings)
      if (data.holidays) await leaveStorage.saveHolidays(data.holidays)
      if (data.carryovers) await leaveStorage.saveCarryoverLeaves(data.carryovers)
      
      // Importer les données de feuille de paie
      if (data.payrollData) {
        localStorage.setItem('payrollDataByMonth', JSON.stringify(data.payrollData))
      }
      
      toast.success('Données importées avec succès')
      await loadData()
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      toast.error('Erreur lors de l\'import des données')
    }
  }

  const monthlySummary = useMemo(() => {
    if (!settings?.quotas) return null
    return calculateMonthlyLeaveSummarySeparated(leaves, settings.quotas, carryovers, currentYear)
  }, [leaves, settings, carryovers, currentYear])

  const goToPreviousYear = () => {
    setCurrentYear(prev => prev - 1)
  }

  const goToNextYear = () => {
    setCurrentYear(prev => prev + 1)
  }

  const goToCurrentYear = () => {
    setCurrentYear(new Date().getFullYear())
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    )
  }

  return (
    <MainLayout
      onExport={handleExport}
      onImport={handleImport}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Réel vs Prévision</h1>
        <p className="text-gray-600 dark:text-gray-400">Comparaison des congés réels et en prévision</p>
      </div>

      <div className="space-y-8">
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tableau Réel vs Prévisions
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Suivi mensuel des RTT et CP avec données réelles et prévisions
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={goToPreviousYear}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  ← {currentYear - 1}
                </button>
                <button
                  onClick={goToCurrentYear}
                  className={`px-3 py-1 text-sm rounded ${
                    currentYear === new Date().getFullYear()
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {currentYear}
                </button>
                <button
                  onClick={goToNextYear}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {currentYear + 1} →
                </button>
              </div>
            </div>
          </div>
          <div className="card-content">
            {monthlySummary ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                        Mois
                      </th>
                      <th colSpan={1} className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                        {/* Colonne vide */}
                      </th>
                      <th colSpan={4} className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-blue-200 dark:bg-blue-800 border-r border-gray-200 dark:border-gray-700">
                        Réel
                      </th>
                      <th colSpan={4} className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-purple-200 dark:bg-purple-800">
                        Prévisions
                      </th>
                    </tr>
                    <tr>
                      <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                        {/* Colonne vide décalée */}
                      </th>
                      <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-900 border-r border-gray-200 dark:border-gray-700">
                        RTT
                      </th>
                      <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-900 border-r border-gray-200 dark:border-gray-700">
                        Cumul
                      </th>
                      <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-900 border-r border-gray-200 dark:border-gray-700">
                        CP
                      </th>
                      <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-900 border-r border-gray-200 dark:border-gray-700">
                        Cumul
                      </th>
                      <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-purple-100 dark:bg-purple-900 border-r border-gray-200 dark:border-gray-700">
                        RTT
                      </th>
                      <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-purple-100 dark:bg-purple-900 border-r border-gray-200 dark:border-gray-700">
                        Cumul
                      </th>
                      <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-purple-100 dark:bg-purple-900 border-r border-gray-200 dark:border-gray-700">
                        CP
                      </th>
                      <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-purple-100 dark:bg-purple-900">
                        Cumul
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummary.months.map((monthData, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                          {monthData.monthName}
                        </td>
                        {/* Colonne vide décalée */}
                        <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                          {/* Vide */}
                        </td>
                        {/* RTT Réel */}
                        <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                          {monthData.rtt.real.taken > 0 ? monthData.rtt.real.taken : ''}
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                          {monthData.rtt.real.remaining}
                        </td>
                        {/* CP Réel */}
                        <td className="px-2 py-2 text-center text-sm text-green-600 dark:text-green-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                          {monthData.cp.real.taken > 0 ? monthData.cp.real.taken : ''}
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                          {monthData.cp.real.remaining}
                        </td>
                        {/* RTT Prévisions */}
                        <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                          {monthData.rtt.forecast.taken > 0 ? monthData.rtt.forecast.taken : ''}
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                          {monthData.rtt.forecast.remaining}
                        </td>
                        {/* CP Prévisions */}
                        <td className="px-2 py-2 text-center text-sm text-green-600 dark:text-green-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                          {monthData.cp.forecast.taken > 0 ? monthData.cp.forecast.taken : ''}
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white">
                          {monthData.cp.forecast.remaining}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}


