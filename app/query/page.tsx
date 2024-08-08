import { Nav } from '@/components/mail/components/nav';
import { auth, EnrichedSession } from 'auth';

export default async function Page() {
  const session = (await auth()) as EnrichedSession
 
  return (
    <Nav/>
  );
}
