import { useState } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/supabase/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { supabase } from '@/supabase/client'

export default function Login() {
  useDocumentTitle('Login')
  const { signInWithGithub, signInWithTwitter, signOut, session } = useAuth()
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    })

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  const avatarUrl = (session?.user?.user_metadata as any)?.avatar_url as string | undefined
  const fullName = (session?.user?.user_metadata as any)?.full_name as string | undefined
  const email = session?.user?.email ?? undefined

  return (
    <section className="mx-auto max-w-md p-4 pt-20">
      <Card className="bg-card/80 backdrop-blur-xl border-border/60 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

        <CardHeader className="text-center pb-2 relative z-10">
          <CardTitle className="font-heading text-3xl font-bold tracking-wide text-primary drop-shadow-md">
            Welcome Warrior
          </CardTitle>
          <CardDescription className="font-body text-lg">
            Sign in to continue your legend
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 pt-6">
          {session ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border/40">
                <Avatar className="h-16 w-16 border-2 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="font-heading font-bold text-xl bg-primary/20 text-primary">
                    {fullName?.slice(0, 2).toUpperCase() || email?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-heading font-bold text-xl leading-tight text-foreground">{fullName || 'Signed in'}</p>
                  {email && <p className="text-sm font-mono text-muted-foreground">{email}</p>}
                </div>
              </div>
              <Button variant="secondary" onClick={signOut} className="w-full font-heading uppercase tracking-wider font-bold hover:bg-destructive hover:text-destructive-foreground transition-colors">
                Sign out
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3">
                <Button onClick={signInWithGithub} className="w-full bg-[#24292e] hover:bg-[#24292e]/90 text-white font-bold border border-white/10 shadow-lg transition-all hover:scale-[1.02]" variant="default">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mr-2 h-5 w-5"><path d="M12 .5C5.73.5.9 5.33.9 11.6c0 4.87 3.16 9 7.54 10.45.55.1.76-.24.76-.53 0-.26-.01-1.1-.02-1.99-3.07.67-3.72-1.3-3.72-1.3-.5-1.28-1.22-1.62-1.22-1.62-.99-.67.08-.66.08-.66 1.1.08 1.67 1.13 1.67 1.13.98 1.67 2.58 1.19 3.21.91.1-.71.38-1.19.69-1.46-2.45-.28-5.02-1.23-5.02-5.47 0-1.21.43-2.2 1.13-2.98-.11-.28-.49-1.41.11-2.94 0 0 .92-.3 3.01 1.14A10.5 10.5 0 0 1 12 6.84c.93 0 1.86.13 2.73.38 2.09-1.44 3.01-1.14 3.01-1.14.6 1.53.22 2.66.11 2.94.7.78 1.13 1.77 1.13 2.98 0 4.25-2.58 5.19-5.04 5.46.39.34.73 1.01.73 2.03 0 1.46-.01 2.64-.01 3 0 .29.2.63.77.52A10.72 10.72 0 0 0 23.1 11.6C23.1 5.33 18.27.5 12 .5Z" /></svg>
                  Sign in with GitHub
                </Button>
                <Button onClick={signInWithTwitter} className="w-full bg-black hover:bg-black/80 text-white font-bold border border-white/10 shadow-lg transition-all hover:scale-[1.02]" variant="outline">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mr-2 h-4 w-4"><path d="M18.244 2H21l-6.356 7.27L22 22h-6.9l-4.8-6.263L4.7 22H2l6.78-7.757L2 2h7l4.3 5.7L18.244 2Zm-2.412 18h2.23L8.258 4H5.9l9.932 16Z" /></svg>
                  Sign in with X (Twitter)
                </Button>
              </div>

              {!showEmailLogin ? (
                <div className="relative pt-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/40" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <button
                      onClick={() => setShowEmailLogin(true)}
                      className="bg-background px-2 text-muted-foreground hover:text-primary transition-colors font-bold tracking-wider"
                    >
                      Or continue with email
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-border/40 animate-in slide-in-from-top-2 fade-in duration-300">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="Email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="bg-background/50 border-primary/30 focus:ring-primary/50 font-body"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="bg-background/50 border-primary/30 focus:ring-primary/50 font-body"
                      />
                    </div>
                    {error && (
                      <p className="text-xs font-bold text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">{error}</p>
                    )}
                    <Button type="submit" className="w-full font-heading uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)] transition-all" size="sm" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign in with Email'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowEmailLogin(false)}
                      className="w-full text-xs text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-wider mt-2"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
