/**
 * Navigation and focus management module
 * Handles keyboard navigation and spatial focus movement
 * 
 * This module has been refactored to use a modular architecture:
 * - Geometry Calculator: Position and distance calculations
 * - Element Selector: Focusable element querying and filtering
 * - Context Manager: Navigation context detection
 * - Candidate Scorer: Focus candidate scoring and selection
 * - Focus Manager: Focus state tracking and restoration
 */

import type { FocusDirection } from './navigation/geometry.js';
import { 
	getGeometry, 
	isInDirection,
	type ElementGeometry 
} from './navigation/geometry.js';
import { getAllFocusable as getAllFocusableElements } from './navigation/selector.js';
import { 
	getActiveModal,
	isInSidebar,
	isInGrid 
} from './navigation/context.js';
import { 
	scoreCandidates,
	type ScoredCandidate 
} from './navigation/scorer.js';
import { 
	setCurrentFocus,
	saveFocus,
	restoreFocus,
	setFindNearestElementCallback,
	startFocusRecovery
} from './navigation/focusManager.js';
import {
	shouldUseGridNavigation,
	navigateGrid
} from './navigation/grid.js';
import {
	shouldUseSidebarNavigation,
	navigateSidebar,
	isSearchInput
} from './navigation/sidebar.js';
import {
	getCachedGeometry,
	clearGeometryCache,
	filterCandidatesEarly,
	startProfiling,
	endProfiling
} from './navigation/performance.js';

/**
 * Get all focusable elements that are currently visible
 * Uses Element Selector module for querying and filtering
 * @returns Array of visible focusable elements
 */
export function getAllFocusable(): HTMLElement[] {
	return getAllFocusableElements();
}

/**
 * Move focus in specified direction using spatial navigation
 * Uses modular architecture for geometry, scoring, and context management
 * 
 * Requirements implemented:
 * - 1.1: Move focus to nearest element in direction based on geometric position
 * - 1.4: Maintain focus when no candidates exist
 * - 1.5: Scroll element into view smoothly
 * - 7.2: Direction consistency check with 20px threshold
 * 
 * Performance optimizations:
 * - Element position caching during navigation operation
 * - Early filtering of invalid candidates
 * - Performance profiling (target < 16ms)
 * 
 * @param dir - Direction to move focus (up, down, left, right)
 */
export function moveFocus(dir: FocusDirection): void {
	// Start performance profiling
	const startTime = startProfiling();
	
	try {
		// Get all focusable elements using Element Selector module
		const focusable = getAllFocusable();
		if (!focusable.length) return;
		
		// Apply early filtering to skip obviously invalid elements
		const validFocusable = filterCandidatesEarly(focusable);
		if (!validFocusable.length) return;
	
		// Get current focused element
		const current = document.activeElement as HTMLElement;
		const currentIndex = validFocusable.indexOf(current);
		
		// If no element is focused, focus the first one (Requirement 6.3)
		if (currentIndex === -1) {
			const firstElement = validFocusable[0];
			if (firstElement) {
				firstElement.focus();
				firstElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				setCurrentFocus(firstElement);
			}
			return;
		}
	
		// Check if we should use sidebar navigation (Requirements 3.1, 3.2, 3.5)
		const useSidebarNav = shouldUseSidebarNavigation(current, dir);
		
		// Block vertical navigation from search inputs (Requirement 3.5)
		if (isInSidebar(current) && isSearchInput(current) && (dir === 'up' || dir === 'down')) {
			return; // Maintain current focus - no navigation
		}
		
		// Handle sidebar navigation with vertical containment
		if (useSidebarNav) {
			const nextElement = navigateSidebar(current, dir, validFocusable);
			
			if (nextElement) {
				// Move focus to the next element
				nextElement.focus();
				
				// Requirement 1.5: Scroll element into view with smooth behavior and nearest block
				nextElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				
				// Update Focus Manager state
				setCurrentFocus(nextElement);
				return;
			}
			
			// If sidebar navigation didn't find a candidate, maintain focus (vertical containment)
			// Requirements 3.1, 3.2: up/down stays in sidebar
			return;
		}
	
		// Handle cross-container navigation from sidebar to grid (right direction)
		// Requirements 3.3, 8.1, 8.3: Sidebar to grid navigation
		if (isInSidebar(current) && dir === 'right') {
			// Use spatial navigation to find grid elements
			// This maintains vertical alignment (prefers similar Y coordinate)
			const currentGeometry = getCachedGeometry(current);
			const gridCandidates: ElementGeometry[] = [];
			
			for (const el of validFocusable) {
				if (el === current) continue;
				
				// Look for grid elements (content cards) to the right
				if (el.classList.contains('content-card')) {
					const candidateGeometry = getCachedGeometry(el);
					
					// Check if element is to the right with threshold
					if (isInDirection(currentGeometry, candidateGeometry, dir, 20)) {
						gridCandidates.push(candidateGeometry);
					}
				}
			}
			
			// If grid candidates exist, use spatial scoring to maintain vertical alignment
			if (gridCandidates.length > 0) {
				const scoredCandidates = scoreCandidates(currentGeometry, gridCandidates, dir);
				
				if (scoredCandidates.length > 0) {
					const bestCandidate = scoredCandidates[0];
					
					// Move focus to the best candidate
					bestCandidate.element.focus();
					bestCandidate.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
					setCurrentFocus(bestCandidate.element);
					return;
				}
			}
			
			// If no grid candidates found, fall through to general spatial navigation
		}
	
		// Check if we should use grid navigation (Requirements 2.1-2.6)
		const useGridNav = shouldUseGridNavigation(current, dir);
		
		if (useGridNav) {
			// Get all grid elements (content cards or elements in grid columns)
			const gridElements = validFocusable.filter(el => 
				el.classList.contains('content-card') || el.closest('[data-nav-col]') !== null
			);
			
			// For horizontal navigation from grid, check for cross-container navigation first
			// Requirements 3.4, 8.1, 8.3: Grid to sidebar navigation (left direction)
			// Skip cross-container check if we're in main screen grid (data-nav-col)
			const isInMainScreenGrid = current.closest('[data-nav-col]') !== null;
			
			if ((dir === 'left' || dir === 'right') && !isInMainScreenGrid) {
				// Check if there are potential cross-container candidates
				const currentGeometry = getCachedGeometry(current);
				const crossContainerCandidates: ElementGeometry[] = [];
				
				for (const el of validFocusable) {
					if (el === current) continue;
					if (el.classList.contains('content-card')) continue; // Skip other grid elements
					
					const candidateGeometry = getCachedGeometry(el);
					
					// Check if element is in the correct direction with threshold
					if (isInDirection(currentGeometry, candidateGeometry, dir, 20)) {
						crossContainerCandidates.push(candidateGeometry);
					}
				}
				
				// If cross-container candidates exist, use spatial navigation for cross-container movement
				// This maintains vertical alignment (Requirement 8.1)
				if (crossContainerCandidates.length > 0) {
					const scoredCandidates = scoreCandidates(currentGeometry, crossContainerCandidates, dir);
					
					if (scoredCandidates.length > 0) {
						const bestCandidate = scoredCandidates[0];
						
						// Move focus to the best candidate
						bestCandidate.element.focus();
						bestCandidate.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
						setCurrentFocus(bestCandidate.element);
						return;
					}
				}
			}
			
			// Use grid navigation logic (includes wrapping)
			const nextElement = navigateGrid(current, dir, gridElements);
			
			if (nextElement) {
				// Move focus to the next element
				nextElement.focus();
				
				// Requirement 1.5: Scroll element into view with smooth behavior and nearest block
				nextElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				
				// Update Focus Manager state
				setCurrentFocus(nextElement);
				return;
			}
			
			// If grid navigation didn't find a candidate, fall through to spatial navigation
		}
	
		// Use Geometry Calculator to get current element geometry (with caching)
		const currentGeometry = getCachedGeometry(current);
		
		// Find all valid candidates in the specified direction
		// Requirement 7.2: Use 20px threshold for direction consistency check
		const candidateGeometries: ElementGeometry[] = [];
		
		for (let i = 0; i < validFocusable.length; i++) {
			if (i === currentIndex) continue; // Skip current element
			
			const el = validFocusable[i];
			const candidateGeometry = getCachedGeometry(el);
			
			// Use Geometry Calculator to check if element is in the correct direction
			// with 20px threshold (Requirement 7.2)
			if (isInDirection(currentGeometry, candidateGeometry, dir, 20)) {
				candidateGeometries.push(candidateGeometry);
			}
		}
		
		// Requirement 1.4: If no candidates found, maintain current focus
		if (candidateGeometries.length === 0) {
			return; // Focus preservation - no change
		}
		
		// Use Candidate Scorer to score and sort candidates
		// Requirement 1.3: Prioritize elements that are closer and more aligned
		const scoredCandidates = scoreCandidates(currentGeometry, candidateGeometries, dir);
		
		// Select the best candidate (lowest score)
		if (scoredCandidates.length > 0) {
			const bestCandidate = scoredCandidates[0];
			
			// Move focus to the best candidate
			bestCandidate.element.focus();
			
			// Requirement 1.5: Scroll element into view with smooth behavior and nearest block
			bestCandidate.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			
			// Update Focus Manager state
			setCurrentFocus(bestCandidate.element);
		}
	} finally {
		// Clear geometry cache after navigation completes
		clearGeometryCache();
		
		// End performance profiling
		endProfiling(startTime);
	}
}

/**
 * Find the nearest valid focusable element to a given element
 * Uses spatial navigation algorithm to find the closest element in any direction
 * 
 * @param current - Element to find nearest neighbor for
 * @returns Nearest valid focusable element or null
 */
function findNearestElement(current: HTMLElement): HTMLElement | null {
	try {
		const focusable = getAllFocusable();
		
		if (focusable.length === 0) {
			return null;
		}
		
		// Apply early filtering
		const validFocusable = filterCandidatesEarly(focusable);
		
		// Remove the current element from candidates
		const candidates = validFocusable.filter(el => el !== current);
		
		if (candidates.length === 0) {
			return null;
		}
		
		// Get geometry for current element (with caching)
		const currentGeometry = getCachedGeometry(current);
		
		// Convert all candidates to geometries (with caching)
		const candidateGeometries: ElementGeometry[] = candidates.map(el => getCachedGeometry(el));
		
		// Score all candidates by distance (ignore direction for nearest neighbor)
		// We'll use a simple distance-based scoring
		const scored = candidateGeometries.map(candidateGeometry => {
			const dx = candidateGeometry.centerX - currentGeometry.centerX;
			const dy = candidateGeometry.centerY - currentGeometry.centerY;
			const distance = Math.sqrt(dx * dx + dy * dy);
			
			return {
				element: candidateGeometry.element,
				distance: distance
			};
		});
		
		// Sort by distance (ascending)
		scored.sort((a, b) => a.distance - b.distance);
		
		// Return the closest element
		return scored.length > 0 ? scored[0].element : null;
	} finally {
		// Clear cache after operation
		clearGeometryCache();
	}
}

/**
 * Initialize the navigation system
 * Sets up focus recovery and other initialization tasks
 */
export function initializeNavigation(): void {
	// Set up the callback for finding nearest element (used by focus recovery)
	setFindNearestElementCallback(findNearestElement);
	
	// Start focus recovery monitoring
	startFocusRecovery();
}

/**
 * Export focus management functions for use by other modules
 */
export { saveFocus, restoreFocus, startFocusRecovery, stopFocusRecovery, isFocusRecoveryActive } from './navigation/focusManager.js';

/**
 * Export performance monitoring functions for debugging and profiling
 */
export { 
	getPerformanceMetrics, 
	resetPerformanceMetrics, 
	logPerformanceMetrics 
} from './navigation/performance.js';
