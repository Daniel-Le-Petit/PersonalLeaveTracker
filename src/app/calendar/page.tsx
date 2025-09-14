'use client'

import { ArrowLeft, Edit, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react'
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

  const goToPreviousYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))
  }

  const goToNextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))
  }

  const adjustDate = (field: 'startDate' | 'endDate', direction: 'add' | 'subtract') => {
    const currentDate = new Date(formData[field])
    const newDate = new Date(currentDate)
    
    if (direction === 'add') {
      newDate.setDate(currentDate.getDate() + 1)
    } else {
      newDate.setDate(currentDate.getDate() - 1)
    }
    
    const year = newDate.getFullYear()
    const month = String(newDate.getMonth() + 1).padStart(2, '0')
    const day = String(newDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    setFormData(prev => ({
      ...prev,
      [field]: dateStr
    }))
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
    console.log('Date cliquée:', date)
    const dayLeaves = getLeavesForDate(date)
    console.log('Congés trouvés:', dayLeaves)
    
    if (dayLeaves.length > 0) {
      // Si il y a des congés ce jour, modifier le premier
      console.log('Modification du congé:', dayLeaves[0])
      handleEditLeave(dayLeaves[0])
    } else {
      // Sinon, ajouter un nouveau congé
      console.log('Ajout d\'un nouveau congé pour:', date)
      setSelectedDate(date)
      // Utiliser le format local pour éviter les décalages GMT
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      console.log('Date formatée:', dateStr)
      setFormData({
        type: 'cp',
        startDate: dateStr,
        endDate: dateStr,
        isForecast: false,
        notes: ''
      })
      setShowAddModal(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleSubmit appelé')
    console.log('showEditModal:', showEditModal)
    console.log('selectedLeave:', selectedLeave)
    console.log('formData:', formData)
    
    try {
      if (showEditModal && selectedLeave) {
        // Modifier un congé existant
        console.log('Modification du congé existant')
        const updatedLeave: LeaveEntry = {
          ...selectedLeave,
          ...formData,
          workingDays: calculateWorkingDays(formData.startDate, formData.endDate),
          updatedAt: new Date().toISOString()
        }
        
        console.log('Congé mis à jour:', updatedLeave)
        await leaveStorage.updateLeave(updatedLeave)
        setLeaves(prev => prev.map(leave => leave.id === selectedLeave.id ? updatedLeave : leave))
        toast.success('Congé modifié avec succès')
        setShowEditModal(false)
      } else {
        // Ajouter un nouveau congé
        console.log('Ajout d\'un nouveau congé')
        const newLeave: LeaveEntry = {
          id: Date.now().toString(),
          ...formData,
          workingDays: calculateWorkingDays(formData.startDate, formData.endDate),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        console.log('Nouveau congé créé:', newLeave)
        await leaveStorage.addLeave(newLeave)
        console.log('Congé sauvegardé dans le storage')
        setLeaves(prev => {
          const newLeaves = [...prev, newLeave]
          console.log('Nouvelle liste des congés:', newLeaves)
          return newLeaves
        })
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Calendrier multi-mois */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Calendrier des congés</h2>
              
              {/* Sélecteur d'année */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={goToPreviousYear}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Année précédente"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
                
                <div className="text-xl font-semibold text-gray-900 dark:text-white min-w-[80px] text-center">
                  {currentDate.getFullYear()}
                </div>
                
                <button
                  onClick={goToNextYear}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Année suivante"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>

            {/* Légende */}
            <div className="flex justify-center space-x-4 text-sm mb-6">
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="font-medium text-gray-700 dark:text-gray-300">RTT</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="font-medium text-gray-700 dark:text-gray-300">CP</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                <div className="w-4 h-4 bg-cyan-500 rounded"></div>
                <span className="font-medium text-gray-700 dark:text-gray-300">CET</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Autres</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded"></div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Aujourd'hui</span>
              </div>
            </div>

            {/* Grille du calendrier - 12 mois */}
            <div className="relative bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 overflow-x-auto">
              {/* En-têtes des mois */}
              <div className="flex mb-4">
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const month = new Date(currentDate.getFullYear(), monthIndex, 1)
                  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
                  const monthName = monthNames[month.getMonth()]
                  
                  return (
                    <div key={monthIndex} className="flex-1 text-center min-w-[200px]">
                      <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{monthName} {month.getFullYear()}</div>
                      {/* En-têtes des jours de la semaine */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, dayIndex) => (
                          <div key={dayIndex} className="text-xs text-gray-500 dark:text-gray-400 text-center p-1">
                            {day}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Grille du calendrier - 12 mois */}
              <div className="flex">
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const month = new Date(currentDate.getFullYear(), monthIndex, 1)
                  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
                  const startDate = new Date(firstDay)
                  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1) // Commencer le lundi
                  
                  // Générer toutes les semaines du mois (jusqu'à 6 semaines)
                  const weeks = []
                  const maxWeeks = 6
                  for (let week = 0; week < maxWeeks; week++) {
                    const weekDays = []
                    for (let day = 0; day < 7; day++) {
                      const currentDate = new Date(startDate)
                      currentDate.setDate(startDate.getDate() + (week * 7) + day)
                      
                      // Vérifier si c'est un jour de congé
                      const dayLeaves = leaves.filter(leave => {
                        const leaveStart = new Date(leave.startDate)
                        const leaveEnd = new Date(leave.endDate)
                        return currentDate >= leaveStart && 
                               currentDate <= leaveEnd
                      })
                      
                      const isCurrentMonth = currentDate.getMonth() === month.getMonth()
                      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6
                      const isToday = currentDate.toDateString() === new Date().toDateString()
                      
                      // Déterminer la couleur du carreau
                      let carreauColor = ''
                      if (!isCurrentMonth) {
                        carreauColor = 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
                      } else if (isWeekend) {
                        carreauColor = 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                      } else if (isToday) {
                        carreauColor = 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold'
                      } else if (dayLeaves.length > 0) {
                        // Prioriser RTT > CP > CET > Autres
                        const rttLeaves = dayLeaves.filter(l => l.type === 'rtt')
                        const cpLeaves = dayLeaves.filter(l => l.type === 'cp')
                        const cetLeaves = dayLeaves.filter(l => l.type === 'cet')
                        
                        if (rttLeaves.length > 0) {
                          carreauColor = 'bg-red-500 text-white font-medium'
                        } else if (cpLeaves.length > 0) {
                          carreauColor = 'bg-blue-500 text-white font-medium'
                        } else if (cetLeaves.length > 0) {
                          carreauColor = 'bg-cyan-500 text-white font-medium'
                        } else {
                          carreauColor = 'bg-orange-500 text-white font-medium'
                        }
                      } else {
                        carreauColor = 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-500'
                      }
                      
                      weekDays.push(
                        <div
                          key={day}
                          className={`h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center text-xs rounded cursor-pointer relative ${carreauColor}`}
                          title={`${currentDate.getDate()}/${currentDate.getMonth() + 1}${dayLeaves.length > 0 ? `\nCongés: ${dayLeaves.map(l => getLeaveTypeLabel(l.type)).join(', ')}` : ''}`}
                          onClick={() => handleDateClick(currentDate)}
                        >
                          {currentDate.getDate()}
                        </div>
                      )
                    }
                    weeks.push(
                      <div key={week} className="grid grid-cols-7 gap-1 mb-1">
                        {weekDays}
                      </div>
                    )
                  }
                  
                  return (
                    <div key={monthIndex} className="flex-1 min-w-[200px]">
                      {weeks}
                    </div>
                  )
                })}
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
                  title="Sélectionner le type de congé"
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
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => adjustDate('startDate', 'subtract')}
                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Soustraire un jour"
                  >
                    <Minus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    title="Sélectionner la date de début"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => adjustDate('startDate', 'add')}
                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Ajouter un jour"
                  >
                    <Plus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date de fin
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => adjustDate('endDate', 'subtract')}
                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Soustraire un jour"
                  >
                    <Minus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    title="Sélectionner la date de fin"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => adjustDate('endDate', 'add')}
                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Ajouter un jour"
                  >
                    <Plus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
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
                  title="Sélectionner le type de congé"
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
                  title="Sélectionner le type de congé"
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
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => adjustDate('startDate', 'subtract')}
                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Soustraire un jour"
                  >
                    <Minus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    title="Sélectionner la date de début"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => adjustDate('startDate', 'add')}
                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Ajouter un jour"
                  >
                    <Plus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date de fin
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => adjustDate('endDate', 'subtract')}
                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Soustraire un jour"
                  >
                    <Minus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    title="Sélectionner la date de fin"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => adjustDate('endDate', 'add')}
                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Ajouter un jour"
                  >
                    <Plus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
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
                  title="Sélectionner le type de congé"
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
