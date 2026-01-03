import { redirect } from 'next/navigation'

export default function PlaySessionsRedirect() {
  redirect('/admin/sessions')
}
