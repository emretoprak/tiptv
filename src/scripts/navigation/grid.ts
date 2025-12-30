/**
 * Grid Navigation Module
 * 
 * Provides specialized navigation logic for grid layouts including:
 * - Row and column detection by grouping elements with similar coordinates
 * - Horizontal navigation (left/right to adjacent cards)
 * - Vertical navigation with column preference
 * - Horizontal wrapping at row edges
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import type { FocusDirection, ElementGeometry } from './geometry.js';
import { getGeometry } from './geometry.js';

/**
 * Tolerance for grouping elements into rows/columns (pixels)
 * Elements within this tolerance are considered to be in the same row/column
 */
const GRID_ALIGNMENT_TOLERANCE = 10;

/**
 * Grid row information
 */
interface GridRow {
  /** Average Y coordinate of elements in this row */
  y: number;
  /** Elements in this row, sorted by X coordinate */
  elements: HTMLElement[];
}

/**
 * Grid column information
 */
interface GridColumn {
  /** Average X coordinate of elements in this column */
  x: number;
  /** Elements in this column, sorted by Y coordinate */
  elements: HTMLElement[];
}

/**
 * Detect grid rows by grouping elements with similar Y coordinates
 * 
 * @param elements - Elements to analyze
 * @returns Array of grid rows, sorted by Y coordinate
 */
export function detectGridRows(elements: HTMLElement[]): GridRow[] {
  if (elements.length === 0) return [];
  
  // Get geometries for all elements
  const geometries = elements.map(el => getGeometry(el));
  
  // Sort by Y coordinate
  geometries.sort((a, b) => a.centerY - b.centerY);
  
  // Group elements into rows based on Y coordinate similarity
  const rows: GridRow[] = [];
  let currentRow: ElementGeometry[] = [geometries[0]];
  
  for (let i = 1; i < geometries.length; i++) {
    const current = geometries[i];
    const previous = geometries[i - 1];
    
    // Check if current element is in the same row as previous
    if (Math.abs(current.centerY - previous.centerY) <= GRID_ALIGNMENT_TOLERANCE) {
      currentRow.push(current);
    } else {
      // Start a new row
      if (currentRow.length > 0) {
        rows.push(createRow(currentRow));
      }
      currentRow = [current];
    }
  }
  
  // Add the last row
  if (currentRow.length > 0) {
    rows.push(createRow(currentRow));
  }
  
  return rows;
}

/**
 * Create a grid row from element geometries
 * 
 * @param geometries - Element geometries in the row
 * @returns Grid row with average Y and sorted elements
 */
function createRow(geometries: ElementGeometry[]): GridRow {
  // Calculate average Y coordinate
  const avgY = geometries.reduce((sum, g) => sum + g.centerY, 0) / geometries.length;
  
  // Sort elements by X coordinate (left to right)
  const sortedGeometries = [...geometries].sort((a, b) => a.centerX - b.centerX);
  const elements = sortedGeometries.map(g => g.element);
  
  return {
    y: avgY,
    elements
  };
}

/**
 * Detect grid columns by grouping elements with similar X coordinates
 * 
 * @param elements - Elements to analyze
 * @returns Array of grid columns, sorted by X coordinate
 */
export function detectGridColumns(elements: HTMLElement[]): GridColumn[] {
  if (elements.length === 0) return [];
  
  // Get geometries for all elements
  const geometries = elements.map(el => getGeometry(el));
  
  // Sort by X coordinate
  geometries.sort((a, b) => a.centerX - b.centerX);
  
  // Group elements into columns based on X coordinate similarity
  const columns: GridColumn[] = [];
  let currentColumn: ElementGeometry[] = [geometries[0]];
  
  for (let i = 1; i < geometries.length; i++) {
    const current = geometries[i];
    const previous = geometries[i - 1];
    
    // Check if current element is in the same column as previous
    if (Math.abs(current.centerX - previous.centerX) <= GRID_ALIGNMENT_TOLERANCE) {
      currentColumn.push(current);
    } else {
      // Start a new column
      if (currentColumn.length > 0) {
        columns.push(createColumn(currentColumn));
      }
      currentColumn = [current];
    }
  }
  
  // Add the last column
  if (currentColumn.length > 0) {
    columns.push(createColumn(currentColumn));
  }
  
  return columns;
}

/**
 * Create a grid column from element geometries
 * 
 * @param geometries - Element geometries in the column
 * @returns Grid column with average X and sorted elements
 */
function createColumn(geometries: ElementGeometry[]): GridColumn {
  // Calculate average X coordinate
  const avgX = geometries.reduce((sum, g) => sum + g.centerX, 0) / geometries.length;
  
  // Sort elements by Y coordinate (top to bottom)
  const sortedGeometries = [...geometries].sort((a, b) => a.centerY - b.centerY);
  const elements = sortedGeometries.map(g => g.element);
  
  return {
    x: avgX,
    elements
  };
}

/**
 * Find the row containing a specific element
 * 
 * @param element - Element to find
 * @param rows - Grid rows to search
 * @returns Row containing the element, or null if not found
 */
export function findElementRow(element: HTMLElement, rows: GridRow[]): GridRow | null {
  for (const row of rows) {
    if (row.elements.includes(element)) {
      return row;
    }
  }
  return null;
}

/**
 * Find the column containing a specific element
 * 
 * @param element - Element to find
 * @param columns - Grid columns to search
 * @returns Column containing the element, or null if not found
 */
export function findElementColumn(element: HTMLElement, columns: GridColumn[]): GridColumn | null {
  for (const column of columns) {
    if (column.elements.includes(element)) {
      return column;
    }
  }
  return null;
}

/**
 * Navigate horizontally within a grid (left/right)
 * Implements horizontal wrapping at row edges
 * 
 * Requirements:
 * - 2.1: Right moves to card immediately to the right in same row
 * - 2.2: Left moves to card immediately to the left in same row
 * - 2.5: Right from rightmost wraps to leftmost in same row
 * - 2.6: Left from leftmost wraps to rightmost in same row
 * 
 * @param current - Currently focused element
 * @param direction - Direction to navigate (left or right)
 * @param gridElements - All elements in the grid
 * @returns Next element to focus, or null if not in grid
 */
export function navigateGridHorizontal(
  current: HTMLElement,
  direction: 'left' | 'right',
  gridElements: HTMLElement[]
): HTMLElement | null {
  // Check if we're in a main screen grid with data-nav-col
  const currentCol = current.closest('[data-nav-col]');
  
  if (currentCol) {
    const currentColNum = parseInt(currentCol.getAttribute('data-nav-col') || '0');
    
    // Find target column
    const targetColNum = direction === 'right' ? currentColNum + 1 : currentColNum - 1;
    
    // Find all columns
    const allCols = Array.from(document.querySelectorAll('[data-nav-col]'));
    const targetCol = allCols.find(col => parseInt(col.getAttribute('data-nav-col') || '0') === targetColNum);
    
    if (targetCol) {
      // Find focusable elements in target column
      const targetFocusable = Array.from(targetCol.querySelectorAll<HTMLElement>('.focusable'))
        .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
      
      if (targetFocusable.length > 0) {
        // Get current element's Y position
        const currentGeometry = getGeometry(current);
        
        // Find element in target column with closest Y position
        let bestElement = targetFocusable[0];
        let bestDistance = Infinity;
        
        for (const el of targetFocusable) {
          const elGeometry = getGeometry(el);
          const distance = Math.abs(elGeometry.centerY - currentGeometry.centerY);
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestElement = el;
          }
        }
        
        return bestElement;
      }
    }
    
    // No target column found, return null (no wrapping between columns)
    return null;
  }
  
  // Fallback to original grid navigation for content cards
  // Detect grid rows
  const rows = detectGridRows(gridElements);
  
  // Find the row containing the current element
  const currentRow = findElementRow(current, rows);
  if (!currentRow) return null;
  
  // Find current element's index in the row
  const currentIndex = currentRow.elements.indexOf(current);
  if (currentIndex === -1) return null;
  
  // Calculate next index based on direction
  let nextIndex: number;
  
  if (direction === 'right') {
    // Move to next element, or wrap to first element
    nextIndex = (currentIndex + 1) % currentRow.elements.length;
  } else {
    // Move to previous element, or wrap to last element
    nextIndex = (currentIndex - 1 + currentRow.elements.length) % currentRow.elements.length;
  }
  
  return currentRow.elements[nextIndex];
}

/**
 * Navigate vertically within a grid (up/down)
 * Prefers elements in the same column when multiple candidates exist
 * 
 * Requirements:
 * - 2.3: Down moves to nearest card in row below, preferring same column
 * - 2.4: Up moves to nearest card in row above, preferring same column
 * 
 * @param current - Currently focused element
 * @param direction - Direction to navigate (up or down)
 * @param gridElements - All elements in the grid
 * @returns Next element to focus, or null if not in grid or no element in direction
 */
export function navigateGridVertical(
  current: HTMLElement,
  direction: 'up' | 'down',
  gridElements: HTMLElement[]
): HTMLElement | null {
  // Check if we're in a main screen grid with data-nav-col
  const currentCol = current.closest('[data-nav-col]');
  
  if (currentCol) {
    // Get all focusable elements in the same column
    const colElements = Array.from(currentCol.querySelectorAll<HTMLElement>('.focusable'))
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    
    // Find current element's index
    const currentIndex = colElements.indexOf(current);
    if (currentIndex === -1) return null;
    
    // Find next element based on direction
    if (direction === 'down') {
      // Move to next element in column
      if (currentIndex < colElements.length - 1) {
        return colElements[currentIndex + 1];
      }
    } else {
      // Move to previous element in column
      if (currentIndex > 0) {
        return colElements[currentIndex - 1];
      }
    }
    
    // No element found in direction
    return null;
  }
  
  // Fallback to original grid navigation for content cards
  // Detect grid rows and columns
  const rows = detectGridRows(gridElements);
  const columns = detectGridColumns(gridElements);
  
  // Find the row and column containing the current element
  const currentRow = findElementRow(current, rows);
  const currentColumn = findElementColumn(current, columns);
  
  if (!currentRow) return null;
  
  // Find current row's index
  const currentRowIndex = rows.indexOf(currentRow);
  if (currentRowIndex === -1) return null;
  
  // Find target row based on direction
  let targetRow: GridRow | null = null;
  
  if (direction === 'down') {
    // Move to next row (if exists)
    if (currentRowIndex < rows.length - 1) {
      targetRow = rows[currentRowIndex + 1];
    }
  } else {
    // Move to previous row (if exists)
    if (currentRowIndex > 0) {
      targetRow = rows[currentRowIndex - 1];
    }
  }
  
  // If no target row, return null (no vertical wrapping)
  if (!targetRow) return null;
  
  // Get current element's X coordinate for column preference
  const currentGeometry = getGeometry(current);
  const currentX = currentGeometry.centerX;
  
  // Find the element in target row that is closest to current X coordinate
  // This implements column preference
  let bestElement: HTMLElement | null = null;
  let bestDistance = Infinity;
  
  for (const element of targetRow.elements) {
    const elementGeometry = getGeometry(element);
    const distance = Math.abs(elementGeometry.centerX - currentX);
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestElement = element;
    }
  }
  
  return bestElement;
}

/**
 * Check if grid navigation should be used for the current element and direction
 * Grid navigation is used for horizontal movement within grids and vertical movement
 * 
 * @param element - Current element
 * @param direction - Navigation direction
 * @returns True if grid navigation should be used
 */
export function shouldUseGridNavigation(
  element: HTMLElement,
  direction: FocusDirection
): boolean {
  // Check if element is a content card (grid element)
  const isGridElement = element.classList.contains('content-card');
  
  // Check if element is in a grid column (main screen)
  const isInGridColumn = element.closest('[data-nav-col]') !== null;
  
  // Grid navigation is used for all directions within grids
  return isGridElement || isInGridColumn;
}

/**
 * Perform grid navigation
 * Delegates to horizontal or vertical navigation based on direction
 * 
 * @param current - Currently focused element
 * @param direction - Direction to navigate
 * @param gridElements - All elements in the grid
 * @returns Next element to focus, or null if navigation not possible
 */
export function navigateGrid(
  current: HTMLElement,
  direction: FocusDirection,
  gridElements: HTMLElement[]
): HTMLElement | null {
  if (direction === 'left' || direction === 'right') {
    return navigateGridHorizontal(current, direction, gridElements);
  } else {
    return navigateGridVertical(current, direction, gridElements);
  }
}
