'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { LeaveEntry, AppSettings, PublicHoliday, CarryoverLeave } from '../../types'
import { leaveStorage } from '../../utils/storage'
import LeaveCalendar from '../../components/LeaveCalendar'
import MainLayout from '../../components/MainLayout'

export default function CalendarPage() {
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📅 Calendrier des Congés</h1>
        <p className="text-gray-600 dark:text-gray-400">Visualisez et gérez vos congés dans un calendrier interactif</p>
      </div>

      <div className="space-y-8">
        {/* Calendrier des congés */}
        <LeaveCalendar
          leaves={leaves}
          currentYear={currentYear}
          holidays={holidays}
          onLeaveAdd={async (leave) => {
            try {
              await leaveStorage.addLeave(leave)
              setLeaves(prev => [...prev, leave])
              toast.success('Congé ajouté avec succès')
            } catch (error) {
              console.error('Erreur lors de l\'ajout du congé:', error)
              toast.error('Erreur lors de l\'ajout du congé')
            }
          }}
          onLeaveUpdate={handleLeaveUpdate}
          onLeaveDelete={async (id) => {
            try {
              await leaveStorage.deleteLeave(id)
              setLeaves(prev => prev.filter(leave => leave.id !== id))
              toast.success('Congé supprimé avec succès')
            } catch (error) {
              console.error('Erreur lors de la suppression du congé:', error)
              toast.error('Erreur lors de la suppression du congé')
            }
          }}
          onYearChange={(year) => setCurrentYear(year)}
        />
      </div>
    </MainLayout>
  )
}