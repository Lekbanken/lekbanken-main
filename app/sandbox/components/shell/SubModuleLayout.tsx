'use client';

import { usePathname } from 'next/navigation';
import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { findModuleByPath } from '../../config/sandbox-modules';

interface SubModuleLayoutProps {
  children: React.ReactNode;
  categoryId: string;
  categoryLabel: string;
}

export function SubModuleLayout({ children, categoryId: _categoryId, categoryLabel }: SubModuleLayoutProps) {
  const pathname = usePathname();
  const found = findModuleByPath(pathname);
  
  // Om vi hittar modulen i config, använd dess info
  const moduleId = found?.module?.id || pathname.split('/').pop() || '';
  const title = found?.module?.label || moduleId;
  const description = found?.module?.description || `${categoryLabel} modul`;

  return (
    <SandboxShell
      moduleId={moduleId}
      title={title}
      description={description}
    >
      {children}
    </SandboxShell>
  );
}
