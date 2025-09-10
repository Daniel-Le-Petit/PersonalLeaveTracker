'use client'

import { useState } from 'react'
import DashboardHeader from './DashboardHeader'
import toast from 'react-hot-toast'

/**
 * Exemple d'utilisation du composant DashboardHeader
 * Ce fichier montre comment intégrer le composant dans votre application
 */
export default function DashboardHeaderExample() {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    setIsLoading(true)
    try {
      // Simuler une opération d'export
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Données exportées avec succès !')
    } catch (error) {
      toast.error('Erreur lors de l\'export')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    setIsLoading(true)
    try {
      // Simuler une opération d'import
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Données importées avec succès !')
    } catch (error) {
      toast.error('Erreur lors de l\'import')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Utilisation du composant DashboardHeader */}
      <DashboardHeader 
        onExport={handleExport}
        onImport={handleImport}
        className="sticky top-0 z-40"
      />

      {/* Contenu de la page */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Exemple d'utilisation
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ce composant DashboardHeader est maintenant prêt à être utilisé dans votre application.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Fonctionnalités incluses :
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Titre avec icône 📊</li>
                <li>• Actions principales : Ajouter, Historique, Reliquats</li>
                <li>• Actions secondaires : Exporter, Importer</li>
                <li>• Bouton Paramètres (⚙️)</li>
                <li>• Design responsive avec menu hamburger mobile</li>
                <li>• Style moderne avec Tailwind CSS</li>
                <li>• Support du mode sombre</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                Comment l'utiliser :
              </h3>
              <div className="text-sm text-green-700 dark:text-green-300 space-y-2">
                <p>1. Importez le composant : <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">import DashboardHeader from './components/DashboardHeader'</code></p>
                <p>2. Utilisez-le dans votre layout ou page :</p>
                <pre className="bg-gray-200 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto">
{`<DashboardHeader 
  onExport={handleExport}
  onImport={handleImport}
  className="sticky top-0 z-40"
/>`}
                </pre>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
