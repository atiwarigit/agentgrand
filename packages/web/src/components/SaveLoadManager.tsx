// @ts-ignore
import React, { useState, useCallback, useRef } from 'react';
import { GrantProposalData, GrantInputData } from '../types/grantProposalDataSchema.js';
import { SessionStorageService, SavedSession } from '../services/sessionStorage.js';

interface SaveLoadManagerProps {
  data: GrantProposalData | null;
  inputData: GrantInputData | null;
  onLoadSession: (inputData: GrantInputData, proposalData: GrantProposalData) => void;
}

export function SaveLoadManager({ data, inputData, onLoadSession }: SaveLoadManagerProps) {
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setSavedSessions(SessionStorageService.getSavedSessions());
  }, []);

  const handleSaveSession = useCallback(async () => {
    if (!data || !inputData) return;
    
    setLoading(true);
    try {
      const session = SessionStorageService.saveSession(sessionName, inputData, data);
      setSavedSessions(SessionStorageService.getSavedSessions());
      setSessionName('');
      setShowSaveDialog(false);
      alert(`Session "${session.name}" saved successfully!`);
    } catch (error) {
      alert(`Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [data, inputData, sessionName]);

  const handleLoadSession = useCallback((session: SavedSession) => {
    onLoadSession(session.inputData, session.proposalData);
    setShowLoadDialog(false);
    alert(`Session "${session.name}" loaded successfully!`);
  }, [onLoadSession]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        SessionStorageService.deleteSession(sessionId);
        setSavedSessions(SessionStorageService.getSavedSessions());
      } catch (error) {
        alert(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, []);

  const handleImportSession = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    SessionStorageService.importSession(file)
      .then(session => {
        setSavedSessions(SessionStorageService.getSavedSessions());
        alert(`Session "${session.name}" imported successfully!`);
      })
      .catch(error => {
        alert(`Failed to import session: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });
  }, []);

  const handleClearAllSessions = useCallback(() => {
    if (confirm('Are you sure you want to delete all saved sessions? This cannot be undone.')) {
      try {
        SessionStorageService.clearAllSessions();
        setSavedSessions([]);
        alert('All sessions cleared successfully!');
      } catch (error) {
        alert(`Failed to clear sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      {/* Save Session Button */}
      <button
        onClick={() => setShowSaveDialog(true)}
        disabled={!data || !inputData || loading}
        className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        <span>💾</span>
        <span>Save Session</span>
      </button>

      {/* Load Session Button */}
      <button
        onClick={() => setShowLoadDialog(true)}
        disabled={loading}
        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        <span>📂</span>
        <span>Load Session</span>
      </button>

      {/* Import Session Button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        <span>📥</span>
        <span>Import Session</span>
      </button>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportSession}
        className="hidden"
      />

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Current Session</h3>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Enter session name (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={handleSaveSession}
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                disabled={loading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Load Saved Session</h3>
              {savedSessions.length > 0 && (
                <button
                  onClick={handleClearAllSessions}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {savedSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No saved sessions found. Save your current work to create your first session.
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {savedSessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{session.name}</h4>
                        <p className="text-sm text-gray-600">
                          Grant: {session.inputData.grantTitle || 'Untitled'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Saved: {new Date(session.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleLoadSession(session)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowLoadDialog(false)}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}