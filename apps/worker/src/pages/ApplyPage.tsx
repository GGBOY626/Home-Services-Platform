import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@home-services/ui';
import { Button, Input, Label, Textarea } from '@home-services/ui';
import { useToast } from '@home-services/ui';
import { api } from '@home-services/shared';

export function ApplyPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/public/worker-applications', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      addToast('error', 'Submission failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <Card className="w-full max-w-md rounded-2xl border-neutral-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-green-700">Application submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-700">Our team will review your application. We will be in touch.</p>
            <Link to="/login" className="mt-4 inline-block font-medium text-neutral-900 hover:underline">Back to sign in</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8">
      <Card className="w-full max-w-lg rounded-2xl border-neutral-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Apply as a worker</CardTitle>
          <p className="text-sm text-neutral-600">Submit your details. We will review and get back to you.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name *</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit application'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-600">
            Already have an account? <Link to="/login" className="font-medium text-neutral-900 hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
