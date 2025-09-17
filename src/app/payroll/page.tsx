'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { LeaveEntry, PublicHoliday } from '../../types'
import { leaveStorage } from '../../utils/storage'
import PayrollValidation from '../../components/PayrollValidation'
import MainLayout from '../../components/MainLayout'

export default function PayrollPage() {
  const [leaves, setLeaves] = useState<LeaveEntry[]>([])
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const currentMonth = new Date().getMonth() + 1
    return currentMonth === 1 ? 12 : currentMonth - 1
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const leavesData = await leaveStorage.getLeaves()
      const holidaysData = await leaveStorage.getHolidays()
      
      setLeaves(leavesData)
      setHolidays(holidaysData)
      setIsLoading(false)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    const data = {
      leaves,
      holidays,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll-data-${currentYear}.json`
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
      if (data.holidays) await leaveStorage.saveHolidays(data.holidays)
      
      toast.success('Données importées avec succès')
      await loadData()
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      toast.error('Erreur lors de l\'import des données')
    }
  }

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setCurrentYear(prev => prev - 1)
    } else {
      setSelectedMonth(prev => prev - 1)
    }
  }

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setCurrentYear(prev => prev + 1)
    } else {
      setSelectedMonth(prev => prev + 1)
    }
  }

  const goToCurrentMonth = () => {
    const currentMonth = new Date().getMonth() + 1
    setSelectedMonth(currentMonth === 1 ? 12 : currentMonth - 1)
    setCurrentYear(new Date().getFullYear())
  }

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  // Données de feuille de paie simulées pour chaque mois
  const getPayrollDataForMonth = (month: number, year: number) => {
    // Données simulées - dans un vrai système, ceci viendrait d'une base de données
    const payrollData = {
      7: { // Juillet 2025
        cpAcquired: 6.24,
        cpElapsed: 27,
        cpRemaining: 64.5,
        rttTaken: 4,
        cetBalance: 5,
        cetTaken: 0, // CET pris en juillet (aucun CET pris)
        cpDates: ['2025-07-15', '2025-07-16', '2025-07-17', '2025-07-18', '2025-07-21'],
        holidays: ['2025-07-14']
      },
      8: { // Août 2025
        cpAcquired: 6.24,
        cpElapsed: 27,
        cpRemaining: 62.5,
        rttTaken: 2,
        cetBalance: 5,
        cetTaken: 0, // CET pris en août (aucun CET pris)
        cpDates: ['2025-08-05', '2025-08-06', '2025-08-07'],
        holidays: ['2025-08-15']
      },
      9: { // Septembre 2025
        cpAcquired: 6.24,
        cpElapsed: 27,
        cpRemaining: 60.5,
        rttTaken: 1,
        cetBalance: 5,
        cetTaken: 0, // CET pris en septembre (aucun CET pris)
        cpDates: ['2025-09-10', '2025-09-11'],
        holidays: []
      }
    }
    return payrollData[month as keyof typeof payrollData] || {
      cpAcquired: 0,
      cpElapsed: 0,
      cpRemaining: 0,
      rttTaken: 0,
      cetBalance: 5, // Solde CET toujours à 5
      cetTaken: 0,
      cpDates: [],
      holidays: []
    }
  }

  // Calculer les données Leave-Tracker pour le mois précédent
  const getLeaveTrackerDataForMonth = (month: number, year: number) => {
    // Calculer le mois précédent
    const previousMonth = month === 1 ? 12 : month - 1
    const previousYear = month === 1 ? year - 1 : year
    
    const monthLeaves = leaves.filter(leave => {
      const leaveDate = new Date(leave.startDate)
      return leaveDate.getMonth() + 1 === previousMonth && leaveDate.getFullYear() === previousYear
    })

    const rttLeaves = monthLeaves.filter(leave => leave.type === 'rtt')
    const cpLeaves = monthLeaves.filter(leave => leave.type === 'cp')
    const cetLeaves = monthLeaves.filter(leave => leave.type === 'cet')

    return {
      rttTaken: rttLeaves.reduce((sum, leave) => sum + leave.workingDays, 0),
      cpTaken: cpLeaves.reduce((sum, leave) => sum + leave.workingDays, 0),
      cetTaken: cetLeaves.reduce((sum, leave) => sum + leave.workingDays, 0),
      cpDates: cpLeaves.map(leave => leave.startDate),
      totalLeaves: monthLeaves.length
    }
  }

  const currentPayrollData = getPayrollDataForMonth(selectedMonth, currentYear)
  const currentLeaveTrackerData = getLeaveTrackerDataForMonth(selectedMonth, currentYear)

  // Fonction pour analyser les incohérences et expliquer les calculs
  const analyzeInconsistencies = () => {
    const inconsistencies = []
    
    // Vérification RTT
    if (currentPayrollData.rttTaken !== currentLeaveTrackerData.rttTaken) {
      inconsistencies.push({
        type: 'RTT',
        payrollValue: currentPayrollData.rttTaken,
        trackerValue: currentLeaveTrackerData.rttTaken,
        explanation: `RTT Incohérence détectée:
• Feuille de paie: ${currentPayrollData.rttTaken} jours
• Leave-Tracker: ${currentLeaveTrackerData.rttTaken} jours
• Différence: ${Math.abs(currentPayrollData.rttTaken - currentLeaveTrackerData.rttTaken)} jours

CALCUL LEAVE-TRACKER:
• Filtrage des congés RTT pour ${monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]} ${selectedMonth === 1 ? currentYear - 1 : currentYear} (mois précédent)
• Somme des workingDays (jours ouvrés) de chaque congé RTT
• Résultat: ${currentLeaveTrackerData.rttTaken} jours

POSSIBLES CAUSES:
• Congés RTT non saisis dans Leave-Tracker pour le mois précédent
• Erreur de saisie dans la feuille de paie
• Différence de calcul des jours ouvrés`
      })
    }
    
    // Vérification CP
    if (currentPayrollData.cpDates.length !== currentLeaveTrackerData.cpTaken) {
      inconsistencies.push({
        type: 'CP',
        payrollValue: currentPayrollData.cpDates.length,
        trackerValue: currentLeaveTrackerData.cpTaken,
        explanation: `CP Incohérence détectée:
• Feuille de paie: ${currentPayrollData.cpDates.length} jours (${currentPayrollData.cpDates.length > 0 ? currentPayrollData.cpDates.join(', ') : 'Aucune date'})
• Leave-Tracker: ${currentLeaveTrackerData.cpTaken} jours
• Différence: ${Math.abs(currentPayrollData.cpDates.length - currentLeaveTrackerData.cpTaken)} jours

CALCUL LEAVE-TRACKER:
• Filtrage des congés CP pour ${monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]} ${selectedMonth === 1 ? currentYear - 1 : currentYear} (mois précédent)
• Somme des workingDays (jours ouvrés) de chaque congé CP
• Dates trouvées: ${currentLeaveTrackerData.cpDates.length > 0 ? currentLeaveTrackerData.cpDates.join(', ') : 'Aucune date'}
• Résultat: ${currentLeaveTrackerData.cpTaken} jours

POSSIBLES CAUSES:
• Congés CP non saisis dans Leave-Tracker pour le mois précédent
• Dates incorrectes dans la feuille de paie
• Différence de calcul des jours ouvrés
• Congés CP marqués comme "Prévision" non comptés`
      })
    }
    
    // Vérification CET
    if (currentPayrollData.cetTaken !== currentLeaveTrackerData.cetTaken) {
      inconsistencies.push({
        type: 'CET',
        payrollValue: currentPayrollData.cetTaken,
        trackerValue: currentLeaveTrackerData.cetTaken,
        explanation: `CET Incohérence détectée:
• Feuille de paie: ${currentPayrollData.cetTaken} jours CET pris en ${monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]} (mois précédent)
• Leave-Tracker: ${currentLeaveTrackerData.cetTaken} jours CET pris
• Différence: ${Math.abs(currentPayrollData.cetTaken - currentLeaveTrackerData.cetTaken)} jours

CALCUL LEAVE-TRACKER:
• Filtrage des congés CET pour ${monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]} ${selectedMonth === 1 ? currentYear - 1 : currentYear} (mois précédent)
• Somme des workingDays (jours ouvrés) de chaque congé CET
• Résultat: ${currentLeaveTrackerData.cetTaken} jours

SOLDE CET:
• Solde CET ${currentYear}: ${currentPayrollData.cetBalance} jours (quota initial)
• CET pris en ${monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]}: ${currentPayrollData.cetTaken} jours
• CET restant: ${currentPayrollData.cetBalance - currentPayrollData.cetTaken} jours

POSSIBLES CAUSES:
• Congés CET non saisis dans Leave-Tracker pour le mois précédent
• Erreur de saisie dans la feuille de paie
• Différence de calcul des jours ouvrés
• Congés CET marqués comme "Prévision" non comptés`
      })
    }
    
    return inconsistencies
  }

  const inconsistencies = analyzeInconsistencies()

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
      {/* Header avec navigation */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <a href="/" className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <h1 className="text-2xl font-bold">Validation Feuilles de Paie</h1>
            </a>
          </div>
          
          {/* Navigation par mois */}
          <div className="flex items-center space-x-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              title={`Mois précédent (${selectedMonth === 1 ? monthNames[11] : monthNames[selectedMonth - 2]})`}
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold text-lg min-w-[200px] text-center shadow-md">
              {monthNames[selectedMonth - 1]} {currentYear}
            </div>
            
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              title={`Mois suivant (${selectedMonth === 12 ? monthNames[0] : monthNames[selectedMonth]})`}
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {(selectedMonth !== (new Date().getMonth() === 0 ? 12 : new Date().getMonth()) || currentYear !== new Date().getFullYear()) && (
              <button
                onClick={goToCurrentMonth}
                className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                title="Revenir au mois actuel"
              >
                Aujourd'hui
              </button>
            )}
          </div>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Vérifiez et validez les données de vos feuilles de paie avec les calculs automatiques
        </p>
      </div>

      {/* Section de comparaison des données */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Données Feuille de Paie */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">📄</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Feuille de Paie - {monthNames[selectedMonth - 1]} {currentYear}</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">CP acquis depuis 31/05</span>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{currentPayrollData.cpAcquired}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">jours</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">CP écoulés à ajouter</span>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{currentPayrollData.cpElapsed}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">jours</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">CP restant (réel+prévision)</span>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{currentPayrollData.cpRemaining}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">jours</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">RTT Pris sur {monthNames[selectedMonth - 1]}</span>
              <div className="text-right">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{currentPayrollData.rttTaken}</div>
                <div className="text-xs text-red-600 dark:text-red-400">jours</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Solde CET {currentYear}</span>
              <div className="text-right">
                <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{currentPayrollData.cetBalance}</div>
                <div className="text-xs text-cyan-600 dark:text-cyan-400">jours</div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">CP Pris {monthNames[selectedMonth - 1]} (dates)</span>
              <div className="text-sm text-gray-800 dark:text-gray-200">
                {currentPayrollData.cpDates.length > 0 ? (
                  <div className="space-y-1">
                    {currentPayrollData.cpDates.map((date, index) => (
                      <div key={index} className="font-mono text-xs">{date}</div>
                    ))}
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      {currentPayrollData.cpDates.length} dates dans la feuille de paie
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">Aucun congé CP ce mois</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Données Leave-Tracker */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">📊</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Leave-Tracker - {monthNames[selectedMonth - 1]} {currentYear}</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">RTT Pris (calculé)</span>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{currentLeaveTrackerData.rttTaken}</div>
                <div className="text-xs text-green-600 dark:text-green-400">jours</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">CP Pris (calculé)</span>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{currentLeaveTrackerData.cpTaken}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">jours</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">CET Pris (calculé)</span>
              <div className="text-right">
                <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{currentLeaveTrackerData.cetTaken}</div>
                <div className="text-xs text-cyan-600 dark:text-cyan-400">jours</div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">CP Pris {monthNames[selectedMonth - 1]} (dates)</span>
              <div className="text-sm text-gray-800 dark:text-gray-200">
                {currentLeaveTrackerData.cpDates.length > 0 ? (
                  <div className="space-y-1">
                    {currentLeaveTrackerData.cpDates.map((date, index) => (
                      <div key={index} className="font-mono text-xs">{date}</div>
                    ))}
                    <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                      {currentLeaveTrackerData.cpDates.length} dates trouvées = {currentLeaveTrackerData.cpTaken} jours ouvrés ✅
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">Aucun congé CP ce mois</div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total congés</span>
              <div className="text-right">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{currentLeaveTrackerData.totalLeaves}</div>
                <div className="text-xs text-purple-600 dark:text-purple-400">entrées</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section de comparaison et vérifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Comparaison et Vérifications</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* RTT Comparison */}
          <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center mr-2">
                <span className="text-white text-xs font-bold">RTT</span>
              </div>
              RTT Pris (mois précédent)
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Feuille de paie:</span>
                <span className="font-bold text-gray-900 dark:text-white">{currentPayrollData.rttTaken} jours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Leave-Tracker:</span>
                <span className="font-bold text-gray-900 dark:text-white">{currentLeaveTrackerData.rttTaken} jours</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${
                currentPayrollData.rttTaken === currentLeaveTrackerData.rttTaken 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                <span className="text-sm font-medium">Statut:</span>
                <span className="text-sm font-bold">
                  {currentPayrollData.rttTaken === currentLeaveTrackerData.rttTaken ? '✅ Cohérent' : '❌ Incohérent'}
                </span>
              </div>
              {currentPayrollData.rttTaken !== currentLeaveTrackerData.rttTaken && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded text-xs text-gray-600 dark:text-gray-400">
                  <div className="font-medium mb-1">Calcul Leave-Tracker:</div>
                  <div>• Filtrage congés RTT pour {monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]} {selectedMonth === 1 ? currentYear - 1 : currentYear}</div>
                  <div>• Somme workingDays (jours ouvrés)</div>
                  <div>• Résultat: {currentLeaveTrackerData.rttTaken} jours</div>
                </div>
              )}
            </div>
          </div>

          {/* CP Comparison */}
          <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center mr-2">
                <span className="text-white text-xs font-bold">CP</span>
              </div>
              CP Pris (mois précédent)
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Feuille de paie:</span>
                <span className="font-bold text-gray-900 dark:text-white">{currentPayrollData.cpDates.length} jours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Leave-Tracker:</span>
                <span className="font-bold text-gray-900 dark:text-white">{currentLeaveTrackerData.cpTaken} jours</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${
                currentPayrollData.cpDates.length === currentLeaveTrackerData.cpTaken 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                <span className="text-sm font-medium">Statut:</span>
                <span className="text-sm font-bold">
                  {currentPayrollData.cpDates.length === currentLeaveTrackerData.cpTaken ? '✅ Cohérent' : '❌ Incohérent'}
                </span>
              </div>
              {currentPayrollData.cpDates.length !== currentLeaveTrackerData.cpTaken && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded text-xs text-gray-600 dark:text-gray-400">
                  <div className="font-medium mb-1">Calcul Leave-Tracker:</div>
                  <div>• Filtrage congés CP pour {monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]} {selectedMonth === 1 ? currentYear - 1 : currentYear}</div>
                  <div>• Somme workingDays (jours ouvrés)</div>
                  <div>• Dates: {currentLeaveTrackerData.cpDates.length > 0 ? currentLeaveTrackerData.cpDates.join(', ') : 'Aucune'}</div>
                  <div>• Résultat: {currentLeaveTrackerData.cpTaken} jours</div>
                </div>
              )}
            </div>
          </div>

          {/* CET Comparison */}
          <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <div className="w-6 h-6 bg-cyan-500 rounded-lg flex items-center justify-center mr-2">
                <span className="text-white text-xs font-bold">CET</span>
              </div>
              CET Pris (mois précédent)
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Feuille de paie:</span>
                <span className="font-bold text-gray-900 dark:text-white">{currentPayrollData.cetTaken} jours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Leave-Tracker:</span>
                <span className="font-bold text-gray-900 dark:text-white">{currentLeaveTrackerData.cetTaken} jours</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${
                currentPayrollData.cetTaken === currentLeaveTrackerData.cetTaken 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                <span className="text-sm font-medium">Statut:</span>
                <span className="text-sm font-bold">
                  {currentPayrollData.cetTaken === currentLeaveTrackerData.cetTaken ? '✅ Cohérent' : '❌ Incohérent'}
                </span>
              </div>
              {currentPayrollData.cetTaken !== currentLeaveTrackerData.cetTaken && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded text-xs text-gray-600 dark:text-gray-400">
                  <div className="font-medium mb-1">Calcul Leave-Tracker:</div>
                  <div>• Filtrage congés CET pour {monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]} {selectedMonth === 1 ? currentYear - 1 : currentYear}</div>
                  <div>• Somme workingDays (jours ouvrés)</div>
                  <div>• Résultat: {currentLeaveTrackerData.cetTaken} jours</div>
                </div>
              )}
              <div className="mt-2 p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded text-xs text-cyan-700 dark:text-cyan-300">
                <div className="font-medium mb-1">Solde CET {currentYear} (mois précédent):</div>
                <div>• Quota initial: {currentPayrollData.cetBalance} jours</div>
                <div>• CET pris en {monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]}: {currentPayrollData.cetTaken} jours</div>
                <div>• CET restant: {currentPayrollData.cetBalance - currentPayrollData.cetTaken} jours</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section d'explication des incohérences */}
      {inconsistencies.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-sm font-bold">!</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-4">
                Incohérences Détectées - Explications Détaillées
              </h3>
              
              <div className="space-y-6">
                {inconsistencies.map((inconsistency, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        inconsistency.type === 'RTT' ? 'bg-red-500' : 'bg-blue-500'
                      }`}>
                        <span className="text-white text-sm font-bold">{inconsistency.type}</span>
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        Incohérence {inconsistency.type}
                      </h4>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                      <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                        {inconsistency.explanation}
                      </pre>
                    </div>
                    
                    <div className="mt-4 flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Feuille de paie: <strong>{inconsistency.payrollValue}</strong>
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Leave-Tracker: <strong>{inconsistency.trackerValue}</strong>
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Différence: <strong>{Math.abs(inconsistency.payrollValue - inconsistency.trackerValue)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="text-md font-bold text-blue-800 dark:text-blue-200 mb-2">
                  📊 Explication des Différences Possibles
                </h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                  <div><strong>Dates vs Jours Ouvrés :</strong></div>
                  <div>• <strong>Feuille de paie :</strong> Compte le nombre de dates listées (ex: 5 dates)</div>
                  <div>• <strong>Leave-Tracker :</strong> Calcule les jours ouvrés (ex: 5 dates = 5 jours ouvrés si pas de week-end)</div>
                  <div>• <strong>Différence possible :</strong> Si une date tombe un week-end, elle n'est pas comptée comme jour ouvré</div>
                  
                  <div className="mt-3"><strong>CET :</strong></div>
                  <div>• <strong>Solde CET :</strong> Quota initial CET (5 jours)</div>
                  <div>• <strong>CET Pris :</strong> Congés CET effectivement pris dans le mois</div>
                  <div>• <strong>Différence :</strong> Le solde peut être de 5 jours même si 0 CET pris ce mois</div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <h4 className="text-md font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                  Actions Recommandées
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• Vérifiez les congés saisis dans Leave-Tracker pour le mois concerné</li>
                  <li>• Comparez les dates de congés entre les deux systèmes</li>
                  <li>• Vérifiez que les congés "Prévision" sont bien comptés</li>
                  <li>• Contrôlez le calcul des jours ouvrés (exclusion week-ends)</li>
                  <li>• Mettez à jour les données incorrectes dans le système approprié</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section de saisie des données de feuille de paie */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Saisie des données</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mois
            </label>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {monthNames.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Année
            </label>
            <input 
              type="number" 
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reliquat CP
            </label>
            <input 
              type="number" 
              step="0.01"
              defaultValue="47.5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              RTT Pris (mois précédent)
            </label>
            <input 
              type="number" 
              defaultValue="4"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Solde CET (mois précédent)
            </label>
            <input 
              type="number" 
              defaultValue="5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              readOnly
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CP Pris (mois précédent) - Dates
            </label>
            <textarea 
              rows={3}
              defaultValue={currentPayrollData.cpDates.join('\n')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Une date par ligne (DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD)"
              readOnly
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {currentPayrollData.cpDates.length} dates dans la feuille de paie
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4 mt-6">
          <button className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors">
            Annuler
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Valider les Données
          </button>
        </div>
      </div>

      {/* Tableau annuel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Tableau Annuel {currentYear}</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">
                  Mois
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">
                  Reliquat CP
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">
                  Nbr RTT Mois précédent
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">
                  Nbr CP Mois précédent
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">
                  Nbr CET Mois précédent
                </th>
              </tr>
            </thead>
            <tbody>
              {monthNames.map((month, index) => {
                const monthNum = index + 1
                const previousMonth = monthNum === 1 ? 12 : monthNum - 1
                const previousYear = monthNum === 1 ? currentYear - 1 : currentYear
                
                // Calculer les données pour ce mois
                const monthLeaves = leaves.filter(leave => {
                  const leaveDate = new Date(leave.startDate)
                  return leaveDate.getMonth() + 1 === previousMonth && leaveDate.getFullYear() === previousYear
                })
                
                const rttCount = monthLeaves.filter(leave => leave.type === 'rtt').reduce((sum, leave) => sum + leave.workingDays, 0)
                const cpCount = monthLeaves.filter(leave => leave.type === 'cp').reduce((sum, leave) => sum + leave.workingDays, 0)
                const cetCount = monthLeaves.filter(leave => leave.type === 'cet').reduce((sum, leave) => sum + leave.workingDays, 0)
                const cpDates = monthLeaves.filter(leave => leave.type === 'cp').map(leave => leave.startDate)
                
                // Reliquat CP (exemple - à adapter selon votre logique)
                const reliquatCP = 47.5 - cpCount
                
                return (
                  <tr key={monthNum} className={monthNum === selectedMonth ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-medium text-gray-900 dark:text-white">
                      {month}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                      <div 
                        className="text-blue-600 dark:text-blue-400 font-medium cursor-help"
                        title={`Calcul: Reliquat initial (47.5) - CP pris en ${monthNames[previousMonth - 1]} (${cpCount} jours) = ${reliquatCP}`}
                      >
                        {reliquatCP.toFixed(1)}
                      </div>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                      <div 
                        className="text-red-600 dark:text-red-400 font-medium cursor-help"
                        title={`Calcul: Somme des workingDays des congés RTT pris en ${monthNames[previousMonth - 1]} ${previousYear} = ${rttCount} jours`}
                      >
                        {rttCount}
                      </div>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                      <div 
                        className="text-blue-600 dark:text-blue-400 font-medium cursor-help"
                        title={`Calcul: Somme des workingDays des congés CP pris en ${monthNames[previousMonth - 1]} ${previousYear} = ${cpCount} jours. Dates: ${cpDates.length > 0 ? cpDates.join(', ') : 'Aucune'}`}
                      >
                        {cpCount}
                      </div>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                      <div 
                        className="text-cyan-600 dark:text-cyan-400 font-medium cursor-help"
                        title={`Calcul: Somme des workingDays des congés CET pris en ${monthNames[previousMonth - 1]} ${previousYear} = ${cetCount} jours`}
                      >
                        {cetCount}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Légende:</strong> Survolez les chiffres pour voir les détails des calculs.</p>
          <p><strong>Mois en surbrillance:</strong> Mois actuellement sélectionné ({monthNames[selectedMonth - 1]})</p>
        </div>
      </div>

      {/* Section de recommandations */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-sm font-bold">!</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-2">
              Recommandations de Correction
            </h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• <strong>Formulaire simplifié :</strong> Suppression des champs inutiles (CP acquis, CP écoulés, Jours fériés)</li>
              <li>• <strong>Logique mois précédent :</strong> Tous les champs correspondent au mois précédent</li>
              <li>• <strong>Tableau annuel :</strong> Vue d'ensemble avec calculs automatiques et tooltips détaillés</li>
              <li>• <strong>Reliquat CP :</strong> Calculé automatiquement (Reliquat initial - CP pris)</li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

