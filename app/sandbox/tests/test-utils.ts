/**
 * Sandbox Smoke Tests
 * 
 * This module provides lightweight smoke tests for all sandbox modules.
 * Based on the sandbox-modules.ts config, it generates:
 * 
 * 1. Component render smoke tests - verify components can render without crashing
 * 2. Route smoke tests - verify app routes respond with 200 and no console errors
 * 
 * The goal is basic quality control, not full unit/E2E coverage.
 */

import { sandboxCategories, getAllModules, type SandboxModule } from '../config/sandbox-modules';

// -----------------------------------------------------------------------------
// Test Data Extraction
// -----------------------------------------------------------------------------

/**
 * Get all modules that have components defined
 */
export function getModulesWithComponents(): SandboxModule[] {
  return getAllModules().filter((m) => m.components && m.components.length > 0);
}

/**
 * Get all modules that have routes defined
 */
export function getModulesWithRoutes(): SandboxModule[] {
  return getAllModules().filter((m) => m.routes && m.routes.length > 0);
}

/**
 * Get all unique component paths from all modules
 */
export function getAllComponentPaths(): string[] {
  const paths = new Set<string>();
  for (const mod of getAllModules()) {
    if (mod.components) {
      for (const comp of mod.components) {
        paths.add(comp);
      }
    }
  }
  return Array.from(paths);
}

/**
 * Get all unique route paths from all modules
 */
export function getAllRoutePaths(): string[] {
  const paths = new Set<string>();
  for (const mod of getAllModules()) {
    if (mod.routes) {
      for (const route of mod.routes) {
        // Skip wildcard patterns for actual testing
        if (!route.includes('*')) {
          paths.add(route);
        }
      }
    }
  }
  return Array.from(paths);
}

/**
 * Get component-to-module mapping for traceability
 */
export function getComponentModuleMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const mod of getAllModules()) {
    if (mod.components) {
      for (const comp of mod.components) {
        const existing = map.get(comp) || [];
        existing.push(mod.id);
        map.set(comp, existing);
      }
    }
  }
  return map;
}

/**
 * Get route-to-module mapping for traceability
 */
export function getRouteModuleMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const mod of getAllModules()) {
    if (mod.routes) {
      for (const route of mod.routes) {
        const existing = map.get(route) || [];
        existing.push(mod.id);
        map.set(route, existing);
      }
    }
  }
  return map;
}

// -----------------------------------------------------------------------------
// Test Generation Helpers
// -----------------------------------------------------------------------------

export interface ComponentTestCase {
  componentPath: string;
  moduleIds: string[];
}

export interface RouteTestCase {
  route: string;
  moduleIds: string[];
}

/**
 * Generate test cases for component smoke tests
 */
export function generateComponentTestCases(): ComponentTestCase[] {
  const componentMap = getComponentModuleMap();
  return Array.from(componentMap.entries()).map(([path, moduleIds]) => ({
    componentPath: path,
    moduleIds,
  }));
}

/**
 * Generate test cases for route smoke tests
 */
export function generateRouteTestCases(): RouteTestCase[] {
  const routeMap = getRouteModuleMap();
  return Array.from(routeMap.entries())
    .filter(([route]) => !route.includes('*')) // Skip wildcards
    .map(([route, moduleIds]) => ({
      route,
      moduleIds,
    }));
}

// -----------------------------------------------------------------------------
// Test Summary
// -----------------------------------------------------------------------------

export interface TestSummary {
  totalModules: number;
  modulesWithComponents: number;
  modulesWithRoutes: number;
  uniqueComponents: number;
  uniqueRoutes: number;
  categories: {
    id: string;
    label: string;
    moduleCount: number;
  }[];
}

/**
 * Get a summary of what would be tested
 */
export function getTestSummary(): TestSummary {
  const allModules = getAllModules();
  const modulesWithComponents = getModulesWithComponents();
  const modulesWithRoutes = getModulesWithRoutes();
  const allComponents = getAllComponentPaths();
  const allRoutes = getAllRoutePaths();

  return {
    totalModules: allModules.length,
    modulesWithComponents: modulesWithComponents.length,
    modulesWithRoutes: modulesWithRoutes.length,
    uniqueComponents: allComponents.length,
    uniqueRoutes: allRoutes.length,
    categories: sandboxCategories.map((cat) => ({
      id: cat.id,
      label: cat.label,
      moduleCount: cat.modules.length,
    })),
  };
}
