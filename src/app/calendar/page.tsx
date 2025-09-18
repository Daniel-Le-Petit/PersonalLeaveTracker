'use client'

import { ArrowLeft, Plus, Edit } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { LeaveEntry, LeaveType } from '../../types'
import { formatDate, calculateWorkingDays } from '../../utils/leaveUtils'
import { leaveStorage } from '../../utils/storage'

export default function CalendarPage() {
  const [leaves, setLeaves] = useState<LeaveEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<LeaveEntry | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [formData, setFormData] = useState({
    type: 'cp' as LeaveType,
    startDate: '',
    endDate: '',
    isForecast: false,
    notes: ''
  })

  useEffect(() => {
    loadLeaves()
  }, [])

  const loadLeaves = async () => {
    try {
      const leavesData = await leaveStorage.getLeaves()
      setLeaves(leavesData)
    } catch (error) {
      console.error('Erreur lors du chargement des congés:', error)
      toast.error('Erreur lors du chargement des congés')
    } finally {
      setIsLoading(false)
    }
  }

  const getLeaveTypeColor = (type: string) => {
    const colors = {
      cp: 'bg-blue-500',
      rtt: 'bg-green-500',
      sick: 'bg-orange-500',
      
    }
    return colors[type as keyof typeof colors] || 'bg-gray-500'
  }

  const getLeaveTypeLabel = (type: string) => {
    const types = {
      cp: 'CP',
      rtt: 'RTT',
      sick: 'Maladie',
      
    }
    return types[type as keyof typeof types] || type
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    return { daysInMonth, startingDay }
  }

  const getLeavesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return leaves.filter(leave => {
      const start = new Date(leave.startDate)
      const end = new Date(leave.endDate)
      const current = new Date(dateStr)
      return current >= start && current <= end
    })
  }

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const renderCalendar = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(currentDate)
    const days = []
    
    // Ajouter les jours vides du début
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day bg-gray-50 dark:bg-gray-800"></div>)
    }
    
    // Ajouter les jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayLeaves = getLeavesForDate(date)
      const isWeekendDay = isWeekend(date)
      
      days.push(
        <div 
          key={day} 
          className={`calendar-day ${isWeekendDay ? 'calendar-day-weekend' : ''} ${
            dayLeaves.length > 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
        >
          <div className="text-sm font-medium mb-1">{day}</div>
          {dayLeaves.map((leave, index) => (
            <div
              key={`${leave.id}-${index}`}
              className={`text-xs p-1 rounded mb-1 text-white ${getLeaveTypeColor(leave.type)} cursor-pointer hover:opacity-80 transition-opacity group relative`}
              title={`${getLeaveTypeLabel(leave.type)}: ${formatDate(leave.startDate)} - ${formatDate(leave.endDate)} - Cliquez pour modifier`}
              onClick={() => handleEditLeave(leave)}
            >
              <div className="flex items-center justify-between">
                <span>{getLeaveTypeLabel(leave.type)}</span>
                <Edit className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      )
    }
    
    return days
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleAddLeave = () => {
    setFormData({
      type: 'cp',
      startDate: '',
      endDate: '',
      isForecast: false,
      notes: ''
    })
    setShowAddModal(true)
  }

  const handleEditLeave = (leave: LeaveEntry) => {
    setSelectedLeave(leave)
    setFormData({
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      isForecast: leave.isForecast,
      notes: leave.notes || ''
    })
    setShowEditModal(true)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    const dateStr = date.toISOString().split('T')[0]
    setFormData({
      type: 'cp',
      startDate: dateStr,
      endDate: dateStr,
      isForecast: false,
      notes: ''
    })
    setShowAddModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (showEditModal && selectedLeave) {
        // Modifier un congé existant
        const updatedLeave: LeaveEntry = {
          ...selectedLeave,
          ...formData,
          workingDays: calculateWorkingDays(formData.startDate, formData.endDate),
          updatedAt: new Date().toISOString()
        }
        
        await leaveStorage.updateLeave(updatedLeave)
        setLeaves(prev => prev.map(leave => leave.id === selectedLeave.id ? updatedLeave : leave))
        toast.success('Congé modifié avec succès')
        setShowEditModal(false)
      } else {
        // Ajouter un nouveau congé
        const newLeave: LeaveEntry = {
          id: Date.now().toString(),
          ...formData,
          workingDays: calculateWorkingDays(formData.startDate, formData.endDate),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        await leaveStorage.addLeave(newLeave)
        setLeaves(prev => [...prev, newLeave])
        toast.success('Congé ajouté avec succès')
        setShowAddModal(false)
      }
      
      setFormData({
        type: 'cp',
        startDate: '',
        endDate: '',
        isForecast: false,
        notes: ''
      })
      setSelectedLeave(null)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde du congé')
    }
  }

  const handleDeleteLeave = async (leave: LeaveEntry) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce congé ?')) {
      try {
        await leaveStorage.deleteLeave(leave.id)
        setLeaves(prev => prev.filter(l => l.id !== leave.id))
        toast.success('Congé supprimé avec succès')
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
        toast.error('Erreur lors de la suppression du congé')
      }
    }
  }

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/" className="btn-secondary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    📅 Calendrier des congés
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Visualisez vos congés dans un calendrier
                  </p>
                </div>
              </div>
              <button
                onClick={handleAddLeave}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau congé</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contrôles du calendrier */}
        <div className="card mb-8">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={goToPreviousMonth}
                  className="btn-secondary"
                >
                  ← Précédent
                </button>
                <button
                  onClick={goToToday}
                  className="btn-primary"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={goToNextMonth}
                  className="btn-secondary"
                >
                  Suivant →
                </button>
              </div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
            </div>
          </div>
        </div>

        {/* Calendrier */}
        <div className="card">
          <div className="card-body">
            {/* En-têtes des jours */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Grille du calendrier */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>
        </div>

        {/* Légende */}
        <div className="card mt-8">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Légende
            </h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { type: 'cp', label: 'CP - Congés payés' },
                { type: 'rtt', label: 'RTT - Réduction du temps de travail' },
                { type: 'sick', label: 'Maladie' },
                
              ].map((item) => (
                <div key={item.type} className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded ${getLeaveTypeColor(item.type)}`}></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Statistiques du mois */}
        <div className="card mt-8">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Statistiques du mois
            </h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {leaves.filter(leave => {
                    const start = new Date(leave.startDate)
                    const end = new Date(leave.endDate)
                    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
                    return (start <= monthEnd && end >= monthStart)
                  }).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Congés ce mois
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {leaves.filter(leave => {
                    const start = new Date(leave.startDate)
                    const end = new Date(leave.endDate)
                    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
                    return (start <= monthEnd && end >= monthStart)
                  }).reduce((sum, leave) => sum + leave.workingDays, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Jours de congé
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Set(leaves.filter(leave => {
                    const start = new Date(leave.startDate)
                    const end = new Date(leave.endDate)
                    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
                    return (start <= monthEnd && end >= monthStart)
                  }).map(leave => leave.type)).size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Types de congé
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal d'ajout de congé */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Nouveau congé
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type de congé
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as LeaveType})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="cp">CP - Congés payés</option>
                  <option value="rtt">RTT - Réduction du temps de travail</option>
                  <option value="cet">CET - Compte épargne temps</option>
                  <option value="sick">Maladie</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isForecast"
                  checked={formData.isForecast}
                  onChange={(e) => setFormData({...formData, isForecast: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="isForecast" className="text-sm text-gray-700 dark:text-gray-300">
                  Congé en prévision
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de modification de congé */}
      {showEditModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Modifier le congé
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type de congé
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as LeaveType})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="cp">CP - Congés payés</option>
                  <option value="rtt">RTT - Réduction du temps de travail</option>
                  <option value="cet">CET - Compte épargne temps</option>
                  <option value="sick">Maladie</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isForecastEdit"
                  checked={formData.isForecast}
                  onChange={(e) => setFormData({...formData, isForecast: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="isForecastEdit" className="text-sm text-gray-700 dark:text-gray-300">
                  Congé en prévision
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedLeave(null)
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLeave(selectedLeave)}
                  className="px-4 py-2 text-red-600 bg-red-100 dark:bg-red-900/20 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                >
                  Supprimer
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Modifier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
