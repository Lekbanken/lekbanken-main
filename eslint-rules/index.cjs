/**
 * Custom ESLint Rules for Lekbanken
 * 
 * These rules enforce project-specific coding standards, including:
 * - i18n compliance (no-hardcoded-strings)
 */

'use strict';

const noHardcodedStrings = require('./no-hardcoded-strings.cjs');

module.exports = {
  rules: {
    'no-hardcoded-strings': noHardcodedStrings,
  },
};
