import { redirect } from 'next/navigation'

export default function PreferencesRootRedirect() {
  redirect('/app/profile/preferences')
}
