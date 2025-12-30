/**
 * Movies rendering module
 * Handles rendering and playback of VOD/movie content
 */

import { t } from '../../i18n/utils';
import { fetchMovieInfo } from '../api';
import { playVideo, getVODPlayer, stopVODPlayer } from '../player';
import type { Movie, Category, Credentials, VirtualScrollState, ScreenName } from '../../types';
let virtualScrollState: VirtualScrollState = { items: [], rendered: 0, batchSize: 30 };

// Module state for credentials and screen navigation
let moduleCredentials: Credentials | null = null;
let moduleShowScreen: ((screen: ScreenName) => void) | null = null;

/**
 * Initialize module with credentials and screen navigation
 * @param creds - User credentials
 * @param showScreenFn - Function to show screen
 */
export function initMoviesModule(
	creds: Credentials,
	showScreenFn: (screen: ScreenName) => void
): void {
	moduleCredentials = creds;
	moduleShowScreen = showScreenFn;
}

/**
 * Render movie categories sidebar
 * @param movieCategories - Array of movie categories
 * @param movies - Array of all movies
 */
export function renderMovieCategories(
	movieCategories: Category[],
	movies: Movie[]
): void {
	const container = document.getElementById('movies-categories');
	if (!container) return;
	
	container.innerHTML = '';
	
	movieCategories.forEach(cat => {
		const btn = document.createElement('button');
		btn.className = 'focusable sidebar-category-btn w-full text-left px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm';
		btn.textContent = cat.category_name;
		btn.onclick = () => {
			const filtered = movies.filter(m => m.category_id == cat.category_id);
			renderMovieList(filtered, cat.category_name, movieCategories, movies);
		};
		container.appendChild(btn);
	});
	
	renderMovieList(movies, null, movieCategories, movies);
}

/**
 * Render movies list
 * @param items - Array of movies to render
 * @param categoryName - Category name (null for all movies)
 * @param movieCategories - Array of all categories
 * @param movies - Array of all movies
 */
export function renderMovieList(
	items: Movie[],
	categoryName: string | null,
	movieCategories: Category[],
	movies: Movie[]
): void {
	const catContainer = document.getElementById('movies-categories');
	
	// Add back button if viewing a specific category
	if (categoryName && catContainer) {
		catContainer.innerHTML = '';
		const backBtn = document.createElement('button');
		backBtn.className = 'focusable sidebar-category-btn flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm';
		backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg><span>${t('common.backToCategories')}</span>`;
		backBtn.onclick = () => renderMovieCategories(movieCategories, movies);
		catContainer.appendChild(backBtn);
		
		const title = document.createElement('div');
		title.className = 'px-3 py-2 text-sm font-semibold text-gray-300';
		title.textContent = categoryName;
		catContainer.appendChild(title);
	}
	
	const container = document.getElementById('movies-list');
	if (!container) return;
	
	container.innerHTML = '';
	
	// Initialize virtual scroll
	virtualScrollState.items = items;
	virtualScrollState.rendered = 0;
	
	renderMovieBatch(container);
	
	// Setup infinite scroll
	const scrollParent = container.parentElement;
	if (scrollParent) {
		scrollParent.onscroll = () => {
			if (scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight < 400) {
				renderMovieBatch(container);
			}
		};
	}
}

/**
 * Render a batch of movies (virtual scrolling)
 * @param container - Container element to append movies to
 */
function renderMovieBatch(container: HTMLElement): void {
	const state = virtualScrollState;
	const end = Math.min(state.rendered + state.batchSize, state.items.length);
	
	const fragment = document.createDocumentFragment();
	
	for (let i = state.rendered; i < end; i++) {
		const item = state.items[i] as Movie;
		const card = document.createElement('button');
		card.className = 'focusable content-card rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition flex flex-col gap-2 relative';
		
		const imgContainer = document.createElement('div');
		imgContainer.className = 'relative';
		
		const img = document.createElement('img');
		img.src = item.stream_icon || item.cover || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="150"%3E%3Crect fill="%23333" width="100" height="150"/%3E%3C/svg%3E';
		img.className = 'w-full aspect-[2/3] object-cover rounded-lg';
		img.loading = 'lazy';
		
		// Add favorite button overlay
		const favBtn = document.createElement('button');
		favBtn.className = 'focusable absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 hover:bg-black/80 transition';
		favBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
		favBtn.title = t('favorites.addRemove');
		favBtn.onclick = async (e) => {
			e.stopPropagation();
			const { isFavorite, addToFavorites, removeFromFavorites } = await import('../storage');
			const isFav = await isFavorite('movie', item.stream_id.toString());
			const svg = favBtn.querySelector('svg');
			if (isFav) {
				await removeFromFavorites('movie', item.stream_id.toString());
				if (svg) svg.setAttribute('fill', 'none');
			} else {
				await addToFavorites({
					id: item.stream_id.toString(),
					name: item.name,
					type: 'movie',
					icon: item.stream_icon || item.cover,
					timestamp: Date.now()
				});
				if (svg) svg.setAttribute('fill', 'currentColor');
			}
		};
		
		// Check if already favorite and update icon
		(async () => {
			const { isFavorite } = await import('../storage');
			const isFav = await isFavorite('movie', item.stream_id.toString());
			const svg = favBtn.querySelector('svg');
			if (isFav && svg) svg.setAttribute('fill', 'currentColor');
		})();
		
		imgContainer.appendChild(img);
		imgContainer.appendChild(favBtn);
		
		const name = document.createElement('div');
		name.className = 'text-sm font-medium text-center line-clamp-2';
		name.textContent = item.name;
		
		card.appendChild(imgContainer);
		card.appendChild(name);
		card.onclick = () => playMovie(item);
		fragment.appendChild(card);
	}
	
	container.appendChild(fragment);
	state.rendered = end;
}

/**
 * Play movie
 * @param item - Movie to play
 */
export async function playMovie(item: Movie): Promise<void> {
	if (!moduleCredentials) {
		console.error('Credentials required to play movie. Call initMoviesModule first.');
		return;
	}
	
	const creds = moduleCredentials;
	const showScreenFn = moduleShowScreen;
	
	try {
		const data = await fetchMovieInfo(creds, item.stream_id);
		const info = data.info || {};
		const ext = (info as any).container_extension || item.container_extension || 'mp4';
		const { host, port, user, pass } = creds;
		const base = /^https?:\/\//i.test(host) ? host : `http://${host}`;
		const fullBase = base.replace(/\/+$/, '') + (port && !/:\d+$/.test(base) ? `:${port}` : '');
		const url = `${fullBase}/movie/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${item.stream_id}.${ext}`;
		
		const currentInfo = document.getElementById('current-info');
		if (currentInfo) {
			currentInfo.textContent = `${item.name} (${ext.toUpperCase()})`;
		}
		
		// Set current playing item
		const { setCurrentPlayingItem } = await import('../playerState');
		setCurrentPlayingItem({
			id: item.stream_id.toString(),
			name: item.name,
			type: 'movie',
			icon: item.stream_icon || item.cover
		});
		
		// Play using shared player module
		playVideo('vod', { url });
		
		// Add to watch history
		const { addToWatchHistory } = await import('../storage');
		await addToWatchHistory({
			id: item.stream_id.toString(),
			type: 'movie',
			name: item.name,
			timestamp: Date.now()
		});
		
		if (showScreenFn) {
			showScreenFn('player');
		}
	} catch (err) {
		console.error('Movie play error:', err);
	}
}

/**
 * Setup movies search functionality
 * @param movies - Array of all movies
 */
export function setupMoviesSearch(movies: Movie[]): void {
	const searchInput = document.getElementById('movies-search') as HTMLInputElement;
	if (!searchInput) return;
	
	searchInput.addEventListener('input', (e) => {
		const q = (e.target as HTMLInputElement).value.toLowerCase();
		const filtered = movies.filter(m => m.name.toLowerCase().includes(q));
		renderMovieList(filtered, null, [], movies);
	});
}

/**
 * Get the current player instance
 * @returns Video.js player instance or null
 */
export function getPlayer(): any {
	return getVODPlayer();
}

/**
 * Stop and cleanup movie player
 */
export function stopMoviePlayer(): void {
	stopVODPlayer();
}
