export const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE != null)
    ? (import.meta as { env?: { VITE_API_BASE?: string } }).env!.VITE_API_BASE!
    : 'http://localhost:8080/api';

export type OrderStatus =
  | 'PLACED'
  | 'MERCHANT_ASSIGNED'
  | 'WORKER_ASSIGNED'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentStatus =
  | 'UNPAID'
  | 'AWAITING'
  | 'PAID'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'FAILED'
  | 'CASH_PENDING';

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  publishableKey: string;
  paymentIntentId: string;
  orderId: string;
  amountCents: number;
  currency: string;
}

export interface PaymentSummaryDTO {
  orderId: string;
  serviceNameSnapshot: string;
  priceCents: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string | null;
  stripeRefundId: string | null;
  paidAt: string | null;
  refundedAmountCents: number | null;
  refundedAt: string | null;
  createdAt: string;
}

export interface ServiceCategoryDTO {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ServiceItemDTO {
  id: number;
  categoryId: number;
  categoryCode?: string | null;
  categoryName?: string | null;
  code: string;
  name: string;
  description?: string | null;
  basePriceCents: number;
  durationMinutes: number;
  isActive: boolean;
}

export interface CategoryWithItemsDTO {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  items: ServiceItemDTO[];
}

export interface MerchantServiceOfferDTO {
  id: number | null;
  serviceItemId: number;
  serviceItemCode: string;
  serviceItemName: string;
  categoryId: number;
  categoryCode: string | null;
  categoryName: string | null;
  basePriceCents: number;
  priceCents: number;
  durationMinutes: number;
  isActive: boolean;
}

/** Completion proof attachment */
export interface CompletionProofAttachment {
  publicUrl: string;
  label: string | null;
  contentType: string;
  fileName: string;
  fileSizeBytes: number;
  createdAt: string;
}

/** Completion proof (notes + images) for an order */
export interface CompletionProof {
  orderId: string;
  completionNotes: string;
  attachments: CompletionProofAttachment[];
  createdAt: string;
}

export interface Order {
  id: string;
  serviceItemId: number;
  serviceNameSnapshot: string;
  priceCents: number;
  durationMinutesSnapshot: number;
  address: string;
  addressLat?: number | null;
  addressLng?: number | null;
  notes: string | null;
  status: OrderStatus;
  merchantId: string | null;
  workerId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  cancelReason?: string | null;
  cancelledByRole?: string | null;
  cancelledById?: string | null;
  cancelledAt?: string | null;
  merchantAssignDeadline?: string | null;
  workerAcceptDeadline?: string | null;
  scheduledAt: string;
  otpVerifiedAt?: string | null;
  paymentStatus?: PaymentStatus | null;
  stripePaymentIntentId?: string | null;
  paidAt?: string | null;
  refundedAmountCents?: number | null;
  refundedAt?: string | null;
}

export interface WorkerMeResponse {
  id: string;
  accountId: string;
  displayName: string;
  availability: string;
  lastSeenAt: string | null;
  homeAddress: string | null;
  homeLat: number | null;
  homeLng: number | null;
}

export interface MerchantMeResponse {
  id: string;
  accountId: string;
  displayName: string;
  businessAddress: string | null;
  businessLat: number | null;
  businessLng: number | null;
}

/** Straight-line distance in km using Haversine formula */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export interface WorkerSummary {
  id: string;
  accountId: string;
  displayName: string;
  availability?: string;
  lastSeenAt?: string | null;
  homeLat?: number | null;
  homeLng?: number | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: string;
}

export type LedgerStatus = 'PENDING' | 'READY' | 'PAID';

export interface PayoutLedgerDTO {
  id: number;
  orderId: string;
  merchantId: string;
  grossAmountCents: number;
  platformFeeCents: number;
  merchantNetCents: number;
  status: LedgerStatus;
  calculatedAt: string;
  paidAt: string | null;
  createdAt: string;
}

export interface FinanceSummaryDTO {
  totalGrossCents: number;
  totalPlatformFeeCents: number;
  totalMerchantNetCents: number;
  ledgerCount: number;
  paidCount: number;
  readyCount: number;
  breakdownByStatus: Record<string, number>;
}

export type FeeRuleScope = 'GLOBAL' | 'CATEGORY';

export interface PlatformFeeRuleDTO {
  id: number;
  scope: FeeRuleScope;
  categoryId: number | null;
  feeRateBps: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantDTO {
  id: string;
  accountId: string;
  displayName: string;
}

export type OrderDTO = Order;
export type WorkerDTO = WorkerSummary;

/** Phase 1.8 Complaint / Dispute */
export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED' | 'CLOSED';
export type ComplaintCategory =
  | 'SERVICE_QUALITY'
  | 'LATE_ARRIVAL'
  | 'NO_SHOW'
  | 'DAMAGE'
  | 'BILLING'
  | 'OTHER';

export interface ComplaintMessageDTO {
  id: number;
  actorRole: string;
  actorId: string;
  message: string;
  createdAt: string;
}

export interface ComplaintAttachmentDTO {
  id: number;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  publicUrl: string;
  createdAt: string;
}

export interface ComplaintTicketDTO {
  id: number;
  orderId: string;
  userId: string;
  merchantId: string | null;
  status: ComplaintStatus;
  category: ComplaintCategory;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  messages?: ComplaintMessageDTO[] | null;
  attachments?: ComplaintAttachmentDTO[] | null;
}

/** Phase 1.9 Order rating (1–5 stars, optional comment) */
export interface RatingDTO {
  id: number;
  orderId: string;
  userId: string;
  merchantId: string | null;
  workerId: string | null;
  serviceItemId: number | null;
  stars: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  serviceNameSnapshot?: string | null;
}

export interface RatingSummaryDTO {
  averageStars: number;
  totalCount: number;
  distribution: Record<number, number>;  // 1..5 -> count
  recentComments: string[];
}

export type RefundRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface RefundRequestDTO {
  id: number;
  orderId: string;
  userId: string;
  reason: string | null;
  status: RefundRequestStatus;
  adminNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  serviceNameSnapshot: string | null;
  priceCents: number | null;
}

export interface ApiOptions extends RequestInit {
  token?: string | null;
  on401?: () => void;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, on401, ...rest } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });
  if (res.status === 401) {
    on401?.();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || res.statusText);
  }
  return res.json();
}

/** Multipart form-data upload for completion proof. */
export interface ApiMultipartOptions {
  token?: string | null;
  on401?: () => void;
}

export async function apiMultipart<T>(
  path: string,
  formData: FormData,
  options: ApiMultipartOptions = {}
): Promise<T> {
  const { token, on401 } = options;
  const headers: HeadersInit = {};
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (res.status === 401) {
    on401?.();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || res.statusText);
  }
  return res.json();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NZD' }).format(cents / 100);
}

/** Format scheduled appointment time for display (e.g. "Tue, 18 Feb 2026 10:00"). */
export function formatScheduled(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const datePart = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${datePart} ${timePart}`;
}
