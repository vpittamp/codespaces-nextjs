import { auth, EnrichedSession } from '@/auth'
import LoginForm from '@/components/login-form'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const session = (await auth()) as EnrichedSession

  if (session) {
    redirect('/')
  }

  return (
    <main className="flex flex-col p-4">
      <LoginForm />
    </main>
  )
}
