'use client'

import { BarChart3, Calendar, Clock, Download, Plus, Settings, Upload, Package, Menu } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AppSettings, LeaveBalance, LeaveEntry, PublicHoliday, CarryoverLeave } from '../types'
import { calculateLeaveBalances, calculateLeaveStats, formatDate, getHolidaysForYear, getLeaveTypeLabel, getLeaveTypeColor, getLeaveTypeIcon, calculateMonthlyLeaveSummary } from '../utils/leaveUtils'
import { leaveStorage } from '../utils/storage'
import LeaveCharts from '../components/LeaveCharts'

export default function Dashboard() {
  const [leaves, setLeaves] = useState<LeaveEntry[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [carryovers, setCarryovers] = useState<CarryoverLeave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentYear] = useState(new Date().getFullYear())
  const [monthlySummary, setMonthlySummary] = useState<{ months: any[]; yearlyTotals: any } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
      await leaveStorage.exportDataWithUserChoice()
      toast.success('Export réussi - Choisissez où sauvegarder le fichier')
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      toast.error('Erreur lors de l\'export')
    }
  }

  const handleImport = async () => {
    try {
      await leaveStorage.importDataWithFileSelection()
      await loadData()
      toast.success('Données importées avec succès')
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      if (error instanceof Error && error.message === 'Import annulé') {
        toast('Import annulé')
      } else {
        toast.error('Erreur lors de l\'import')
      }
    }
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
               <button
                 onClick={handleImport}
                 className="btn-secondary"
               >
                 <Upload className="w-4 h-4 mr-2" />
                 Importer
               </button>
               {/* Menu burger pour mobile uniquement */}
               <button
                 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                 className="md:hidden btn-secondary"
                 title="Menu des actions rapides"
               >
                 <Menu className="w-4 h-4" />
               </button>
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
         {/* Nouveau tableau Réel vs Prévisions */}
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                📊 Tableau Réel vs Prévisions - 2025
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                  Suivi mensuel des RTT et CP avec données réelles et prévisions
              </p>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead>
                    {/* En-tête principal */}
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white bg-red-600 text-white border-r border-gray-200 dark:border-gray-700">
                        2025
                      </th>
                      <th colSpan={4} className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-green-200 dark:bg-green-800 border-r border-gray-200 dark:border-gray-700">
                        Réel
                      </th>
                      <th colSpan={4} className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-green-200 dark:bg-green-800 border-r border-gray-200 dark:border-gray-700">
                        Prévisions
                      </th>
                    </tr>
                    {/* Sous-en-têtes RTT et CP */}
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                        
                      </th>
                      <th colSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-green-100 dark:bg-green-900 border-r border-gray-200 dark:border-gray-700">
                        RTT
                      </th>
                      <th colSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-yellow-100 dark:bg-yellow-900 border-r border-gray-200 dark:border-gray-700">
                        CP
                      </th>
                      <th colSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-green-100 dark:bg-green-900 border-r border-gray-200 dark:border-gray-700">
                        RTT
                      </th>
                      <th colSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-yellow-100 dark:bg-yellow-900 border-r border-gray-200 dark:border-gray-700">
                        CP
                      </th>
                    </tr>
                    {/* En-têtes Jours et Cumul */}
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                        
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700">
                        Jours
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700">
                        Cumul
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700">
                        Jours
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700">
                        Cumul
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700">
                        Jours
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700">
                        Cumul
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700">
                        Jours
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700">
                        Cumul
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Reliquat */}
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Reliquat
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        -
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        7
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        -
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        43.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        -
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        7
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        -
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        43.5
                      </td>
                    </tr>
                    {/* Janvier */}
                    <tr className="bg-white dark:bg-gray-900">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Janv
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        6
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        24
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        43.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        6
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        24
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        43.5
                      </td>
                    </tr>
                    {/* Février */}
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Fev
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        24
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        43.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        24
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        43.5
                      </td>
                    </tr>
                    {/* Mars */}
                    <tr className="bg-white dark:bg-gray-900">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Mar
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        3
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        21
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        43.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        3
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        21
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        43.5
                      </td>
                    </tr>
                    {/* Avril */}
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Avril
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        2
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        19
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        1
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        42.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        2
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        19
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        1
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        42.5
                      </td>
                    </tr>
                    {/* Mai */}
                    <tr className="bg-white dark:bg-gray-900">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Mai
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        4
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        15
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        42.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        4
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        15
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        42.5
                      </td>
                    </tr>
                    {/* Juin */}
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Juin
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        15
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        69.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        15
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        69.5
                      </td>
                    </tr>
                    {/* Juillet */}
                    <tr className="bg-white dark:bg-gray-900">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Juillet
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        4
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        11
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        4
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        65.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        4
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        11
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        4
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        65.5
                      </td>
                    </tr>
                    {/* Août */}
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Aout
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        2
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        9
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        5
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        60.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        2
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        9
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        5
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        60.5
                      </td>
                    </tr>
                    {/* Septembre */}
                    <tr className="bg-white dark:bg-gray-900">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Sept
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        9
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        60.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        9
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        60.5
                      </td>
                    </tr>
                    {/* Octobre */}
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Oct
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        9
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        60.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        9
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        60.5
                      </td>
                    </tr>
                    {/* Novembre */}
                    <tr className="bg-white dark:bg-gray-900">
                      <td className="px-4 py-2 text-center text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Nov
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        9
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        60.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        6
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        3
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        8
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        52.5
                      </td>
                    </tr>
                    {/* Décembre */}
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Dec
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        9
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        60.5
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        3
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        0
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                        4
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        48.5
                      </td>
                    </tr>
                    {/* Total */}
                    <tr className="bg-red-50 dark:bg-red-900/20">
                      <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                        Total
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-bold text-red-600 dark:text-red-400 border-r border-gray-200 dark:border-gray-700">
                        21
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-bold text-red-600 dark:text-red-400 border-r border-gray-200 dark:border-gray-700">
                        10
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-bold text-red-600 dark:text-red-400 border-r border-gray-200 dark:border-gray-700">
                        30
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-bold text-red-600 dark:text-red-400 border-r border-gray-200 dark:border-gray-700">
                        22
                      </td>
                      <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                        
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                {/* Légende */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    💡 Explication du tableau
                  </h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-200 dark:bg-green-800 rounded mr-2"></div>
                      <span><strong>Réel :</strong> Données effectives des congés pris</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-200 dark:bg-green-800 rounded mr-2"></div>
                      <span><strong>Prévisions :</strong> Planification des congés à venir</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-100 dark:bg-green-900 rounded mr-2"></div>
                      <span><strong>RTT :</strong> Réduction du temps de travail</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900 rounded mr-2"></div>
                      <span><strong>CP :</strong> Congés payés</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
                      <span><strong>Total :</strong> Somme des jours pris</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

         {/* Graphiques des congés */}
         <div className="mt-8">
           <LeaveCharts leaves={leaves} currentYear={currentYear} />
         </div>
       </main>

       {/* Menu mobile des actions rapides */}
       {isMobileMenuOpen && (
         <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
           <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-lg p-6" onClick={(e) => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Actions rapides</h3>
               <button
                 onClick={() => setIsMobileMenuOpen(false)}
                 className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                 title="Fermer le menu"
               >
                 ✕
               </button>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <Link href="/add" className="action-item-mobile" onClick={() => setIsMobileMenuOpen(false)}>
                 <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                   <div className="text-3xl mb-2">➕</div>
                   <h3 className="font-semibold text-gray-900 dark:text-white">Ajouter un congé</h3>
                   <p className="text-sm text-gray-600 dark:text-gray-400">Créer une nouvelle entrée</p>
                 </div>
               </Link>
               
               <Link href="/history" className="action-item-mobile" onClick={() => setIsMobileMenuOpen(false)}>
                 <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                   <div className="text-3xl mb-2">📋</div>
                   <h3 className="font-semibold text-gray-900 dark:text-white">Historique</h3>
                   <p className="text-sm text-gray-600 dark:text-gray-400">Voir tous les congés</p>
                 </div>
               </Link>
               
               <Link href="/calendar" className="action-item-mobile" onClick={() => setIsMobileMenuOpen(false)}>
                 <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                   <div className="text-3xl mb-2">📅</div>
                   <h3 className="font-semibold text-gray-900 dark:text-white">Calendrier</h3>
                   <p className="text-sm text-gray-600 dark:text-gray-400">Vue calendrier</p>
                 </div>
               </Link>
               
               <Link href="/carryover" className="action-item-mobile" onClick={() => setIsMobileMenuOpen(false)}>
                 <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                   <div className="text-3xl mb-2">📦</div>
                   <h3 className="font-semibold text-gray-900 dark:text-white">Reliquats</h3>
                   <p className="text-sm text-gray-600 dark:text-gray-400">Congés reportés</p>
                 </div>
               </Link>
             </div>
           </div>
         </div>
       )}

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
