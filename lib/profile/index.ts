/**
 * Profile Services - Barrel Export
 * 
 * NOTE: Server-side ProfileService is exported from './profile-service' directly
 * to avoid bundling server code in client components.
 * Use: import { ProfileService } from '@/lib/profile/profile-service'
 */

// Client-side service (for client components with passed supabase client)
export { ProfileService } from './profile-service.client';

// All types
export * from './types';
