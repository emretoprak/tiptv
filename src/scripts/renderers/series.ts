/**
 * Series rendering module
 * Handles rendering and playback of series/TV show content
 */

import { t } from '../../i18n/utils';
import { fetchSeriesInfo } from '../api';
import { playVideo, getVODPlayer, stopVODPlayer } from '../player';
import type {
	Series,
	Category,
	Credentials,
	VirtualScrollState,
	ScreenName,
	Episode,
	SeriesEpisodes
} from '../../types';
let virtualScrollState: VirtualScrollState = { items: [], rendered: 0, batchSize: 30 };

// Module state for credentials and screen navigation
let moduleCredentials: Credentials | null = null;
let moduleShowScreen: ((screen: ScreenName) => void) | null = null;

/**
 * Initialize module with credentials and screen navigation
 * @param creds - User credentials
 * @param showScreenFn - Function to show screen
 */
export function initSeriesModule(
	creds: Credentials,
	showScreenFn: (screen: ScreenName) => void
): void {
	moduleCredentials = creds;
	moduleShowScreen = showScreenFn;
}

/**
 * Render series categories sidebar
 * @param seriesCategories - Array of series categories
 * @param series - Array of all series
 */
export function renderSeriesCategories(
	seriesCategories: Category[],
	series: Series[]
): void {
	const container = document.getElementById('series-categories');
	if (!container) return;
	
	container.innerHTML = '';
	
	seriesCategories.forEach(cat => {
		const btn = document.createElement('button');
		btn.className = 'focusable sidebar-category-btn w-full text-left px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm';
		btn.textContent = cat.category_name;
		btn.onclick = () => {
			const filtered = series.filter(s => s.category_id == cat.category_id);
			renderSeriesList(filtered, cat.category_name, seriesCategories, series);
		};
		container.appendChild(btn);
	});
	
	renderSeriesList(series, null, seriesCategories, series);
}

/**
 * Render series list
 * @param items - Array of series to render
 * @param categoryName - Category name (null for all series)
 * @param seriesCategories - Array of all categories
 * @param series - Array of all series
 */
export function renderSeriesList(
	items: Series[],
	categoryName: string | null,
	seriesCategories: Category[],
	series: Series[]
): void {
	const catContainer = document.getElementById('series-categories');
	
	// Add back button if viewing a specific category
	if (categoryName && catContainer) {
		catContainer.innerHTML = '';
		const backBtn = document.createElement('button');
		backBtn.className = 'focusable sidebar-category-btn flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm';
		backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg><span>${t('common.backToCategories')}</span>`;
		backBtn.onclick = () => renderSeriesCategories(seriesCategories, series);
		catContainer.appendChild(backBtn);
		
		const title = document.createElement('div');
		title.className = 'px-3 py-2 text-sm font-semibold text-gray-300';
		title.textContent = categoryName;
		catContainer.appendChild(title);
	}
	
	const container = document.getElementById('series-list');
	if (!container) return;
	
	container.innerHTML = '';
	
	// Initialize virtual scroll
	virtualScrollState.items = items;
	virtualScrollState.rendered = 0;
	
	renderSeriesBatch(container);
	
	// Setup infinite scroll
	const scrollParent = container.parentElement;
	if (scrollParent) {
		scrollParent.onscroll = () => {
			if (scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight < 400) {
				renderSeriesBatch(container);
			}
		};
	}
}

/**
 * Render a batch of series (virtual scrolling)
 * @param container - Container element to append series to
 */
function renderSeriesBatch(container: HTMLElement): void {
	const state = virtualScrollState;
	const end = Math.min(state.rendered + state.batchSize, state.items.length);
	
	const fragment = document.createDocumentFragment();
	
	for (let i = state.rendered; i < end; i++) {
		const item = state.items[i] as Series;
		const card = document.createElement('button');
		card.className = 'focusable content-card rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition flex flex-col gap-2 relative';
		
		const imgContainer = document.createElement('div');
		imgContainer.className = 'relative';
		
		const img = document.createElement('img');
		img.src = item.cover || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="150"%3E%3Crect fill="%23333" width="100" height="150"/%3E%3C/svg%3E';
		img.className = 'w-full aspect-[2/3] object-cover rounded-lg';
		img.loading = 'lazy';
		img.onerror = () => {
			img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="150"%3E%3Crect fill="%23333" width="100" height="150"/%3E%3C/svg%3E';
		};
		
		// Add favorite button overlay
		const favBtn = document.createElement('button');
		favBtn.className = 'focusable absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 hover:bg-black/80 transition';
		favBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
		favBtn.title = t('favorites.addRemove');
		favBtn.onclick = async (e) => {
			e.stopPropagation();
			const { isFavorite, addToFavorites, removeFromFavorites } = await import('../storage');
			const isFav = await isFavorite('series', item.series_id.toString());
			const svg = favBtn.querySelector('svg');
			if (isFav) {
				await removeFromFavorites('series', item.series_id.toString());
				if (svg) svg.setAttribute('fill', 'none');
			} else {
				await addToFavorites({
					id: item.series_id.toString(),
					name: item.name,
					type: 'series',
					icon: item.cover,
					timestamp: Date.now()
				});
				if (svg) svg.setAttribute('fill', 'currentColor');
			}
		};
		
		// Check if already favorite and update icon
		(async () => {
			const { isFavorite } = await import('../storage');
			const isFav = await isFavorite('series', item.series_id.toString());
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
		card.onclick = () => showSeriesEpisodes(item);
		fragment.appendChild(card);
	}
	
	container.appendChild(fragment);
	state.rendered = end;
}

/**
 * Show series episodes screen
 * @param item - Series to show episodes for
 */
export async function showSeriesEpisodes(item: Series): Promise<void> {
	if (!moduleCredentials) {
		console.error('Credentials required to fetch series info. Call initSeriesModule first.');
		return;
	}
	
	const creds = moduleCredentials;
	const showScreenFn = moduleShowScreen;
	
	const player = getVODPlayer();
	if (player) {
		player.pause();
		player.src({ src: '', type: 'video/mp4' });
	}
	
	try {
		const data = await fetchSeriesInfo(creds, item.series_id);
		const episodes = data.episodes || {};
		
		const titleEl = document.getElementById('episodes-title');
		if (titleEl) titleEl.textContent = item.name;
		
		const seasonsContainer = document.getElementById('episodes-seasons');
		if (!seasonsContainer) return;
		
		seasonsContainer.innerHTML = '';
		
		const seasons = Object.keys(episodes).sort((a, b) => parseInt(a) - parseInt(b));
		seasons.forEach(season => {
			const btn = document.createElement('button');
			btn.className = 'focusable sidebar-category-btn w-full text-left px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm';
			btn.textContent = `${t('series.season')} ${season}`;
			btn.onclick = () => renderEpisodes(item, episodes[season], season);
			seasonsContainer.appendChild(btn);
		});
		
		if (seasons.length > 0) {
			renderEpisodes(item, episodes[seasons[0]], seasons[0]);
		}
		
		if (showScreenFn) {
			showScreenFn('episodes');
		}
	} catch (err) {
		console.error('Series info error:', err);
	}
}

/**
 * Render episodes list for a season
 * @param seriesItem - Series information
 * @param episodeList - Array of episodes
 * @param season - Season number
 */
function renderEpisodes(
	seriesItem: Series,
	episodeList: Episode[],
	season: string
): void {
	const container = document.getElementById('episodes-list');
	if (!container) return;
	
	container.innerHTML = '';
	
	episodeList.forEach(ep => {
		const card = document.createElement('button');
		card.className = 'focusable episode-card text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition';
		const duration = ep.info?.duration ? ` - ${ep.info.duration}` : '';
		card.innerHTML = `
			<div class="font-semibold mb-1">${t('series.episode')} ${ep.episode_num}${duration}</div>
			<div class="text-sm text-gray-400 line-clamp-2">${ep.title || ep.info?.name || t('series.noTitle')}</div>
		`;
		card.onclick = () => playEpisode(seriesItem, ep, season);
		container.appendChild(card);
	});
}

/**
 * Play episode
 * @param seriesItem - Series information
 * @param episode - Episode to play
 * @param season - Season number
 */
async function playEpisode(
	seriesItem: Series,
	episode: Episode,
	season: string
): Promise<void> {
	if (!moduleCredentials) {
		console.error('Credentials required to play episode. Call initSeriesModule first.');
		return;
	}
	
	const creds = moduleCredentials;
	const showScreenFn = moduleShowScreen;
	const { host, user, pass } = creds;
	const base = /^https?:\/\//i.test(host) ? host : `http://${host}`;
	const fullBase = base.replace(/\/+$/, '');
	const streamId = episode.id || episode.stream_id;
	const ext = episode.container_extension || 'mkv';
	const url = `${fullBase}/series/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${streamId}.${ext}`;
	
	const currentInfo = document.getElementById('current-info');
	if (currentInfo) {
		currentInfo.textContent = `${seriesItem.name} - S${season}E${episode.episode_num} (${ext.toUpperCase()})`;
	}
	
	// Set current playing item
	const { setCurrentPlayingItem } = await import('../playerState');
	setCurrentPlayingItem({
		id: seriesItem.series_id.toString(),
		name: `${seriesItem.name} - S${season}E${episode.episode_num}`,
		type: 'series',
		icon: seriesItem.cover
	});
	
	// Play using shared player module
	playVideo('vod', { url });
	
	// Add to watch history
	const { addToWatchHistory } = await import('../storage');
	await addToWatchHistory({
		id: `${seriesItem.series_id}${streamId}`,
		type: 'series',
		name: `${seriesItem.name} - S${season}E${episode.episode_num}`,
		timestamp: Date.now()
	});
	
	if (showScreenFn) {
		showScreenFn('player');
	}
}

/**
 * Setup series search functionality
 * @param series - Array of all series
 */
export function setupSeriesSearch(series: Series[]): void {
	const searchInput = document.getElementById('series-search') as HTMLInputElement;
	if (!searchInput) return;
	
	searchInput.addEventListener('input', (e) => {
		const q = (e.target as HTMLInputElement).value.toLowerCase();
		const filtered = series.filter(s => s.name.toLowerCase().includes(q));
		renderSeriesList(filtered, null, [], series);
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
 * Stop and cleanup series player
 */
export function stopSeriesPlayer(): void {
	stopVODPlayer();
}
