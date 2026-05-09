import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { API_BASE } from '@home-services/shared';
import type { CreatePaymentIntentResponse } from '@home-services/shared';
import { Button } from '@home-services/ui';
import { useToast } from '@home-services/ui';

interface PaymentFormProps {
  clientSecret: string;
  paymentIntentId: string;
  orderId: string;
  amountCents: number;
  token: string | null;
  onSuccess: () => void;
}

function PaymentForm({ clientSecret, paymentIntentId, orderId, amountCents, token, onSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { addToast } = useToast();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const card = elements.getElement(CardElement);
    if (!card) { setProcessing(false); return; }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (error) {
      addToast('error', 'Payment failed', error.message ?? 'Card declined');
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        await fetch(
          `${API_BASE}/payment/mark-paid/${orderId}?paymentIntentId=${paymentIntentId}`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        // Webhook will handle it if this call fails
      }
      addToast('success', 'Payment successful', 'Your order is confirmed.');
      onSuccess();
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-neutral-300 bg-white px-4 py-3">
        <CardElement
          options={{
            style: {
              base: { fontSize: '16px', color: '#111827', '::placeholder': { color: '#9ca3af' } },
              invalid: { color: '#ef4444' },
            },
          }}
        />
      </div>
      <p className="text-sm text-neutral-500">
        Test card: <span className="font-mono">4242 4242 4242 4242</span> · any future expiry · any CVC
      </p>
      <Button type="submit" disabled={!stripe || processing} className="w-full">
        {processing ? 'Processing…' : `Pay NZD ${(amountCents / 100).toFixed(2)}`}
      </Button>
    </form>
  );
}

interface PaymentSectionProps {
  orderId: string;
  priceCents: number;
  token: string | null;
  autoOpen?: boolean;
  onPaymentComplete: () => void;
}

export function PaymentSection({ orderId, priceCents, token, autoOpen = false, onPaymentComplete }: PaymentSectionProps) {
  const { addToast } = useToast();
  const [intentData, setIntentData] = useState<CreatePaymentIntentResponse | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [loading, setLoading] = useState(false);
  const [initiated, setInitiated] = useState(false);

  const handleInitiate = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payment/create-intent/${orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? res.statusText);
      }
      const data: CreatePaymentIntentResponse = await res.json();
      setIntentData(data);
      setStripePromise(loadStripe(data.publishableKey));
      setInitiated(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      addToast('error', 'Could not initialise payment', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-open payment form when redirected from order creation (?pay=1)
  // AbortController cleanup prevents React StrictMode's double-invoke from sending two concurrent requests.
  useEffect(() => {
    if (!autoOpen || initiated) return;
    const controller = new AbortController();
    handleInitiate(controller.signal);
    return () => controller.abort();
  }, [autoOpen]);

  if (!initiated) {
    return (
      <div className="mt-6 border-t border-neutral-200 pt-6">
        <p className="text-sm font-medium text-neutral-700 mb-3">Payment required</p>
        <p className="text-sm text-neutral-500 mb-4">
          Your order is placed. Complete payment to confirm your booking.
        </p>
        <Button onClick={() => handleInitiate()} disabled={loading}>
          {loading ? 'Loading…' : `Pay NZD ${(priceCents / 100).toFixed(2)}`}
        </Button>
      </div>
    );
  }

  if (!intentData || !stripePromise) return null;

  return (
    <div className="mt-6 border-t border-neutral-200 pt-6">
      <p className="text-sm font-medium text-neutral-700 mb-3">Enter card details</p>
      <Elements stripe={stripePromise} options={{ clientSecret: intentData.clientSecret }}>
        <PaymentForm
          clientSecret={intentData.clientSecret}
          paymentIntentId={intentData.paymentIntentId}
          orderId={orderId}
          amountCents={intentData.amountCents}
          token={token}
          onSuccess={() => {
            setInitiated(false);
            setIntentData(null);
            onPaymentComplete();
          }}
        />
      </Elements>
    </div>
  );
}
