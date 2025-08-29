'use client'

import { BarChart3, Calendar, Clock, Download, Plus, Settings, Upload, Package } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AppSettings, LeaveBalance, LeaveEntry, PublicHoliday, CarryoverLeave } from '../types'
import { calculateLeaveBalances, calculateLeaveStats, formatDate, getHolidaysForYear, getLeaveTypeLabel, getLeaveTypeColor, getLeaveTypeIcon, calculateCurrentAvailableRTT, calculateMonthlyLeaveSummary } from '../utils/leaveUtils'
import { leaveStorage } from '../utils/storage'

export default function Dashboard() {
  const [leaves, setLeaves] = useState<LeaveEntry[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [carryovers, setCarryovers] = useState<CarryoverLeave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentYear] = useState(new Date().getFullYear())
  const [currentRTT, setCurrentRTT] = useState<{ totalAvailable: number; details: Array<{ month: number; available: number; canTake: boolean; reason?: string }> } | null>(null)
  const [monthlySummary, setMonthlySummary] = useState<{ months: any[]; yearlyTotals: any } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      console.log('Début du chargement des données...')
      
      // Charger les données de base une par une pour éviter les erreurs
      let leavesData: LeaveEntry[] = []
      let settingsData: AppSettings | null = null
      let holidaysData: PublicHoliday[] = []
      let carryoversData: CarryoverLeave[] = []

      try {
        leavesData = await leaveStorage.getLeaves()
      } catch (error) {
        console.log('Erreur lors du chargement des congés:', error)
        leavesData = []
      }

      try {
        settingsData = await leaveStorage.getSettings()
      } catch (error) {
        console.log('Erreur lors du chargement des paramètres:', error)
        settingsData = null
      }

      try {
        holidaysData = await leaveStorage.getHolidays()
      } catch (error) {
        console.log('Erreur lors du chargement des jours fériés:', error)
        holidaysData = []
      }

      try {
        carryoversData = await leaveStorage.getCarryoverLeaves()
      } catch (carryoverError) {
        console.log('Table carryover non trouvée, utilisation d\'un tableau vide:', carryoverError)
        carryoversData = []
      }

      console.log('Données chargées:', {
        leaves: leavesData.length,
        settings: settingsData,
        holidays: holidaysData.length,
        carryovers: carryoversData.length
      })

      setLeaves(leavesData)
      setSettings(settingsData)
      setHolidays(holidaysData)
      setCarryovers(carryoversData)

      // Calculer les RTT disponibles actuellement
      const rttAvailability = calculateCurrentAvailableRTT()
      setCurrentRTT(rttAvailability)

      // Calculer le tableau mensuel détaillé
      if (settingsData && settingsData.quotas) {
        const monthlyData = calculateMonthlyLeaveSummary(
          leavesData,
          settingsData.quotas,
          carryoversData,
          currentYear
        )
        setMonthlySummary(monthlyData)
      }

      // Calculer les soldes avec les reliquats
      if (settingsData && settingsData.quotas) {
        console.log('Calcul des soldes avec quotas:', settingsData.quotas)
        const calculatedBalances = calculateLeaveBalances(
          leavesData,
          settingsData.quotas,
          carryoversData,
          currentYear
        )
        console.log('Soldes calculés:', calculatedBalances)
        setBalances(calculatedBalances)
      } else {
        console.log('Pas de paramètres ou quotas manquants')
        // Créer des soldes par défaut si pas de paramètres
        const defaultBalances: LeaveBalance[] = [
          { type: 'cp', total: 25, used: 0, remaining: 25 },
          { type: 'rtt', total: 10, used: 0, remaining: 10 }
        ]
        setBalances(defaultBalances)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      toast.error('Erreur lors du chargement des données')
      
      // En cas d'erreur, afficher des soldes par défaut
      const defaultBalances: LeaveBalance[] = [
        { type: 'cp', total: 25, used: 0, remaining: 25 },
        { type: 'rtt', total: 10, used: 0, remaining: 10 }
      ]
      setBalances(defaultBalances)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const data = await leaveStorage.exportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leave-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Sauvegarde exportée avec succès')
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      toast.error('Erreur lors de l\'export')
    }
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as string
        await leaveStorage.importData(data)
        await loadData()
        toast.success('Données importées avec succès')
      } catch (error) {
        console.error('Erreur lors de l\'import:', error)
        toast.error('Erreur lors de l\'import')
      }
    }
    reader.readAsText(file)
  }

  const stats = calculateLeaveStats(leaves, currentYear)
  const recentLeaves = leaves
    .filter(leave => new Date(leave.startDate).getFullYear() === currentYear)
    .filter(leave => ['cp', 'rtt', 'cet'].includes(leave.type))
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 5)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                📅 Gestionnaire de Congés
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gérez vos congés et suivez vos soldes
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="btn-secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </button>
              <label className="btn-secondary cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Importer
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Desktop */}
      <nav className="hidden md:block bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/" className="nav-link-active">
              <BarChart3 className="w-5 h-5 mr-2" />
              Dashboard
            </Link>
            <Link href="/add" className="nav-link-inactive">
              <Plus className="w-5 h-5 mr-2" />
              Ajouter un congé
            </Link>
            <Link href="/history" className="nav-link-inactive">
              <Clock className="w-5 h-5 mr-2" />
              Historique
            </Link>
            <Link href="/calendar" className="nav-link-inactive">
              <Calendar className="w-5 h-5 mr-2" />
              Calendrier
            </Link>
            <Link href="/carryover" className="nav-link-inactive">
              <Package className="w-5 h-5 mr-2" />
              Reliquats
            </Link>
            <Link href="/settings" className="nav-link-inactive">
              <Settings className="w-5 h-5 mr-2" />
              Paramètres
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mobile-safe-area">
        {/* Debug info */}
        <div className="mb-4 debug-mobile bg-yellow-100 border border-yellow-400 rounded">
          <h3 className="font-semibold text-yellow-800">Debug Info:</h3>
          <p>Balances: {balances.length} | Settings: {settings ? 'OK' : 'NULL'} | Leaves: {leaves.length}</p>
          <p>Current Year: {currentYear}</p>
          <button 
            onClick={async () => {
              try {
                await leaveStorage.clearAllData()
                toast.success('Base de données nettoyée')
                await loadData()
              } catch (error) {
                console.error('Erreur lors du nettoyage:', error)
                toast.error('Erreur lors du nettoyage')
              }
            }}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Nettoyer la base de données
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Résumé des soldes */}
          <div className="lg:col-span-2">
            <div className="grid-mobile grid-tablet gap-4">
              {balances
                .filter((balance) => ['cp', 'rtt', 'cet'].includes(balance.type))
                .map((balance) => (
                <div key={balance.type} className="card">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {getLeaveTypeLabel(balance.type)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(balance.type)}`}>
                        {getLeaveTypeIcon(balance.type)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Total:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {balance.total} jour{balance.total > 1 ? 's' : ''}
                        </span>
                      </div>
                      {balance.carryover && balance.carryover > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Dont reliquats:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            +{balance.carryover} jour{balance.carryover > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Utilisés:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {balance.used} jour{balance.used > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-600 dark:text-gray-400">Restants:</span>
                        <span className="text-green-600 dark:text-green-400">
                          {balance.remaining} jour{balance.remaining > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistiques rapides */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Statistiques
                </h2>
              </div>
              <div className="card-body stats-mobile">
                <div className="stat-item-mobile">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total des congés pris
                  </span>
                  <span className="stat-value-mobile text-gray-900 dark:text-white">
                    {stats.totalDays}
                  </span>
                </div>
                <div className="stat-item-mobile">
                  <span className="text-gray-600 dark:text-gray-400">
                    Congés cette année
                  </span>
                  <span className="stat-value-mobile text-gray-900 dark:text-white">
                    {leaves.filter(l => new Date(l.startDate).getFullYear() === currentYear && ['cp', 'rtt', 'cet'].includes(l.type)).length}
                  </span>
                </div>
                <div className="stat-item-mobile">
                  <span className="text-gray-600 dark:text-gray-400">
                    Prochain congé
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {recentLeaves.length > 0
                      ? formatDate(recentLeaves[0].startDate)
                      : 'Aucun'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RTT Disponibles */}
        {currentRTT && (
          <div className="mt-8">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📅 RTT Disponibles Actuellement
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  RTT que vous pouvez prendre à l'instant présent
                </p>
              </div>
              <div className="card-body">
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                        Total RTT Disponibles
                      </h3>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Basé sur les mois passés et le mois en cours (après le 15)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {currentRTT.totalAvailable}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        jour{currentRTT.totalAvailable > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rtt-grid-mobile">
                  {currentRTT.details.map((monthDetail) => (
                    <div
                      key={monthDetail.month}
                      className={`rtt-item-mobile rounded-lg border-2 ${
                        monthDetail.canTake
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                          : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`rtt-number-mobile font-semibold ${
                          monthDetail.canTake
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {monthDetail.available}
                        </div>
                        <div className="rtt-month-mobile text-gray-600 dark:text-gray-400">
                          {new Date(2024, monthDetail.month - 1).toLocaleDateString('fr-FR', { month: 'short' })}
                        </div>
                        {!monthDetail.canTake && monthDetail.reason && (
                          <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                            {monthDetail.reason.includes('15') ? 'Après le 15' : 'Non disponible'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    💡 Comment ça marche ?
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Vous gagnez 2 RTT par mois</li>
                    <li>• Les RTT sont disponibles après la fin du mois</li>
                    <li>• Pour le mois en cours : disponible après le 15</li>
                    <li>• Les RTT non pris peuvent être reportés</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

                {/* Tableau mensuel détaillé */}
        {monthlySummary && (
          <div className="mt-8">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📊 Tableau mensuel détaillé - {currentYear}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Suivi mensuel des RTT et congés payés avec cumuls
                </p>
              </div>
              <div className="card-body">
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">
                          Mois
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                          RTT dispo
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                          RTT pris
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                          CP dispo
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                          CP pris
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                          Total dispo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {monthlySummary.months.map((month) => (
                        <tr key={month.month} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-white dark:bg-gray-900 z-10">
                            {month.monthName}
                          </td>
                          <td className="px-2 py-3 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {month.rttDispo}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {month.rttPris}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {month.cpDispo}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {month.cpPris}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                            <span className="text-gray-900 dark:text-white font-semibold">
                              {month.totalDispo}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Graphique des cumuls */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📈 Graphique des cumuls
                  </h3>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="space-y-4">
                      {monthlySummary.months.map((month) => (
                        <div key={month.month} className="space-y-2">
                          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>{month.monthName}</span>
                            <span>Total dispo: {month.totalCumulDispo} | Total pris: {month.totalCumulPris}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                            {/* Barre de fond pour le total disponible */}
                            <div 
                              className="bg-gray-300 dark:bg-gray-600 h-6 rounded-full"
                              style={{ width: `${Math.min(100, (month.totalCumulDispo / 60) * 100)}%` }}
                            ></div>
                            
                            {/* Barre RTT cumulé */}
                            <div 
                              className="bg-green-500 h-6 rounded-l-full absolute top-0 left-0"
                              style={{ width: `${Math.min(100, (month.rttCumulDispo / 60) * 100)}%` }}
                            ></div>
                            
                            {/* Barre CP cumulé */}
                            <div 
                              className="bg-blue-500 h-6 absolute top-0"
                              style={{ 
                                left: `${Math.min(100, (month.rttCumulDispo / 60) * 100)}%`,
                                width: `${Math.min(100, (month.cpCumulDispo / 60) * 100)}%`
                              }}
                            ></div>
                            
                            {/* Indicateur des congés pris */}
                            <div 
                              className="bg-red-500 h-6 absolute top-0 opacity-80"
                              style={{ 
                                left: `${Math.min(100, (month.rttCumulDispo / 60) * 100)}%`,
                                width: `${Math.min(100, (month.rttCumulPris / 60) * 100)}%`
                              }}
                            ></div>
                            <div 
                              className="bg-red-500 h-6 absolute top-0 opacity-80"
                              style={{ 
                                left: `${Math.min(100, ((month.rttCumulDispo + month.cpCumulDispo) / 60) * 100)}%`,
                                width: `${Math.min(100, (month.cpCumulPris / 60) * 100)}%`
                              }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>RTT: {month.rttCumulDispo} dispo, {month.rttCumulPris} pris</span>
                            <span>CP: {month.cpCumulDispo} dispo, {month.cpCumulPris} pris</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Légende */}
                    <div className="mt-4 flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                        <span>RTT cumulé</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                        <span>CP cumulé</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                        <span>Congés pris</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Totaux annuels */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    📈 Totaux annuels
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {monthlySummary.yearlyTotals.rtt.remaining}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">RTT restants</div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {monthlySummary.yearlyTotals.cp.remaining}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">CP restants</div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {monthlySummary.yearlyTotals.total.remaining}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total restant</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Congés récents */}
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Congés récents
              </h2>
            </div>
            <div className="card-body">
              {recentLeaves.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">Type</th>
                        <th className="table-header-cell">Période</th>
                        <th className="table-header-cell">Jours</th>
                        <th className="table-header-cell">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {recentLeaves
                        .filter((leave) => ['cp', 'rtt', 'cet'].includes(leave.type))
                        .map((leave) => (
                        <tr key={leave.id}>
                          <td className="table-cell">
                            <span className={`badge-${leave.type}`}>
                              {getLeaveTypeLabel(leave.type)}
                            </span>
                          </td>
                          <td className="table-cell">
                            {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                          </td>
                          <td className="table-cell">
                            {leave.workingDays} jour{leave.workingDays > 1 ? 's' : ''}
                          </td>
                          <td className="table-cell">
                            {leave.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Calendar className="w-12 h-12" />
                  </div>
                  <div className="empty-state-title">
                    Aucun congé enregistré
                  </div>
                  <div className="empty-state-description">
                    Commencez par ajouter votre premier congé
                  </div>
                  <Link href="/add" className="btn-primary mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un congé
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Actions rapides
              </h2>
            </div>
            <div className="card-body">
                             <div className="actions-mobile">
                                 <Link href="/add" className="action-item-mobile">
                   <div className="text-center">
                     <div className="text-3xl mb-2">➕</div>
                     <h3 className="font-semibold text-gray-900 dark:text-white">Ajouter un congé</h3>
                     <p className="text-sm text-gray-600 dark:text-gray-400">Créer une nouvelle entrée</p>
                   </div>
                 </Link>
                 
                 <Link href="/history" className="action-item-mobile">
                   <div className="text-center">
                     <div className="text-3xl mb-2">📋</div>
                     <h3 className="font-semibold text-gray-900 dark:text-white">Historique</h3>
                     <p className="text-sm text-gray-600 dark:text-gray-400">Voir tous les congés</p>
                   </div>
                 </Link>
                 
                 <Link href="/calendar" className="action-item-mobile">
                   <div className="text-center">
                     <div className="text-3xl mb-2">📅</div>
                     <h3 className="font-semibold text-gray-900 dark:text-white">Calendrier</h3>
                     <p className="text-sm text-gray-600 dark:text-gray-400">Vue calendrier</p>
                   </div>
                 </Link>
                 
                 <Link href="/carryover" className="action-item-mobile">
                   <div className="text-center">
                     <div className="text-3xl mb-2">📦</div>
                     <h3 className="font-semibold text-gray-900 dark:text-white">Reliquats</h3>
                     <p className="text-sm text-gray-600 dark:text-gray-400">Congés reportés</p>
                   </div>
                 </Link>
              </div>
            </div>
          </div>
                 </div>
       </main>

       {/* Navigation Mobile */}
       <nav className="mobile-nav md:hidden">
         <div className="mobile-nav-container">
           <Link href="/" className="mobile-nav-item-active">
             <BarChart3 className="mobile-nav-icon" />
             <span className="mobile-nav-label">Dashboard</span>
           </Link>
           <Link href="/add" className="mobile-nav-item-inactive">
             <Plus className="mobile-nav-icon" />
             <span className="mobile-nav-label">Ajouter</span>
           </Link>
           <Link href="/history" className="mobile-nav-item-inactive">
             <Clock className="mobile-nav-icon" />
             <span className="mobile-nav-label">Historique</span>
           </Link>
           <Link href="/calendar" className="mobile-nav-item-inactive">
             <Calendar className="mobile-nav-icon" />
             <span className="mobile-nav-label">Calendrier</span>
           </Link>
           <Link href="/carryover" className="mobile-nav-item-inactive">
             <Package className="mobile-nav-icon" />
             <span className="mobile-nav-label">Reliquats</span>
           </Link>
           <Link href="/settings" className="mobile-nav-item-inactive">
             <Settings className="mobile-nav-icon" />
             <span className="mobile-nav-label">Réglages</span>
           </Link>
         </div>
       </nav>
     </div>
   )
 }
