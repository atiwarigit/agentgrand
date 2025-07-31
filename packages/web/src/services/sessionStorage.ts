import { GrantProposalData, GrantInputData } from '../types/grantProposalDataSchema.js';

export interface SavedSession {
  id: string;
  name: string;
  timestamp: string;
  inputData: GrantInputData;
  proposalData: GrantProposalData;
}

export class SessionStorageService {
  private static readonly STORAGE_KEY = 'grant-writer-sessions';
  private static readonly MAX_SESSIONS = 10;

  static getSavedSessions(): SavedSession[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load saved sessions:', error);
      return [];
    }
  }

  static saveSession(
    name: string,
    inputData: GrantInputData,
    proposalData: GrantProposalData
  ): SavedSession {
    const sessions = this.getSavedSessions();
    
    const newSession: SavedSession = {
      id: Date.now().toString(),
      name: name || `Session ${new Date().toLocaleDateString()}`,
      timestamp: new Date().toISOString(),
      inputData: { ...inputData, rfpFile: null }, // Don't store the file object
      proposalData,
    };

    sessions.unshift(newSession);
    
    // Keep only the most recent sessions
    if (sessions.length > this.MAX_SESSIONS) {
      sessions.splice(this.MAX_SESSIONS);
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      return newSession;
    } catch (error) {
      console.error('Failed to save session:', error);
      throw new Error('Failed to save session. Storage might be full.');
    }
  }

  static loadSession(sessionId: string): SavedSession | null {
    const sessions = this.getSavedSessions();
    return sessions.find(session => session.id === sessionId) || null;
  }

  static deleteSession(sessionId: string): void {
    const sessions = this.getSavedSessions();
    const filteredSessions = sessions.filter(session => session.id !== sessionId);
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredSessions));
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw new Error('Failed to delete session.');
    }
  }

  static clearAllSessions(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear sessions:', error);
      throw new Error('Failed to clear sessions.');
    }
  }

  static importSession(file: File): Promise<SavedSession> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          
          // Validate the imported data structure
          if (!data.inputData || !data.proposalData) {
            throw new Error('Invalid session file format');
          }

          const importedSession = this.saveSession(
            `Imported ${new Date().toLocaleDateString()}`,
            data.inputData,
            data.proposalData
          );
          
          resolve(importedSession);
        } catch (error) {
          reject(new Error('Failed to import session. Invalid file format.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file.'));
      };
      
      reader.readAsText(file);
    });
  }

  static getStorageUsage(): { used: number; available: number } {
    try {
      const used = new Blob([localStorage.getItem(this.STORAGE_KEY) || '']).size;
      
      // Estimate available storage (most browsers have ~5-10MB limit)
      const testKey = 'storage-test';
      let available = 0;
      
      try {
        let testData = '';
        while (true) {
          testData += 'x'.repeat(1024); // Add 1KB at a time
          localStorage.setItem(testKey, testData);
          available += 1024;
          
          if (available > 1024 * 1024 * 5) { // Stop at 5MB to avoid hanging
            break;
          }
        }
      } catch {
        // Hit storage limit
      } finally {
        localStorage.removeItem(testKey);
      }

      return { used, available };
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
      return { used: 0, available: 0 };
    }
  }
}