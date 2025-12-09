'use client';

import { SandboxShell } from '../../components/shell/SandboxShellV2';
import AchievementAdminPage from "@/app/admin/achievements/page";

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
