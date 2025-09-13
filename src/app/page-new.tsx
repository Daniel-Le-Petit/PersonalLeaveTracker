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

  // Calculer la répartition mensuelle réelle pour le graphique
  const monthlyLeaveData = useMemo(() => {
    const monthlyData = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1
      const monthStart = new Date(currentYear, index, 1)
      const monthEnd = new Date(currentYear, index + 1, 0)
      
      const monthLeaves = leaves.filter(leave => {
        const leaveStart = new Date(leave.startDate)
        const leaveEnd = new Date(leave.endDate)
        return leaveStart <= monthEnd && leaveEnd >= monthStart && !leave.isForecast
      })
      
      let rttDays = 0
      let cpDays = 0
      let cetDays = 0
      
      monthLeaves.forEach(leave => {
        if (leave.type === 'rtt') rttDays += leave.workingDays
        else if (leave.type === 'cp') cpDays += leave.workingDays
        else if (leave.type === 'cet') cetDays += leave.workingDays
      })
      
      const totalDays = rttDays + cpDays + cetDays
      
      return {
        month,
        rttDays,
        cpDays,
        cetDays,
        totalDays,
        rttPercent: totalDays > 0 ? Math.round((rttDays / totalDays) * 100) : 0,
        cpPercent: totalDays > 0 ? Math.round((cpDays / totalDays) * 100) : 0,
        cetPercent: totalDays > 0 ? Math.round((cetDays / totalDays) * 100) : 0
      }
    })
    
    return monthlyData
  }, [leaves, currentYear])

  // Calculer les données cumulatives pour la courbe
  const cumulativeData = useMemo(() => {
    let cumulativeRtt = 0
    let cumulativeCp = 0
    let cumulativeCet = 0
    
    return monthlyLeaveData.map((monthData, index) => {
      cumulativeRtt += monthData.rttDays
      cumulativeCp += monthData.cpDays
      cumulativeCet += monthData.cetDays
      
      const totalCumulative = cumulativeRtt + cumulativeCp + cumulativeCet
      
      // Calculer les pourcentages par rapport aux quotas
      const rttQuota = 29 // Quota RTT total
      const cpCetQuota = 79.5 // Quota CP/CET total
      
      const rttProgress = Math.min((cumulativeRtt / rttQuota) * 100, 100)
      const cpCetProgress = Math.min(((cumulativeCp + cumulativeCet) / cpCetQuota) * 100, 100)
      
      return {
        month: index + 1,
        cumulativeRtt,
        cumulativeCp,
        cumulativeCet,
        totalCumulative,
        rttProgress,
        cpCetProgress
      }
    })
  }, [monthlyLeaveData])

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
                        <div>• <span className="font-bold text-blue-400 dark:text-blue-600">Bleu</span> = Jours CP pris par mois</div>
                        <div>• <span className="font-bold text-cyan-400 dark:text-cyan-600">Cyan</span> = Jours CET pris par mois</div>
                        <div>• Barres empilées = Total des congés</div>
                        <div>• Courbes = Progression cumulée (%)</div>
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
              
              {/* Histogramme avec données réelles et courbes cumulatives */}
              <div className="relative h-80 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                {/* Graphique en barres */}
                <div className="h-48 flex items-end justify-between space-x-2 mb-4">
                  {monthlyLeaveData.map((monthData, index) => {
                    const monthNames = ['Ja', 'Fe', 'M', 'Ar', 'M', 'Ju', 'Jl', 'Au', 'Se', 'Oc', 'N', 'D']
                    const maxHeight = 180
                    const maxDays = Math.max(...monthlyLeaveData.map(m => m.totalDays), 1)
                    const scaleFactor = maxHeight / maxDays
                    
                    const rttHeight = Math.max(monthData.rttDays * scaleFactor, 2)
                    const cpHeight = Math.max(monthData.cpDays * scaleFactor, 2)
                    const cetHeight = Math.max(monthData.cetDays * scaleFactor, 2)
                    
                    return (
                      <div key={index} className="flex flex-col items-center space-y-1 group">
                        <div className="flex flex-col space-y-0 cursor-help" title={`${monthNames[index]} ${currentYear}: ${monthData.rttDays} RTT (${monthData.rttPercent}%) + ${monthData.cpDays} CP (${monthData.cpPercent}%) + ${monthData.cetDays} CET (${monthData.cetPercent}%) = ${monthData.totalDays} jours total`}>
                          {monthData.rttDays > 0 && (
                            <div 
                              className="w-8 bg-red-500 rounded-t" 
                              style={{height: `${rttHeight}px`}} 
                              title={`${monthData.rttDays} jours RTT (${monthData.rttPercent}%)`}
                            ></div>
                          )}
                          {monthData.cpDays > 0 && (
                            <div 
                              className="w-8 bg-blue-500" 
                              style={{height: `${cpHeight}px`}} 
                              title={`${monthData.cpDays} jours CP (${monthData.cpPercent}%)`}
                            ></div>
                          )}
                          {monthData.cetDays > 0 && (
                            <div 
                              className="w-8 bg-cyan-500 rounded-b" 
                              style={{height: `${cetHeight}px`}} 
                              title={`${monthData.cetDays} jours CET (${monthData.cetPercent}%)`}
                            ></div>
                          )}
                          {monthData.totalDays === 0 && (
                            <div 
                              className="w-8 bg-gray-300 dark:bg-gray-600 rounded" 
                              style={{height: '10px'}} 
                              title="Aucun congé ce mois"
                            ></div>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{monthNames[index]}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Courbes cumulatives */}
                <div className="relative h-20 border-t border-gray-300 dark:border-gray-600 pt-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Progression cumulée (%)</div>
                  
                  {/* Grille de fond */}
                  <div className="absolute inset-0 flex justify-between">
                    {Array.from({ length: 13 }).map((_, i) => (
                      <div key={i} className="w-8 flex justify-center">
                        <div className="w-px h-full bg-gray-200 dark:bg-gray-600"></div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Courbe RTT */}
                  <svg className="absolute inset-0 w-full h-full" style={{ top: '8px' }}>
                    <polyline
                      points={cumulativeData.map((data, index) => {
                        const x = (index * (100 / 11)) + 4
                        const y = 80 - (data.rttProgress * 0.8)
                        return `${x},${y}`
                      }).join(' ')}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="3,3"
                    />
                    {cumulativeData.map((data, index) => {
                      const x = (index * (100 / 11)) + 4
                      const y = 80 - (data.rttProgress * 0.8)
                      return (
                        <circle
                          key={index}
                          cx={x}
                          cy={y}
                          r="2"
                          fill="#ef4444"
                          title={`Mois ${index + 1}: ${data.cumulativeRtt} jours RTT (${data.rttProgress.toFixed(1)}%)`}
                        />
                      )
                    })}
                  </svg>
                  
                  {/* Courbe CP/CET */}
                  <svg className="absolute inset-0 w-full h-full" style={{ top: '8px' }}>
                    <polyline
                      points={cumulativeData.map((data, index) => {
                        const x = (index * (100 / 11)) + 4
                        const y = 80 - (data.cpCetProgress * 0.8)
                        return `${x},${y}`
                      }).join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                    {cumulativeData.map((data, index) => {
                      const x = (index * (100 / 11)) + 4
                      const y = 80 - (data.cpCetProgress * 0.8)
                      return (
                        <circle
                          key={index}
                          cx={x}
                          cy={y}
                          r="2"
                          fill="#3b82f6"
                          title={`Mois ${index + 1}: ${data.cumulativeCp + data.cumulativeCet} jours CP/CET (${data.cpCetProgress.toFixed(1)}%)`}
                        />
                      )
                    })}
                  </svg>
                  
                  {/* Légende des courbes */}
                  <div className="absolute top-0 right-0 flex space-x-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-0.5 bg-red-500" style={{ backgroundImage: 'repeating-linear-gradient(to right, #ef4444, #ef4444 3px, transparent 3px, transparent 6px)' }}></div>
                      <span className="text-gray-600 dark:text-gray-400">RTT</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-0.5 bg-blue-500" style={{ backgroundImage: 'repeating-linear-gradient(to right, #3b82f6, #3b82f6 5px, transparent 5px, transparent 10px)' }}></div>
                      <span className="text-gray-600 dark:text-gray-400">CP/CET</span>
                    </div>
                  </div>
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