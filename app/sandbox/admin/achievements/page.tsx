'use client';

import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { AchievementAdminPage } from '@/features/admin/achievements/AchievementAdminPage';

export default function SandboxAchievementsPage() {
  return (
    <SandboxShell
      moduleId="admin-achievements"
      title="Achievements"
      description="Prestationer, badges"
    >
      <AchievementAdminPage />
    </SandboxShell>
  );
}
