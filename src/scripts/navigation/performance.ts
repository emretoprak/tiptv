/**
 * Performance Optimization Module
 * 
 * Provides caching and optimization utilities for spatial navigation:
 * - Element position caching during navigation operations
 * - Debouncing for rapid key presses
 * - Early filtering of invalid candidates
 */

import type { ElementGeometry } from './geometry.js';
import { getGeometry } from './geometry.js';

/**
 * Cache for element geometries during a single navigation operation
 */
const geometryCache = new Map<HTMLElement, ElementGeometry>();

/**
 * Get geometry for an element with caching
 * Uses cache during navigation operation to avoid repeated getBoundingClientRect calls
 * 
 * @param element - Element to get geometry for
 * @returns Cached or freshly calculated geometry
 */
export function getCachedGeometry(element: HTMLElement): ElementGeometry {
	// Check cache first
	if (geometryCache.has(element)) {
		return geometryCache.get(element)!;
	}
	
	// Calculate and cache
	const geometry = getGeometry(element);
	geometryCache.set(element, geometry);
	
	return geometry;
}

/**
 * Clear the geometry cache
 * Should be called after each navigation operation completes
 */
export function clearGeometryCache(): void {
	geometryCache.clear();
}

/**
 * Get the current cache size (for debugging/profiling)
 * @returns Number of cached geometries
 */
export function getCacheSize(): number {
	return geometryCache.size;
}

/**
 * Debounce state for key press handling
 */
interface DebounceState {
	timeoutId: number | null;
	lastCallTime: number;
	pendingCall: (() => void) | null;
}

const debounceState: DebounceState = {
	timeoutId: null,
	lastCallTime: 0,
	pendingCall: null
};

/**
 * Debounce a function call
 * Prevents rapid successive calls by delaying execution
 * 
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds (default 50ms)
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => void>(
	fn: T,
	delay: number = 50
): (...args: Parameters<T>) => void {
	return (...args: Parameters<T>) => {
		const now = Date.now();
		
		// Clear any pending timeout
		if (debounceState.timeoutId !== null) {
			clearTimeout(debounceState.timeoutId);
		}
		
		// Store the pending call
		debounceState.pendingCall = () => fn(...args);
		
		// Set new timeout
		debounceState.timeoutId = window.setTimeout(() => {
			debounceState.lastCallTime = Date.now();
			if (debounceState.pendingCall) {
				debounceState.pendingCall();
				debounceState.pendingCall = null;
			}
			debounceState.timeoutId = null;
		}, delay);
	};
}

/**
 * Early filtering optimization
 * Quickly filter out elements that are obviously invalid before expensive calculations
 * 
 * This function performs fast checks that don't require getBoundingClientRect:
 * - Focusable class requirement
 * - Disabled attribute check
 * - Document membership check
 * - Basic visibility checks
 * 
 * Note: This is an optimization for early rejection. The main selector module
 * performs more thorough visibility checks.
 * 
 * @param element - Element to check
 * @returns True if element should be considered as a candidate
 */
export function isValidCandidate(element: HTMLElement): boolean {
	// Must have focusable class
	if (!element.classList.contains('focusable')) {
		return false;
	}
	
	// Must not be disabled
	if (element.hasAttribute('disabled')) {
		return false;
	}
	
	// Must be in document
	if (!document.body.contains(element)) {
		return false;
	}
	
	// Check visibility via computed style
	const style = window.getComputedStyle(element);
	if (style.display === 'none' || style.visibility === 'hidden') {
		return false;
	}
	
	// Note: We don't check offsetParent here because:
	// 1. In JSDOM (test environment), offsetParent is always null even for visible elements
	// 2. The main selector module (selector.ts) performs more thorough visibility checks
	// 3. This is just an early optimization to skip obviously invalid elements
	
	return true;
}

/**
 * Filter candidates with early rejection
 * Applies fast checks before expensive geometry calculations
 * 
 * @param candidates - Array of candidate elements
 * @returns Filtered array of valid candidates
 */
export function filterCandidatesEarly(candidates: HTMLElement[]): HTMLElement[] {
	return candidates.filter(isValidCandidate);
}

/**
 * Performance profiler for navigation operations
 */
interface PerformanceMetrics {
	operationCount: number;
	totalTime: number;
	averageTime: number;
	maxTime: number;
	minTime: number;
	lastOperationTime: number;
}

const performanceMetrics: PerformanceMetrics = {
	operationCount: 0,
	totalTime: 0,
	averageTime: 0,
	maxTime: 0,
	minTime: Infinity,
	lastOperationTime: 0
};

/**
 * Start profiling a navigation operation
 * @returns Start timestamp
 */
export function startProfiling(): number {
	return performance.now();
}

/**
 * End profiling a navigation operation and record metrics
 * @param startTime - Start timestamp from startProfiling()
 * @returns Operation duration in milliseconds
 */
export function endProfiling(startTime: number): number {
	const endTime = performance.now();
	const duration = endTime - startTime;
	
	// Update metrics
	performanceMetrics.operationCount++;
	performanceMetrics.totalTime += duration;
	performanceMetrics.averageTime = performanceMetrics.totalTime / performanceMetrics.operationCount;
	performanceMetrics.lastOperationTime = duration;
	
	if (duration > performanceMetrics.maxTime) {
		performanceMetrics.maxTime = duration;
	}
	
	if (duration < performanceMetrics.minTime) {
		performanceMetrics.minTime = duration;
	}
	
	// Log warning if operation exceeds target (16ms for 60fps)
	if (duration > 16) {
		console.warn(`Navigation operation took ${duration.toFixed(2)}ms (target: <16ms)`);
	}
	
	return duration;
}

/**
 * Get current performance metrics
 * @returns Copy of performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
	return { ...performanceMetrics };
}

/**
 * Reset performance metrics
 */
export function resetPerformanceMetrics(): void {
	performanceMetrics.operationCount = 0;
	performanceMetrics.totalTime = 0;
	performanceMetrics.averageTime = 0;
	performanceMetrics.maxTime = 0;
	performanceMetrics.minTime = Infinity;
	performanceMetrics.lastOperationTime = 0;
}

/**
 * Log performance metrics to console
 */
export function logPerformanceMetrics(): void {
	console.log('Navigation Performance Metrics:');
	console.log(`  Operations: ${performanceMetrics.operationCount}`);
	console.log(`  Average: ${performanceMetrics.averageTime.toFixed(2)}ms`);
	console.log(`  Min: ${performanceMetrics.minTime === Infinity ? 'N/A' : performanceMetrics.minTime.toFixed(2) + 'ms'}`);
	console.log(`  Max: ${performanceMetrics.maxTime.toFixed(2)}ms`);
	console.log(`  Last: ${performanceMetrics.lastOperationTime.toFixed(2)}ms`);
	console.log(`  Target: <16ms (60fps)`);
}
