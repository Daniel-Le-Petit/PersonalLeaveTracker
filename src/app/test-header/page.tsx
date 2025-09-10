'use client'

import { useState } from 'react'
import DashboardHeader from '../../components/DashboardHeader'
import toast from 'react-hot-toast'

export default function TestHeaderPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    setIsLoading(true)
    try {
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
      <DashboardHeader 
        onExport={handleExport}
        onImport={handleImport}
        className="sticky top-0 z-40"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Test du composant DashboardHeader
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Cette page permet de tester le nouveau composant DashboardHeader.
          </p>
          
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Instructions de test :
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Desktop : Tous les boutons sont visibles dans le header</li>
                <li>• Mobile : Cliquez sur le bouton menu pour voir le menu hamburger</li>
                <li>• Actions : Testez les boutons Exporter/Importer (simulation)</li>
                <li>• Navigation : Les liens Ajouter, Historique, Reliquats, Paramètres fonctionnent</li>
                <li>• Responsive : Redimensionnez la fenêtre pour tester l'adaptation</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                Fonctionnalités incluses :
              </h3>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>• Titre "Leave Tracker Dashboard" avec icône</li>
                <li>• Actions principales : Ajouter (bleu), Historique (vert), Reliquats (orange)</li>
                <li>• Actions secondaires : Exporter, Importer (gris)</li>
                <li>• Bouton Paramètres à droite</li>
                <li>• Design responsive avec menu hamburger mobile</li>
                <li>• Style moderne avec Tailwind CSS</li>
                <li>• Support du mode sombre</li>
                <li>• Transitions et effets hover</li>
              </ul>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Opération en cours...</span>
              </div>
            )}

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Test des couleurs des boutons :
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-2"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Ajouter</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-600 rounded-lg mx-auto mb-2"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Historique</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg mx-auto mb-2"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Reliquats</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-600 rounded-lg mx-auto mb-2"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Paramètres</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                Navigation disponible :
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <a href="/add" className="text-blue-600 dark:text-blue-400 hover:underline">Page Ajouter</a>
                <a href="/history" className="text-green-600 dark:text-green-400 hover:underline">Page Historique</a>
                <a href="/carryover" className="text-orange-600 dark:text-orange-400 hover:underline">Page Reliquats</a>
                <a href="/settings" className="text-gray-600 dark:text-gray-400 hover:underline">Page Paramètres</a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}