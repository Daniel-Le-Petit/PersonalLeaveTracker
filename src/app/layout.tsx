'use client'

import { Inter } from 'next/font/google'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { AppSettings } from '../types'
import { leaveStorage } from '../utils/storage'
import DeploymentNotice from '../components/DeploymentNotice'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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
          await leaveStorage.saveSettings(defaultSettings)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error)
        // Paramètres de fallback
        setSettings({
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
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Appliquer le thème sombre si activé
  useEffect(() => {
    if (settings?.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings?.darkMode])

  if (isLoading) {
    return (
      <html lang="fr">
        <body className={`${inter.className} bg-gray-50 dark:bg-gray-900`}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="fr" className={settings?.darkMode ? 'dark' : ''}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content={settings?.darkMode ? '#1f2937' : '#ffffff'} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content={settings?.darkMode ? 'black-translucent' : 'default'} />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200`}>
        <div className="min-h-screen">
          {children}
        </div>
        <DeploymentNotice />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: settings?.darkMode ? '#374151' : '#ffffff',
              color: settings?.darkMode ? '#f9fafb' : '#111827',
              border: `1px solid ${settings?.darkMode ? '#4b5563' : '#e5e7eb'}`,
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
