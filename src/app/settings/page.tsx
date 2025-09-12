'use client'

import { ArrowLeft, Calendar, Download, Moon, Save, Sun, Upload, Wrench } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AppSettings, LeaveEntry, PublicHoliday } from '../../types'
import { leaveStorage } from '../../utils/storage'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [leaves, setLeaves] = useState<LeaveEntry[]>([])
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])

  useEffect(() => {
    loadSettings()
    loadData()
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

  const loadData = async () => {
    try {
      const [leavesData, holidaysData] = await Promise.all([
        leaveStorage.getLeaves(),
        leaveStorage.getHolidays()
      ])
      setLeaves(leavesData || [])
      setHolidays(holidaysData || [])
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    }
  }

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
              {settings.country === 'FR' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Jours fériés fixes */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        📅 Jours fériés fixes
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm font-medium">1er janvier</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Jour de l'An</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm font-medium">1er mai</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Fête du Travail</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm font-medium">8 mai</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Victoire 1945</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm font-medium">14 juillet</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Fête Nationale</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm font-medium">15 août</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Assomption</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm font-medium">1er novembre</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Toussaint</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm font-medium">11 novembre</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Armistice</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm font-medium">25 décembre</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Noël</span>
                        </div>
                      </div>
                    </div>

                    {/* Jours fériés mobiles */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        🐣 Jours fériés mobiles 2025 (2 jours)
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                          <span className="text-sm font-medium">21 avril 2025</span>
                          <span className="text-sm text-green-700 dark:text-green-300">Lundi de Pâques</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                          <span className="text-sm font-medium">29 mai 2025</span>
                          <span className="text-sm text-green-700 dark:text-green-300">Ascension</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      💡 <strong>Note :</strong> Ces jours fériés sont automatiquement pris en compte dans le calcul des jours ouvrés pour vos congés.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Les jours fériés pour {settings.country} sont automatiquement configurés
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Cette fonctionnalité sera bientôt disponible pour les autres pays
                  </p>
                </div>
              )}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={correctWorkingDays}
                  className="flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  title="Recalculer les jours ouvrés de tous les congés (exclure WE et jours fériés)"
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Corriger les jours ouvrés
                </button>
                <button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer tous les congés ?')) {
                      leaveStorage.clearLeaves()
                      toast.success('Congés supprimés')
                      loadData()
                    }
                  }}
                  className="btn-warning w-full"
                >
                  Supprimer tous les congés
                </button>
                <button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.')) {
                      leaveStorage.clearAllData()
                      toast.success('Données réinitialisées')
                      loadSettings()
                      loadData()
                    }
                  }}
                  className="btn-danger w-full"
                >
                  Réinitialiser toutes les données
                </button>
              </div>
              <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                  🔧 Correction des jours ouvrés
                </h4>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Cette fonction recalcule automatiquement les jours ouvrés de tous vos congés en excluant les week-ends et les jours fériés. 
                  Utile après un import de données ou une modification des jours fériés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
