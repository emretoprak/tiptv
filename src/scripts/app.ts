/**
 * Main application entry point
 * Coordinates all modules and handles application lifecycle
 */

import './i18n-dom';
import { t } from '../i18n/utils';
import { 
	loadCreds, 
	saveCreds, 
	clearCreds,
	loadProfiles,
	saveProfiles,
	addProfile,
	updateProfile,
	deleteProfile,
	getActiveProfileId,
	setActiveProfileId,
	getWatchHistory,
	clearWatchHistory,
	removeFromWatchHistory,
	getFavorites,
	addToFavorites,
	removeFromFavorites,
	isFavorite,
	clearFavorites
} from './storage';
import { 
	loadTranslations, 
	getStoredLanguage, 
	setLanguage, 
	updatePageTranslations,
	type Language 
} from './i18n';
import { getCache, setCache, deleteCache } from './cache';
import { moveFocus, initializeNavigation } from './navigation';
import { debounce } from './navigation/performance';
import { showScreen, showModal, updateMainScreenCounts, updateLastUpdateTime } from './ui';
import { stopAllPlayers } from './player';
import {
	fetchUserInfo,
	fetchLiveStreams,
	fetchLiveCategories,
	fetchMovies,
	fetchMovieCategories,
	fetchSeries,
	fetchSeriesCategories
} from './api';
import {
	initLiveTVModule,
	renderLiveTVCategories,
	playNextChannel,
	playPrevChannel,
	setupLiveTVSearch,
	stopLiveTVPlayer,
	playLiveTV
} from './renderers/liveTV';
import {
	initMoviesModule,
	renderMovieCategories,
	setupMoviesSearch,
	getPlayer as getMoviePlayer,
	stopMoviePlayer,
	playMovie
} from './renderers/movies';
import {
	initSeriesModule,
	renderSeriesCategories,
	setupSeriesSearch,
	getPlayer as getSeriesPlayer,
	stopSeriesPlayer
} from './renderers/series';

import type {
	Credentials,
	IPTVProfile,
	UserInfo,
	LiveChannel,
	Category,
	Movie,
	Series,
	ScreenElements,
	ScreenName
} from '../types';

/**
 * Application state
 */
let creds: Credentials = { host: '', port: '', user: '', pass: '' };
let activeProfileId: string | null = null;
let userInfo: UserInfo | null = null;
let liveChannels: LiveChannel[] = [];
let currentHistoryType: 'live' | 'movie' | 'series' | null = null;
let currentFavoriteType: 'live' | 'movie' | 'series' | null = null;
let liveCategories: Category[] = [];
let movies: Movie[] = [];
let movieCategories: Category[] = [];
let series: Series[] = [];
let seriesCategories: Category[] = [];
let currentScreen: ScreenName = 'login';
let lastContentScreen: 'movies' | 'series' = 'movies';

/**
 * Screen elements collection
 */
const screens: ScreenElements = {
	loadingScreen: document.getElementById('loading-screen'),
	loginScreen: document.getElementById('login-screen'),
	mainScreen: document.getElementById('main-screen'),
	livetvScreen: document.getElementById('livetv-screen'),
	moviesScreen: document.getElementById('movies-screen'),
	seriesScreen: document.getElementById('series-screen'),
	episodesScreen: document.getElementById('episodes-screen'),
	playerScreen: document.getElementById('player-screen'),
	settingsModal: document.getElementById('settings-modal')
};

/**
 * Load all IPTV data from API or cache
 * @param forceRefresh - Force refresh from API instead of using cache
 */
async function loadData(forceRefresh = false): Promise<void> {
	creds = await loadCreds();
	
	try {
		const cacheKey = `xt_cache_${creds.user}`;
		const cached = !forceRefresh && await getCache(cacheKey);
		
		if (cached) {
			// Load from cache
			userInfo = cached.userInfo;
			liveChannels = cached.liveChannels;
			liveCategories = cached.liveCategories;
			movies = cached.movies;
			movieCategories = cached.movieCategories;
			series = cached.series;
			seriesCategories = cached.seriesCategories;
			localStorage.setItem('xt_last_update', cached.timestamp);
		} else {
			// Fetch from API
			[
				userInfo,
				liveChannels,
				liveCategories,
				movies,
				movieCategories,
				series,
				seriesCategories
			] = await Promise.all([
				fetchUserInfo(creds),
				fetchLiveStreams(creds),
				fetchLiveCategories(creds),
				fetchMovies(creds),
				fetchMovieCategories(creds),
				fetchSeries(creds),
				fetchSeriesCategories(creds)
			]);
			
			const timestamp = new Date().toISOString();
			await setCache(cacheKey, {
				userInfo,
				liveChannels,
				liveCategories,
				movies,
				movieCategories,
				series,
				seriesCategories,
				timestamp
			});
			localStorage.setItem('xt_last_update', timestamp);
		}
		
		updateLastUpdateTime();
	} catch (err) {
		console.error('Data load error:', err);
	}
}

/**
 * Clean up invalid items from watch history and favorites
 * Removes items that no longer exist in the current data
 */
async function cleanupInvalidItems(): Promise<void> {
	// Clean up live channels
	const liveHistory = await getWatchHistory('live');
	const liveFavorites = await getFavorites('live');
	
	for (const item of liveHistory) {
		const exists = liveChannels.some(ch => ch.stream_id.toString() === item.id);
		if (!exists) {
			await removeFromWatchHistory('live', item.id);
		}
	}
	
	for (const item of liveFavorites) {
		const exists = liveChannels.some(ch => ch.stream_id.toString() === item.id);
		if (!exists) {
			await removeFromFavorites('live', item.id);
		}
	}
	
	// Clean up movies
	const movieHistory = await getWatchHistory('movie');
	const movieFavorites = await getFavorites('movie');
	
	for (const item of movieHistory) {
		const exists = movies.some(m => m.stream_id.toString() === item.id);
		if (!exists) {
			await removeFromWatchHistory('movie', item.id);
		}
	}
	
	for (const item of movieFavorites) {
		const exists = movies.some(m => m.stream_id.toString() === item.id);
		if (!exists) {
			await removeFromFavorites('movie', item.id);
		}
	}
	
	// Clean up series
	const seriesHistory = await getWatchHistory('series');
	const seriesFavorites = await getFavorites('series');
	
	for (const item of seriesHistory) {
		const exists = series.some(s => s.series_id.toString() === item.id);
		if (!exists) {
			await removeFromWatchHistory('series', item.id);
		}
	}
	
	for (const item of seriesFavorites) {
		const exists = series.some(s => s.series_id.toString() === item.id);
		if (!exists) {
			await removeFromFavorites('series', item.id);
		}
	}
}

/**
 * Get current credentials
 * @returns Current credentials or null if not available
 */
function getCredentials(): Credentials | null {
	if (!creds.host || !creds.user || !creds.pass) {
		return null;
	}
	return creds;
}

/**
 * Initialize renderer modules with credentials and screen navigation
 */
function initRenderers(): void {
	initLiveTVModule(creds, (screen: ScreenName) => {
		currentScreen = showScreen(screen, screens);
	});
	initMoviesModule(creds, (screen: ScreenName) => {
		currentScreen = showScreen(screen, screens);
		if (screen === 'player') lastContentScreen = 'movies';
	});
	initSeriesModule(creds, (screen: ScreenName) => {
		currentScreen = showScreen(screen, screens);
		if (screen === 'player') lastContentScreen = 'series';
	});
}

/**
 * Render profiles list in settings
 */
async function renderProfiles(): Promise<void> {
	const profilesList = document.getElementById('profiles-list');
	if (!profilesList) return;
	
	const profiles = await loadProfiles();
	const activeId = await getActiveProfileId();
	
	if (profiles.length === 0) {
		profilesList.innerHTML = `<p class="text-sm text-gray-400 text-center py-2">${t('profiles.noProfiles')}</p>`;
		return;
	}
	
	profilesList.innerHTML = profiles.map(profile => `
		<div class="flex items-center gap-2 p-3 rounded-lg border ${profile.id === activeId ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-white/5'}">
			<div class="flex-1">
				<div class="font-semibold text-sm">${profile.name}</div>
				<div class="text-xs text-gray-400">${profile.credentials.user}@${profile.credentials.host}</div>
			</div>
			${profile.id === activeId ? '<span class="text-xs text-indigo-400 font-semibold">Aktif</span>' : `<button class="focusable activate-profile-btn px-3 py-1 rounded text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition" data-profile-id="${profile.id}">Aktif Et</button>`}
			<button class="focusable edit-profile-btn p-2 rounded hover:bg-white/10 transition" data-profile-id="${profile.id}">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
				</svg>
			</button>
			<button class="focusable delete-profile-btn p-2 rounded hover:bg-red-500/20 text-red-400 transition" data-profile-id="${profile.id}">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
				</svg>
			</button>
		</div>
	`).join('');
	
	// Attach event listeners
	profilesList.querySelectorAll('.activate-profile-btn').forEach(btn => {
		btn.addEventListener('click', async (e) => {
			const profileId = (e.currentTarget as HTMLElement).dataset.profileId;
			if (profileId) await activateProfile(profileId);
		});
	});
	
	profilesList.querySelectorAll('.edit-profile-btn').forEach(btn => {
		btn.addEventListener('click', async (e) => {
			const profileId = (e.currentTarget as HTMLElement).dataset.profileId;
			if (profileId) await editProfile(profileId);
		});
	});
	
	profilesList.querySelectorAll('.delete-profile-btn').forEach(btn => {
		btn.addEventListener('click', async (e) => {
			const profileId = (e.currentTarget as HTMLElement).dataset.profileId;
			if (profileId) await removeProfile(profileId);
		});
	});
}

/**
 * Activate a profile
 */
async function activateProfile(profileId: string): Promise<void> {
	const profiles = await loadProfiles();
	const profile = profiles.find(p => p.id === profileId);
	
	if (!profile) {
		alert(t('profiles.notFound'));
		return;
	}
	
	await setActiveProfileId(profileId);
	creds = profile.credentials;
	activeProfileId = profileId;
	
	screens.settingsModal?.classList.add('hidden');
	currentScreen = showScreen('loading', screens);
	
	await loadData(true);
	initRenderers();
	updateMainScreenCounts(liveChannels, movies, series, userInfo);
	currentScreen = showScreen('main', screens);
}

/**
 * Edit a profile
 */
async function editProfile(profileId: string): Promise<void> {
	const profiles = await loadProfiles();
	const profile = profiles.find(p => p.id === profileId);
	
	if (!profile) return;
	
	const formContainer = document.getElementById('profile-form-container');
	const profileIdInput = document.getElementById('profile-id') as HTMLInputElement;
	const nameInput = document.getElementById('profile-name') as HTMLInputElement;
	const protocolInput = document.getElementById('profile-protocol') as HTMLSelectElement;
	const hostInput = document.getElementById('profile-host') as HTMLInputElement;
	const userInput = document.getElementById('profile-user') as HTMLInputElement;
	const passInput = document.getElementById('profile-pass') as HTMLInputElement;
	
	if (profileIdInput) profileIdInput.value = profile.id;
	if (nameInput) nameInput.value = profile.name;
	if (protocolInput) protocolInput.value = profile.credentials.protocol || 'http';
	if (hostInput) hostInput.value = profile.credentials.host;
	if (userInput) userInput.value = profile.credentials.user;
	if (passInput) passInput.value = profile.credentials.pass;
	
	// Show form with automatic focus (Requirement 6.2)
	showModal(formContainer);
}

/**
 * Remove a profile
 */
async function removeProfile(profileId: string): Promise<void> {
	if (!confirm(t('profiles.deleteConfirm'))) return;
	
	await deleteProfile(profileId);
	await renderProfiles();
	
	// If deleted profile was active, logout
	if (activeProfileId === profileId) {
		await clearCreds();
		location.reload();
	}
}

/**
 * Clean host URL by removing protocol prefix
 */
function cleanHostUrl(host: string): string {
	return host.replace(/^https?:\/\//i, '').trim();
}

/**
 * Show watch history modal
 */
async function showWatchHistory(type: 'live' | 'movie' | 'series'): Promise<void> {
	currentHistoryType = type;
	
	// Clean up invalid items first
	await cleanupInvalidItems();
	
	const modal = document.getElementById('watch-history-modal');
	const content = document.getElementById('watch-history-content');
	const empty = document.getElementById('watch-history-empty');
	const title = document.getElementById('watch-history-title');
	const clearBtn = document.getElementById('clear-watch-history-btn');
	
	if (!modal || !content || !empty) return;
	
	// Update title
	if (title) {
		if (type === 'live') title.textContent = t('history.liveTVTitle');
		else if (type === 'movie') title.textContent = t('history.movieTitle');
		else title.textContent = t('history.seriesTitle');
	}
	
	// Load history
	const history = await getWatchHistory(type);
	
	// Clear content
	content.innerHTML = '';
	
	if (history.length === 0) {
		empty.classList.remove('hidden');
		content.classList.add('hidden');
		if (clearBtn) clearBtn.classList.add('hidden');
	} else {
		empty.classList.add('hidden');
		content.classList.remove('hidden');
		if (clearBtn) clearBtn.classList.remove('hidden');
		
		// Render history items
		history.forEach(item => {
			const container = document.createElement('div');
			container.className = 'flex gap-2 items-stretch';
			
			const btn = document.createElement('button');
			btn.className = 'focusable flex-1 flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 focus:bg-white/10 focus:border-indigo-500 transition text-left';
			btn.dataset.historyId = item.id;
			btn.dataset.historyType = item.type;
			btn.tabIndex = 0;
			
			const icon = document.createElement('div');
			icon.className = 'w-12 h-12 md:w-16 md:h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0';
			icon.innerHTML = type === 'live' 
				? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
				: type === 'movie' 
				? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m16 10-4-2.5L8 10"/></svg>'
				: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>';
			
			const info = document.createElement('div');
			info.className = 'flex-1 min-w-0';
			
			const name = document.createElement('div');
			name.className = 'font-semibold text-sm md:text-base truncate';
			name.textContent = item.name;
			
			const date = document.createElement('div');
			date.className = 'text-xs text-gray-400';
			date.textContent = new Date(item.timestamp).toLocaleString('tr-TR');
			
			info.appendChild(name);
			info.appendChild(date);
			
			btn.appendChild(icon);
			btn.appendChild(info);
			
			// Add click handler to play the item
			btn.addEventListener('click', async () => {
				modal.classList.add('hidden');
				currentHistoryType = null;
				
				if (type === 'live') {
					// Find channel and play
					let channel = liveChannels.find(ch => ch.stream_id.toString() === item.id);
					
					// If channel not found in current list, try to reload data
					if (!channel && liveChannels.length === 0) {
						try {
							const creds = getCredentials();
							if (creds) {
								const { initLiveTVModule } = await import('./renderers/liveTV');
								initLiveTVModule(creds, (screen: ScreenName) => {
									currentScreen = showScreen(screen, screens);
								});
								// Try to find channel again after loading
								channel = liveChannels.find(ch => ch.stream_id.toString() === item.id);
							}
						} catch (error) {
							console.error('Failed to reload live channels:', error);
						}
					}
					
					if (channel) {
						// Navigate to live TV screen first
						renderLiveTVCategories(liveCategories, liveChannels);
						currentScreen = showScreen('livetv', screens);
						const { playLiveTV } = await import('./renderers/liveTV');
						await playLiveTV(channel);
					} else {
						// Channel not found, remove from history and favorites
						await removeFromWatchHistory(type, item.id);
						await removeFromFavorites(type, item.id);
						// Refresh the current modal
						await showWatchHistory(type);
					}
				} else if (type === 'movie') {
					// Find movie and play
					let movie = movies.find(m => m.stream_id.toString() === item.id);
					
					// If movie not found in current list, try to reload data
					if (!movie && movies.length === 0) {
						try {
							const creds = getCredentials();
							if (creds) {
								const { initMoviesModule } = await import('./renderers/movies');
								initMoviesModule(creds, (screen: ScreenName) => {
									currentScreen = showScreen(screen, screens);
								});
								// Try to find movie again after loading
								movie = movies.find(m => m.stream_id.toString() === item.id);
							}
						} catch (error) {
							console.error('Failed to reload movies:', error);
						}
					}
					
					if (movie) {
						// Navigate to movies screen first
						renderMovieCategories(movieCategories, movies);
						currentScreen = showScreen('movies', screens);
						const { playMovie } = await import('./renderers/movies');
						await playMovie(movie);
					} else {
						// Movie not found, remove from history and favorites
						await removeFromWatchHistory(type, item.id);
						await removeFromFavorites(type, item.id);
						// Refresh the current modal
						await showWatchHistory(type);
					}
				} else if (type === 'series') {
					// Find series and show episodes
					let seriesItem = series.find(s => s.series_id.toString() === item.id);
					
					// If series not found in current list, try to reload data
					if (!seriesItem && series.length === 0) {
						try {
							const creds = getCredentials();
							if (creds) {
								const { initSeriesModule } = await import('./renderers/series');
								initSeriesModule(creds, (screen: ScreenName) => {
									currentScreen = showScreen(screen, screens);
								});
								// Try to find series again after loading
								seriesItem = series.find(s => s.series_id.toString() === item.id);
							}
						} catch (error) {
							console.error('Failed to reload series:', error);
						}
					}
					
					if (seriesItem) {
						renderSeriesCategories(seriesCategories, series);
						currentScreen = showScreen('series', screens);
						const { showSeriesEpisodes } = await import('./renderers/series');
						await showSeriesEpisodes(seriesItem);
					} else {
						// Series not found, remove from history and favorites
						await removeFromWatchHistory(type, item.id);
						await removeFromFavorites(type, item.id);
						// Refresh the current modal
						await showWatchHistory(type);
					}
				}
			});
			
			// Add delete button - full height to match item
			const deleteBtn = document.createElement('button');
			deleteBtn.className = 'focusable rounded-lg border border-white/10 bg-white/5 text-red-400 transition flex items-center justify-center px-3';
			deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
			deleteBtn.tabIndex = 0;
			deleteBtn.addEventListener('click', async () => {
				await removeFromWatchHistory(type, item.id);
				await showWatchHistory(type);
			});
			
			container.appendChild(btn);
			container.appendChild(deleteBtn);
			content.appendChild(container);
		});
	}
	
	// Show modal with automatic focus (Requirement 6.2)
	showModal(modal);
}



/**
 * Show favorites modal
 */
async function showFavorites(type: 'live' | 'movie' | 'series'): Promise<void> {
	currentFavoriteType = type;
	
	// Clean up invalid items first
	await cleanupInvalidItems();
	
	const modal = document.getElementById('favorites-modal');
	const content = document.getElementById('favorites-content');
	const empty = document.getElementById('favorites-empty');
	const title = document.getElementById('favorites-title');
	const clearBtn = document.getElementById('clear-favorites-btn');
	
	if (!modal || !content || !empty) return;
	
	// Update title
	if (title) {
		if (type === 'live') title.textContent = t('favorites.liveTVTitle');
		else if (type === 'movie') title.textContent = t('favorites.movieTitle');
		else title.textContent = t('favorites.seriesTitle');
	}
	
	// Load favorites
	const favorites = await getFavorites(type);
	
	// Clear content
	content.innerHTML = '';
	
	if (favorites.length === 0) {
		empty.classList.remove('hidden');
		content.classList.add('hidden');
		if (clearBtn) clearBtn.classList.add('hidden');
	} else {
		empty.classList.add('hidden');
		content.classList.remove('hidden');
		if (clearBtn) clearBtn.classList.remove('hidden');
		
		// Render favorite items
		favorites.forEach(item => {
			const container = document.createElement('div');
			container.className = 'flex gap-2 items-stretch';
			
			const btn = document.createElement('button');
			btn.className = 'focusable flex-1 flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 focus:bg-white/10 focus:border-indigo-500 transition text-left';
			btn.dataset.favoriteId = item.id;
			btn.dataset.favoriteType = item.type;
			btn.tabIndex = 0;
			
			const icon = document.createElement('div');
			icon.className = 'w-12 h-12 md:w-16 md:h-16 rounded-lg bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center flex-shrink-0';
			icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
			
			const info = document.createElement('div');
			info.className = 'flex-1 min-w-0';
			
			const name = document.createElement('div');
			name.className = 'font-semibold text-sm md:text-base truncate';
			name.textContent = item.name;
			
			const date = document.createElement('div');
			date.className = 'text-xs text-gray-400';
			date.textContent = new Date(item.timestamp).toLocaleString('tr-TR');
			
			info.appendChild(name);
			info.appendChild(date);
			
			btn.appendChild(icon);
			btn.appendChild(info);
			
			// Add click handler to play the item
			btn.addEventListener('click', async () => {
				modal.classList.add('hidden');
				currentFavoriteType = null;
				
				if (type === 'live') {
					let channel = liveChannels.find(ch => ch.stream_id.toString() === item.id);
					
					// If channel not found in current list, try to reload data
					if (!channel && liveChannels.length === 0) {
						try {
							const creds = getCredentials();
							if (creds) {
								const { initLiveTVModule } = await import('./renderers/liveTV');
								initLiveTVModule(creds, (screen: ScreenName) => {
									currentScreen = showScreen(screen, screens);
								});
								// Try to find channel again after loading
								channel = liveChannels.find(ch => ch.stream_id.toString() === item.id);
							}
						} catch (error) {
							console.error('Failed to reload live channels:', error);
						}
					}
					
					if (channel) {
						renderLiveTVCategories(liveCategories, liveChannels);
						currentScreen = showScreen('livetv', screens);
						const { playLiveTV } = await import('./renderers/liveTV');
						await playLiveTV(channel);
					} else {
						// Channel not found, remove from history and favorites
						await removeFromWatchHistory(type, item.id);
						await removeFromFavorites(type, item.id);
						// Refresh the current modal
						await showFavorites(type);
					}
				} else if (type === 'movie') {
					let movie = movies.find(m => m.stream_id.toString() === item.id);
					
					// If movie not found in current list, try to reload data
					if (!movie && movies.length === 0) {
						try {
							const creds = getCredentials();
							if (creds) {
								const { initMoviesModule } = await import('./renderers/movies');
								initMoviesModule(creds, (screen: ScreenName) => {
									currentScreen = showScreen(screen, screens);
								});
								// Try to find movie again after loading
								movie = movies.find(m => m.stream_id.toString() === item.id);
							}
						} catch (error) {
							console.error('Failed to reload movies:', error);
						}
					}
					
					if (movie) {
						renderMovieCategories(movieCategories, movies);
						currentScreen = showScreen('movies', screens);
						const { playMovie } = await import('./renderers/movies');
						await playMovie(movie);
					} else {
						// Movie not found, remove from history and favorites
						await removeFromWatchHistory(type, item.id);
						await removeFromFavorites(type, item.id);
						// Refresh the current modal
						await showFavorites(type);
					}
				} else if (type === 'series') {
					let seriesItem = series.find(s => s.series_id.toString() === item.id);
					
					// If series not found in current list, try to reload data
					if (!seriesItem && series.length === 0) {
						try {
							const creds = getCredentials();
							if (creds) {
								const { initSeriesModule } = await import('./renderers/series');
								initSeriesModule(creds, (screen: ScreenName) => {
									currentScreen = showScreen(screen, screens);
								});
								// Try to find series again after loading
								seriesItem = series.find(s => s.series_id.toString() === item.id);
							}
						} catch (error) {
							console.error('Failed to reload series:', error);
						}
					}
					
					if (seriesItem) {
						renderSeriesCategories(seriesCategories, series);
						currentScreen = showScreen('series', screens);
						// Import and call showSeriesEpisodes from series renderer
						const { showSeriesEpisodes } = await import('./renderers/series');
						await showSeriesEpisodes(seriesItem);
					} else {
						// Series not found, remove from history and favorites
						await removeFromWatchHistory(type, item.id);
						await removeFromFavorites(type, item.id);
						// Refresh the current modal
						await showFavorites(type);
					}
				}
			});
			
			// Add delete button
			const deleteBtn = document.createElement('button');
			deleteBtn.className = 'focusable rounded-lg border border-white/10 bg-white/5 text-red-400 transition flex items-center justify-center px-3';
			deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
			deleteBtn.tabIndex = 0;
			deleteBtn.addEventListener('click', async () => {
				await removeFromFavorites(type, item.id);
				await showFavorites(type);
			});
			
			container.appendChild(btn);
			container.appendChild(deleteBtn);
			content.appendChild(container);
		});
	}
	
	// Show modal with automatic focus
	showModal(modal);
}

/**
 * Setup all event handlers
 */
function setupEventHandlers(): void {
	// Login form
	const loginForm = document.getElementById('login-form');
	loginForm?.addEventListener('submit', async (e) => {
		e.preventDefault();
		
		const protocolInput = document.getElementById('protocol') as HTMLSelectElement;
		const hostInput = document.getElementById('host') as HTMLInputElement;
		const userInput = document.getElementById('user') as HTMLInputElement;
		const passInput = document.getElementById('pass') as HTMLInputElement;
		
		// Clean host URL (remove any http:// or https:// prefix)
		const cleanedHost = cleanHostUrl(hostInput.value);
		
		if (!cleanedHost) {
			alert(t('profiles.hostRequired'));
			return;
		}
		
		creds = await saveCreds(creds, {
			protocol: protocolInput.value,
			host: cleanedHost,
			port: '',
			user: userInput.value.trim(),
			pass: passInput.value.trim(),
		});
		
		// Create first profile if none exists
		const profiles = await loadProfiles();
		if (profiles.length === 0) {
			const profile = await addProfile('Ana IPTV', creds);
			await setActiveProfileId(profile.id);
			activeProfileId = profile.id;
		}
		
		currentScreen = showScreen('loading', screens);
		await loadData(true);
		initRenderers();
		updateMainScreenCounts(liveChannels, movies, series, userInfo);
		currentScreen = showScreen('main', screens);
	});

	// Category buttons
	document.getElementById('livetv-btn')?.addEventListener('click', () => {
		// Stop all players before switching
		stopAllPlayers();
		
		renderLiveTVCategories(liveCategories, liveChannels);
		currentScreen = showScreen('livetv', screens);
	});

	document.getElementById('movies-btn')?.addEventListener('click', () => {
		// Stop all players before switching
		stopAllPlayers();
		
		renderMovieCategories(movieCategories, movies);
		currentScreen = showScreen('movies', screens);
	});

	document.getElementById('series-btn')?.addEventListener('click', () => {
		// Stop all players before switching
		stopAllPlayers();
		
		renderSeriesCategories(seriesCategories, series);
		currentScreen = showScreen('series', screens);
	});

	// Watch history buttons
	document.getElementById('livetv-history-btn')?.addEventListener('click', async () => {
		await showWatchHistory('live');
	});

	document.getElementById('movies-history-btn')?.addEventListener('click', async () => {
		await showWatchHistory('movie');
	});

	document.getElementById('series-history-btn')?.addEventListener('click', async () => {
		await showWatchHistory('series');
	});

	document.getElementById('close-watch-history-btn')?.addEventListener('click', () => {
		document.getElementById('watch-history-modal')?.classList.add('hidden');
		currentHistoryType = null;
	});

	document.getElementById('clear-watch-history-btn')?.addEventListener('click', async () => {
		if (!currentHistoryType) return;
		
		if (confirm(t('history.confirmClear'))) {
			await clearWatchHistory(currentHistoryType);
			await showWatchHistory(currentHistoryType);
		}
	});

	// Favorites buttons
	document.getElementById('livetv-favorites-btn')?.addEventListener('click', async () => {
		await showFavorites('live');
	});

	document.getElementById('movies-favorites-btn')?.addEventListener('click', async () => {
		await showFavorites('movie');
	});

	document.getElementById('series-favorites-btn')?.addEventListener('click', async () => {
		await showFavorites('series');
	});

	document.getElementById('close-favorites-btn')?.addEventListener('click', () => {
		document.getElementById('favorites-modal')?.classList.add('hidden');
		currentFavoriteType = null;
	});

	document.getElementById('clear-favorites-btn')?.addEventListener('click', async () => {
		if (!currentFavoriteType) return;
		
		if (confirm(t('favorites.confirmClear'))) {
			await clearFavorites(currentFavoriteType);
			await showFavorites(currentFavoriteType);
		}
	});

	// Back buttons
	document.getElementById('livetv-back-btn')?.addEventListener('click', () => {
		stopLiveTVPlayer();
		// showScreen handles automatic focus (Requirement 6.1)
		currentScreen = showScreen('main', screens);
	});

	document.getElementById('movies-back-btn')?.addEventListener('click', () => {
		stopMoviePlayer();
		// showScreen handles automatic focus (Requirement 6.1)
		currentScreen = showScreen('main', screens);
	});

	document.getElementById('series-back-btn')?.addEventListener('click', () => {
		stopSeriesPlayer();
		// showScreen handles automatic focus (Requirement 6.1)
		currentScreen = showScreen('main', screens);
	});

	document.getElementById('player-back-btn')?.addEventListener('click', async () => {
		// Stop all players
		stopAllPlayers();
		
		const { setCurrentPlayingItem } = await import('./playerState');
		setCurrentPlayingItem(null);
		
		// showScreen handles automatic focus (Requirement 6.1)
		if (lastContentScreen === 'series') {
			currentScreen = showScreen('episodes', screens);
		} else {
			currentScreen = showScreen(lastContentScreen, screens);
		}
	});



	document.getElementById('episodes-back-btn')?.addEventListener('click', () => {
		stopAllPlayers();
		// showScreen handles automatic focus (Requirement 6.1)
		currentScreen = showScreen('series', screens);
	});

	// Settings
	document.getElementById('settings-btn')?.addEventListener('click', async () => {
		await renderProfiles();
		updateLastUpdateTime();
		
		// Update active language button
		const currentLang = await getStoredLanguage();
		document.querySelectorAll('.lang-btn').forEach(btn => {
			const lang = btn.getAttribute('data-lang');
			if (lang === currentLang) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});
		
		// Show settings modal with automatic focus (Requirement 6.2)
		if (screens.settingsModal) {
			showModal(screens.settingsModal);
		}
	});

	document.getElementById('refresh-btn')?.addEventListener('click', async () => {
		currentScreen = showScreen('loading', screens);
		await loadData(true);
		initRenderers();
		updateMainScreenCounts(liveChannels, movies, series, userInfo);
		currentScreen = showScreen('main', screens);
	});

	// Add profile button
	document.getElementById('add-profile-btn')?.addEventListener('click', () => {
		const formContainer = document.getElementById('profile-form-container');
		const form = document.getElementById('profile-form') as HTMLFormElement;
		form?.reset();
		(document.getElementById('profile-id') as HTMLInputElement).value = '';
		
		// Show form with automatic focus (Requirement 6.2)
		showModal(formContainer);
	});

	// Cancel profile form
	document.getElementById('cancel-profile-btn')?.addEventListener('click', () => {
		const formContainer = document.getElementById('profile-form-container');
		formContainer?.classList.add('hidden');
		
		// Focus back to add profile button
		setTimeout(() => {
			const addBtn = document.getElementById('add-profile-btn');
			if (addBtn) addBtn.focus();
		}, 50);
	});

	// Profile form submit
	const profileForm = document.getElementById('profile-form');
	profileForm?.addEventListener('submit', async (e) => {
		e.preventDefault();
		
		const profileId = (document.getElementById('profile-id') as HTMLInputElement).value;
		const name = (document.getElementById('profile-name') as HTMLInputElement).value.trim();
		const protocol = (document.getElementById('profile-protocol') as HTMLSelectElement).value;
		const hostInput = (document.getElementById('profile-host') as HTMLInputElement).value.trim();
		const user = (document.getElementById('profile-user') as HTMLInputElement).value.trim();
		const pass = (document.getElementById('profile-pass') as HTMLInputElement).value.trim();
		
		// Clean host URL (remove any http:// or https:// prefix)
		const cleanedHost = cleanHostUrl(hostInput);
		
		if (!name || !cleanedHost || !user || !pass) {
			alert(t('profiles.allFieldsRequired'));
			return;
		}
		
		const credentials: Credentials = { protocol, host: cleanedHost, port: '', user, pass };
		
		try {
			if (profileId) {
				// Update existing profile
				await updateProfile(profileId, name, credentials);
				
				// If updating active profile, reload data
				if (profileId === activeProfileId) {
					creds = credentials;
					currentScreen = showScreen('loading', screens);
					screens.settingsModal?.classList.add('hidden');
					await loadData(true);
					initRenderers();
					updateMainScreenCounts(liveChannels, movies, series, userInfo);
					currentScreen = showScreen('main', screens);
					return;
				}
			} else {
				// Add new profile
				await addProfile(name, credentials);
			}
			
			const formContainer = document.getElementById('profile-form-container');
			formContainer?.classList.add('hidden');
			await renderProfiles();
			
			// Focus back to add profile button
			setTimeout(() => {
				const addBtn = document.getElementById('add-profile-btn');
				if (addBtn) addBtn.focus();
			}, 50);
		} catch (error) {
			alert((error as Error).message);
		}
	});

	document.getElementById('close-settings-btn')?.addEventListener('click', () => {
		screens.settingsModal?.classList.add('hidden');
	});

	document.getElementById('logout-btn')?.addEventListener('click', async () => {
		await clearCreds();
		location.reload();
	});

	// Language switcher (Settings modal)
	document.querySelectorAll('.lang-btn').forEach(btn => {
		btn.addEventListener('click', async (e) => {
			const target = e.currentTarget as HTMLElement;
			const lang = target.getAttribute('data-lang') as Language;
			
			if (lang) {
				await setLanguage(lang);
				await loadTranslations(lang);
				updatePageTranslations();
				
				// Update active state
				document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
				target.classList.add('active');
			}
		});
	});

	// Language switcher (Login screen)
	document.querySelectorAll('.login-lang-btn').forEach(btn => {
		btn.addEventListener('click', async (e) => {
			const target = e.currentTarget as HTMLElement;
			const lang = target.getAttribute('data-lang') as Language;
			
			if (lang) {
				await setLanguage(lang);
				await loadTranslations(lang);
				updatePageTranslations();
				
				// Update active state
				document.querySelectorAll('.login-lang-btn').forEach(b => b.classList.remove('active'));
				target.classList.add('active');
			}
		});
	});
	
	// Auto-clean host input on login form
	const loginHostInput = document.getElementById('host') as HTMLInputElement;
	loginHostInput?.addEventListener('blur', () => {
		if (loginHostInput.value) {
			loginHostInput.value = cleanHostUrl(loginHostInput.value);
		}
	});
	
	// Auto-clean host input on profile form
	const profileHostInput = document.getElementById('profile-host') as HTMLInputElement;
	profileHostInput?.addEventListener('blur', () => {
		if (profileHostInput.value) {
			profileHostInput.value = cleanHostUrl(profileHostInput.value);
		}
	});
}

/**
 * Setup keyboard navigation
 */
function setupKeyboardNavigation(): void {
	// Create debounced version of moveFocus for arrow keys (50ms debounce)
	const debouncedMoveFocus = debounce(moveFocus, 50);
	
	document.addEventListener('keydown', (e) => {
		// Handle watch history modal
		const watchHistoryModal = document.getElementById('watch-history-modal');
		if (watchHistoryModal && !watchHistoryModal.classList.contains('hidden')) {
			if (e.key === 'Escape' || e.key === 'Backspace') {
				e.preventDefault();
				watchHistoryModal.classList.add('hidden');
				currentHistoryType = null;
				return;
			}
			
			// Arrow key navigation in modal (debounced)
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				debouncedMoveFocus('down');
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				debouncedMoveFocus('up');
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				debouncedMoveFocus('right');
			} else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				debouncedMoveFocus('left');
			} else if (e.key === 'Enter') {
				e.preventDefault();
				const activeEl = document.activeElement as HTMLElement;
				if (activeEl) {
					activeEl.click();
				}
			}
			return;
		}
		
		// Handle settings modal
		if (!screens.settingsModal?.classList.contains('hidden')) {
			if (e.key === 'Escape' || e.key === 'Backspace') {
				e.preventDefault();
				// Hide form if open, otherwise close modal
				const formContainer = document.getElementById('profile-form-container');
				if (formContainer && !formContainer.classList.contains('hidden')) {
					formContainer.classList.add('hidden');
					setTimeout(() => {
						const addBtn = document.getElementById('add-profile-btn');
						if (addBtn) addBtn.focus();
					}, 50);
				} else {
					screens.settingsModal?.classList.add('hidden');
				}
				return;
			}
			
			// Arrow key navigation in modal (debounced)
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				debouncedMoveFocus('down');
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				debouncedMoveFocus('up');
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				debouncedMoveFocus('right');
			} else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				debouncedMoveFocus('left');
			} else if (e.key === 'Enter') {
				e.preventDefault();
				const activeEl = document.activeElement as HTMLElement;
				// If it's an input, don't click, let it handle enter naturally
				if (activeEl && activeEl.tagName !== 'INPUT') {
					activeEl.click();
				} else if (activeEl && activeEl.tagName === 'INPUT') {
					// Submit form on enter in input
					const form = activeEl.closest('form');
					if (form) {
						form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
					}
				}
			}
			return;
		}
		
		// Handle login screen navigation
		if (currentScreen === 'login') {
			// Arrow key navigation (debounced for performance)
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				debouncedMoveFocus('down');
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				debouncedMoveFocus('up');
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				debouncedMoveFocus('right');
			} else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				debouncedMoveFocus('left');
			} else if (e.key === 'Enter') {
				e.preventDefault();
				const activeEl = document.activeElement as HTMLElement;
				if (activeEl) {
					// If it's the login form submit button or any other button, click it
					if (activeEl.tagName === 'BUTTON' || activeEl.tagName === 'A') {
						activeEl.click();
					} else if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT') {
						// For form inputs, submit the form if it's the last input
						const form = activeEl.closest('form');
						if (form && activeEl.id === 'pass') {
							// If we're on the password field, submit the form
							form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
						}
					}
				}
			}
			return;
		}
		
		// Arrow key navigation (debounced for performance)
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			debouncedMoveFocus('down');
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			debouncedMoveFocus('up');
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			debouncedMoveFocus('right');
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			debouncedMoveFocus('left');
		} else if (e.key === 'Enter') {
			e.preventDefault();
			(document.activeElement as HTMLElement)?.click();
		} else if (e.key === 'Backspace' || e.key === 'Escape') {
			e.preventDefault();
			
			const activeEl = document.activeElement as HTMLElement;
			
			// Check if we're on a content card (movie/series/channel)
			const isContentCard = activeEl?.classList.contains('content-card');
			const isEpisodeCard = activeEl?.classList.contains('episode-card');
			
			// If on a content card, go back to first category in sidebar
			if (isContentCard || isEpisodeCard) {
				const firstCategory = document.querySelector<HTMLElement>('.sidebar-category-btn');
				if (firstCategory) {
					firstCategory.focus();
					firstCategory.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				}
				return;
			}
			
			// Otherwise, use back button if it exists
			let backBtn: HTMLElement | null = null;
			
			if (currentScreen === 'player') {
				backBtn = document.getElementById('player-back-btn');
			} else if (currentScreen === 'livetv') {
				backBtn = document.getElementById('livetv-back-btn');
			} else if (currentScreen === 'movies') {
				backBtn = document.getElementById('movies-back-btn');
			} else if (currentScreen === 'series') {
				backBtn = document.getElementById('series-back-btn');
			} else if (currentScreen === 'episodes') {
				backBtn = document.getElementById('episodes-back-btn');
			}
			
			// If back button exists, click it
			if (backBtn) {
				if (currentScreen === 'player') {
					stopAllPlayers();
				}
				backBtn.click();
			}
		} else if (e.key === 'PageDown' && currentScreen === 'livetv') {
			e.preventDefault();
			playNextChannel();
		} else if (e.key === 'PageUp' && currentScreen === 'livetv') {
			e.preventDefault();
			playPrevChannel();
		}
	});
}

/**
 * Setup search handlers
 */
function setupSearchHandlers(): void {
	setupLiveTVSearch(liveChannels);
	setupMoviesSearch(movies);
	setupSeriesSearch(series);
}

/**
 * Application initialization
 */
(async () => {
	// Initialize i18n
	const lang = await getStoredLanguage();
	await loadTranslations(lang);
	updatePageTranslations();
	
	// Set initial active language button on login screen
	document.querySelectorAll('.login-lang-btn').forEach(btn => {
		const btnLang = btn.getAttribute('data-lang');
		if (btnLang === lang) {
			btn.classList.add('active');
		} else {
			btn.classList.remove('active');
		}
	});
	
	currentScreen = showScreen('loading', screens);
	await new Promise(resolve => setTimeout(resolve, 1000));
	
	// Check for active profile first
	activeProfileId = await getActiveProfileId();
	const profiles = await loadProfiles();
	
	if (activeProfileId && profiles.length > 0) {
		const activeProfile = profiles.find(p => p.id === activeProfileId);
		if (activeProfile) {
			creds = activeProfile.credentials;
			await loadData();
			initRenderers();
			updateMainScreenCounts(liveChannels, movies, series, userInfo);
			// showScreen handles automatic focus (Requirement 6.1)
			currentScreen = showScreen('main', screens);
		} else {
			currentScreen = showScreen('login', screens);
		}
	} else {
		// Fallback to old credentials system
		creds = await loadCreds();
		if (creds.host && creds.user && creds.pass) {
			// Migrate to profile system
			const profile = await addProfile('Ana IPTV', creds);
			await setActiveProfileId(profile.id);
			activeProfileId = profile.id;
			
			await loadData();
			initRenderers();
			updateMainScreenCounts(liveChannels, movies, series, userInfo);
			// showScreen handles automatic focus (Requirement 6.1)
			currentScreen = showScreen('main', screens);
		} else {
			currentScreen = showScreen('login', screens);
		}
	}
	
	setupEventHandlers();
	setupKeyboardNavigation();
	setupSearchHandlers();
	

	
	// Initialize navigation system with focus recovery (Requirement 5.5)
	initializeNavigation();
})();
