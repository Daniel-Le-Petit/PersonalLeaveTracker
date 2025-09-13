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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Validation feuille de paie</h1>
        <p className="text-gray-600 dark:text-gray-400">Validation et suivi des données de paie</p>
      </div>

      <div className="space-y-8">
        <PayrollValidation 
          leaves={leaves}
          currentYear={currentYear}
        />
      </div>
    </MainLayout>
  )
}
