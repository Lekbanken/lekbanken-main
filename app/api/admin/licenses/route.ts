import { NextResponse } from 'next/server';
import { fetchLicenses } from '@/features/admin/licenses';
import type { LicenseFilters, LicenseFilterType } from '@/features/admin/licenses';
import { apiHandler } from '@/lib/api/route-handler';

export const GET = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
    const { searchParams } = new URL(req.url);

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
  },
});
