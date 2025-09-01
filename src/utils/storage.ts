import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { AppSettings, CarryoverLeave, LeaveBalance, LeaveEntry, PublicHoliday } from '../types';

// Schéma de la base de données IndexedDB
interface LeaveTrackerDB extends DBSchema {
  leaves: {
    key: string;
    value: LeaveEntry;
    indexes: { 'by-date': string; 'by-type': string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  balances: {
    key: string;
    value: LeaveBalance[];
  };
  holidays: {
    key: string;
    value: PublicHoliday[];
  };
  carryover: {
    key: string;
    value: CarryoverLeave;
    indexes: { 'by-type': string; 'by-year': number };
  };
}

class LeaveStorage {
  private db: IDBPDatabase<LeaveTrackerDB> | null = null;
  private readonly DB_NAME = 'LeaveTrackerDB';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<LeaveTrackerDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Store pour les congés
        const leaveStore = db.createObjectStore('leaves', { keyPath: 'id' });
        leaveStore.createIndex('by-date', 'startDate');
        leaveStore.createIndex('by-type', 'type');

        // Store pour les paramètres
        db.createObjectStore('settings', { keyPath: 'id' });

        // Store pour les soldes
        db.createObjectStore('balances', { keyPath: 'id' });

        // Store pour les jours fériés
        db.createObjectStore('holidays', { keyPath: 'id' });

        // Store pour les congés reportés
        const carryoverStore = db.createObjectStore('carryover', { keyPath: 'id' });
        carryoverStore.createIndex('by-type', 'type');
        carryoverStore.createIndex('by-year', 'year');
      },
    });
  }

  // Gestion des congés
  async getLeaves(): Promise<LeaveEntry[]> {
    await this.init();
    return this.db!.getAll('leaves');
  }

  async getLeave(id: string): Promise<LeaveEntry | undefined> {
    await this.init();
    return this.db!.get('leaves', id);
  }

  async addLeave(leave: LeaveEntry): Promise<void> {
    await this.init();
    await this.db!.add('leaves', leave);
  }

  async updateLeave(leave: LeaveEntry): Promise<void> {
    await this.init();
    await this.db!.put('leaves', leave);
  }

  async deleteLeave(id: string): Promise<void> {
    await this.init();
    await this.db!.delete('leaves', id);
  }

  async saveLeaves(leaves: LeaveEntry[]): Promise<void> {
    await this.init();
    // Vider le store et ajouter les nouveaux congés
    await this.db!.clear('leaves');
    for (const leave of leaves) {
      await this.db!.add('leaves', leave);
    }
  }

  async clearLeaves(): Promise<void> {
    await this.init();
    await this.db!.clear('leaves');
  }

  async getLeavesByYear(year: number): Promise<LeaveEntry[]> {
    await this.init();
    const allLeaves = await this.getLeaves();
    return allLeaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === year
    );
  }

  async getLeavesByType(type: string): Promise<LeaveEntry[]> {
    await this.init();
    return this.db!.getAllFromIndex('leaves', 'by-type', type);
  }

  // Gestion des paramètres
  async getSettings(): Promise<AppSettings | null> {
    await this.init();
    return this.db!.get('settings', 'app-settings');
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.init();
    await this.db!.put('settings', { id: 'app-settings', ...settings } as any);
  }

  // Gestion des soldes
  async getBalances(): Promise<LeaveBalance[]> {
    await this.init();
    const balances = await this.db!.get('balances', 'current-balances');
    return balances || [];
  }

  async saveBalances(balances: LeaveBalance[]): Promise<void> {
    await this.init();
    await this.db!.put('balances', { id: 'current-balances', balances } as any);
  }

  // Gestion des jours fériés
  async getHolidays(): Promise<PublicHoliday[]> {
    await this.init();
    const holidays = await this.db!.get('holidays', 'french-holidays');
    return holidays || [];
  }

  async saveHolidays(holidays: PublicHoliday[]): Promise<void> {
    await this.init();
    await this.db!.put('holidays', { id: 'french-holidays', holidays } as any);
  }

  // Gestion des congés reportés
  async getCarryoverLeaves(): Promise<CarryoverLeave[]> {
    try {
      await this.init();
      return this.db!.getAll('carryover');
    } catch (error) {
      console.log('Store carryover non trouvé, retour d\'un tableau vide:', error);
      return [];
    }
  }

  async getCarryoverLeave(id: string): Promise<CarryoverLeave | undefined> {
    await this.init();
    return this.db!.get('carryover', id);
  }

  async addCarryoverLeave(carryover: CarryoverLeave): Promise<void> {
    await this.init();
    await this.db!.add('carryover', carryover);
  }

  async updateCarryoverLeave(carryover: CarryoverLeave): Promise<void> {
    await this.init();
    await this.db!.put('carryover', carryover);
  }

  async deleteCarryoverLeave(id: string): Promise<void> {
    await this.init();
    await this.db!.delete('carryover', id);
  }

  async saveCarryoverLeaves(carryovers: CarryoverLeave[]): Promise<void> {
    await this.init();
    // Vider le store et ajouter les nouveaux congés reportés
    await this.db!.clear('carryover');
    for (const carryover of carryovers) {
      await this.db!.add('carryover', carryover);
    }
  }

  async clearCarryoverLeaves(): Promise<void> {
    await this.init();
    await this.db!.clear('carryover');
  }

  async getCarryoverLeavesByType(type: string): Promise<CarryoverLeave[]> {
    await this.init();
    return this.db!.getAllFromIndex('carryover', 'by-type', type);
  }

  async getCarryoverLeavesByYear(year: number): Promise<CarryoverLeave[]> {
    await this.init();
    return this.db!.getAllFromIndex('carryover', 'by-year', year);
  }

  // Export/Import des données
  async exportData(): Promise<string> {
    // Charger les données une par une pour éviter les erreurs
    const leaves = await this.getLeaves();
    const settings = await this.getSettings();
    const balances = await this.getBalances();
    const holidays = await this.getHolidays();
    
    let carryovers: CarryoverLeave[] = [];
    try {
      carryovers = await this.getCarryoverLeaves();
    } catch (error) {
      console.log('Carryover store non trouvé lors de l\'export:', error);
      carryovers = [];
    }

    const exportData = {
      leaves,
      settings,
      balances,
      holidays,
      carryovers,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Nouvelle fonction d'export avec choix utilisateur
  async exportDataWithUserChoice(): Promise<void> {
    try {
      const data = await this.exportData();
      const filename = `leave-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      // Vérifier si l'API Web Share est disponible (mobile)
      if (navigator.share && navigator.canShare) {
        const blob = new Blob([data], { type: 'application/json' });
        const file = new File([blob], filename, { type: 'application/json' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Leave Tracker Backup',
            text: `Sauvegarde Leave Tracker du ${new Date().toLocaleDateString('fr-FR')}`
          });
          return;
        }
      }
      
      // Fallback pour desktop ou navigateurs sans Web Share
      this.downloadFile(data, filename);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      // Fallback vers téléchargement direct
      const data = await this.exportData();
      const filename = `leave-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      this.downloadFile(data, filename);
    }
  }

  // Fonction de téléchargement direct (fallback)
  private downloadFile(data: string, filename: string): void {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      // Vérifier la structure des données
      if (!data.leaves || !Array.isArray(data.leaves)) {
        throw new Error('Format de données invalide');
      }

      // Importer les données
      await this.init();
      
      // Vider les stores existants
      await this.db!.clear('leaves');
      await this.db!.clear('settings');
      await this.db!.clear('balances');
      await this.db!.clear('holidays');
      await this.db!.clear('carryover'); // Clear carryover on import

      // Ajouter les nouvelles données
      for (const leave of data.leaves) {
        await this.addLeave(leave);
      }

      if (data.settings) {
        await this.saveSettings(data.settings);
      }

      if (data.balances) {
        await this.saveBalances(data.balances);
      }

      if (data.holidays) {
        await this.saveHolidays(data.holidays);
      }

      if (data.carryovers) {
        await this.saveCarryoverLeaves(data.carryovers);
      }

    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      throw new Error('Erreur lors de l\'import des données');
    }
  }

  // Nouvelle fonction d'import avec sélection de fichier
  async importDataWithFileSelection(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Créer un input file caché
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('Aucun fichier sélectionné'));
          return;
        }

        try {
          const text = await file.text();
          await this.importData(text);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          // Nettoyer l'input
          document.body.removeChild(input);
        }
      };

      input.oncancel = () => {
        reject(new Error('Import annulé'));
        document.body.removeChild(input);
      };

      // Ajouter l'input au DOM et déclencher la sélection
      document.body.appendChild(input);
      input.click();
    });
  }

  // Sauvegarde de secours dans localStorage
  async backupToLocalStorage(): Promise<void> {
    try {
      const data = await this.exportData();
      localStorage.setItem('leave-tracker-backup', data);
      localStorage.setItem('leave-tracker-backup-date', new Date().toISOString());
      
      // Sauvegarde multiple pour plus de sécurité
      const timestamp = new Date().toISOString().split('T')[0];
      localStorage.setItem(`leave-tracker-backup-${timestamp}`, data);
      
      // Garder seulement les 5 dernières sauvegardes
      this.cleanupOldBackups();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  }

  async restoreFromLocalStorage(): Promise<boolean> {
    try {
      // Essayer d'abord la sauvegarde la plus récente
      const backupData = localStorage.getItem('leave-tracker-backup');
      if (backupData) {
        await this.importData(backupData);
        return true;
      }

      // Sinon, essayer les sauvegardes datées
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('leave-tracker-backup-')
      ).sort().reverse();

      if (keys.length > 0) {
        const latestBackup = localStorage.getItem(keys[0]);
        if (latestBackup) {
          await this.importData(latestBackup);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Erreur lors de la restauration:', error);
      return false;
    }
  }

  private cleanupOldBackups(): void {
    try {
      const backupKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('leave-tracker-backup-')
      ).sort().reverse();

      // Garder seulement les 5 dernières sauvegardes
      if (backupKeys.length > 5) {
        backupKeys.slice(5).forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des sauvegardes:', error);
    }
  }

  // Fonction pour obtenir la liste des sauvegardes disponibles
  async getAvailableBackups(): Promise<Array<{ date: string; size: number }>> {
    try {
      const backups: Array<{ date: string; size: number }> = [];
      
      // Sauvegarde principale
      const mainBackup = localStorage.getItem('leave-tracker-backup');
      if (mainBackup) {
        const backupDate = localStorage.getItem('leave-tracker-backup-date');
        backups.push({
          date: backupDate || 'Unknown',
          size: mainBackup.length
        });
      }

      // Sauvegardes datées
      const backupKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('leave-tracker-backup-')
      ).sort().reverse();

      backupKeys.forEach(key => {
        const backup = localStorage.getItem(key);
        if (backup) {
          const date = key.replace('leave-tracker-backup-', '');
          backups.push({
            date,
            size: backup.length
          });
        }
      });

      return backups;
    } catch (error) {
      console.error('Erreur lors de la récupération des sauvegardes:', error);
      return [];
    }
  }

  // Nettoyage des données
  async clearAllData(): Promise<void> {
    await this.init();
    await this.db!.clear('leaves');
    await this.db!.clear('settings');
    await this.db!.clear('balances');
    await this.db!.clear('holidays');
    await this.db!.clear('carryover'); // Clear carryover on clearAllData
  }

  // Statistiques de la base de données
  async getDatabaseStats(): Promise<{
    totalLeaves: number;
    totalSize: number;
    lastBackup?: string;
  }> {
    await this.init();
    const leaves = await this.getLeaves();
    const backupDate = localStorage.getItem('leave-tracker-backup-date');
    
    return {
      totalLeaves: leaves.length,
      totalSize: new Blob([JSON.stringify(leaves)]).size,
      lastBackup: backupDate || undefined,
    };
  }
}

// Instance singleton
export const leaveStorage = new LeaveStorage();

// Fonctions utilitaires pour la migration depuis localStorage
export async function migrateFromLocalStorage(): Promise<void> {
  const oldData = localStorage.getItem('leave-tracker-data');
  if (!oldData) return;

  try {
    const data = JSON.parse(oldData);
    await leaveStorage.importData(JSON.stringify(data));
    
    // Supprimer les anciennes données
    localStorage.removeItem('leave-tracker-data');
    console.log('Migration depuis localStorage terminée');
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  }
}

// Fonction pour vérifier la disponibilité d'IndexedDB
export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

// Fallback vers localStorage si IndexedDB n'est pas disponible
export class LocalStorageFallback {
  private readonly STORAGE_KEY = 'leave-tracker-data';

  async getLeaves(): Promise<LeaveEntry[]> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data).leaves || [] : [];
  }

  async saveLeaves(leaves: LeaveEntry[]): Promise<void> {
    const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    data.leaves = leaves;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  async getSettings(): Promise<AppSettings | null> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data).settings || null : null;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    data.settings = settings;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
}
