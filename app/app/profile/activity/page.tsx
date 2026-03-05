import { redirect } from 'next/navigation';

// TODO(profile): route temporarily disabled until feature is reintroduced
export default function ActivityPage() {
  redirect('/app/profile');
}
