/**
 * Sidebar Navigation Module
 * Handles sidebar-specific navigation logic including vertical containment
 * and search input isolation
 * 
 * Requirements:
 * - 3.1: Navigate down within sidebar to next element below
 * - 3.2: Navigate up within sidebar to previous element above
 * - 3.5: Block vertical navigation from search inputs
 */

import { getGeometry, isInDirection, type FocusDirection } from './geometry.js';
import { isInSidebar } from './context.js';

/**
 * Check if an element is a search input in the sidebar
 * @param element - Element to check
 * @returns True if element is a search input
 */
export function isSearchInput(element: HTMLElement): boolean {
	return element.tagName === 'INPUT' && element.getAttribute('type') === 'search';
}

/**
 * Check if sidebar navigation should be used for the current element and direction
 * @param current - Currently focused element
 * @param direction - Direction of navigation
 * @returns True if sidebar navigation should be used
 */
export function shouldUseSidebarNavigation(current: HTMLElement, direction: FocusDirection): boolean {
	// Only use sidebar navigation for vertical movement (up/down)
	if (direction !== 'up' && direction !== 'down') {
		return false;
	}
	
	// Only use sidebar navigation if current element is in sidebar
	if (!isInSidebar(current)) {
		return false;
	}
	
	// Block vertical navigation from search inputs (Requirement 3.5)
	// This allows normal text input behavior
	if (isSearchInput(current)) {
		return false; // Will be handled by caller to maintain focus
	}
	
	return true;
}

/**
 * Navigate within the sidebar vertically
 * Implements vertical containment - up/down stays within sidebar
 * Filters out search inputs from candidates
 * 
 * @param current - Currently focused element
 * @param direction - Direction to navigate (up or down)
 * @param allFocusable - All focusable elements in current context
 * @returns Next element to focus, or null if no valid candidate
 */
export function navigateSidebar(
	current: HTMLElement,
	direction: FocusDirection,
	allFocusable: HTMLElement[]
): HTMLElement | null {
	// Only handle vertical navigation
	if (direction !== 'up' && direction !== 'down') {
		return null;
	}
	
	// Get current element geometry
	const currentGeometry = getGeometry(current);
	
	// Filter to only sidebar elements, excluding search inputs
	// Requirements 3.1, 3.2: Vertical containment within sidebar
	// Requirement 3.5: Filter out search inputs from candidates
	const sidebarCandidates = allFocusable.filter(el => {
		// Must be in sidebar
		if (!isInSidebar(el)) {
			return false;
		}
		
		// Must not be the current element
		if (el === current) {
			return false;
		}
		
		// Filter out search inputs from navigation candidates
		if (isSearchInput(el)) {
			return false;
		}
		
		return true;
	});
	
	// Find candidates in the specified direction
	const candidatesInDirection = sidebarCandidates.filter(el => {
		const candidateGeometry = getGeometry(el);
		return isInDirection(currentGeometry, candidateGeometry, direction, 20);
	});
	
	// If no candidates in direction, return null (maintain focus)
	if (candidatesInDirection.length === 0) {
		return null;
	}
	
	// Find the nearest candidate by distance
	// For vertical navigation in sidebar, we prioritize vertical distance
	let nearestCandidate: HTMLElement | null = null;
	let nearestDistance = Infinity;
	
	for (const candidate of candidatesInDirection) {
		const candidateGeometry = getGeometry(candidate);
		
		// Calculate vertical distance (Y-axis only for sidebar vertical navigation)
		const verticalDistance = Math.abs(candidateGeometry.centerY - currentGeometry.centerY);
		
		if (verticalDistance < nearestDistance) {
			nearestDistance = verticalDistance;
			nearestCandidate = candidate;
		}
	}
	
	return nearestCandidate;
}
