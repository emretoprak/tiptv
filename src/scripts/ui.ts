/**
 * UI rendering utilities
 * Helper functions for updating UI elements
 */

import type { LiveChannel, Movie, Series, UserInfo, ScreenElements, ScreenName } from '../types';
import { setCurrentFocus, restoreFocus } from './navigation/focusManager';

// Console error tracking
interface ConsoleError {
	timestamp: Date;
	message: string;
	source?: string;
	line?: number;
	column?: number;
	stack?: string;
	type: 'error' | 'warn' | 'log';
}

let consoleErrors: ConsoleError[] = [];
const MAX_CONSOLE_ERRORS = 50;

/**
 * Initialize console error tracking
 */
export function initConsoleErrorTracking(): void {
	// Override console.error
	const originalError = console.error;
	console.error = function(...args: any[]) {
		addConsoleError('error', args.join(' '));
		originalError.apply(console, args);
	};

	// Override console.warn
	const originalWarn = console.warn;
	console.warn = function(...args: any[]) {
		addConsoleError('warn', args.join(' '));
		originalWarn.apply(console, args);
	};

	// Listen for unhandled errors
	window.addEventListener('error', (event) => {
		addConsoleError('error', event.message, event.filename, event.lineno, event.colno, event.error?.stack);
	});

	// Listen for unhandled promise rejections
	window.addEventListener('unhandledrejection', (event) => {
		addConsoleError('error', `Unhandled Promise Rejection: ${event.reason}`);
	});
}

/**
 * Add a console error to the tracking list
 */
function addConsoleError(
	type: 'error' | 'warn' | 'log',
	message: string,
	source?: string,
	line?: number,
	column?: number,
	stack?: string
): void {
	const error: ConsoleError = {
		timestamp: new Date(),
		message,
		source,
		line,
		column,
		stack,
		type
	};

	consoleErrors.unshift(error);
	
	// Keep only the latest errors
	if (consoleErrors.length > MAX_CONSOLE_ERRORS) {
		consoleErrors = consoleErrors.slice(0, MAX_CONSOLE_ERRORS);
	}

	// Update the console errors display if it's visible
	updateConsoleErrorsDisplay();
}

/**
 * Update the console errors display in settings modal
 */
export function updateConsoleErrorsDisplay(): void {
	const container = document.getElementById('console-errors-list');
	if (!container) return;

	if (consoleErrors.length === 0) {
		container.innerHTML = `
			<div class="text-gray-400 text-center py-2" data-i18n="settings.noErrors">
				No errors detected
			</div>
		`;
		return;
	}

	container.innerHTML = consoleErrors.map(error => {
		const timeStr = error.timestamp.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});

		const typeColor = error.type === 'error' ? 'text-red-400' : 
						 error.type === 'warn' ? 'text-yellow-400' : 'text-blue-400';

		const sourceInfo = error.source ? 
			`<div class="text-gray-500 text-xs mt-1">
				${error.source}${error.line ? `:${error.line}` : ''}${error.column ? `:${error.column}` : ''}
			</div>` : '';

		return `
			<div class="border border-white/10 rounded p-2 bg-black/30">
				<div class="flex justify-between items-start gap-2">
					<span class="${typeColor} font-semibold text-xs uppercase">${error.type}</span>
					<span class="text-gray-400 text-xs">${timeStr}</span>
				</div>
				<div class="text-white text-xs mt-1 break-words">${escapeHtml(error.message)}</div>
				${sourceInfo}
				${error.stack ? `<details class="mt-2">
					<summary class="text-gray-400 text-xs cursor-pointer">Stack Trace</summary>
					<pre class="text-gray-300 text-xs mt-1 whitespace-pre-wrap">${escapeHtml(error.stack)}</pre>
				</details>` : ''}
			</div>
		`;
	}).join('');
}

/**
 * Clear all console errors
 */
export function clearConsoleErrors(): void {
	consoleErrors = [];
	updateConsoleErrorsDisplay();
}

/**
 * Get current console errors
 */
export function getConsoleErrors(): ConsoleError[] {
	return [...consoleErrors];
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Update main screen content counts
 * @param liveChannels - Array of live channels
 * @param movies - Array of movies
 * @param series - Array of series
 * @param userInfo - User account information
 */
export function updateMainScreenCounts(
	liveChannels: LiveChannel[],
	movies: Movie[],
	series: Series[],
	userInfo: UserInfo | null
): void {
	const livetvCount = document.getElementById('livetv-count');
	const moviesCount = document.getElementById('movies-count');
	const seriesCount = document.getElementById('series-count');
	const expiryDate = document.getElementById('expiry-date');
	
	if (livetvCount) livetvCount.textContent = `${liveChannels.length} kanal`;
	if (moviesCount) moviesCount.textContent = `${movies.length} film`;
	if (seriesCount) seriesCount.textContent = `${series.length} dizi`;
	
	if (userInfo?.exp_date && expiryDate) {
		const date = new Date(parseInt(userInfo.exp_date) * 1000);
		expiryDate.textContent = date.toLocaleDateString('tr-TR');
	}
}

import { t } from '../i18n/utils';

/**
 * Update last update time display
 */
export function updateLastUpdateTime(): void {
	const lastUpdate = localStorage.getItem('xt_last_update');
	if (!lastUpdate) return;
	
	const date = new Date(lastUpdate);
	
	const settingsEl = document.getElementById('settings-last-update');
	if (settingsEl) {
		settingsEl.textContent = date.toLocaleString('tr-TR');
	}
	
	const headerEl = document.getElementById('header-last-update');
	if (headerEl) {
		headerEl.textContent = `${t('header.lastUpdate')} ${date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		})}`;
	}
}

/**
 * Show specified screen and hide all others
 * Implements automatic focus on screen transitions (Requirements 6.1, 6.2, 6.3)
 * 
 * @param screen - Screen name to show
 * @param screens - Collection of screen elements
 * @returns The screen name that was shown
 */
export function showScreen(screen: ScreenName, screens: ScreenElements): ScreenName {
	const {
		loadingScreen,
		loginScreen,
		mainScreen,
		livetvScreen,
		moviesScreen,
		seriesScreen,
		episodesScreen,
		playerScreen,
		settingsModal
	} = screens;
	
	// Hide all screens
	[
		loadingScreen,
		loginScreen,
		mainScreen,
		livetvScreen,
		moviesScreen,
		seriesScreen,
		episodesScreen,
		playerScreen
	].forEach(s => s?.classList.add('hidden'));
	
	settingsModal?.classList.add('hidden');
	
	// Show requested screen
	if (screen === 'loading') loadingScreen?.classList.remove('hidden');
	else if (screen === 'login') loginScreen?.classList.remove('hidden');
	else if (screen === 'main') mainScreen?.classList.remove('hidden');
	else if (screen === 'livetv') livetvScreen?.classList.remove('hidden');
	else if (screen === 'movies') moviesScreen?.classList.remove('hidden');
	else if (screen === 'series') seriesScreen?.classList.remove('hidden');
	else if (screen === 'episodes') episodesScreen?.classList.remove('hidden');
	else if (screen === 'player') playerScreen?.classList.remove('hidden');
	
	// Requirement 6.1: Automatic focus on screen transitions
	// Requirement 6.3: Focus recovery when no element is focused
	// Add 100ms timeout for focus guarantee (allows DOM to settle)
	setTimeout(() => {
		focusFirstElement();
	}, 100);
	
	return screen;
}

/**
 * Focus the first focusable element in the current context
 * Implements focus recovery logic (Requirement 6.3)
 * 
 * @returns True if an element was focused, false otherwise
 */
function focusFirstElement(): boolean {
	// Get all focusable elements that are not disabled
	const focusables = document.querySelectorAll<HTMLElement>('.focusable:not([disabled])');
	
	// Find the first valid focusable element
	for (const element of focusables) {
		// Check if element is visible
		const style = window.getComputedStyle(element);
		if (style.display === 'none' || style.visibility === 'hidden') {
			continue;
		}
		
		// Check if element has non-zero dimensions
		const rect = element.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) {
			continue;
		}
		
		// Check if element is in the document
		if (!document.body.contains(element)) {
			continue;
		}
		
		// Focus the element and update Focus Manager state
		element.focus();
		setCurrentFocus(element);
		return true;
	}
	
	return false;
}

/**
 * Show a modal and automatically focus the first element within it
 * Implements automatic focus on modal opening (Requirement 6.2)
 * 
 * @param modal - Modal element to show
 */
export function showModal(modal: HTMLElement | null): void {
	if (!modal) return;
	
	// Show the modal
	modal.classList.remove('hidden');
	
	// Requirement 6.2: Automatic focus on modal opening
	// Add 100ms timeout for focus guarantee (allows DOM to settle)
	setTimeout(() => {
		focusFirstModalElement(modal);
	}, 100);
}

/**
 * Focus the first focusable element within a modal
 * 
 * @param modal - Modal element
 * @returns True if an element was focused, false otherwise
 */
function focusFirstModalElement(modal: HTMLElement): boolean {
	// Get all focusable elements within the modal that are not disabled
	const focusables = modal.querySelectorAll<HTMLElement>('.focusable:not([disabled])');
	
	// Find the first valid focusable element
	for (const element of focusables) {
		// Check if element is visible
		const style = window.getComputedStyle(element);
		if (style.display === 'none' || style.visibility === 'hidden') {
			continue;
		}
		
		// Check if element has non-zero dimensions
		const rect = element.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) {
			continue;
		}
		
		// Check if element is in the document
		if (!document.body.contains(element)) {
			continue;
		}
		
		// Focus the element and update Focus Manager state
		element.focus();
		setCurrentFocus(element);
		return true;
	}
	
	return false;
}
