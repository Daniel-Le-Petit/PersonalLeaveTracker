'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { AppSettings, LeaveBalance, LeaveEntry, PublicHoliday, CarryoverLeave } from '../types'
import { calculateLeaveBalances, calculateLeaveStats, formatDate, getHolidaysForYear, getLeaveTypeLabel, getLeaveTypeColor, getLeaveTypeIcon, calculateMonthlyLeaveSummarySeparated } from '../utils/leaveUtils'
import CalculationTooltip from '../components/CalculationTooltip'
import { leaveStorage } from '../utils/storage'
import CumulativeCharts from '../components/CumulativeCharts'
import LeaveCalendar from '../components/LeaveCalendar'
import PayrollValidation from '../components/PayrollValidation'
import EmailReportModal from '../components/EmailReportModal'
import MainLayout from '../components/MainLayout'

export default function Dashboard() {
  const router = useRouter()
  const [leaves, setLeaves] = useState<LeaveEntry[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [carryovers, setCarryovers] = useState<CarryoverLeave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [monthlySummary, setMonthlySummary] = useState<{ months: any[]; yearlyTotals: any } | null>(null)
  const [monthlySummarySeparated, setMonthlySummarySeparated] = useState<{ months: any[]; yearlyTotals: any } | null>(null)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  const goToPreviousYear = () => {
    setCurrentYear(prev => prev - 1)
  }

  const goToNextYear = () => {
    setCurrentYear(prev => prev + 1)
  }

  const goToCurrentYear = () => {
    setCurrentYear(new Date().getFullYear())
  }

  const handleCorrigerIncoherences = () => {
    router.push('/payroll')
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (leaves.length > 0) {
      loadData()
    }
  }, [currentYear])

  const loadData = async () => {
    try {
      console.log('Début du chargement des données...')
      
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

      setLeaves(leavesData)
      setSettings(settingsData)
      setHolidays(holidaysData)
      setCarryovers(carryoversData)

      if (settingsData && settingsData.quotas) {
        const summary = calculateMonthlyLeaveSummarySeparated(leavesData, settingsData.quotas, carryoversData, currentYear)
        setMonthlySummarySeparated(summary)
      }

      if (settingsData && settingsData.quotas) {
        const calculatedBalances = calculateLeaveBalances(leavesData, settingsData.quotas, carryoversData, currentYear)
        setBalances(calculatedBalances)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      setIsLoading(false)
    }
  }

  const handleLeaveUpdate = async (updatedLeave: LeaveEntry) => {
    try {
      await leaveStorage.updateLeave(updatedLeave)
      setLeaves(prev => prev.map(leave => leave.id === updatedLeave.id ? updatedLeave : leave))
      toast.success('Congé mis à jour avec succès')
    } catch (error) {
      console.error('Erreur lors de la mise à jour du congé:', error)
      toast.error('Erreur lors de la mise à jour du congé')
    }
  }

  const handleExport = () => {
    const data = {
      leaves,
      settings,
      holidays,
      carryovers,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leave-tracker-backup-${currentYear}.json`
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
      
      toast.success('Données importées avec succès')
      await loadData()
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      toast.error('Erreur lors de l\'import des données')
    }
  }

  const leaveStats = useMemo(() => {
    if (!settings?.quotas || !balances.length) return null
    
    const rttBalance = balances.find(b => b.type === 'rtt')
    const cpBalance = balances.find(b => b.type === 'cp')
    const cetBalance = balances.find(b => b.type === 'cet')
    
    return {
      rttUsed: rttBalance?.used || 0,
      rttTotal: rttBalance?.total || 0,
      rttRemaining: rttBalance?.remaining || 0,
      cpUsed: (cpBalance?.used || 0) + (cetBalance?.used || 0),
      cpTotal: (cpBalance?.total || 0) + (cetBalance?.total || 0),
      cpRemaining: (cpBalance?.remaining || 0) + (cetBalance?.remaining || 0)
    }
  }, [balances])

  const currentYearLeaves = useMemo(() => {
    return leaves.filter(leave => new Date(leave.startDate).getFullYear() === currentYear)
  }, [leaves, currentYear])

  const monthlySummarySeparatedMemo = useMemo(() => {
    if (!settings?.quotas) return null
    return calculateMonthlyLeaveSummarySeparated(leaves, settings.quotas, carryovers, currentYear)
  }, [leaves, settings, carryovers, currentYear])

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
      onEmail={() => setIsEmailModalOpen(true)}
    >
      {/* Header principal */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Leave Tracker Dashboard</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">Gestion et suivi de vos congés</p>
          </div>
          
          {/* Sélecteur d'année stylé */}
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
            <button
              onClick={goToPreviousYear}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              title={`Année précédente (${currentYear - 1})`}
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold text-lg min-w-[100px] text-center shadow-md">
              {currentYear}
            </div>
            
            <button
              onClick={goToNextYear}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              title={`Année suivante (${currentYear + 1})`}
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {currentYear !== new Date().getFullYear() && (
              <button
                onClick={goToCurrentYear}
                className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                title="Revenir à l'année actuelle"
              >
                Aujourd'hui
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cards de résumé en haut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">41</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Pris</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">24 RTT + 12 CP + 5 CET</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">15</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Planifié</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 RTT + 7 CP + 6 CET</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">58,5</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">À planifier</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">3 RTT + 55,5 CP/CET</div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne gauche - Sections principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section RTT */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-red-600 dark:bg-red-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white">RTT</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="group relative">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Quota initial</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white cursor-help" title="29 = 23 jours (Quota RTT 2025) + 6 jours (Reliquat RTT 2024)">
                    29
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="text-center">
                      <div className="font-semibold">Calcul du quota initial</div>
                      <div>23 jours (Quota RTT 2025)</div>
                      <div>+ 6 jours (Reliquat RTT 2024)</div>
                      <div className="font-bold">= 29 jours total</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </div>
                <div className="group relative">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Quota pris</div>
                  <div className="text-lg font-bold text-red-600 dark:text-red-400 cursor-help" title="Total des jours RTT effectivement pris en 2025">
                    24
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="text-center">
                      <div className="font-semibold">RTT pris</div>
                      <div>Consommation au 11/09/2025</div>
                      <div>Congés marqués comme "réels"</div>
                      <div className="font-bold">= 24 jours</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </div>
                <div className="group relative">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Planifié</div>
                  <div className="text-lg font-bold text-red-600 dark:text-red-400 cursor-help" title="Total des jours RTT planifiés">
                    2
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="text-center">
                      <div className="font-semibold">RTT planifiés</div>
                      <div>Consommation au 11/09/2025</div>
                      <div>Congés marqués comme "prévision"</div>
                      <div className="font-bold">= 2 jours</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </div>
                <div className="group relative">
                  <div className="text-sm text-gray-600 dark:text-gray-400">À planifier</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white cursor-help" title="Jours RTT restants à planifier">
                    3
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="text-center">
                      <div className="font-semibold">RTT à planifier</div>
                      <div>29 (total) - 24 (pris) - 2 (planifiés)</div>
                      <div className="font-bold">= 3 jours</div>
                      <div className="text-red-300 dark:text-red-700">⚠️ Échéance: 31/12/2025</div>
                      <div className="text-xs text-gray-300 dark:text-gray-600">(deadline 28/02/2026)</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Échéance: 31/12/2025
              </div>
            </div>
          </div>

          {/* Section CP/CET */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-blue-600 dark:bg-blue-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white">CP / CET</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="group relative">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Quota initial</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white cursor-help" title="Calcul détaillé du quota initial CP/CET">
                    79,5
                  </div>
                  {/* Tooltip pour expliquer le calcul CP/CET */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="text-center">
                      <div className="font-semibold mb-1">Calcul du quota initial CP/CET</div>
                      <div className="text-xs space-y-0.5">
                        <div className="font-bold text-blue-400 dark:text-blue-600">32 jours (Quota 2025)</div>
                        <div>• 27 jours (Quota CP 2025)</div>
                        <div>• 5 jours (Quota CET 2025)</div>
                        <div className="border-t border-gray-600 dark:border-gray-400 my-0.5"></div>
                        <div className="font-bold text-orange-400 dark:text-orange-600">+ 47,5 jours (Reliquats 2024)</div>
                        <div>• Reliquats CP et CET de 2024</div>
                        <div className="border-t border-gray-600 dark:border-gray-400 my-0.5"></div>
                        <div className="font-bold text-sm">= 79,5 jours total</div>
                        <div className="text-xs text-gray-300 dark:text-gray-600">Au 31/05/2025</div>
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </div>
                <div className="group relative">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Quota pris</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white cursor-help" title="Total des jours CP/CET effectivement pris">
                    17
                  </div>
                  {/* Tooltip pour expliquer les jours pris */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="text-center">
                      <div className="font-semibold">CP/CET pris</div>
                      <div>Consommation au 11/09/2025</div>
                      <div>Congés marqués comme "réels"</div>
                      <div className="font-bold">= 17 jours</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </div>
                <div className="group relative">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Planifié</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400 cursor-help" title="Total des jours CP/CET planifiés">
                    7
                  </div>
                  {/* Tooltip pour expliquer les jours planifiés */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="text-center">
                      <div className="font-semibold">CP/CET planifiés</div>
                      <div>Consommation au 11/09/2025</div>
                      <div>Congés marqués comme "prévision"</div>
                      <div className="font-bold">= 7 jours</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </div>
                <div className="group relative">
                  <div className="text-sm text-gray-600 dark:text-gray-400">À planifier</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white cursor-help" title="Jours CP/CET restants à planifier">
                    55,5
                  </div>
                  {/* Tooltip pour expliquer les jours à planifier */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="text-center">
                      <div className="font-semibold">CP/CET à planifier</div>
                      <div>79,5 (total) - 17 (pris) - 7 (planifiés)</div>
                      <div className="font-bold">= 55,5 jours</div>
                      <div className="text-orange-300 dark:text-orange-700">⚠️ Échéance: 31/05/2026</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Échéance: 31/05/2026
              </div>
            </div>
          </div>

        </div>

        {/* Colonne droite - Informations complémentaires */}
        <div className="space-y-6">
          {/* Card d'alertes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Incohérences détectées</h3>
            </div>
            <div className="space-y-2 mb-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                • CET: Différence de 5 j
              </div>
            </div>
            <button 
              onClick={handleCorrigerIncoherences}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              title="Aller à la page Validation feuille de paye pour corriger les incohérences"
            >
              Corriger maintenant
            </button>
          </div>


          {/* Graphique en barres RTT vs CP/CET */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="group relative">
                  <div className="text-lg font-bold text-gray-900 dark:text-white cursor-help">Évolution annuelle</div>
                  {/* Tooltip pour expliquer le graphique */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="text-center max-w-xs">
                      <div className="font-semibold mb-2">Comment lire ce graphique</div>
                      <div className="text-xs space-y-1">
                        <div>• <span className="font-bold text-red-400 dark:text-red-600">Rouge</span> = Jours RTT pris par mois</div>
                        <div>• <span className="font-bold text-blue-400 dark:text-blue-600">Bleu</span> = Jours CP/CET pris par mois</div>
                        <div>• Barres empilées = Total des congés</div>
                        <div>• Hauteur = Nombre de jours</div>
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </div>
              </div>
              
              {/* Légende professionnelle */}
              <div className="flex justify-center space-x-6 text-sm mb-6">
                <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                  <div className="w-4 h-4 bg-red-500 rounded-sm shadow-sm"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">RTT</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                  <div className="w-4 h-4 bg-blue-500 rounded-sm shadow-sm"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">CP</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                  <div className="w-4 h-4 bg-cyan-500 rounded-sm shadow-sm"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">CET</span>
                </div>
              </div>
              
              {/* Histogramme professionnel avec barres empilées par type */}
              <div className="h-64 flex items-end justify-between space-x-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                {/* Janvier */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Janvier 2025: 3 RTT (60%) + 1 CP (20%) + 1 CET (20%) = 5 jours total">
                    <div className="w-8 bg-red-500 rounded-t" style={{height: '30px'}} title="3 jours RTT (60%)"></div>
                    <div className="w-8 bg-blue-500" style={{height: '10px'}} title="1 jour CP (20%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '10px'}} title="1 jour CET (20%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Ja</span>
                </div>
                
                {/* Février */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Février 2025: 2 RTT (25%) + 4 CP (50%) + 2 CET (25%) = 8 jours total">
                    <div className="w-8 bg-red-500 rounded-t" style={{height: '20px'}} title="2 jours RTT (25%)"></div>
                    <div className="w-8 bg-blue-500" style={{height: '40px'}} title="4 jours CP (50%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '20px'}} title="2 jours CET (25%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Fe</span>
                </div>
                
                {/* Mars */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Mars 2025: 3 RTT (37%) + 2 CP (25%) + 3 CET (37%) = 8 jours total">
                    <div className="w-8 bg-red-500 rounded-t" style={{height: '30px'}} title="3 jours RTT (37%)"></div>
                    <div className="w-8 bg-blue-500" style={{height: '20px'}} title="2 jours CP (25%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '30px'}} title="3 jours CET (37%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">M</span>
                </div>
                
                {/* Avril */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Avril 2025: 4 RTT (44%) + 3 CP (33%) + 2 CET (22%) = 9 jours total">
                    <div className="w-8 bg-red-500 rounded-t" style={{height: '36px'}} title="4 jours RTT (44%)"></div>
                    <div className="w-8 bg-blue-500" style={{height: '27px'}} title="3 jours CP (33%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '18px'}} title="2 jours CET (22%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Ar</span>
                </div>
                
                {/* Mai */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Mai 2025: 5 RTT (38%) + 4 CP (31%) + 4 CET (31%) = 13 jours total">
                    <div className="w-8 bg-red-500 rounded-t" style={{height: '38px'}} title="5 jours RTT (38%)"></div>
                    <div className="w-8 bg-blue-500" style={{height: '31px'}} title="4 jours CP (31%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '31px'}} title="4 jours CET (31%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">M</span>
                </div>
                
                {/* Juin */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Juin 2025: 3 RTT (33%) + 3 CP (33%) + 3 CET (33%) = 9 jours total">
                    <div className="w-8 bg-red-500 rounded-t" style={{height: '30px'}} title="3 jours RTT (33%)"></div>
                    <div className="w-8 bg-blue-500" style={{height: '30px'}} title="3 jours CP (33%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '30px'}} title="3 jours CET (33%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Ju</span>
                </div>
                
                {/* Juillet */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Juillet 2025: 2 RTT (22%) + 4 CP (44%) + 3 CET (33%) = 9 jours total">
                    <div className="w-8 bg-red-500 rounded-t" style={{height: '20px'}} title="2 jours RTT (22%)"></div>
                    <div className="w-8 bg-blue-500" style={{height: '40px'}} title="4 jours CP (44%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '30px'}} title="3 jours CET (33%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Jl</span>
                </div>
                
                {/* Août */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Août 2025: 2 RTT (25%) + 3 CP (38%) + 3 CET (38%) = 8 jours total">
                    <div className="w-8 bg-red-500 rounded-t" style={{height: '20px'}} title="2 jours RTT (25%)"></div>
                    <div className="w-8 bg-blue-500" style={{height: '30px'}} title="3 jours CP (38%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '30px'}} title="3 jours CET (38%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Au</span>
                </div>
                
                {/* Septembre */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Septembre 2025: 2 RTT (40%) + 2 CP (40%) + 1 CET (20%) = 5 jours total">
                    <div className="w-8 bg-red-500 rounded-t" style={{height: '20px'}} title="2 jours RTT (40%)"></div>
                    <div className="w-8 bg-blue-500" style={{height: '20px'}} title="2 jours CP (40%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '10px'}} title="1 jour CET (20%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Se</span>
                </div>
                
                {/* Octobre */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Octobre 2025: 1 RTT (33%) + 1 CP (33%) + 1 CET (33%) = 3 jours total">
                    <div className="w-8 bg-red-500 rounded-t" style={{height: '10px'}} title="1 jour RTT (33%)"></div>
                    <div className="w-8 bg-blue-500" style={{height: '10px'}} title="1 jour CP (33%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '10px'}} title="1 jour CET (33%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Oc</span>
                </div>
                
                {/* Novembre */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Novembre 2025: 1 RTT (50%) + 0 CP (0%) + 1 CET (50%) = 2 jours total">
                    <div className="w-8 bg-red-500 rounded-t" style={{height: '10px'}} title="1 jour RTT (50%)"></div>
                    <div className="w-8 bg-gray-300 dark:bg-gray-600" style={{height: '2px'}} title="0 jour CP (0%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '10px'}} title="1 jour CET (50%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">N</span>
                </div>
                
                {/* Décembre */}
                <div className="flex flex-col items-center space-y-1 group">
                  <div className="flex flex-col space-y-0 cursor-help" title="Décembre 2025: 0 RTT (0%) + 0 CP (0%) + 1 CET (100%) = 1 jour total">
                    <div className="w-8 bg-gray-300 dark:bg-gray-600 rounded-t" style={{height: '2px'}} title="0 jour RTT (0%)"></div>
                    <div className="w-8 bg-gray-300 dark:bg-gray-600" style={{height: '2px'}} title="0 jour CP (0%)"></div>
                    <div className="w-8 bg-cyan-500 rounded-b" style={{height: '10px'}} title="1 jour CET (100%)"></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">D</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'envoi d'email */}
      <EmailReportModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        leaves={leaves}
        currentYear={currentYear}
        onLeaveUpdate={handleLeaveUpdate}
      />
    </MainLayout>
  )
}