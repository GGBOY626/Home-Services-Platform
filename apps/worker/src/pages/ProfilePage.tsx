import { useAuth } from '../auth';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Profile</h1>
      <Card className="rounded-2xl border-neutral-200 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-neutral-500">Role</p>
          <p className="font-medium text-neutral-900">Worker</p>
          <p className="text-sm text-neutral-500 mt-4">Merchant</p>
          <p className="text-sm text-neutral-600">Assigned via platform</p>
          <Button variant="outline" className="mt-4" onClick={() => { logout(); navigate('/login'); }}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
