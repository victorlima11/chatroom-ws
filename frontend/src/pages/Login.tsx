import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/api';
import { setAuth, type AuthUser } from '@/lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await apiRequest<{ user: AuthUser; token: string }>('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      setAuth(result.token, result.user);
      navigate('/rooms');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-5xl items-center">
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Sync Chat</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Chat rooms. <span className="text-gradient">Clear signals.</span>
          </h1>
          <p className="text-base text-muted-foreground">
            A web app, make to be a real time chat rooms.
            <span className="block">Built with Socket.io</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-muted-foreground">
              Real time
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-muted-foreground">
              No logs
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-muted-foreground">
              Shared rooms
            </span>
          </div>
          </div>
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>Sign in to continue to your rooms.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="✦✦✦✦✦✦✦"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                {error ? <p className="text-sm text-red-400">{error}</p> : null}
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  No account?{' '}
                  <Link className="text-primary hover:underline" to="/register">
                    Create one
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
