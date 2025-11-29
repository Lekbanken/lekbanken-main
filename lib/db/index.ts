/**
 * Database Query Helpers Index
 *
 * Central export point for all database query functions.
 * Organized by domain (Tenants, Users, Games, Plans, Billing, Products, Browse).
 */

// Tenant queries
export {
  getTenantById,
  getUserTenants,
  getUserPrimaryTenant,
  createTenant,
  updateTenant,
  addUserToTenant,
  getUserRoleInTenant,
  isUserTenantAdmin,
  updateUserTenantRole,
  removeUserFromTenant,
  getTenantMembers,
} from './tenants'

// User queries
export {
  getCurrentUser,
  getUserProfile,
  getCurrentUserProfile,
  updateUserProfile,
  updateCurrentUserProfile,
  setUserLanguage,
  getUserByEmail,
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  resetPassword,
  updatePassword,
  getSession,
  onAuthStateChange,
} from './users'

// Games queries
export {
  getGameById,
  getGamesForTenant,
  getPublishedGames,
  searchGames,
  createGame,
  updateGame,
  publishGame,
  deleteGame,
  addSecondaryPurpose,
  removeSecondaryPurpose,
  getGameSecondaryPurposes,
  createGameMedia,
  getGameMedia,
  deleteMedia,
  filterGames,
} from './games'

// Plans queries
export {
  getPlanById,
  getPlansForUser,
  getTenantPlans,
  getPublicPlans,
  createPlan,
  updatePlan,
  deletePlan,
  addGameToPlan,
  removeGameFromPlan,
  updatePlanGames,
  getPlanGames,
  calculatePlanTime,
  duplicatePlan,
  searchPlans,
} from './plans'

// Billing queries
export {
  getTenantSubscription,
  getUserPrivateSubscription,
  createTenantSubscription,
  createUserPrivateSubscription,
  updateTenantSubscriptionStatus,
  updatePrivateSubscriptionStatus,
  cancelTenantSubscription,
  cancelPrivateSubscription,
  getTenantSeatAssignments,
  assignTenantSeat,
  updateSeatAssignmentStatus,
  releaseSeatAssignment,
  getTenantInvoices,
  getInvoice,
  createInvoice,
  updateInvoiceStatus,
  getPaymentHistory,
  createPayment,
  getUpcomingRenewals,
  getTenantBillingSummary,
} from './billing'

// Products queries
export {
  getAllProducts,
  getProductById,
  getProductByKey,
  createProduct,
  updateProduct,
  getAllPurposes,
  getMainPurposes,
  getPurposeById,
  getSubPurposes,
  createPurpose,
  updatePurpose,
  addPurposeToProduct,
  removePurposeFromProduct,
  getProductsForPurpose,
  getPurposesForProduct,
} from './products'

// Browse queries
export {
  searchPublicGames,
  getFeaturedGames,
  getGamesByProduct,
  getGamesByPurpose,
  logSearch,
  getSearchSuggestions,
  getTrendingSearches,
  getFilteredGames,
} from './browse'
