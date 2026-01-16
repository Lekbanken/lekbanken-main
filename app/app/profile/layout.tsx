import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ProfileNavigation, ProfileMobileNav } from '@/components/profile/ProfileNavigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app.profile');
  
  return {
    title: t('title') + ' | Lekbanken',
    description: t('sections.personalInfo.description'),
  };
}

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export default async function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <ProfileNavigation />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Mobile Navigation */}
            <ProfileMobileNav />
            
            {/* Page Content */}
            <div className="bg-card rounded-xl border border-border shadow-sm">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
