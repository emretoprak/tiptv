/**
 * Shared Video.js player module
 * Handles player initialization, configuration, and playback
 */

export type PlayerType = 'vod' | 'live';

export interface PlaybackOptions {
	url: string;
	mimeType?: string;
	autoplay?: boolean;
	onError?: (error: any) => void;
}

/**
 * Player instances
 */
let vodPlayer: any = null; // For movies and series
let livePlayer: any = null; // For live TV

/**
 * Get or initialize VOD player (movies/series)
 */
export function getVODPlayer(): any {
	if (!vodPlayer) {
		const playerElement = document.getElementById('player');
		if (!playerElement) {
			console.error('Player element not found');
			return null;
		}

		vodPlayer = (window as any).videojs('player', {
			fluid: true,
			autoplay: true,
			aspectRatio: '16:9',
			controls: true,
			preload: 'auto',
			techOrder: ['html5'],
			html5: {
				vhs: {
					overrideNative: !((window as any).videojs.browser.IS_SAFARI),
					enableLowInitialPlaylist: true,
					smoothQualityChange: true,
					useBandwidthFromLocalStorage: true,
					handlePartialData: true
				},
				nativeAudioTracks: false,
				nativeVideoTracks: false
			},
			sources: []
		});

		// Add error handler
		vodPlayer.on('error', function() {
			const error = vodPlayer.error();
			if (error) {
				console.error('VOD Player error:', error.code, error.message);
			}
		});
		
		// Log when player is ready
		vodPlayer.ready(function() {
			console.log('VOD Player ready');
		});
	}

	return vodPlayer;
}

/**
 * Get or initialize Live TV player
 */
export function getLivePlayer(): any {
	if (!livePlayer) {
		const playerElement = document.getElementById('livetv-player');
		if (!playerElement) {
			console.error('Live TV player element not found');
			return null;
		}

		livePlayer = (window as any).videojs('livetv-player', {
			liveui: true,
			fluid: true,
			autoplay: true,
			aspectRatio: '16:9',
			controls: true,
			preload: 'auto',
			techOrder: ['html5'],
			html5: {
				vhs: {
					overrideNative: !((window as any).videojs.browser.IS_SAFARI),
					enableLowInitialPlaylist: true,
					smoothQualityChange: true,
					useBandwidthFromLocalStorage: true,
					handlePartialData: true,
					withCredentials: false
				},
				nativeAudioTracks: false,
				nativeVideoTracks: false
			},
			sources: []
		});

		// Add error handler
		livePlayer.on('error', function() {
			const error = livePlayer.error();
			if (error) {
				console.error('Live Player error:', error.code, error.message);
			}
		});
		
		// Log when player is ready
		livePlayer.ready(function() {
			console.log('Live Player ready');
		});
	}

	return livePlayer;
}

/**
 * Detect MIME type from URL or extension
 */
export function detectMimeType(url: string, extension?: string): string {
	const ext = extension || url.split('.').pop()?.toLowerCase() || '';

	// Check URL patterns first
	if (url.includes('.m3u8') || url.includes('/live/')) {
		return 'application/x-mpegURL'; // HLS
	}

	// Check by extension
	switch (ext) {
		case 'm3u8':
			return 'application/x-mpegURL'; // HLS
		case 'mpd':
			return 'application/dash+xml'; // DASH
		case 'ts':
			return 'video/mp2t'; // MPEG-TS
		case 'mp4':
			return 'video/mp4';
		case 'webm':
			return 'video/webm';
		case 'mkv':
			console.warn('MKV format not natively supported, attempting playback as MP4...');
			return 'video/mp4'; // Try as MP4
		case 'avi':
			return 'video/x-msvideo';
		default:
			return 'video/mp4'; // Default fallback
	}
}

/**
 * Play video with the appropriate player
 */
export function playVideo(
	playerType: PlayerType,
	options: PlaybackOptions
): void {
	const player = playerType === 'live' ? getLivePlayer() : getVODPlayer();
	
	if (!player) {
		console.error('Player not available');
		return;
	}

	const { url, mimeType, autoplay = true, onError } = options;
	const detectedMimeType = mimeType || detectMimeType(url);

	console.log(`Playing ${playerType} stream:`, url, 'Type:', detectedMimeType);

	// Reset player first
	try {
		player.reset();
	} catch (e) {
		// Ignore reset errors
	}

	// Set source
	player.src({
		src: url,
		type: detectedMimeType,
		withCredentials: false
	});

	// Play
	if (autoplay) {
		// Small delay to ensure player is ready
		setTimeout(() => {
			player.play().then(() => {
				console.log('Playback started successfully');
				// Try to enter fullscreen
				if (player.requestFullscreen) {
					player.requestFullscreen();
				} else if (player.el().requestFullscreen) {
					player.el().requestFullscreen();
				}
			}).catch((error: Error) => {
				console.error('Failed to play:', error);
				if (onError) {
					onError(error);
				} else {
					// Try alternative MIME types
					tryAlternativePlayback(player, url);
				}
			});
		}, 100);
	}
}

/**
 * Try alternative playback methods for problematic streams
 */
function tryAlternativePlayback(player: any, url: string): void {
	console.log('Trying alternative playback methods...');

	const alternatives = [
		{ src: url, type: 'application/x-mpegURL' },
		{ src: url, type: 'application/vnd.apple.mpegurl' },
		{ src: url, type: 'video/mp4' },
		{ src: url, type: 'video/mp2t' }
	];

	let attemptIndex = 0;

	const tryNext = () => {
		if (attemptIndex >= alternatives.length) {
			console.error('All playback methods failed');
			return;
		}

		const alt = alternatives[attemptIndex++];
		console.log(`Trying type: ${alt.type}`);

		player.src(alt);
		player.play().catch(() => {
			setTimeout(tryNext, 500);
		});
	};

	tryNext();
}

/**
 * Stop and cleanup VOD player
 */
export function stopVODPlayer(): void {
	if (vodPlayer) {
		try {
			// Exit fullscreen if active
			if (document.fullscreenElement) {
				document.exitFullscreen().catch(() => {});
			}
			
			// Pause first
			vodPlayer.pause();
			
			// Reset source safely
			try {
				vodPlayer.src({ src: '', type: 'video/mp4' });
			} catch (e) {
				// Ignore source errors during cleanup
			}
			
			// Remove any lingering overlays
			const playerEl = vodPlayer.el();
			if (playerEl) {
				playerEl.style.pointerEvents = '';
			}
		} catch (error) {
			console.error('Error stopping VOD player:', error);
		}
	}
}

/**
 * Stop and cleanup Live player
 */
export function stopLivePlayer(): void {
	if (livePlayer) {
		try {
			// Exit fullscreen if active
			if (document.fullscreenElement) {
				document.exitFullscreen().catch(() => {});
			}
			
			// Pause first
			livePlayer.pause();
			
			// Reset source safely
			try {
				livePlayer.src({ src: '', type: 'video/mp4' });
			} catch (e) {
				// Ignore source errors during cleanup
			}
			
			// Remove any lingering overlays
			const playerEl = livePlayer.el();
			if (playerEl) {
				playerEl.style.pointerEvents = '';
			}
		} catch (error) {
			console.error('Error stopping Live player:', error);
		}
	}
}

/**
 * Stop all players
 */
export function stopAllPlayers(): void {
	console.log('Stopping all players...');
	
	stopVODPlayer();
	stopLivePlayer();
	
	// Clean up any lingering fullscreen or modal overlays
	setTimeout(() => {
		// Remove any vjs-modal that might be blocking
		const modals = document.querySelectorAll('.vjs-modal-dialog');
		if (modals.length > 0) {
			console.log('Removing', modals.length, 'video.js modals');
			modals.forEach(el => {
				(el as HTMLElement).style.display = 'none';
			});
		}
		
		// Ensure body doesn't have pointer-events blocked
		document.body.style.pointerEvents = '';
		
		// Remove any fullscreen classes
		document.body.classList.remove('vjs-full-window');
		
		// Check for any elements with high z-index that might be blocking
		const highZElements = Array.from(document.querySelectorAll('*')).filter(el => {
			const zIndex = parseInt(window.getComputedStyle(el).zIndex);
			return zIndex > 50 && !el.classList.contains('focusable');
		});
		
		if (highZElements.length > 0) {
			console.warn('Found elements with high z-index:', highZElements);
		}
		
		console.log('Player cleanup complete');
	}, 100);
}

/**
 * Dispose of all players (cleanup on app exit)
 */
export function disposePlayers(): void {
	if (vodPlayer) {
		try {
			vodPlayer.dispose();
			vodPlayer = null;
		} catch (error) {
			console.error('Error disposing VOD player:', error);
		}
	}

	if (livePlayer) {
		try {
			livePlayer.dispose();
			livePlayer = null;
		} catch (error) {
			console.error('Error disposing Live player:', error);
		}
	}
}
