'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }
    
    localStorage.setItem('theme', newTheme);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => handleThemeChange('light')}
          className={`p-2 rounded-md transition-all duration-200 ${
            theme === 'light'
              ? 'bg-white dark:bg-gray-700 shadow-sm text-yellow-600 dark:text-yellow-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          title="Mode clair"
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleThemeChange('dark')}
          className={`p-2 rounded-md transition-all duration-200 ${
            theme === 'dark'
              ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          title="Mode sombre"
        >
          <Moon className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleThemeChange('system')}
          className={`p-2 rounded-md transition-all duration-200 ${
            theme === 'system'
              ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-600 dark:text-gray-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          title="Système"
        >
          <Monitor className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ThemeToggle;

