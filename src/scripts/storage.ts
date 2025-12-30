/**
 * Storage management module
 * Handles credential storage using Tauri Store (desktop) or localStorage (web)
 */

import { Store } from '@tauri-apps/plugin-store';
import type { Credentials, IPTVProfile, WatchHistoryItem, FavoriteItem } from '../types';

const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
let store: Store | null = null;

if (isTauri) {
	store = await Store.load('.xtream.creds.json');
}

const MAX_PROFILES = 10;

/**
 * Load credentials from storage
 * @returns Promise resolving to credentials object
 */
export async function loadCreds(): Promise<Credentials> {
	let protocol = 'http';
	let host = '';
	let user = '';
	let pass = '';
	
	if (isTauri && store) {
		protocol = (await store.get<string>('protocol')) || 'http';
		host = (await store.get<string>('host')) || '';
		user = (await store.get<string>('user')) || '';
		pass = (await store.get<string>('pass')) || '';
		
		// Migrate old port field if exists
		const oldPort = await store.get<string>('port');
		if (oldPort && host && !host.includes(':')) {
			host = `${host}:${oldPort}`;
			await store.delete('port');
			await store.set('host', host);
			await store.save();
		}
	} else {
		protocol = localStorage.getItem('xt_protocol') || 'http';
		host = localStorage.getItem('xt_host') || '';
		user = localStorage.getItem('xt_user') || '';
		pass = localStorage.getItem('xt_pass') || '';
		
		// Migrate old port field if exists
		const oldPort = localStorage.getItem('xt_port');
		if (oldPort && host && !host.includes(':')) {
			host = `${host}:${oldPort}`;
			localStorage.setItem('xt_host', host);
			localStorage.removeItem('xt_port');
		}
	}
	
	return { protocol, host, user, pass };
}

/**
 * Save credentials to storage
 * @param creds - Current credentials
 * @param next - New credentials to merge
 * @returns Promise resolving to updated credentials
 */
export async function saveCreds(
	creds: Credentials,
	next: Partial<Credentials>
): Promise<Credentials> {
	const updated = { ...creds, ...next };
	
	if (isTauri && store) {
		await store.set('protocol', updated.protocol || 'http');
		await store.set('host', updated.host || '');
		await store.set('user', updated.user || '');
		await store.set('pass', updated.pass || '');
		await store.save();
	}
	
	try {
		localStorage.setItem('xt_protocol', updated.protocol || 'http');
		localStorage.setItem('xt_host', updated.host || '');
		localStorage.setItem('xt_user', updated.user || '');
		localStorage.setItem('xt_pass', updated.pass || '');
	} catch (error) {
		console.error('Failed to save to localStorage:', error);
	}
	
	return updated;
}

/**
 * Clear all credentials from storage
 * @returns Promise that resolves when credentials are cleared
 */
export async function clearCreds(): Promise<void> {
	if (isTauri && store) {
		await store.clear();
		await store.save();
	}
	
	try {
		localStorage.removeItem('xt_protocol');
		localStorage.removeItem('xt_host');
		localStorage.removeItem('xt_port'); // Remove old port field
		localStorage.removeItem('xt_user');
		localStorage.removeItem('xt_pass');
		localStorage.removeItem('xt_profiles');
		localStorage.removeItem('xt_active_profile');
	} catch (error) {
		console.error('Failed to clear localStorage:', error);
	}
}

/**
 * Load all IPTV profiles from storage
 * @returns Promise resolving to array of profiles
 */
export async function loadProfiles(): Promise<IPTVProfile[]> {
	let profiles: IPTVProfile[] = [];
	
	if (isTauri && store) {
		profiles = await store.get<IPTVProfile[]>('profiles') || [];
	} else {
		try {
			const profilesJson = localStorage.getItem('xt_profiles');
			profiles = profilesJson ? JSON.parse(profilesJson) : [];
		} catch (error) {
			console.error('Failed to load profiles:', error);
			return [];
		}
	}
	
	// Migrate old profiles with port field
	let needsSave = false;
	profiles = profiles.map(profile => {
		const creds = profile.credentials as any;
		if (creds.port && !creds.protocol) {
			needsSave = true;
			const host = creds.host || '';
			const port = creds.port || '';
			return {
				...profile,
				credentials: {
					protocol: 'http',
					host: port && !host.includes(':') ? `${host}:${port}` : host,
					user: creds.user || '',
					pass: creds.pass || ''
				}
			};
		}
		// Ensure protocol exists
		if (!creds.protocol) {
			needsSave = true;
			return {
				...profile,
				credentials: {
					protocol: 'http',
					host: creds.host || '',
					user: creds.user || '',
					pass: creds.pass || ''
				}
			};
		}
		return profile;
	});
	
	if (needsSave) {
		await saveProfiles(profiles);
	}
	
	return profiles;
}

/**
 * Save IPTV profiles to storage
 * @param profiles - Array of profiles to save
 * @returns Promise that resolves when profiles are saved
 */
export async function saveProfiles(profiles: IPTVProfile[]): Promise<void> {
	// Limit to MAX_PROFILES
	const limitedProfiles = profiles.slice(0, MAX_PROFILES);
	
	if (isTauri && store) {
		await store.set('profiles', limitedProfiles);
		await store.save();
	}
	
	try {
		localStorage.setItem('xt_profiles', JSON.stringify(limitedProfiles));
	} catch (error) {
		console.error('Failed to save profiles:', error);
	}
}

/**
 * Get active profile ID
 * @returns Promise resolving to active profile ID or null
 */
export async function getActiveProfileId(): Promise<string | null> {
	if (isTauri && store) {
		return await store.get<string>('activeProfileId') || null;
	}
	
	return localStorage.getItem('xt_active_profile');
}

/**
 * Set active profile ID
 * @param profileId - Profile ID to set as active
 * @returns Promise that resolves when active profile is set
 */
export async function setActiveProfileId(profileId: string): Promise<void> {
	if (isTauri && store) {
		await store.set('activeProfileId', profileId);
		await store.save();
	}
	
	try {
		localStorage.setItem('xt_active_profile', profileId);
	} catch (error) {
		console.error('Failed to set active profile:', error);
	}
}

/**
 * Add a new IPTV profile
 * @param name - Profile name
 * @param credentials - Profile credentials
 * @returns Promise resolving to the new profile
 */
export async function addProfile(name: string, credentials: Credentials): Promise<IPTVProfile> {
	const profiles = await loadProfiles();
	
	if (profiles.length >= MAX_PROFILES) {
		throw new Error(`Maksimum ${MAX_PROFILES} profil ekleyebilirsiniz`);
	}
	
	const newProfile: IPTVProfile = {
		id: Date.now().toString(),
		name,
		credentials
	};
	
	profiles.push(newProfile);
	await saveProfiles(profiles);
	
	return newProfile;
}

/**
 * Update an existing IPTV profile
 * @param profileId - Profile ID to update
 * @param name - New profile name
 * @param credentials - New credentials
 * @returns Promise that resolves when profile is updated
 */
export async function updateProfile(profileId: string, name: string, credentials: Credentials): Promise<void> {
	const profiles = await loadProfiles();
	const index = profiles.findIndex(p => p.id === profileId);
	
	if (index === -1) {
		throw new Error('Profile not found');
	}
	
	profiles[index] = {
		...profiles[index],
		name,
		credentials
	};
	
	await saveProfiles(profiles);
}

/**
 * Delete an IPTV profile
 * @param profileId - Profile ID to delete
 * @returns Promise that resolves when profile is deleted
 */
export async function deleteProfile(profileId: string): Promise<void> {
	const profiles = await loadProfiles();
	const filtered = profiles.filter(p => p.id !== profileId);
	await saveProfiles(filtered);
	
	// If deleted profile was active, clear active profile
	const activeId = await getActiveProfileId();
	if (activeId === profileId) {
		if (isTauri && store) {
			await store.delete('activeProfileId');
			await store.save();
		}
		localStorage.removeItem('xt_active_profile');
	}
}

/**
 * Load language preference from storage
 * @returns Promise resolving to language code or null
 */
export async function loadLanguage(): Promise<string | null> {
	if (isTauri && store) {
		return await store.get<string>('language') || null;
	}
	
	return localStorage.getItem('xt_language');
}

/**
 * Save language preference to storage
 * @param language - Language code to save (e.g., 'en', 'tr')
 * @returns Promise that resolves when language is saved
 */
export async function saveLanguage(language: string): Promise<void> {
	if (isTauri && store) {
		await store.set('language', language);
		await store.save();
	}
	
	try {
		localStorage.setItem('xt_language', language);
	} catch (error) {
		console.error('Failed to save language:', error);
	}
}

/**
 * Add item to watch history
 * @param item - Watch history item to add
 * @returns Promise that resolves when item is added
 */
export async function addToWatchHistory(item: WatchHistoryItem): Promise<void> {
	const history = await getWatchHistory(item.type);
	
	// Remove if already exists
	const filtered = history.filter(h => h.id !== item.id);
	
	// Add to beginning
	filtered.unshift(item);
	
	// Keep only last 10
	const limited = filtered.slice(0, 10);
	
	const key = `watch_history_${item.type}`;
	
	if (isTauri && store) {
		await store.set(key, limited);
		await store.save();
	}
	
	try {
		localStorage.setItem(`xt_${key}`, JSON.stringify(limited));
	} catch (error) {
		console.error('Failed to save watch history:', error);
	}
}

/**
 * Get watch history for a specific type
 * @param type - Type of content (live, movie, series)
 * @returns Promise resolving to array of watch history items
 */
export async function getWatchHistory(type: 'live' | 'movie' | 'series'): Promise<WatchHistoryItem[]> {
	const key = `watch_history_${type}`;
	
	if (isTauri && store) {
		const history = await store.get<WatchHistoryItem[]>(key);
		return history || [];
	}
	
	try {
		const historyJson = localStorage.getItem(`xt_${key}`);
		return historyJson ? JSON.parse(historyJson) : [];
	} catch (error) {
		console.error('Failed to load watch history:', error);
		return [];
	}
}

/**
 * Clear watch history for a specific type
 * @param type - Type of content (live, movie, series)
 * @returns Promise that resolves when history is cleared
 */
export async function clearWatchHistory(type: 'live' | 'movie' | 'series'): Promise<void> {
	const key = `watch_history_${type}`;
	
	if (isTauri && store) {
		await store.delete(key);
		await store.save();
	}
	
	try {
		localStorage.removeItem(`xt_${key}`);
	} catch (error) {
		console.error('Failed to clear watch history:', error);
	}
}

/**
 * Remove a single item from watch history
 * @param type - Type of content (live, movie, series)
 * @param itemId - ID of the item to remove
 * @returns Promise that resolves when item is removed
 */
export async function removeFromWatchHistory(type: 'live' | 'movie' | 'series', itemId: string): Promise<void> {
	const history = await getWatchHistory(type);
	const filtered = history.filter(h => h.id !== itemId);
	
	const key = `watch_history_${type}`;
	
	if (isTauri && store) {
		await store.set(key, filtered);
		await store.save();
	}
	
	try {
		localStorage.setItem(`xt_${key}`, JSON.stringify(filtered));
	} catch (error) {
		console.error('Failed to remove from watch history:', error);
	}
}

/**
 * Add item to favorites
 * @param item - Favorite item to add
 * @returns Promise that resolves when item is added
 */
export async function addToFavorites(item: FavoriteItem): Promise<void> {
	const favorites = await getFavorites(item.type);
	
	// Remove if already exists
	const filtered = favorites.filter(f => f.id !== item.id);
	
	// Add to beginning
	filtered.unshift(item);
	
	const key = `favorites_${item.type}`;
	
	if (isTauri && store) {
		await store.set(key, filtered);
		await store.save();
	} else {
		localStorage.setItem(`xt_${key}`, JSON.stringify(filtered));
	}
}

/**
 * Get favorites for a specific type
 * @param type - Type of content (live, movie, series)
 * @returns Promise resolving to array of favorite items
 */
export async function getFavorites(type: 'live' | 'movie' | 'series'): Promise<FavoriteItem[]> {
	const key = `favorites_${type}`;
	
	if (isTauri && store) {
		const favorites = await store.get<FavoriteItem[]>(key);
		return favorites || [];
	}
	
	try {
		const favoritesJson = localStorage.getItem(`xt_${key}`);
		return favoritesJson ? JSON.parse(favoritesJson) : [];
	} catch (error) {
		console.error('Failed to load favorites:', error);
		return [];
	}
}

/**
 * Remove an item from favorites
 * @param type - Type of content (live, movie, series)
 * @param itemId - ID of the item to remove
 * @returns Promise that resolves when item is removed
 */
export async function removeFromFavorites(type: 'live' | 'movie' | 'series', itemId: string | number): Promise<void> {
	const favorites = await getFavorites(type);
	const filtered = favorites.filter(f => f.id !== itemId.toString());
	
	const key = `favorites_${type}`;
	
	if (isTauri && store) {
		await store.set(key, filtered);
		await store.save();
	} else {
		localStorage.setItem(`xt_${key}`, JSON.stringify(filtered));
	}
}

/**
 * Check if an item is in favorites
 * @param type - Type of content (live, movie, series)
 * @param itemId - ID of the item to check
 * @returns Promise resolving to boolean
 */
export async function isFavorite(type: 'live' | 'movie' | 'series', itemId: string | number): Promise<boolean> {
	const favorites = await getFavorites(type);
	return favorites.some(f => f.id === itemId.toString());
}

/**
 * Clear all favorites for a specific type
 * @param type - Type of content (live, movie, series)
 * @returns Promise that resolves when favorites are cleared
 */
export async function clearFavorites(type: 'live' | 'movie' | 'series'): Promise<void> {
	const key = `favorites_${type}`;
	
	if (isTauri && store) {
		await store.delete(key);
		await store.save();
	} else {
		localStorage.removeItem(`xt_${key}`);
	}
}
