import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { UserAdminPage } from "@/features/admin/users/UserAdminPage";
import { getAdminUserList } from "@/features/admin/users/userList.server";

export default async function UsersPage() {
  await requireSystemAdmin('/admin');
  
  const { users, error } = await getAdminUserList();
  
  return <UserAdminPage initialUsers={users} initialError={error} />;
}
