/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Custom ESLint Rules for Lekbanken
 * 
 * These rules enforce project-specific coding standards:
 * - no-hardcoded-strings: i18n compliance (error in critical paths, warn elsewhere)
 * - no-manual-profile-fetch: Profile loading resilience (error — locked pattern)
 * 
 * Severity is configured per file scope in eslint.config.mjs.
 * See each rule file for suppression guidance.
 */

'use strict';

const noHardcodedStrings = require('./no-hardcoded-strings.cjs');
const noManualProfileFetch = require('./no-manual-profile-fetch.cjs');

module.exports = {
  rules: {
    'no-hardcoded-strings': noHardcodedStrings,
    'no-manual-profile-fetch': noManualProfileFetch,
  },
};
