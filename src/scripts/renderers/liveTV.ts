/**
 * Live TV rendering module
 * Handles rendering and playback of live TV channels
 */

import { t } from '../../i18n/utils';
import { buildStreamUrl } from '../api';
import { playVideo, getLivePlayer, stopLivePlayer } from '../player';
import type { LiveChannel, Category, Credentials, VirtualScrollState, ScreenName } from '../../types';
let currentChannelIndex = -1;
let currentChannelList: LiveChannel[] = [];
let virtualScrollState: VirtualScrollState = { items: [], rendered: 0, batchSize: 50 };

// Module state for credentials and screen navigation
let moduleCredentials: Credentials | null = null;
let moduleShowScreen: ((screen: ScreenName) => void) | null = null;

/**
 * Initialize module with credentials and screen navigation
 * @param creds - User credentials
 * @param showScreenFn - Function to show screen
 */
export function initLiveTVModule(
	creds: Credentials,
	showScreenFn: (screen: ScreenName) => void
): void {
	moduleCredentials = creds;
	moduleShowScreen = showScreenFn;
}

/**
 * Render live TV categories sidebar
 * @param liveCategories - Array of live TV categories
 * @param liveChannels - Array of all live channels
 */
export function renderLiveTVCategories(
	liveCategories: Category[],
	liveChannels: LiveChannel[]
): void {
	const container = document.getElementById('livetv-categories');
	if (!container) return;
	
	container.innerHTML = '';
	
	liveCategories.forEach(cat => {
		const btn = document.createElement('button');
		btn.className = 'focusable sidebar-category-btn w-full text-left px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm';
		btn.textContent = cat.category_name;
		btn.onclick = () => {
			const filtered = liveChannels.filter(ch => ch.category_id == cat.category_id);
			renderLiveChannels(filtered, cat.category_name, liveCategories, liveChannels);
		};
		container.appendChild(btn);
	});
}

/**
 * Render live channels list
 * @param channels - Array of channels to render
 * @param categoryName - Category name (null for all channels)
 * @param liveCategories - Array of all categories
 * @param liveChannels - Array of all channels
 */
export function renderLiveChannels(
	channels: LiveChannel[],
	categoryName: string | null,
	liveCategories: Category[],
	liveChannels: LiveChannel[]
): void {
	const container = document.getElementById('livetv-categories');
	if (!container) return;
	
	container.innerHTML = '';
	
	currentChannelList = channels;
	currentChannelIndex = -1;
	
	// Add back button if viewing a specific category
	if (categoryName) {
		const backBtn = document.createElement('button');
		backBtn.className = 'focusable sidebar-category-btn flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm';
		backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg><span>${t('common.backToCategories')}</span>`;
		backBtn.onclick = () => renderLiveTVCategories(liveCategories, liveChannels);
		container.appendChild(backBtn);
		
		const title = document.createElement('div');
		title.className = 'px-3 py-2 text-sm font-semibold text-gray-300';
		title.textContent = categoryName;
		container.appendChild(title);
	}
	
	// Initialize virtual scroll
	virtualScrollState.items = channels;
	virtualScrollState.rendered = 0;
	
	const list = document.createElement('div');
	list.className = 'channel-list space-y-1 flex-1 overflow-auto custom-scroll';
	container.appendChild(list);
	
	renderChannelBatch(list);
	
	// Setup infinite scroll
	list.addEventListener('scroll', () => {
		if (list.scrollHeight - list.scrollTop - list.clientHeight < 200) {
			renderChannelBatch(list);
		}
	});
}

/**
 * Render a batch of channels (virtual scrolling)
 * @param container - Container element to append channels to
 */
function renderChannelBatch(container: HTMLElement): void {
	const state = virtualScrollState;
	const end = Math.min(state.rendered + state.batchSize, state.items.length);
	
	for (let i = state.rendered; i < end; i++) {
		const ch = state.items[i] as LiveChannel;
		
		const itemContainer = document.createElement('div');
		itemContainer.className = 'flex items-center gap-1';
		
		const btn = document.createElement('button');
		btn.className = 'focusable content-card flex-1 text-left px-3 py-2 rounded-lg hover:bg-indigo-500/20 transition text-sm flex items-center gap-2';
		
		// Add channel icon if available
		if (ch.stream_icon) {
			const img = document.createElement('img');
			img.src = ch.stream_icon;
			img.className = 'w-8 h-8 rounded object-cover';
			img.loading = 'lazy';
			img.onerror = () => img.remove();
			btn.appendChild(img);
		}
		
		const name = document.createElement('span');
		name.textContent = ch.name;
		name.className = 'truncate';
		btn.appendChild(name);
		btn.onclick = () => playLiveTV(ch);
		
		// Add favorite button
		const favBtn = document.createElement('button');
		favBtn.className = 'focusable p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition';
		favBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
		favBtn.title = t('favorites.addRemove');
		favBtn.onclick = async (e) => {
			e.stopPropagation();
			const { isFavorite, addToFavorites, removeFromFavorites } = await import('../storage');
			const isFav = await isFavorite('live', ch.stream_id.toString());
			const svg = favBtn.querySelector('svg');
			if (isFav) {
				await removeFromFavorites('live', ch.stream_id.toString());
				if (svg) svg.setAttribute('fill', 'none');
			} else {
				await addToFavorites({
					id: ch.stream_id.toString(),
					name: ch.name,
					type: 'live',
					icon: ch.stream_icon,
					timestamp: Date.now()
				});
				if (svg) svg.setAttribute('fill', 'currentColor');
			}
		};
		
		// Check if already favorite and update icon
		(async () => {
			const { isFavorite } = await import('../storage');
			const isFav = await isFavorite('live', ch.stream_id.toString());
			const svg = favBtn.querySelector('svg');
			if (isFav && svg) svg.setAttribute('fill', 'currentColor');
		})();
		
		itemContainer.appendChild(btn);
		itemContainer.appendChild(favBtn);
		container.appendChild(itemContainer);
	}
	
	state.rendered = end;
}

/**
 * Play live TV channel
 * @param channel - Channel to play
 */
export async function playLiveTV(channel: LiveChannel): Promise<void> {
	if (!moduleCredentials) {
		console.error('Credentials required to play channel. Call initLiveTVModule first.');
		return;
	}
	
	const creds = moduleCredentials;
	
	const url = buildStreamUrl(creds, channel.stream_id, 'live');
	const currentEl = document.getElementById('livetv-current');
	if (currentEl) currentEl.textContent = channel.name;
	
	currentChannelIndex = currentChannelList.findIndex(ch => ch.stream_id === channel.stream_id);
	
	// Set current playing item
	const { setCurrentPlayingItem } = await import('../playerState');
	setCurrentPlayingItem({
		id: channel.stream_id.toString(),
		name: channel.name,
		type: 'live',
		icon: channel.stream_icon
	});
	
	// Play using shared player module
	playVideo('live', { url });
	
	// Add to watch history
	const { addToWatchHistory } = await import('../storage');
	await addToWatchHistory({
		id: channel.stream_id.toString(),
		type: 'live',
		name: channel.name,
		timestamp: Date.now()
	});
}

/**
 * Play next channel in current list
 */
export function playNextChannel(): void {
	if (currentChannelList.length === 0) return;
	currentChannelIndex = (currentChannelIndex + 1) % currentChannelList.length;
	playLiveTV(currentChannelList[currentChannelIndex]);
}

/**
 * Play previous channel in current list
 */
export function playPrevChannel(): void {
	if (currentChannelList.length === 0) return;
	currentChannelIndex = (currentChannelIndex - 1 + currentChannelList.length) % currentChannelList.length;
	playLiveTV(currentChannelList[currentChannelIndex]);
}

/**
 * Setup live TV search functionality
 * @param liveChannels - Array of all live channels
 */
export function setupLiveTVSearch(liveChannels: LiveChannel[]): void {
	const searchInput = document.getElementById('livetv-search') as HTMLInputElement;
	if (!searchInput) return;
	
	searchInput.addEventListener('input', (e) => {
		const q = (e.target as HTMLInputElement).value.toLowerCase();
		const filtered = liveChannels.filter(ch => ch.name.toLowerCase().includes(q));
		renderLiveChannels(filtered, null, [], liveChannels);
	});
}

/**
 * Stop and cleanup live TV player
 */
export function stopLiveTVPlayer(): void {
	stopLivePlayer();
}
