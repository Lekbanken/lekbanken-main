import { notFound } from 'next/navigation';
import { getCourseBySlug } from '@/app/actions/learning';
import { CourseRunnerClient } from './CourseRunnerClient';

interface CourseRunnerPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CourseRunnerPage({ params }: CourseRunnerPageProps) {
  const { slug } = await params;
  
  // TODO: Get tenant context from user session if needed
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  return <CourseRunnerClient course={course} />;
}
