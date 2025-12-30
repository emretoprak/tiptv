/**
 * Element Selector Module
 * Handles querying and filtering of focusable elements based on visibility,
 * context, and focusability criteria.
 */

/**
 * Query all focusable elements in the DOM that meet visibility and focusability criteria
 * @param container - Optional container to search within (defaults to document)
 * @returns Array of focusable elements that pass all filters
 */
export function queryFocusableElements(container: Document | HTMLElement = document): HTMLElement[] {
	const selector = '.focusable';
	const elements = container.querySelectorAll<HTMLElement>(selector);
	const focusable: HTMLElement[] = [];
	
	elements.forEach(element => {
		if (isFocusable(element)) {
			focusable.push(element);
		}
	});
	
	return focusable;
}

/**
 * Check if an element meets all focusability criteria
 * @param element - Element to check
 * @returns True if element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
	// Requirement 5.4: Must have "focusable" CSS class
	if (!element.classList.contains('focusable')) {
		return false;
	}
	
	// Requirement 5.3: Must not have disabled attribute
	if (element.hasAttribute('disabled')) {
		return false;
	}
	
	// Requirement 5.1 & 5.2: Must have non-zero dimensions and be visible
	if (!isVisible(element)) {
		return false;
	}
	
	return true;
}

/**
 * Check if an element is visible based on dimensions and offsetParent
 * Handles partially visible elements at viewport edges (Requirement 8.4)
 * @param element - Element to check
 * @returns True if element is visible
 */
export function isVisible(element: HTMLElement): boolean {
	// Requirement 5.2: Check offsetParent (null means element is hidden)
	if (element.offsetParent === null) {
		return false;
	}
	
	// Requirement 5.1: Check for non-zero dimensions
	const rect = element.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) {
		return false;
	}
	
	// Requirement 8.4: Include partially visible elements at viewport edges
	// An element is considered visible if any part of it is within the viewport
	// We don't exclude elements that are partially outside the viewport
	
	return true;
}

/**
 * Get all focusable elements in the current context
 * Handles modal context isolation
 * @returns Array of focusable elements in current context
 */
export function getAllFocusable(): HTMLElement[] {
	// Check for active modals
	const activeModal = getActiveModal();
	
	if (activeModal) {
		// Modal context: only return elements within the modal
		return queryFocusableElements(activeModal);
	}
	
	// Main context: return all focusable elements in document
	return queryFocusableElements(document);
}

/**
 * Get the currently active modal element, if any
 * Prioritizes topmost modal when multiple modals exist
 * @returns Active modal element or null
 */
export function getActiveModal(): HTMLElement | null {
	// Check watch history modal
	const watchHistoryModal = document.getElementById('watch-history-modal');
	const isWatchHistoryOpen = watchHistoryModal && !watchHistoryModal.classList.contains('hidden');
	
	// Check settings modal
	const settingsModal = document.getElementById('settings-modal');
	const isSettingsOpen = settingsModal && !settingsModal.classList.contains('hidden');
	
	// Return topmost modal (prioritize watch history over settings if both are open)
	if (isWatchHistoryOpen) {
		return watchHistoryModal;
	}
	
	if (isSettingsOpen) {
		return settingsModal;
	}
	
	return null;
}

/**
 * Filter elements by visibility
 * @param elements - Elements to filter
 * @returns Only visible elements
 */
export function filterVisible(elements: HTMLElement[]): HTMLElement[] {
	return elements.filter(element => isVisible(element));
}

/**
 * Filter elements by disabled state
 * @param elements - Elements to filter
 * @returns Only enabled elements
 */
export function filterEnabled(elements: HTMLElement[]): HTMLElement[] {
	return elements.filter(element => !element.hasAttribute('disabled'));
}

/**
 * Filter elements by focusable class requirement
 * @param elements - Elements to filter
 * @returns Only elements with focusable class
 */
export function filterFocusableClass(elements: HTMLElement[]): HTMLElement[] {
	return elements.filter(element => element.classList.contains('focusable'));
}
