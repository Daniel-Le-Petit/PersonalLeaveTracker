'use client'

import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { LeaveEntry, LeaveType } from '../../../types'
import { calculateWorkingDays, formatDate, frenchDateToISO, isoDateToFrench, isValidFrenchDate } from '../../../utils/leaveUtils'
import { leaveStorage } from '../../../utils/storage'

export default function EditLeavePage() {
  const params = useParams()
  const router = useRouter()
  const leaveId = params.id as string

  const [formData, setFormData] = useState({
    type: 'cp' as LeaveType,
    startDate: '',
    endDate: '',
    notes: '',
    isHalfDay: false,
    halfDayType: 'morning' as 'morning' | 'afternoon'
  })
  const [workingDays, setWorkingDays] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [originalLeave, setOriginalLeave] = useState<LeaveEntry | null>(null)

  // Charger les données du congé à éditer
  useEffect(() => {
    const loadLeave = async () => {
      try {
        const leave = await leaveStorage.getLeave(leaveId)
        if (!leave) {
          toast.error('Congé non trouvé')
          router.push('/history')
          return
        }

        setOriginalLeave(leave)
        setFormData({
          type: leave.type,
          startDate: isoDateToFrench(leave.startDate),
          endDate: isoDateToFrench(leave.endDate),
          notes: leave.notes || '',
          isHalfDay: leave.isHalfDay || false,
          halfDayType: leave.halfDayType || 'morning'
        })
        setWorkingDays(leave.workingDays)
      } catch (error) {
        console.error('Erreur lors du chargement du congé:', error)
        toast.error('Erreur lors du chargement du congé')
        router.push('/history')
      } finally {
        setIsLoading(false)
      }
    }

    if (leaveId) {
      loadLeave()
    }
  }, [leaveId, router])

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
            [], // holidays - empty array for now
            formData.isHalfDay, 
            formData.halfDayType
          )
          setWorkingDays(days)
        } else {
          setWorkingDays(0)
        }
      } else {
        setWorkingDays(0)
      }
    }
  }, [formData.startDate, formData.endDate, formData.isHalfDay, formData.halfDayType])

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

    if (workingDays <= 0) {
      toast.error('La période sélectionnée doit contenir au moins un jour ouvrable')
      return
    }

    setIsSubmitting(true)
    try {
      const updatedLeave: LeaveEntry = {
        ...originalLeave!,
        type: formData.type,
        startDate: startISO,
        endDate: endISO,
        workingDays,
        notes: formData.notes.trim(),
        isHalfDay: formData.isHalfDay,
        halfDayType: formData.halfDayType,
        updatedAt: new Date().toISOString()
      }

      await leaveStorage.updateLeave(updatedLeave)

      toast.success('Congé mis à jour avec succès')
      router.push('/history')
    } catch (error) {
      console.error('Erreur lors de la mise à jour du congé:', error)
      toast.error('Erreur lors de la mise à jour du congé')
    } finally {
      setIsSubmitting(false)
    }
  }

  const leaveTypes = [
    { value: 'cp', label: 'CP - Congés payés', color: 'bg-blue-100 text-blue-800' },
    { value: 'rtt', label: 'RTT - Réduction du temps de travail', color: 'bg-green-100 text-green-800' },
    { value: 'sick', label: 'Maladie', color: 'bg-orange-100 text-orange-800' },
    { value: 'unpaid', label: 'Sans solde', color: 'bg-red-100 text-red-800' },
    { value: 'training', label: 'Formation', color: 'bg-purple-100 text-purple-800' },
    { value: 'other', label: 'Autre', color: 'bg-gray-100 text-gray-800' }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/history" className="btn-secondary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  ✏️ Modifier un congé
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Modifiez les informations de ce congé
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as LeaveType })}
                      className="select"
                      required
                    >
                      {leaveTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date de début *
                      </label>
                      <input
                        type="text"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="input"
                        required
                                                   placeholder="DD/MM/YYYY (ex: 02/01/2024)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date de fin *
                      </label>
                      <input
                        type="text"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="input"
                        required
                                                   placeholder="DD/MM/YYYY (ex: 03/01/2024)"
                      />
                    </div>
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

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes (optionnel)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="input"
                      placeholder="Ajoutez des notes ou commentaires sur ce congé..."
                    />
                  </div>

                  {/* Boutons */}
                  <div className="flex justify-between">
                    <Link href="/history" className="btn-secondary">
                      Annuler
                    </Link>
                    <button
                      type="submit"
                      disabled={isSubmitting || workingDays <= 0}
                      className="btn-primary"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${leaveTypes.find(t => t.value === formData.type)?.color}`}>
                        {leaveTypes.find(t => t.value === formData.type)?.label.split(' - ')[0]}
                      </span>
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

            {/* Informations originales */}
            {originalLeave && (
              <div className="card mt-6">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    📋 Informations originales
                  </h3>
                </div>
                <div className="card-body space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Créé le:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {formatDate(originalLeave.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Dernière modification:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {formatDate(originalLeave.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
