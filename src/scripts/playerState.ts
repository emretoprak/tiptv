/**
 * Player state management
 * Tracks currently playing item for favorites and other features
 */

export interface PlayingItem {
	id: string;
	name: string;
	type: 'live' | 'movie' | 'series';
	icon?: string;
}

let currentPlayingItem: PlayingItem | null = null;

export function setCurrentPlayingItem(item: PlayingItem | null): void {
	currentPlayingItem = item;
	
	// Dispatch event for UI updates
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('playingItemChanged', { detail: item }));
	}
}

export function getCurrentPlayingItem(): PlayingItem | null {
	return currentPlayingItem;
}
