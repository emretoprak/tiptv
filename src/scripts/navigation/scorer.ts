/**
 * Candidate Scorer Module
 * 
 * Provides scoring and ranking functionality for focus candidates in spatial navigation.
 * Combines distance and angle difference to determine the best candidate for focus movement.
 */

import { 
  type FocusDirection, 
  type ElementGeometry,
  calculateDistance,
  calculateAngle,
  normalizeAngleDiff
} from './geometry.js';

/**
 * Candidate scoring information
 */
export interface ScoredCandidate {
  /** Candidate element */
  element: HTMLElement;
  /** Element geometry */
  geometry: ElementGeometry;
  /** Euclidean distance from current element */
  distance: number;
  /** Angle difference from desired direction (0-180 degrees) */
  angleDiff: number;
  /** Combined score (lower is better) */
  score: number;
}

/**
 * Direction angle mapping
 * Maps each direction to its corresponding angle in degrees
 * - right: 0°
 * - down: 90°
 * - left: 180°
 * - up: -90°
 */
const DIRECTION_ANGLES: Record<FocusDirection, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: -90
};

/**
 * Get the target angle for a given direction
 * 
 * @param direction - Direction to get angle for
 * @returns Target angle in degrees
 */
export function getDirectionAngle(direction: FocusDirection): number {
  return DIRECTION_ANGLES[direction];
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

/**
 * Score a candidate for focus movement
 * Uses formula: score = distance + (angleDiff × 2)
 * Lower scores are better
 * 
 * @param current - Current element geometry
 * @param candidate - Candidate element geometry
 * @param direction - Desired direction
 * @returns Scored candidate with distance, angle difference, and combined score
 */
export function scoreCandidate(
  current: ElementGeometry,
  candidate: ElementGeometry,
  direction: FocusDirection
): ScoredCandidate {
  // Calculate Euclidean distance between center points
  const distance = calculateDistance(
    current.centerX,
    current.centerY,
    candidate.centerX,
    candidate.centerY
  );
  
  // Calculate angle from current to candidate
  const actualAngle = calculateAngle(
    current.centerX,
    current.centerY,
    candidate.centerX,
    candidate.centerY
  );
  
  // Calculate angle difference from desired direction
  const angleDiff = calculateAngleDifference(actualAngle, direction);
  
  // Calculate combined score: distance + (angleDiff × 2)
  // Angle is weighted more heavily (2x) than distance
  const score = distance + (angleDiff * 2);
  
  return {
    element: candidate.element,
    geometry: candidate,
    distance,
    angleDiff,
    score
  };
}

/**
 * Score multiple candidates and return them sorted by score (ascending)
 * 
 * @param current - Current element geometry
 * @param candidates - Array of candidate element geometries
 * @param direction - Desired direction
 * @returns Array of scored candidates sorted by score (best first)
 */
export function scoreCandidates(
  current: ElementGeometry,
  candidates: ElementGeometry[],
  direction: FocusDirection
): ScoredCandidate[] {
  // Score all candidates
  const scored = candidates.map(candidate => 
    scoreCandidate(current, candidate, direction)
  );
  
  // Sort by score (ascending - lower is better)
  scored.sort((a, b) => a.score - b.score);
  
  return scored;
}

/**
 * Find the best candidate from a list of candidates
 * Returns the candidate with the lowest score
 * 
 * @param current - Current element geometry
 * @param candidates - Array of candidate element geometries
 * @param direction - Desired direction
 * @returns Best candidate or null if no candidates
 */
export function findBestCandidate(
  current: ElementGeometry,
  candidates: ElementGeometry[],
  direction: FocusDirection
): ScoredCandidate | null {
  if (candidates.length === 0) {
    return null;
  }
  
  const scored = scoreCandidates(current, candidates, direction);
  return scored[0]; // First element has lowest score
}
