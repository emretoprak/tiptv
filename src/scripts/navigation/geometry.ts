/**
 * Geometry Calculator Module
 * 
 * Provides geometric calculations for spatial navigation including:
 * - Center point calculation from bounding rectangles
 * - Euclidean distance calculation
 * - Angle calculation between points
 * - Direction detection with threshold
 * - Angle normalization
 * 
 * Note: For performance-critical operations, use getCachedGeometry from performance.ts
 * instead of getGeometry to avoid repeated getBoundingClientRect calls.
 */

/**
 * Focus direction types
 */
export type FocusDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Element position and geometry information
 */
export interface ElementGeometry {
  /** Element reference */
  element: HTMLElement;
  /** Bounding rectangle */
  rect: DOMRect;
  /** Center point X coordinate */
  centerX: number;
  /** Center point Y coordinate */
  centerY: number;
}

/**
 * Get geometry information for an element
 * Calculates center point from bounding rectangle
 * 
 * @param element - Element to analyze
 * @returns Geometry information including center point
 */
export function getGeometry(element: HTMLElement): ElementGeometry {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  return {
    element,
    rect,
    centerX,
    centerY
  };
}

/**
 * Calculate Euclidean distance between two points
 * Uses the formula: sqrt((x2-x1)² + (y2-y1)²)
 * 
 * @param x1 - First point X coordinate
 * @param y1 - First point Y coordinate
 * @param x2 - Second point X coordinate
 * @param y2 - Second point Y coordinate
 * @returns Distance in pixels
 */
export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points in degrees
 * Returns angle from point 1 to point 2
 * - 0° = right
 * - 90° = down
 * - 180° or -180° = left
 * - -90° = up
 * 
 * @param x1 - First point X coordinate
 * @param y1 - First point Y coordinate
 * @param x2 - Second point X coordinate
 * @param y2 - Second point Y coordinate
 * @returns Angle in degrees (-180 to 180)
 */
export function calculateAngle(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const radians = Math.atan2(dy, dx);
  return radians * (180 / Math.PI);
}

/**
 * Get the target angle for a given direction
 * 
 * @param direction - Direction to get angle for
 * @returns Target angle in degrees
 */
export function getDirectionAngle(direction: FocusDirection): number {
  switch (direction) {
    case 'right':
      return 0;
    case 'down':
      return 90;
    case 'left':
      return 180;
    case 'up':
      return -90;
  }
}

/**
 * Normalize angle difference to 0-180 degree range
 * This ensures we always get the smallest angle between two directions
 * 
 * @param angleDiff - Raw angle difference
 * @returns Normalized angle difference (0-180 degrees)
 */
export function normalizeAngleDiff(angleDiff: number): number {
  // Get absolute value
  let normalized = Math.abs(angleDiff);
  
  // Reduce to 0-360 range first
  normalized = normalized % 360;
  
  // If greater than 180, take the complement
  if (normalized > 180) {
    normalized = 360 - normalized;
  }
  
  return normalized;
}

/**
 * Check if an element is in the specified direction from origin
 * Requires minimum displacement threshold to be considered in that direction
 * 
 * @param origin - Origin element geometry
 * @param target - Target element geometry
 * @param direction - Direction to check
 * @param threshold - Minimum displacement threshold in pixels (default 20)
 * @returns True if target is in direction from origin
 */
export function isInDirection(
  origin: ElementGeometry,
  target: ElementGeometry,
  direction: FocusDirection,
  threshold: number = 20
): boolean {
  const dx = target.centerX - origin.centerX;
  const dy = target.centerY - origin.centerY;
  
  switch (direction) {
    case 'up':
      // Target must be above origin by at least threshold
      return dy < -threshold;
    case 'down':
      // Target must be below origin by at least threshold
      return dy > threshold;
    case 'left':
      // Target must be left of origin by at least threshold
      return dx < -threshold;
    case 'right':
      // Target must be right of origin by at least threshold
      return dx > threshold;
  }
}

/**
 * Calculate angle difference between actual angle and desired direction
 * Returns normalized difference (0-180 degrees)
 * 
 * @param actualAngle - Actual angle to target element
 * @param direction - Desired direction
 * @returns Normalized angle difference (0-180 degrees)
 */
export function calculateAngleDifference(
  actualAngle: number,
  direction: FocusDirection
): number {
  const targetAngle = getDirectionAngle(direction);
  const diff = actualAngle - targetAngle;
  return normalizeAngleDiff(diff);
}
