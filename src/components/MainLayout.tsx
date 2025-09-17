'use client'

import { ReactNode } from 'react'
import Sidebar from './Sidebar'

interface MainLayoutProps {
  children: ReactNode
  onExport?: () => void
  onImport?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onEmail?: () => void
}

export default function MainLayout({ 
  children, 
  onExport, 
  onImport, 
  onEmail 
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar onExport={onExport} onImport={onImport} onEmail={onEmail} />
      
      {/* Main content */}
      <div className="lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  )
}


