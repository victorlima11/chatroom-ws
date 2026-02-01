import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/api';
import { setAuth, type AuthUser } from '@/lib/auth';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await apiRequest<{ user: AuthUser; token: string }>('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      setAuth(result.token, result.user);
      navigate('/rooms');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-5xl items-center">
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Get started</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Build your <span className="text-gradient">presence</span>.
          </h1>
          <p className="max-w-md text-base text-muted-foreground">
            Create your account, set a profile image, and spin up private rooms in seconds.
          </p>
          <p className="!mt-8 text-sm text-muted-foreground">Already have access?</p>
          <Link className="text-primary hover:underline" to="/login">
            Sign in instead
          </Link>
          </div>
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Create account</CardTitle>
              <CardDescription>Just a few fields to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
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
                  {loading ? 'Creating...' : 'Create account'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
