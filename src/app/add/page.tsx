'use client'

import { ArrowLeft, Save, BarChart3, Plus, Clock, Calendar, Package, Settings } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { LeaveEntry, LeaveType } from '../../types'
import { calculateWorkingDays, formatDate, frenchDateToISO, isValidFrenchDate, canTakeRTTForMonth, calculateAvailableRTTForPeriod, getHolidaysForYear } from '../../utils/leaveUtils'
import { leaveStorage } from '../../utils/storage'
import DateInputWithButtons from '../../components/DateInputWithButtons'

export default function AddLeavePage() {
  const [formData, setFormData] = useState({
    type: 'cp',
    startDate: '',
    endDate: '',
    notes: '',
    isHalfDay: false,
    halfDayType: 'morning' as 'morning' | 'afternoon',
    isForecast: false
  })
  const [workingDays, setWorkingDays] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rttValidation, setRttValidation] = useState<{ totalAvailable: number; details: Array<{ month: number; year: number; available: number; canTake: boolean }> } | null>(null)

  // Calculer les jours ouvrables quand les dates changent
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const startISO = frenchDateToISO(formData.startDate)
      const endISO = frenchDateToISO(formData.endDate)
      
      if (startISO && endISO) {
        const start = new Date(startISO)
        const end = new Date(endISO)
        
        if (start <= end) {
          const days = calculateWorkingDays(
            startISO, 
            endISO, 
            getHolidaysForYear(new Date(startISO).getFullYear()), // holidays for the year
            formData.isHalfDay, 
            formData.halfDayType
          )
          setWorkingDays(days)
          
          // Calculer la validation RTT si c'est le type sélectionné
          if (formData.type === 'rtt') {
            const validation = calculateAvailableRTTForPeriod(start, end)
            setRttValidation(validation)
          } else {
            setRttValidation(null)
          }
        } else {
          setWorkingDays(0)
          setRttValidation(null)
        }
      } else {
        setWorkingDays(0)
        setRttValidation(null)
      }
    }
  }, [formData.startDate, formData.endDate, formData.isHalfDay, formData.halfDayType, formData.type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.startDate || !formData.endDate) {
      toast.error('Veuillez saisir les dates de début et de fin')
      return
    }

    if (!isValidFrenchDate(formData.startDate)) {
      toast.error('Format de date de début invalide. Utilisez DD/MM/YYYY (ex: 02/01/2024)')
      return
    }

    if (!isValidFrenchDate(formData.endDate)) {
      toast.error('Format de date de fin invalide. Utilisez DD/MM/YYYY (ex: 03/01/2024)')
      return
    }

    const startISO = frenchDateToISO(formData.startDate)
    const endISO = frenchDateToISO(formData.endDate)

    if (new Date(startISO) > new Date(endISO)) {
      toast.error('La date de début ne peut pas être postérieure à la date de fin')
      return
    }

    if (workingDays < 0) {
      toast.error('Le nombre de jours ouvrables ne peut pas être négatif')
      return
    }
    
    // Pour les RTT, on peut autoriser 0 jour ouvré (cas particuliers)
    if (formData.type !== 'rtt' && workingDays === 0) {
      toast.error('La période sélectionnée doit contenir au moins un jour ouvrable')
      return
    }

    // Validation spéciale pour les RTT
    if (formData.type === 'rtt') {
      const startDate = new Date(startISO)
      const endDate = new Date(endISO)
      
      // Vérifier si on peut prendre des RTT pour cette période
      const rttValidation = calculateAvailableRTTForPeriod(startDate, endDate)
      
      if (rttValidation.totalAvailable < workingDays) {
        const unavailableMonths = rttValidation.details
          .filter(d => !d.canTake)
          .map(d => `${d.month}/${d.year}`)
          .join(', ')
        
        toast.error(`Vous ne pouvez pas prendre ${workingDays} jours de RTT pour cette période. RTT non disponibles pour : ${unavailableMonths}`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const newLeave: LeaveEntry = {
        id: Date.now().toString(),
        type: formData.type as LeaveType,
        startDate: startISO,
        endDate: endISO,
        workingDays,
        notes: formData.notes.trim(),
        isHalfDay: formData.isHalfDay,
        halfDayType: formData.halfDayType,
        isForecast: formData.isForecast,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const existingLeaves = await leaveStorage.getLeaves()
      await leaveStorage.saveLeaves([...existingLeaves, newLeave])

      toast.success('Congé ajouté avec succès')
      
      // Réinitialiser le formulaire
      setFormData({
        type: 'cp',
        startDate: '',
        endDate: '',
        notes: '',
        isHalfDay: false,
        halfDayType: 'morning',
        isForecast: false
      })
      setWorkingDays(0)
    } catch (error) {
      console.error('Erreur lors de l\'ajout du congé:', error)
      toast.error('Erreur lors de l\'ajout du congé')
    } finally {
      setIsSubmitting(false)
    }
  }

  const leaveTypes = [
    { value: 'cp', label: 'CP - Congés payés' },
    { value: 'rtt', label: 'RTT - Réduction du temps de travail' },
    { value: 'cet', label: 'CET - Compte épargne temps' },
    
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto header-mobile">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="btn-secondary btn-mobile">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Retour</span>
              </Link>
              <div>
                <h1 className="header-title-mobile text-gray-900 dark:text-white">
                  ➕ Ajouter un congé
                </h1>
                <p className="header-subtitle-mobile text-gray-600 dark:text-gray-400">
                  Créez une nouvelle entrée de congé
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mobile-safe-area">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📝 Informations du congé
                </h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Type de congé */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type de congé *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 touch-button">
                      {leaveTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: type.value })}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            formData.type === type.value
                              ? 'border-2 shadow-lg transform scale-105'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${
                            type.value === 'cp' 
                              ? 'bg-blue-50 border-blue-300 hover:bg-blue-100' + (formData.type === type.value ? ' bg-blue-100 border-blue-500' : '')
                              : type.value === 'rtt'
                              ? 'bg-green-50 border-green-300 hover:bg-green-100' + (formData.type === type.value ? ' bg-green-100 border-green-500' : '')
                                                             : type.value === 'cet'
                               ? 'bg-purple-50 border-purple-300 hover:bg-purple-100' + (formData.type === type.value ? ' bg-purple-100 border-purple-500' : '')

                              : 'bg-gray-50 border-gray-300 hover:bg-gray-100' + (formData.type === type.value ? ' bg-gray-100 border-gray-500' : '')
                          }`}
                        >
                          <div className="text-center">
                            <div className={`text-2xl mb-2 ${
                              type.value === 'cp' ? 'text-blue-600' 
                              : type.value === 'rtt' ? 'text-green-600'
                                                             : type.value === 'cet' ? 'text-purple-600'

                              : 'text-gray-600'
                            }`}>
                              {type.value === 'cp' ? '🏖️' 
                               : type.value === 'rtt' ? '📅'
                                                               : type.value === 'cet' ? '🏥'

                               : '📋'}
                            </div>
                            <div className={`font-medium text-sm ${
                              type.value === 'cp' ? 'text-blue-700' 
                              : type.value === 'rtt' ? 'text-green-700'
                                                             : type.value === 'cet' ? 'text-purple-700'
 
                              : 'text-gray-700'
                            }`}>
                              {type.label}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 form-mobile">
                    <DateInputWithButtons
                      label="Date de début"
                      value={formData.startDate}
                      onChange={(value) => setFormData({ ...formData, startDate: value })}
                      placeholder="DD/MM/YYYY (ex: 02/01/2024)"
                      required
                    />
                    <DateInputWithButtons
                      label="Date de fin"
                      value={formData.endDate}
                      onChange={(value) => setFormData({ ...formData, endDate: value })}
                      placeholder="DD/MM/YYYY (ex: 03/01/2024)"
                      required
                    />
                  </div>

                  {/* Demi-journée */}
                  <div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isHalfDay}
                          onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked })}
                          className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Demi-journée
                        </span>
                      </label>
                    </div>
                    
                    {formData.isHalfDay && (
                      <div className="mt-4 ml-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Type de demi-journée
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="morning"
                              checked={formData.halfDayType === 'morning'}
                              onChange={(e) => setFormData({ ...formData, halfDayType: e.target.value as 'morning' | 'afternoon' })}
                              className="text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              Matin
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="afternoon"
                              checked={formData.halfDayType === 'afternoon'}
                              onChange={(e) => setFormData({ ...formData, halfDayType: e.target.value as 'morning' | 'afternoon' })}
                              className="text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              Après-midi
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mode prévision/réel */}
                  <div className="form-group">
                    <label htmlFor="isForecast" className="form-label">
                      Mode
                    </label>
                    <select
                      id="isForecast"
                      value={formData.isForecast ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, isForecast: e.target.value === 'true' })}
                      className="form-select"
                      title="Sélectionner le mode du congé"
                    >
                      <option value="false">Réel (congé effectivement pris)</option>
                      <option value="true">Prévision (congé planifié)</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes (optionnel)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="input input-mobile"
                      placeholder="Ajoutez des notes ou commentaires sur ce congé..."
                    />
                  </div>

                  {/* Bouton de soumission */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || (formData.type !== 'rtt' && workingDays <= 0)}
                      className="btn-primary btn-mobile-large touch-button"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSubmitting ? 'Ajout en cours...' : 'Ajouter le congé'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Résumé */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📊 Résumé
                </h2>
              </div>
              <div className="card-body space-y-4">
                {/* Type de congé */}
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Type de congé
                  </span>
                  <div className="mt-1">
                    {leaveTypes.find(t => t.value === formData.type) && (
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${
                          formData.type === 'cp' ? 'text-blue-600' 
                          : formData.type === 'rtt' ? 'text-green-600'
                                                     : formData.type === 'cet' ? 'text-purple-600'

                          : 'text-gray-600'
                        }`}>
                          {formData.type === 'cp' ? '🏖️' 
                           : formData.type === 'rtt' ? '📅'
                           : formData.type === 'cet' ? '🏥'

                           : '📋'}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          formData.type === 'cp' ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : formData.type === 'rtt' ? 'bg-green-100 text-green-800 border border-green-200'
                                                     : formData.type === 'cet' ? 'bg-purple-100 text-purple-800 border border-purple-200'

                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {leaveTypes.find(t => t.value === formData.type)?.label.split(' - ')[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Période */}
                {formData.startDate && formData.endDate && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Période
                    </span>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {formatDate(frenchDateToISO(formData.startDate))} - {formatDate(frenchDateToISO(formData.endDate))}
                    </div>
                  </div>
                )}

                {/* Jours ouvrables */}
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Jours ouvrables
                  </span>
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {workingDays}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      jour{workingDays > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Demi-journée */}
                {formData.isHalfDay && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Demi-journée
                    </span>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {formData.halfDayType === 'morning' ? 'Matin' : 'Après-midi'}
                    </div>
                  </div>
                )}

                {/* Validation */}
                {formData.startDate && formData.endDate && (
                  <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    {workingDays > 0 ? (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        ✅ Période valide
                      </div>
                    ) : (
                      <div className="text-sm text-red-600 dark:text-red-400">
                        ❌ Période invalide
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Conseils */}
            <div className="card mt-6">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  💡 Conseils
                </h3>
              </div>
              <div className="card-body">
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <li>• Les weekends et jours fériés ne sont pas comptabilisés</li>
                  <li>• Une demi-journée compte pour 0.5 jour ouvrable</li>
                  <li>• Vous pouvez modifier vos congés depuis l'historique</li>
                  <li>• Les notes sont optionnelles mais utiles</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Navigation Mobile */}
      <nav className="mobile-nav md:hidden">
        <div className="mobile-nav-container">
          <Link href="/" className="mobile-nav-item-inactive">
            <BarChart3 className="mobile-nav-icon" />
            <span className="mobile-nav-label">Dashboard</span>
          </Link>
          <Link href="/add" className="mobile-nav-item-active">
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
