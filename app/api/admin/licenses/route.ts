import { type NextRequest, NextResponse } from 'next/server';
import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { fetchLicenses } from '@/features/admin/licenses';
import type { LicenseFilters, LicenseFilterType } from '@/features/admin/licenses';

/**
 * GET /api/admin/licenses
 * 
 * List licenses with filters (system admin only)
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireSystemAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { searchParams } = new URL(request.url);
    
    const filters: LicenseFilters = {
      search: searchParams.get('search') || '',
      type: (searchParams.get('type') || 'all') as LicenseFilterType,
      status: (searchParams.get('status') || 'all') as LicenseFilters['status'],
      productId: searchParams.get('productId') || null,
    };

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);

    const result = await fetchLicenses(filters, page, pageSize);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/admin/licenses] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
