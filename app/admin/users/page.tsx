import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { UserAdminPage } from "@/features/admin/users/UserAdminPage";

export default async function UsersPage() {
  await requireSystemAdmin('/admin')
  return <UserAdminPage />;
}
