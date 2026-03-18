import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default function RootPage() {
  const session = getSession();
  return redirect(session ? '/dashboard' : '/login');
}
