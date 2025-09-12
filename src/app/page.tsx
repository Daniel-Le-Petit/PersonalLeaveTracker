'use client'

import { BarChart3, Calendar, Clock, Download, Plus, Settings, Upload, Package, Menu } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { AppSettings, LeaveBalance, LeaveEntry, PublicHoliday, CarryoverLeave } from '../types'
import { calculateLeaveBalances, calculateLeaveStats, formatDate, getHolidaysForYear, getLeaveTypeLabel, getLeaveTypeColor, getLeaveTypeIcon, calculateMonthlyLeaveSummarySeparated } from '../utils/leaveUtils'
import CalculationTooltip from '../components/CalculationTooltip'
import { leaveStorage } from '../utils/storage'
import CumulativeCharts from '../components/CumulativeCharts'
import DashboardHeader from '../components/DashboardHeader'
import LeaveCalendar from '../components/LeaveCalendar'
import PayrollValidation from '../components/PayrollValidation'

export default function Dashboard() {
  const [leaves, setLeaves] = useState<LeaveEntry[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [carryovers, setCarryovers] = useState<CarryoverLeave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [monthlySummary, setMonthlySummary] = useState<{ months: any[]; yearlyTotals: any } | null>(null)
  const [monthlySummarySeparated, setMonthlySummarySeparated] = useState<{ months: any[]; yearlyTotals: any } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const goToPreviousYear = () => {
    setCurrentYear(prev => prev - 1)
  }

  const goToNextYear = () => {
    setCurrentYear(prev => prev + 1)
  }

  const goToCurrentYear = () => {
    setCurrentYear(new Date().getFullYear())
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

      // Calculer les données séparées (réel vs prévision)
      if (settingsData && settingsData.quotas) {
        try {
          console.log('📈 Calcul des données mensuelles séparées...')
          const monthlyDataSeparated = calculateMonthlyLeaveSummarySeparated(
            leavesData,
            settingsData.quotas,
            carryoversData,
            currentYear
          )
          setMonthlySummarySeparated(monthlyDataSeparated)
          console.log('✅ Données mensuelles calculées')
        } catch (error) {
          console.error('❌ Erreur calcul données mensuelles:', error)
        }
      } else {
        console.log('⚠️ Pas de paramètres ou quotas manquants')
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
          { type: 'cp', total: 25, taken: 0, used: 0, remaining: 25, year: new Date().getFullYear() },
          { type: 'rtt', total: 10, taken: 0, used: 0, remaining: 10, year: new Date().getFullYear() }
        ]
        setBalances(defaultBalances)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      toast.error('Erreur lors du chargement des données')
      
      // En cas d'erreur, afficher des soldes par défaut
      const defaultBalances: LeaveBalance[] = [
        { type: 'cp', total: 25, taken: 0, used: 0, remaining: 25, year: new Date().getFullYear() },
        { type: 'rtt', total: 10, taken: 0, used: 0, remaining: 10, year: new Date().getFullYear() }
      ]
      setBalances(defaultBalances)
    } finally {
      setIsLoading(false)
    }
  }

  // Fonction Export unifiée (congés + feuilles de paie)
  const handleExport = async () => {
    try {
      const currentYear = new Date().getFullYear()
      
      // Récupérer les données des congés
      const leavesData = await leaveStorage.exportData()
      const leaves = JSON.parse(leavesData)
      
      // Récupérer les données des feuilles de paie
      const stored = localStorage.getItem(`payroll-data-${currentYear}`)
      const payrollData = stored ? JSON.parse(stored) : []
      
      // Créer un fichier unifié
      const unifiedData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        year: currentYear,
        leaves: leaves,
        payrollData: payrollData,
        settings: {
          // Ajouter d'autres paramètres si nécessaire
        }
      }
      
      const blob = new Blob([JSON.stringify(unifiedData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leave-tracker-export-${currentYear}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Toutes les données exportées avec succès')
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      toast.error('Erreur lors de l\'export')
    }
  }

  // Fonction Import unifiée (congés + feuilles de paie)
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        
        // Vérifier si c'est un fichier unifié
        if (data.leaves && data.payrollData) {
          // Importer les congés
          await leaveStorage.importData(JSON.stringify(data.leaves))
          
          // Importer les feuilles de paie
          const currentYear = new Date().getFullYear()
          localStorage.setItem(`payroll-data-${currentYear}`, JSON.stringify(data.payrollData))
          
          // Recharger les données
      await loadData()
          
          toast.success('Toutes les données importées avec succès')
        } else if (data.leaves) {
          // Fichier de congés seulement
          await leaveStorage.importData(JSON.stringify(data.leaves))
          await loadData()
          toast.success('Données de congés importées avec succès')
        } else if (data.payrollData) {
          // Fichier de feuilles de paie seulement
          const currentYear = new Date().getFullYear()
          localStorage.setItem(`payroll-data-${currentYear}`, JSON.stringify(data.payrollData))
          window.location.reload()
          toast.success('Données de feuilles de paie importées avec succès')
        } else {
          toast.error('Format de fichier non reconnu')
        }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
        toast.error('Erreur lors de l\'import')
      }
    }
    reader.readAsText(file)
    
    // Reset input
    event.target.value = ''
  }

  // Gestion des congés
  const handleLeaveAdd = async (leave: any) => {
    try {
      const newLeave = {
        ...leave,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      const updatedLeaves = [...leaves, newLeave];
      setLeaves(updatedLeaves);
      
      // Sauvegarder dans le stockage
      await leaveStorage.saveLeaves(updatedLeaves);
      
      // Recharger les données pour s'assurer de la synchronisation
      await loadData();
      
      toast.success('Congé ajouté avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du congé:', error);
      toast.error('Erreur lors de l\'ajout du congé');
    }
  };

  const handleLeaveUpdate = async (updatedLeave: any) => {
    try {
      const updatedLeaves = leaves.map(leave => 
        leave.id === updatedLeave.id ? updatedLeave : leave
      );
      setLeaves(updatedLeaves);
      
      // Sauvegarder dans le stockage
      await leaveStorage.saveLeaves(updatedLeaves);
      
      // Recharger les données pour s'assurer de la synchronisation
      await loadData();
      
      toast.success('Congé modifié avec succès !');
    } catch (error) {
      console.error('Erreur lors de la modification du congé:', error);
      toast.error('Erreur lors de la modification du congé');
    }
  };

  const handleLeaveDelete = async (id: string) => {
    try {
      const updatedLeaves = leaves.filter(leave => leave.id !== id);
      setLeaves(updatedLeaves);
      
      // Sauvegarder dans le stockage
      await leaveStorage.saveLeaves(updatedLeaves);
      
      // Recharger les données pour s'assurer de la synchronisation
      await loadData();
      
      toast.success('Congé supprimé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la suppression du congé:', error);
      toast.error('Erreur lors de la suppression du congé');
    }
  };

  // Fonction pour corriger les jours ouvrés des congés existants
  const correctWorkingDays = async () => {
    try {
      const correctedLeaves = leaves.map(leave => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        let workingDays = 0;
        let current = new Date(start);

        // S'assurer que holidays est un tableau
        const holidaysArray = Array.isArray(holidays) ? holidays : [];

        while (current <= end) {
          const dayOfWeek = current.getDay();
          const currentDateStr = current.toISOString().split('T')[0];
          
          // Vérifier si c'est un jour ouvré (pas week-end et pas jour férié)
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isHoliday = holidaysArray.some(holiday => {
            if (!holiday || !holiday.date) return false;
            const holidayDate = new Date(holiday.date).toISOString().split('T')[0];
            return holidayDate === currentDateStr;
          });
          
          // Seuls les jours ouvrés (lundi à vendredi, non fériés) sont comptés
          if (!isWeekend && !isHoliday) {
            workingDays++;
          }
          
          current.setDate(current.getDate() + 1);
        }

        return {
          ...leave,
          workingDays: workingDays
        };
      });

      setLeaves(correctedLeaves);
      await leaveStorage.saveLeaves(correctedLeaves);
      await loadData();
      
      toast.success('Jours ouvrés corrigés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la correction des jours ouvrés:', error);
      toast.error('Erreur lors de la correction des jours ouvrés');
    }
  };

  const stats = calculateLeaveStats(leaves, currentYear);
  const recentLeaves = leaves
    .filter(leave => new Date(leave.startDate).getFullYear() === currentYear)
    .filter(leave => ['cp', 'rtt', 'cet'].includes(leave.type))
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 5);

  // Fonctions pour générer les explications de calcul
  const getRttCumulativeCalculation = (monthData: any, monthIndex: number) => {
    const rttQuota = settings?.quotas?.find(q => q.type === 'rtt')?.yearlyQuota || 23;
    const carryoverRtt = carryovers.find(c => c.type === 'rtt' && c.year === currentYear - 1)?.days || 0;
    const totalRtt = rttQuota + carryoverRtt;
    
    // Utiliser la même logique que calculateMonthlyLeaveSummarySeparated
    const rttCumulReal = monthlySummarySeparated?.months
      ?.slice(0, monthIndex + 1)
      ?.reduce((sum, month) => sum + (month.rtt.real.taken || 0), 0) || 0;
    
    const remaining = Math.max(0, totalRtt - rttCumulReal);
    
    return `${remaining} = ${totalRtt} (Quota ${currentYear}: ${rttQuota} + Reliquat ${currentYear - 1}: ${carryoverRtt}) - ${rttCumulReal} (Pris jusqu'à ${monthData.monthName})`;
  };

  const getCpCumulativeCalculation = (monthData: any, monthIndex: number) => {
    const cpQuota = settings?.quotas?.find(q => q.type === 'cp')?.yearlyQuota || 25;
    const cetQuota = settings?.quotas?.find(q => q.type === 'cet')?.yearlyQuota || 5;
    const totalCPCETQuota = cpQuota + cetQuota;
    
    const cpCarryover = carryovers.find(c => c.type === 'cp' && c.year === currentYear - 1)?.days || 0;
    const cetCarryover = carryovers.find(c => c.type === 'cet' && c.year === currentYear - 1)?.days || 0;
    const totalCPCETCarryover = cpCarryover + cetCarryover;
    
    const totalCp = totalCPCETQuota + totalCPCETCarryover;
    
    // Utiliser la même logique que calculateMonthlyLeaveSummarySeparated
    const cpCumulReal = monthlySummarySeparated?.months
      ?.slice(0, monthIndex + 1)
      ?.reduce((sum, month) => sum + (month.cp.real.taken || 0), 0) || 0;
    
    const remaining = Math.max(0, totalCp - cpCumulReal);
    
    return `${remaining} = ${totalCp} (Quota ${currentYear}: ${totalCPCETQuota} + Reliquat ${currentYear - 1}: ${totalCPCETCarryover}) - ${cpCumulReal} (Pris jusqu'à ${monthData.monthName})`;
  };

  const getRttForecastCumulativeCalculation = (monthData: any, monthIndex: number) => {
    const rttQuota = settings?.quotas?.find(q => q.type === 'rtt')?.yearlyQuota || 23;
    const carryoverRtt = carryovers.find(c => c.type === 'rtt' && c.year === currentYear - 1)?.days || 0;
    const totalRtt = rttQuota + carryoverRtt;
    
    // Utiliser la même logique que calculateMonthlyLeaveSummarySeparated
    const rttCumulReal = monthlySummarySeparated?.months
      ?.slice(0, monthIndex + 1)
      ?.reduce((sum, month) => sum + (month.rtt.real.taken || 0), 0) || 0;
    
    const rttCumulForecast = monthlySummarySeparated?.months
      ?.slice(0, monthIndex + 1)
      ?.reduce((sum, month) => sum + (month.rtt.forecast.taken || 0), 0) || 0;
    
    const remaining = Math.max(0, totalRtt - rttCumulReal - rttCumulForecast);
    
    return `${remaining} = ${totalRtt} (Quota ${currentYear}: ${rttQuota} + Reliquat ${currentYear - 1}: ${carryoverRtt}) - ${rttCumulReal} (Réel) - ${rttCumulForecast} (Planifié jusqu'à ${monthData.monthName})`;
  };

  const getCpForecastCumulativeCalculation = (monthData: any, monthIndex: number) => {
    const cpQuota = settings?.quotas?.find(q => q.type === 'cp')?.yearlyQuota || 25;
    const cetQuota = settings?.quotas?.find(q => q.type === 'cet')?.yearlyQuota || 5;
    const totalCPCETQuota = cpQuota + cetQuota;
    
    const cpCarryover = carryovers.find(c => c.type === 'cp' && c.year === currentYear - 1)?.days || 0;
    const cetCarryover = carryovers.find(c => c.type === 'cet' && c.year === currentYear - 1)?.days || 0;
    const totalCPCETCarryover = cpCarryover + cetCarryover;
    
    const totalCp = totalCPCETQuota + totalCPCETCarryover;
    
    // Utiliser la même logique que calculateMonthlyLeaveSummarySeparated
    const cpCumulReal = monthlySummarySeparated?.months
      ?.slice(0, monthIndex + 1)
      ?.reduce((sum, month) => sum + (month.cp.real.taken || 0), 0) || 0;
    
    const cpCumulForecast = monthlySummarySeparated?.months
      ?.slice(0, monthIndex + 1)
      ?.reduce((sum, month) => sum + (month.cp.forecast.taken || 0), 0) || 0;
    
    const remaining = Math.max(0, totalCp - cpCumulReal - cpCumulForecast);
    
    return `${remaining} = ${totalCp} (Quota ${currentYear}: ${totalCPCETQuota} + Reliquat ${currentYear - 1}: ${totalCPCETCarryover}) - ${cpCumulReal} (Réel) - ${cpCumulForecast} (Planifié jusqu'à ${monthData.monthName})`;
  };

  // Calcul des congés planifiés (prévisions)
  const plannedStats = useMemo(() => {
    const currentDate = new Date();
    const futureLeaves = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && 
      new Date(leave.startDate) > currentDate &&
      leave.isForecast
    );

    const plannedRtt = futureLeaves
      .filter(leave => leave.type === 'rtt')
      .reduce((sum, leave) => sum + leave.workingDays, 0);

    const plannedCp = futureLeaves
      .filter(leave => leave.type === 'cp')
      .reduce((sum, leave) => sum + leave.workingDays, 0);

    const plannedCet = futureLeaves
      .filter(leave => leave.type === 'cet')
      .reduce((sum, leave) => sum + leave.workingDays, 0);

    return {
      rtt: plannedRtt,
      cp: plannedCp,
      cet: plannedCet,
      total: plannedRtt + plannedCp + plannedCet
    };
  }, [leaves, currentYear]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Nouveau Header moderne */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4">
            <DashboardHeader
              onExport={handleExport}
              onImport={handleImport}
              className="flex-1"
            />
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
          </div>
        </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mobile-safe-area">
        {/* Graphiques cumulés */}
        <div className="mt-8 animate-fade-in-up">
          <div className="card">
            <div className="card-header">
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    📊 Tableau de bord des congés
                  </h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Évolution mensuelle des congés pris et restants par type
              </p>
                  </div>
            </div>
                <div className="flex items-center space-x-2">
              <button
                    onClick={goToPreviousYear}
                    className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Année précédente"
                  >
                    ←
              </button>
              <button
                    onClick={goToCurrentYear}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    title="Année actuelle"
                  >
                    {currentYear}
              </button>
              <button
                    onClick={goToNextYear}
                    className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Année suivante"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body">
              
              {/* Graphiques simples */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Graphique RTT */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white text-center">
                      📊 RTT
                    </h3>
                  </div>
                  <div className="card-body p-6">
                    <div className="space-y-4">
                      
                      {/* Calculer les valeurs RTT */}
                      {(() => {
                        const rttQuota = settings?.quotas?.find(q => q.type === 'rtt')?.yearlyQuota || 23;
                        const rttCarryover = carryovers.find(c => c.type === 'rtt' && c.year === currentYear - 1)?.days || 0;
                        const totalRTT = rttQuota + rttCarryover;
                        const rttPris = leaves.filter(leave => 
                          new Date(leave.startDate).getFullYear() === currentYear && 
                          leave.type === 'rtt' && 
                          !leave.isForecast
                        ).reduce((sum, leave) => sum + leave.workingDays, 0);
                        const rttPlanifie = plannedStats.rtt;
                        const rttRestants = totalRTT - rttPris - rttPlanifie;
                        
                        return (
                          <>
                      <div className="w-full h-8 rounded-lg overflow-hidden flex">
                        {/* RTT Pris (rouge) */}
                        <div 
                          className="bg-red-500 flex items-center justify-center text-white text-sm font-semibold"
                                style={{ width: `${(rttPris / totalRTT) * 100}%` }}
                              >
                                {rttPris > 0 && rttPris}
                        </div>
                        {/* RTT Planifié (vert foncé) */}
                        <div 
                          className="bg-green-600 flex items-center justify-center text-white text-sm font-semibold"
                                style={{ width: `${(rttPlanifie / totalRTT) * 100}%` }}
                        >
                                {rttPlanifie > 0 && rttPlanifie}
                        </div>
                              {/* RTT Restants (vert clair) */}
                        <div 
                          className="bg-green-300 dark:bg-green-400 flex items-center justify-center text-gray-800 dark:text-gray-900 text-sm font-semibold"
                                style={{ width: `${(rttRestants / totalRTT) * 100}%` }}
                              >
                                {rttRestants}
                        </div>
                      </div>
                            
                            {/* Légende des couleurs */}
                            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-red-500 rounded"></div>
                                <span className="text-gray-600 dark:text-gray-400">Pris</span>
                    </div>
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-green-600 rounded"></div>
                                <span className="text-gray-600 dark:text-gray-400">Planifié</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-green-300 dark:bg-green-400 rounded"></div>
                                <span className="text-gray-600 dark:text-gray-400">Restant</span>
                              </div>
                            </div>
                            
                            {/* Explications */}
                            <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                              <div className="space-y-3">
                                <div className="border-l-4 border-blue-500 pl-3">
                                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Quota initial au 01/01/{currentYear}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-bold text-blue-600 dark:text-blue-400">{totalRTT} jours</span> = 
                                    <span className="font-bold text-green-600 dark:text-green-400"> {rttQuota} jours</span> (Quota {currentYear}) + 
                                    <span className="font-bold text-orange-600 dark:text-orange-400"> {rttCarryover} jours</span> (Reliquat {currentYear - 1})
                                  </div>
                                </div>
                                
                                <div className="border-l-4 border-red-500 pl-3">
                                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Consommation au 11/09/{currentYear}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-bold text-red-600 dark:text-red-400">{rttPris} jours</span> pris • 
                                    <span className="font-bold text-green-600 dark:text-green-400"> {rttPlanifie} jours</span> planifiés • 
                                    <span className="font-bold text-purple-600 dark:text-purple-400"> {Math.max(0, totalRTT - rttPris - rttPlanifie)} jours</span> à planifier
                                  </div>
                                </div>
                                
                                <div className="border-l-4 border-blue-500 pl-3 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Solde disponible</div>
                                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {rttPlanifie + Math.max(0, totalRTT - rttPris - rttPlanifie)} jours restants
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Échéance: 31/12/{currentYear} (deadline 28/02/{currentYear + 1})
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Graphique CP/CET */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white text-center">
                      📊 CP/CET
                    </h3>
                  </div>
                  <div className="card-body p-6">
                    <div className="space-y-4">
                      
                      {/* Calculer les valeurs CP/CET */}
                      {(() => {
                        const cpQuota = settings?.quotas?.find(q => q.type === 'cp')?.yearlyQuota || 25;
                        const cetQuota = settings?.quotas?.find(q => q.type === 'cet')?.yearlyQuota || 5;
                        const totalCPCETQuota = cpQuota + cetQuota;
                        
                        const cpCarryover = carryovers.find(c => c.type === 'cp' && c.year === currentYear - 1)?.days || 0;
                        const cetCarryover = carryovers.find(c => c.type === 'cet' && c.year === currentYear - 1)?.days || 0;
                        const totalCPCETCarryover = cpCarryover + cetCarryover;
                        
                        const totalCPCET = totalCPCETQuota + totalCPCETCarryover;
                        
                        const cpPris = leaves.filter(leave => 
                          new Date(leave.startDate).getFullYear() === currentYear && 
                          leave.type === 'cp' && 
                          !leave.isForecast
                        ).reduce((sum, leave) => sum + leave.workingDays, 0);
                        
                        const cetPris = leaves.filter(leave => 
                          new Date(leave.startDate).getFullYear() === currentYear && 
                          leave.type === 'cet' && 
                          !leave.isForecast
                        ).reduce((sum, leave) => sum + leave.workingDays, 0);
                        
                        const totalPris = cpPris + cetPris;
                        const totalPlanifie = plannedStats.cp + plannedStats.cet;
                        const totalRestants = totalCPCET - totalPris - totalPlanifie;
                        
                        return (
                          <>
                      <div className="w-full h-8 rounded-lg overflow-hidden flex">
                        {/* CP/CET Pris (bleu) */}
                        <div 
                          className="bg-blue-500 flex items-center justify-center text-white text-sm font-semibold"
                                style={{ width: `${(totalPris / totalCPCET) * 100}%` }}
                              >
                                {totalPris > 0 && totalPris}
                        </div>
                        {/* CP/CET Planifié (vert foncé) */}
                        <div 
                          className="bg-green-600 flex items-center justify-center text-white text-sm font-semibold"
                                style={{ width: `${(totalPlanifie / totalCPCET) * 100}%` }}
                        >
                                {totalPlanifie > 0 && totalPlanifie}
                        </div>
                              {/* CP/CET Restants (vert clair) */}
                        <div 
                          className="bg-green-300 dark:bg-green-400 flex items-center justify-center text-gray-800 dark:text-gray-900 text-sm font-semibold"
                                style={{ width: `${(totalRestants / totalCPCET) * 100}%` }}
                              >
                                {totalRestants}
                        </div>
                      </div>
                            
                            {/* Légende des couleurs */}
                            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                <span className="text-gray-600 dark:text-gray-400">Pris</span>
                    </div>
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-green-600 rounded"></div>
                                <span className="text-gray-600 dark:text-gray-400">Planifié</span>
                  </div>
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-green-300 dark:bg-green-400 rounded"></div>
                                <span className="text-gray-600 dark:text-gray-400">Restant</span>
                </div>
              </div>
                            
                            {/* Explications */}
                            <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                              <div className="space-y-3">
                                <div className="border-l-4 border-blue-500 pl-3">
                                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Quota initial au 31/05/{currentYear}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-bold text-blue-600 dark:text-blue-400">{totalCPCET} jours</span> = 
                                    <span className="font-bold text-green-600 dark:text-green-400"> {totalCPCETQuota} jours</span> (Quota CP: {cpQuota} + CET: {cetQuota}) + 
                                    <span className="font-bold text-orange-600 dark:text-orange-400"> {totalCPCETCarryover} jours</span> (Reliquats)
                    </div>
                  </div>
                                
                                <div className="border-l-4 border-red-500 pl-3">
                                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Consommation au 11/09/{currentYear}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-bold text-red-600 dark:text-red-400">{totalPris} jours</span> pris • 
                                    <span className="font-bold text-green-600 dark:text-green-400"> {totalPlanifie} jours</span> planifiés • 
                                    <span className="font-bold text-purple-600 dark:text-purple-400"> {Math.max(0, totalCPCET - totalPris - totalPlanifie)} jours</span> à planifier
                </div>
              </div>
                                
                                <div className="border-l-4 border-blue-500 pl-3 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Solde disponible</div>
                                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {totalPlanifie + Math.max(0, totalCPCET - totalPris - totalPlanifie)} jours restants
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Échéance: 31/05/{currentYear + 1}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Feuilles de Paie */}
        <div className="mt-8 animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
          <PayrollValidation 
            leaves={leaves} 
            currentYear={currentYear}
            onDataUpdate={() => {
              // Recharger les données si nécessaire
              console.log('Données de feuille de paie mises à jour')
            }}
            onYearChange={(year) => {
              setCurrentYear(year)
            }}
          />
        </div>

        {/* Calendrier et Analytics */}
        <div className="mt-8 space-y-8">
          <div className="animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
            <LeaveCalendar 
              leaves={leaves} 
              currentYear={currentYear} 
              holidays={holidays}
              onLeaveAdd={handleLeaveAdd}
              onLeaveUpdate={handleLeaveUpdate}
              onLeaveDelete={handleLeaveDelete}
              onYearChange={(year) => {
                setCurrentYear(year)
              }}
            />
          </div>
        </div>

        {/* Nouveau tableau Réel vs Prévisions */}
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    📊 Tableau Réel vs Prévisions
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                      Suivi mensuel des RTT et CP avec données réelles et prévisions
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPreviousYear}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title="Année précédente"
                  >
                    ←
                  </button>
                  <button
                    onClick={goToCurrentYear}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    title="Année actuelle"
                  >
                    {currentYear}
                  </button>
                  <button
                    onClick={goToNextYear}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title="Année suivante"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead>
                    {/* En-tête principal */}
                    <tr>
                      <th rowSpan={2} className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                        Mois
                      </th>
                      <th colSpan={4} className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-blue-200 dark:bg-blue-800 border-r border-gray-200 dark:border-gray-700">
                        Réel
                      </th>
                      <th colSpan={4} className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-purple-200 dark:bg-purple-800 border-r border-gray-200 dark:border-gray-700">
                        Prévisions
                      </th>
                    </tr>
                    {/* En-tête des colonnes */}
                    <tr>
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
                      <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-white bg-purple-100 dark:bg-purple-900 border-r border-gray-200 dark:border-gray-700">
                        Cumul
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummarySeparated?.months.map((monthData, index) => (
                      <tr key={index} className={monthData.month === 0 ? 'bg-orange-50 dark:bg-orange-900/20 border-t-2 border-orange-300 dark:border-orange-600' : (index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800')}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 sticky left-0 z-10 bg-inherit">
                          {monthData.monthName}
                        </td>
                        {/* RTT Réel */}
                        <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                          {monthData.rtt.real.taken > 0 ? monthData.rtt.real.taken : ''}
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                          <CalculationTooltip
                            value={monthData.rtt.real.remaining}
                            calculation={getRttCumulativeCalculation(monthData, index)}
                          >
                            <span className="cursor-help hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {monthData.rtt.real.remaining}
                            </span>
                          </CalculationTooltip>
                        </td>
                        {/* CP Réel */}
                        <td className="px-2 py-2 text-center text-sm text-green-600 dark:text-green-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                          {monthData.cp.real.taken > 0 ? monthData.cp.real.taken : ''}
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                          <CalculationTooltip
                            value={monthData.cp.real.remaining}
                            calculation={getCpCumulativeCalculation(monthData, index)}
                          >
                            <span className="cursor-help hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {monthData.cp.real.remaining}
                            </span>
                          </CalculationTooltip>
                        </td>
                        {/* RTT Prévisions */}
                        <td className="px-2 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                          {monthData.rtt.forecast.taken > 0 ? monthData.rtt.forecast.taken : ''}
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                          <CalculationTooltip
                            value={monthData.rtt.forecast.remaining}
                            calculation={getRttForecastCumulativeCalculation(monthData, index)}
                          >
                            <span className="cursor-help hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {monthData.rtt.forecast.remaining}
                            </span>
                          </CalculationTooltip>
                        </td>
                        {/* CP Prévisions */}
                        <td className="px-2 py-2 text-center text-sm text-green-600 dark:text-green-400 font-semibold border-r border-gray-200 dark:border-gray-700">
                          {monthData.cp.forecast.taken > 0 ? monthData.cp.forecast.taken : ''}
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                          <CalculationTooltip
                            value={monthData.cp.forecast.remaining}
                            calculation={getCpForecastCumulativeCalculation(monthData, index)}
                          >
                            <span className="cursor-help hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {monthData.cp.forecast.remaining}
                            </span>
                          </CalculationTooltip>
                        </td>
                      </tr>
                    ))}
                     {/* Ligne de totaux combinés */}
                    {monthlySummarySeparated?.yearlyTotals && (
                      <tr className="bg-red-50 dark:bg-red-900/20">
                        <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                           
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-bold text-red-600 dark:text-red-400 border-r border-gray-200 dark:border-gray-700">
                          {monthlySummarySeparated.yearlyTotals.rtt.real}
                        </td>
                        <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                          
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-bold text-red-600 dark:text-red-400 border-r border-gray-200 dark:border-gray-700">
                          {monthlySummarySeparated.yearlyTotals.cp.real}
                        </td>
                        <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                          
                        </td>
                         <td className="px-2 py-2 text-center text-sm font-bold text-purple-600 dark:text-purple-400 border-r border-gray-200 dark:border-gray-700">
                           {monthlySummarySeparated.yearlyTotals.rtt.forecast}
                        </td>
                        <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                          
                        </td>
                         <td className="px-2 py-2 text-center text-sm font-bold text-purple-600 dark:text-purple-400 border-r border-gray-200 dark:border-gray-700">
                           {monthlySummarySeparated.yearlyTotals.cp.forecast}
                        </td>
                        <td className="px-2 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-700">
                          
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Légende */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    💡 Explication du tableau
                  </h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-200 dark:bg-blue-800 rounded mr-2"></div>
                      <span><strong>Réel :</strong> Données effectives des congés pris</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-purple-200 dark:bg-purple-800 rounded mr-2"></div>
                      <span><strong>Prévisions :</strong> Planification des congés à venir</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded mr-2"></div>
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
