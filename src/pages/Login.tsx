import { useAuth } from '@/supabase/AuthContext'
import { Button } from '@/components/ui/button'

export default function Login() {
  const { signInWithGithub, signOut, session } = useAuth()

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Login</h2>
      {session ? (
        <div className="space-y-2">
          <p className="text-muted-foreground">Signed in.</p>
          <Button variant="secondary" onClick={signOut}>Sign out</Button>
        </div>
      ) : (
        <Button onClick={signInWithGithub}>Sign in with GitHub</Button>
      )}
    </section>
  )
}
