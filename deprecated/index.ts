/**
 * Tripwire for deprecated modules.
 * Logs warning in development if deprecated code is imported.
 *
 * Usage:
 * import { deprecatedImportWarning } from '@/deprecated';
 * deprecatedImportWarning('moduleName');
 */
export function deprecatedImportWarning(moduleName: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(
      `⚠️ DEPRECATED IMPORT: ${moduleName} is scheduled for removal. ` +
        `If you see this, the module is still in use!`
    );
  }
}
