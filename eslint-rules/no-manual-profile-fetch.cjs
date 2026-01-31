/**
 * ESLint Rule: no-manual-profile-fetch
 * 
 * Enforces the use of useProfileQuery hook for data fetching in profile routes.
 * This prevents the common pattern of manual useEffect + setState that can lead
 * to infinite loading spinners and request storms.
 * 
 * To opt-out for intentional patterns, add a comment before the useEffect:
 * // profile-fetch:allow
 */

'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce useProfileQuery for profile data fetching to prevent loading issues',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [],
    messages: {
      useProfileQuery:
        'Use useProfileQuery instead of manual useEffect for data fetching in profile routes. ' +
        'Add // profile-fetch:allow comment before useEffect to suppress if intentional.',
    },
  },
  create(context) {
    const filename = context.getFilename();
    
    // Only apply to profile routes
    const isProfileRoute = 
      filename.includes('app/app/profile/') || 
      filename.includes('app\\app\\profile\\');
    
    if (!isProfileRoute) {
      return {};
    }

    return {
      CallExpression(node) {
        // Only check useEffect calls
        if (!node.callee || node.callee.name !== 'useEffect') {
          return;
        }
        
        // Check if there's a callback argument
        if (!node.arguments || !node.arguments[0]) {
          return;
        }

        const sourceCode = context.getSourceCode();
        const effectBody = sourceCode.getText(node.arguments[0]);

        // Detect Supabase or API fetch patterns
        const hasDataFetchPattern = 
          effectBody.includes('.from(') ||
          effectBody.includes('.rpc(') ||
          effectBody.includes("fetch('/api/") ||
          effectBody.includes('fetch("/api/') ||
          effectBody.includes('fetch(`/api/');

        if (!hasDataFetchPattern) {
          return;
        }

        // Check for explicit allow comment
        const comments = sourceCode.getCommentsBefore(node);
        const hasAllowComment = comments.some(
          (c) => c.value && c.value.includes('profile-fetch:allow')
        );

        if (hasAllowComment) {
          return;
        }

        context.report({
          node,
          messageId: 'useProfileQuery',
        });
      },
    };
  },
};
