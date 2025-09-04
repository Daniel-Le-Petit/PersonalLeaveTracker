'use client'

import { ArrowLeft, Plus, Save, Trash2, BarChart3, Clock, Calendar, Package, Settings } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CarryoverLeave, LeaveType } from '../../types'
import { generateCarryoverSummary } from '../../utils/leaveUtils'
import { leaveStorage } from '../../utils/storage'

export default function CarryoverPage() {
  const [carryovers, setCarryovers] = useState<CarryoverLeave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    type: 'cp' as LeaveType,
    year: new Date().getFullYear() - 1,
    days: 0,
    description: ''
  })

  useEffect(() => {
    loadCarryovers()
  }, [])

  const loadCarryovers = async () => {
    try {
      const data = await leaveStorage.getCarryoverLeaves()
      setCarryovers(data)
    } catch (error) {
      console.error('Erreur lors du chargement des reliquats:', error)
      toast.error('Erreur lors du chargement des reliquats')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.days <= 0) {
      toast.error('Le nombre de jours doit être supérieur à 0')
      return
    }

    if (formData.year > new Date().getFullYear()) {
      toast.error('L\'année ne peut pas être dans le futur')
      return
    }

    try {
      if (editingId) {
        // Mise à jour
        const existing = carryovers.find(c => c.id === editingId)
        if (!existing) {
          toast.error('Reliquat non trouvé')
          return
        }

        const updated: CarryoverLeave = {
          ...existing,
          type: formData.type,
          year: formData.year,
          days: formData.days,
          description: formData.description.trim(),
          updatedAt: new Date().toISOString()
        }

        await leaveStorage.updateCarryoverLeave(updated)
        toast.success('Reliquat mis à jour avec succès')
      } else {
        // Ajout
        const newCarryover: CarryoverLeave = {
          id: Date.now().toString(),
          type: formData.type,
          year: formData.year,
          days: formData.days,
          description: formData.description.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        await leaveStorage.addCarryoverLeave(newCarryover)
        toast.success('Reliquat ajouté avec succès')
      }

      // Réinitialiser le formulaire
      setFormData({
        type: 'cp',
        year: new Date().getFullYear() - 1,
        days: 0,
        description: ''
      })
      setShowAddForm(false)
      setEditingId(null)
      await loadCarryovers()
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleEdit = (carryover: CarryoverLeave) => {
    setFormData({
      type: carryover.type,
      year: carryover.year,
      days: carryover.days,
      description: carryover.description || ''
    })
    setEditingId(carryover.id)
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce reliquat ?')) {
      return
    }

    try {
      await leaveStorage.deleteCarryoverLeave(id)
      toast.success('Reliquat supprimé avec succès')
      await loadCarryovers()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleCancel = () => {
    setFormData({
      type: 'cp',
      year: new Date().getFullYear() - 1,
      days: 0,
      description: ''
    })
    setShowAddForm(false)
    setEditingId(null)
  }

  const summary = generateCarryoverSummary(carryovers)
  const leaveTypes = [
    { value: 'cp', label: 'CP - Congés payés' },
    { value: 'rtt', label: 'RTT - Réduction du temps de travail' },
    { value: 'cet', label: 'CET - Compte épargne temps' },
    
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
        <div className="max-w-6xl mx-auto header-mobile">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="btn-secondary btn-mobile">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Retour</span>
              </Link>
              <div>
                <h1 className="header-title-mobile text-gray-900 dark:text-white">
                  📦 Reliquats de congés
                </h1>
                <p className="header-subtitle-mobile text-gray-600 dark:text-gray-400">
                  Gérez vos congés reportés des années précédentes
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary btn-mobile"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Ajouter un reliquat</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mobile-safe-area">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Résumé */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📊 Résumé des reliquats
                </h2>
              </div>
              <div className="card-body space-y-4">
                {leaveTypes.map((type) => {
                  const total = summary.totalByType[type.value as LeaveType]
                  return total > 0 ? (
                    <div key={type.value} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {type.label.split(' - ')[0]}
                      </span>
                                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                         type.value === 'cp' ? 'bg-blue-100 text-blue-800' 
                         : type.value === 'rtt' ? 'bg-green-100 text-green-800'
                         : type.value === 'cet' ? 'bg-purple-100 text-purple-800'
                 
                         : 'bg-gray-100 text-gray-800'
                       }`}>
                        {total} jour{total > 1 ? 's' : ''}
                      </span>
                    </div>
                  ) : null
                })}
                
                {Object.values(summary.totalByType).every(total => total === 0) && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    Aucun reliquat enregistré
                  </div>
                )}
              </div>
            </div>

            {/* Formulaire d'ajout/édition */}
            {showAddForm && (
              <div className="card mt-6">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingId ? '✏️ Modifier le reliquat' : '➕ Ajouter un reliquat'}
                  </h3>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type de congé */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Type de congé *
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {leaveTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: type.value as LeaveType })}
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

                    {/* Année */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Année d'origine *
                      </label>
                                             <input
                         type="number"
                         value={formData.year}
                         onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                         className="input"
                         required
                         min="2020"
                         max={new Date().getFullYear()}
                         aria-label="Année d'origine"
                       />
                    </div>

                    {/* Nombre de jours */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nombre de jours *
                      </label>
                                             <input
                         type="number"
                         value={formData.days}
                         onChange={(e) => setFormData({ ...formData, days: parseFloat(e.target.value) })}
                         className="input"
                         required
                         min="0.5"
                         max="365"
                         step="0.5"
                         aria-label="Nombre de jours"
                       />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description (optionnel)
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        className="input"
                        placeholder="Ex: Congés non pris en 2024..."
                      />
                    </div>

                    {/* Boutons */}
                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-secondary"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {editingId ? 'Mettre à jour' : 'Ajouter'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Liste des reliquats */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📋 Détail des reliquats
                </h2>
              </div>
              <div className="card-body">
                {carryovers.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <p>Aucun reliquat enregistré</p>
                    <p className="text-sm mt-2">Cliquez sur "Ajouter un reliquat" pour commencer</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(summary.byYear)
                      .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Trier par année décroissante
                      .map(([year, yearCarryovers]) => (
                        <div key={year} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Année {year}
                          </h3>
                          <div className="space-y-2">
                            {yearCarryovers.map((carryover) => {
                              const typeInfo = leaveTypes.find(t => t.value === carryover.type)
                              return (
                                <div
                                  key={carryover.id}
                                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                                                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                         typeInfo?.value === 'cp' ? 'bg-blue-100 text-blue-800' 
                                         : typeInfo?.value === 'rtt' ? 'bg-green-100 text-green-800'
                                         : typeInfo?.value === 'cet' ? 'bg-purple-100 text-purple-800'

                                         : 'bg-gray-100 text-gray-800'
                                       }`}>
                                        {typeInfo?.label.split(' - ')[0]}
                                      </span>
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {carryover.days} jour{carryover.days > 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    {carryover.description && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {carryover.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleEdit(carryover)}
                                      className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                                      title="Modifier"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(carryover.id)}
                                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
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
          <Link href="/carryover" className="mobile-nav-item-active">
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
