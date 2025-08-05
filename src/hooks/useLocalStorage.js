// src/hooks/useLocalStorage.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing localStorage with React state synchronization
 * @param {string} key - The localStorage key
 * @param {*} initialValue - Initial value if nothing is stored
 * @param {Object} options - Configuration options
 */
export function useLocalStorage(key, initialValue, options = {}) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    validator = null,
    errorCallback = console.error
  } = options;

  // State to store our value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }

      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }

      const parsed = deserialize(item);
      
      // Validate the parsed data if validator is provided
      if (validator && !validator(parsed)) {
        console.warn(`Invalid data in localStorage for key "${key}", using initial value`);
        return initialValue;
      }

      return parsed;
    } catch (error) {
      errorCallback(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Validate the value if validator is provided
      if (validator && !validator(valueToStore)) {
        throw new Error(`Value failed validation for key "${key}"`);
      }

      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, serialize(valueToStore));
      }
    } catch (error) {
      errorCallback(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, serialize, storedValue, validator, errorCallback]);

  // Remove the item from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      errorCallback(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, errorCallback]);

  // Check if the key exists in localStorage
  const hasValue = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(key) !== null;
  }, [key]);

  // Get the raw string value from localStorage
  const getRawValue = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }, [key]);

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== serialize(storedValue)) {
        try {
          const newValue = e.newValue ? deserialize(e.newValue) : initialValue;
          
          // Validate the new value if validator is provided
          if (validator && !validator(newValue)) {
            console.warn(`Invalid data received from storage event for key "${key}"`);
            return;
          }

          setStoredValue(newValue);
        } catch (error) {
          errorCallback(`Error handling storage change for key "${key}":`, error);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [key, storedValue, serialize, deserialize, initialValue, validator, errorCallback]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    hasValue,
    getRawValue
  };
}

/**
 * Hook for managing multiple localStorage values with a common prefix
 * @param {string} prefix - Common prefix for all keys
 */
export function useLocalStorageNamespace(prefix) {
  const setItem = useCallback((key, value) => {
    try {
      const fullKey = `${prefix}-${key}`;
      window.localStorage.setItem(fullKey, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage item "${prefix}-${key}":`, error);
    }
  }, [prefix]);

  const getItem = useCallback((key, defaultValue = null) => {
    try {
      const fullKey = `${prefix}-${key}`;
      const item = window.localStorage.getItem(fullKey);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error getting localStorage item "${prefix}-${key}":`, error);
      return defaultValue;
    }
  }, [prefix]);

  const removeItem = useCallback((key) => {
    try {
      const fullKey = `${prefix}-${key}`;
      window.localStorage.removeItem(fullKey);
    } catch (error) {
      console.error(`Error removing localStorage item "${prefix}-${key}":`, error);
    }
  }, [prefix]);

  const clear = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`${prefix}-`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error(`Error clearing localStorage namespace "${prefix}":`, error);
    }
  }, [prefix]);

  const getAll = useCallback(() => {
    try {
      const items = {};
      const keys = Object.keys(localStorage);
      keys.forEach(fullKey => {
        if (fullKey.startsWith(`${prefix}-`)) {
          const key = fullKey.replace(`${prefix}-`, '');
          const value = localStorage.getItem(fullKey);
          items[key] = value ? JSON.parse(value) : null;
        }
      });
      return items;
    } catch (error) {
      console.error(`Error getting all localStorage items for namespace "${prefix}":`, error);
      return {};
    }
  }, [prefix]);

  return {
    setItem,
    getItem,
    removeItem,
    clear,
    getAll
  };
}

/**
 * Hook for managing localStorage with automatic backup
 * @param {string} key - The localStorage key
 * @param {*} initialValue - Initial value
 * @param {Object} options - Configuration options
 */
export function useLocalStorageWithBackup(key, initialValue, options = {}) {
  const { maxBackups = 5, autoBackup = true } = options;
  
  const storage = useLocalStorage(key, initialValue, options);
  const backupNamespace = useLocalStorageNamespace(`${key}-backups`);

  const createBackup = useCallback(() => {
    try {
      const timestamp = new Date().toISOString();
      const backupKey = `backup-${timestamp}`;
      const backupData = {
        timestamp,
        data: storage.value
      };

      backupNamespace.setItem(backupKey, backupData);

      // Clean up old backups
      const allBackups = backupNamespace.getAll();
      const backupKeys = Object.keys(allBackups)
        .filter(key => key.startsWith('backup-'))
        .sort()
        .reverse();

      if (backupKeys.length > maxBackups) {
        const keysToRemove = backupKeys.slice(maxBackups);
        keysToRemove.forEach(key => backupNamespace.removeItem(key));
      }
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }, [storage.value, backupNamespace, maxBackups]);

  const getBackups = useCallback(() => {
    const allBackups = backupNamespace.getAll();
    return Object.entries(allBackups)
      .filter(([key]) => key.startsWith('backup-'))
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [backupNamespace]);

  const restoreFromBackup = useCallback((backupKey) => {
    const backup = backupNamespace.getItem(backupKey);
    if (backup && backup.data) {
      storage.setValue(backup.data);
      return true;
    }
    return false;
  }, [backupNamespace, storage]);

  // Auto-backup on value changes
  useEffect(() => {
    if (autoBackup && storage.value !== initialValue) {
      const timeoutId = setTimeout(createBackup, 1000); // Debounce backups
      return () => clearTimeout(timeoutId);
    }
  }, [storage.value, initialValue, autoBackup, createBackup]);

  return {
    ...storage,
    createBackup,
    getBackups,
    restoreFromBackup
  };
}

export default useLocalStorage;