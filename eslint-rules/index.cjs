/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Custom ESLint Rules for Lekbanken
 * 
 * These rules enforce project-specific coding standards, including:
 * - i18n compliance (no-hardcoded-strings)
 * - Profile loading resilience (no-manual-profile-fetch)
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
