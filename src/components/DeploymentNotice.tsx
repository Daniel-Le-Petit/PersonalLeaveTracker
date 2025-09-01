'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Download, Upload, Info } from 'lucide-react'
import { leaveStorage } from '../utils/storage'

export default function DeploymentNotice() {
  const [showNotice, setShowNotice] = useState(false)
  const [hasData, setHasData] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  useEffect(() => {
    checkDataStatus()
  }, [])

  const checkDataStatus = async () => {
    try {
      const leaves = await leaveStorage.getLeaves()
      const settings = await leaveStorage.getSettings()
      const hasExistingData = leaves.length > 0 || settings !== null
      
      setHasData(hasExistingData)
      
      // Check for backup
      const backupDate = localStorage.getItem('leave-tracker-backup-date')
      setLastBackup(backupDate)
      
      // Show notice if no data or no recent backup
      if (!hasExistingData || !backupDate) {
        setShowNotice(true)
      }
    } catch (error) {
      console.error('Error checking data status:', error)
      setShowNotice(true)
    }
  }

  const handleExport = async () => {
    try {
      const data = await leaveStorage.exportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leave-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // Update backup date
      localStorage.setItem('leave-tracker-backup-date', new Date().toISOString())
      setLastBackup(new Date().toISOString())
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as string
        await leaveStorage.importData(data)
        setHasData(true)
        setShowNotice(false)
        window.location.reload() // Refresh to show imported data
      } catch (error) {
        console.error('Import failed:', error)
      }
    }
    reader.readAsText(file)
  }

  if (!showNotice) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-lg p-4">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            📱 Application Déployée
          </h3>
          
          <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-2">
            <p>
              <strong>Important :</strong> Cette application utilise le stockage local de votre navigateur.
            </p>
            
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded">
              <p className="font-medium mb-1">⚠️ Vos données sont stockées localement :</p>
              <ul className="text-xs space-y-1">
                <li>• Pas de synchronisation entre appareils</li>
                <li>• Perte possible si vous effacez les données du navigateur</li>
                <li>• Exportez régulièrement vos données</li>
              </ul>
            </div>

            {!hasData && (
              <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded">
                <p className="font-medium mb-1">📥 Première utilisation :</p>
                <p className="text-xs">Importez vos données existantes si vous en avez.</p>
              </div>
            )}

            {lastBackup && (
              <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded">
                <p className="font-medium mb-1">✅ Dernière sauvegarde :</p>
                <p className="text-xs">{new Date(lastBackup).toLocaleDateString('fr-FR')}</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleExport}
              className="flex items-center px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
            >
              <Download className="w-3 h-3 mr-1" />
              Exporter
            </button>
            
            <label className="flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors cursor-pointer">
              <Upload className="w-3 h-3 mr-1" />
              Importer
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            
            <button
              onClick={() => setShowNotice(false)}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
