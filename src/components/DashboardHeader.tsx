'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Clock, 
  Package, 
  Download, 
  Upload, 
  Settings, 
  Menu, 
  X,
  Mail
} from 'lucide-react'

interface DashboardHeaderProps {
  onExport?: () => void
  onImport?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onEmail?: () => void
  className?: string
}

export default function DashboardHeader({ 
  onExport, 
  onImport, 
  onEmail,
  className = '' 
}: DashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      {/* Header Principal */}
      <header className={`bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Titre avec icône */}
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    Leave Tracker Dashboard
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Gestion et suivi de vos congés
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Desktop */}
            <div className="hidden lg:flex items-center space-x-3">
              {/* Actions principales */}
              <div className="flex items-center space-x-2">
                <Link
                  href="/history"
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  title="Voir l'historique"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Historique
                </Link>
                <Link
                  href="/carryover"
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  title="Gérer les reliquats"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Reliquats
                </Link>
              </div>

              {/* Séparateur visuel */}
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2"></div>

              {/* Actions secondaires - Export/Import/Email unifiés */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={onExport}
                  className="flex items-center px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-all duration-200 border border-green-200 dark:border-green-700"
                  title="Exporter toutes les données (congés + feuilles de paie)"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Exporter</span>
                </button>
                <button
                  onClick={() => {
                    const fileInput = document.getElementById('import-file') as HTMLInputElement
                    fileInput?.click()
                  }}
                  className="flex items-center px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-all duration-200 border border-blue-200 dark:border-blue-700"
                  title="Importer toutes les données (congés + feuilles de paie)"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Importer</span>
                </button>
                <button
                  onClick={onEmail}
                  className="flex items-center px-3 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-all duration-200 border border-purple-200 dark:border-purple-700"
                  title="Envoyer le rapport de congés par email"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Email</span>
                </button>
              </div>

              {/* Bouton Paramètres */}
              <Link
                href="/settings"
                className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
                title="Paramètres"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>

            {/* Menu Mobile - Bouton Hamburger */}
            <div className="lg:hidden flex items-center space-x-2">
              <button
                onClick={toggleMobileMenu}
                className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
                title="Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menu Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={closeMobileMenu}>
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header du menu mobile */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Actions rapides
              </h3>
              <button
                onClick={closeMobileMenu}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions principales */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Actions principales
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <Link 
                  href="/history" 
                  className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  onClick={closeMobileMenu}
                >
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Historique</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Voir tous les congés</div>
                  </div>
                </Link>
                
                <Link 
                  href="/carryover" 
                  className="flex items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                  onClick={closeMobileMenu}
                >
                  <Package className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Reliquats</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Gérer les congés reportés</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Actions secondaires - Export/Import/Email unifiés */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Export/Import/Email
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    onExport?.()
                    closeMobileMenu()
                  }}
                  className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <Download className="w-5 h-5 text-green-600 dark:text-green-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Exporter</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Toutes les données</span>
                </button>
                
                <button
                  onClick={() => {
                    const fileInput = document.getElementById('import-file') as HTMLInputElement
                    fileInput?.click()
                    closeMobileMenu()
                  }}
                  className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Importer</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Toutes les données</span>
                </button>

                <button
                  onClick={() => {
                    onEmail?.()
                    closeMobileMenu()
                  }}
                  className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Email</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Rapport congés</span>
                </button>
              </div>
            </div>

            {/* Bouton Paramètres */}
            <Link 
              href="/settings" 
              className="flex items-center justify-center w-full p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              onClick={closeMobileMenu}
            >
              <Settings className="w-5 h-5 mr-2" />
              <span className="font-medium">Paramètres</span>
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

