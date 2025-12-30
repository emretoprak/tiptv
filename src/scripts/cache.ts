/**
 * IndexedDB cache management module
 * Provides persistent caching for IPTV data
 */

import type { CacheData } from '../types';

const DB_NAME = 'xtreamDB';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

/**
 * Cache entry structure
 */
interface CacheEntry {
	/** Cache key */
	key: string;
	/** Cached data */
	data: CacheData;
}

/**
 * Open IndexedDB database
 * @returns Promise resolving to IDBDatabase instance
 */
function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		
		request.onupgradeneeded = (e) => {
			const db = (e.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'key' });
			}
		};
	});
}

/**
 * Get cached data by key
 * @param key - Cache key
 * @returns Promise resolving to cached data or null if not found
 */
export async function getCache(key: string): Promise<CacheData | null> {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(key);
			
			request.onsuccess = () => {
				const result = request.result as CacheEntry | undefined;
				resolve(result?.data || null);
			};
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.error('Failed to get cache:', error);
		return null;
	}
}

/**
 * Set cached data
 * @param key - Cache key
 * @param data - Data to cache
 * @returns Promise that resolves when data is cached
 */
export async function setCache(key: string, data: CacheData): Promise<void> {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.put({ key, data });
			
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.error('Failed to set cache:', error);
	}
}

/**
 * Delete cached data by key
 * @param key - Cache key to delete
 * @returns Promise that resolves when data is deleted
 */
export async function deleteCache(key: string): Promise<void> {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.delete(key);
			
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.error('Failed to delete cache:', error);
	}
}
