import { useAuth } from '../auth';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Profile</h1>
      <Card className="rounded-2xl border-neutral-200 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-neutral-500">Role</p>
          <p className="font-medium text-neutral-900">Customer</p>
          <p className="text-sm text-neutral-500 mt-4">Session</p>
          <p className="text-sm text-neutral-600">You are signed in.</p>
          <Button variant="outline" className="mt-4" onClick={handleLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
