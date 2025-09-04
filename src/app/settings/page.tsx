'use client'

import { ArrowLeft, Calendar, Download, Moon, Save, Sun, Upload } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AppSettings } from '../../types'
import { leaveStorage } from '../../utils/storage'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const savedSettings = await leaveStorage.getSettings()
      if (savedSettings) {
        setSettings(savedSettings)
      } else {
        // Paramètres par défaut
        const defaultSettings: AppSettings = {
          firstDayOfWeek: 'monday',
          country: 'FR',
          publicHolidays: [],
          quotas: [
            { type: 'cp', yearlyQuota: 25 },
                          { type: 'rtt', yearlyQuota: 10 },
              { type: 'sick', yearlyQuota: 0 }
          ],
          darkMode: false,
          notifications: true,
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
      toast.error('Erreur lors du chargement des paramètres')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    try {
      await leaveStorage.saveSettings(settings)
      toast.success('Paramètres sauvegardés avec succès')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
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
      toast.success('Données importées avec succès')
      // Recharger les paramètres
      const savedSettings = await leaveStorage.getSettings()
      if (savedSettings) {
        setSettings(savedSettings)
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      if (error instanceof Error && error.message === 'Import annulé') {
        toast('Import annulé')
      } else {
        toast.error('Erreur lors de l\'import')
      }
    }
  }

  const updateQuota = (type: string, value: number) => {
    if (!settings) return

    setSettings({
      ...settings,
      quotas: settings.quotas.map(quota =>
        quota.type === type ? { ...quota, yearlyQuota: value } : quota
      )
    })
  }

  const toggleDarkMode = () => {
    if (!settings) return

    const newDarkMode = !settings.darkMode
    setSettings({ ...settings, darkMode: newDarkMode })
    
    // Appliquer immédiatement le thème
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleNotifications = () => {
    if (!settings) return
    setSettings({ ...settings, notifications: !settings.notifications })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Erreur lors du chargement des paramètres</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/" className="btn-secondary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  ⚙️ Paramètres
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Configurez vos préférences et quotas de congés
                </p>
              </div>
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
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Quotas de congés */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                📊 Quotas de congés annuels
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Définissez vos quotas pour chaque type de congé
              </p>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settings.quotas.map((quota) => (
                  <div key={quota.type} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {quota.type.toUpperCase()} (Congés payés)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={quota.yearlyQuota}
                        onChange={(e) => updateQuota(quota.type, parseInt(e.target.value) || 0)}
                        className="input w-20"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">jours</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Préférences générales */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🔧 Préférences générales
              </h2>
            </div>
            <div className="card-body space-y-6">
              {/* Premier jour de la semaine */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Premier jour de la semaine
                </label>
                <select
                  value={settings.firstDayOfWeek}
                  onChange={(e) => setSettings({ ...settings, firstDayOfWeek: e.target.value as 'monday' | 'sunday' })}
                  className="select"
                >
                  <option value="monday">Lundi</option>
                  <option value="sunday">Dimanche</option>
                </select>
              </div>

              {/* Pays */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pays
                </label>
                <select
                  value={settings.country}
                  onChange={(e) => setSettings({ ...settings, country: e.target.value })}
                  className="select"
                >
                  <option value="FR">France</option>
                  <option value="BE">Belgique</option>
                  <option value="CH">Suisse</option>
                  <option value="CA">Canada</option>
                  <option value="US">États-Unis</option>
                </select>
              </div>

              {/* Mode sombre */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mode sombre
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Activer le thème sombre pour l'interface
                  </p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    settings.darkMode ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                  {settings.darkMode ? (
                    <Moon className="absolute right-1 h-3 w-3 text-white" />
                  ) : (
                    <Sun className="absolute left-1 h-3 w-3 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Notifications
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Recevoir des notifications pour les rappels
                  </p>
                </div>
                <button
                  onClick={toggleNotifications}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    settings.notifications ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Jours fériés */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🎉 Jours fériés
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Les jours fériés sont automatiquement détectés selon votre pays
              </p>
            </div>
            <div className="card-body">
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Les jours fériés pour {settings.country} sont automatiquement configurés
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Cette fonctionnalité sera bientôt disponible
                </p>
              </div>
            </div>
          </div>

          {/* Actions de maintenance */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🔧 Maintenance
              </h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.')) {
                      leaveStorage.clearAllData()
                      toast.success('Données réinitialisées')
                      loadSettings()
                    }
                  }}
                  className="btn-danger w-full"
                >
                  Réinitialiser toutes les données
                </button>
                <button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer tous les congés ?')) {
                      leaveStorage.clearLeaves()
                      toast.success('Congés supprimés')
                    }
                  }}
                  className="btn-warning w-full"
                >
                  Supprimer tous les congés
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
