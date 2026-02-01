import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { getUser, updateUser, type AuthUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Profile() {
  const storedUser = getUser();
  const [name, setName] = useState(storedUser?.name || '');
  const [email, setEmail] = useState(storedUser?.email || '');
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add('solid-surface');
    return () => {
      document.body.classList.remove('solid-surface');
    };
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      if (name) formData.append('name', name);
      if (email) formData.append('email', email);
      if (password) formData.append('password', password);
      if (file) formData.append('profile_pic', file);

      const result = await apiRequest<{ user: AuthUser }>('/api/me', {
        method: 'PATCH',
        body: formData,
      });

      updateUser(result.user);
      setSuccess('Profile updated.');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.6fr_1fr]">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Profile identity</CardTitle>
          <CardDescription>Update your avatar and key details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {storedUser?.profile_pic ? <AvatarImage src={storedUser.profile_pic} /> : null}
              <AvatarFallback>{storedUser?.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Current avatar</p>
              <p className="text-lg font-semibold">{storedUser?.name || 'Anonymous'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>Keep your profile aligned with your chat name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@domain.com"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Leave blank to keep"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile_pic">Profile picture</Label>
                <Input
                  id="profile_pic"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </div>
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
