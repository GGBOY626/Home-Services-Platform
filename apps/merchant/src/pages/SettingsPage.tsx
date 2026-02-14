import { useAuth } from '../auth';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { useNavigate } from 'react-router-dom';

export function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Settings</h2>
      <Card className="rounded-xl border-neutral-200 max-w-md">
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-neutral-500">Merchant</p>
          <p className="font-medium text-neutral-900">Demo Cleaning Co</p>
          <Button variant="outline" onClick={() => { logout(); navigate('/login'); }}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
