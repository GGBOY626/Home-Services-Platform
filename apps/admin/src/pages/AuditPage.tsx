import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Badge } from '@home-services/ui';
import { Drawer } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { formatDate } from '@home-services/shared';

interface AuditEventResponse {
  id: number;
  requestId: string;
  actorRole: string;
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface PageRes {
  content: AuditEventResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const ACTION_OPTIONS = [
  '',
  'AUTH_LOGIN_SUCCESS',
  'AUTH_LOGIN_FAILURE',
  'ORDER_CREATE',
  'ORDER_ASSIGN_MERCHANT',
  'ORDER_ASSIGN_WORKER',
  'ORDER_ACCEPT',
  'ORDER_COMPLETE_WITH_PROOF',
  'ORDER_CONFIRM',
  'ORDER_CANCEL',
  'ORDER_REJECT_MERCHANT',
  'ORDER_REJECT_WORKER',
  'ORDER_EXPIRE',
  'ORDER_ROLLBACK_WORKER_ACCEPT_TIMEOUT',
  'ORDER_RESCHEDULE',
  'LEDGER_CREATE',
  'LEDGER_MARK_PAID',
  'LEDGER_BACKFILL',
  'COMPLAINT_CREATE',
  'COMPLAINT_STATUS_CHANGE',
  'COMPLAINT_MESSAGE',
  'RATING_CREATE',
  'WORKER_AVAILABILITY_CHANGE',
  'SYSTEM_JOB_RUN',
];

const ENTITY_OPTIONS = ['', 'ORDER', 'COMPLAINT', 'LEDGER', 'RATING', 'AUTH', 'NOTIFICATION'];

function shortId(s: string | null | undefined): string {
  if (!s) return '—';
  return s.length > 12 ? s.slice(0, 8) + '…' : s;
}

function roleBadgeVariant(role: string): 'default' | 'success' | 'warning' | 'destructive' | 'neutral' {
  switch (role) {
    case 'ADMIN':
      return 'destructive';
    case 'MERCHANT':
    case 'WORKER':
      return 'neutral';
    case 'USER':
      return 'default';
    case 'SYSTEM':
      return 'warning';
    default:
      return 'default';
  }
}

export function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const actionParam = searchParams.get('action') || '';
  const entityParam = searchParams.get('entity') || '';
  const keywordParam = searchParams.get('keyword') || '';
  const requestIdParam = searchParams.get('requestId') || '';
  const pageParam = parseInt(searchParams.get('page') || '0', 10);
  const openId = searchParams.get('open');
  const traceRequestId = searchParams.get('trace');

  const { api } = useApi();
  const { addToast } = useToast();
  const [events, setEvents] = useState<AuditEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<AuditEventResponse | null>(null);
  const [traceEvents, setTraceEvents] = useState<AuditEventResponse[] | null>(null);

  const defaultFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  };
  const defaultTo = () => new Date().toISOString().slice(0, 10);

  const from = fromParam || defaultFrom();
  const to = toParam || defaultTo();

  useEffect(() => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (actionParam) q.set('action', actionParam);
    if (entityParam) q.set('entityType', entityParam);
    if (keywordParam) q.set('keyword', keywordParam);
    if (requestIdParam) q.set('requestId', requestIdParam);
    q.set('page', String(pageParam));
    q.set('size', '20');
    q.set('sort', 'createdAt,desc');
    api<PageRes>(`/admin/audit/events?${q.toString()}`)
      .then((data) => {
        setEvents(data.content);
        setTotalElements(data.totalElements);
        setTotalPages(data.totalPages);
      })
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load audit events', err.message);
      })
      .finally(() => setLoading(false));
  }, [from, to, actionParam, entityParam, keywordParam, requestIdParam, pageParam, api, addToast]);

  useEffect(() => {
    if (openId) {
      const id = parseInt(openId, 10);
      if (!isNaN(id)) {
        api<AuditEventResponse>(`/admin/audit/events/${id}`)
          .then(setSelectedEvent)
          .catch((err) => {
            if (err?.message === 'Unauthorized') return;
            addToast('error', 'Failed to load event', err.message);
            setSelectedEvent(null);
          });
      }
    } else {
      setSelectedEvent(null);
    }
  }, [openId, api, addToast]);

  useEffect(() => {
    if (traceRequestId) {
      api<AuditEventResponse[]>(`/admin/audit/requests/${encodeURIComponent(traceRequestId)}`)
        .then(setTraceEvents)
        .catch((err) => {
          if (err?.message === 'Unauthorized') return;
          addToast('error', 'Failed to load trace', err.message);
          setTraceEvents(null);
        });
    } else {
      setTraceEvents(null);
    }
  }, [traceRequestId, api, addToast]);

  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    next.delete('trace');
    setSearchParams(next);
  };

  const openDrawer = (id: number) => setSearchParams({ ...Object.fromEntries(searchParams), open: String(id) });

  const setFilter = (key: string, value: string) => {
    const next = { ...Object.fromEntries(searchParams), [key]: value || '' };
    if (!value) delete next[key];
    next.page = '0';
    setSearchParams(next);
  };

  const viewTrace = (reqId: string) => setSearchParams({ ...Object.fromEntries(searchParams), trace: reqId });
  const clearTrace = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('trace');
    setSearchParams(next);
  };

  const drawerOpen = !!openId;
  const showTrace = traceRequestId && traceEvents !== null;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">Audit Logs</h1>
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="date"
          value={from}
          onChange={(e) => setFilter('from', e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setFilter('to', e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
        />
        <select
          value={actionParam}
          onChange={(e) => setFilter('action', e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 min-w-[200px]"
        >
          <option value="">All actions</option>
          {ACTION_OPTIONS.filter(Boolean).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={entityParam}
          onChange={(e) => setFilter('entity', e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 min-w-[140px]"
        >
          <option value="">All entities</option>
          {ENTITY_OPTIONS.filter(Boolean).map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Keyword"
          value={keywordParam}
          onChange={(e) => setFilter('keyword', e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 min-w-[120px]"
        />
        <input
          type="text"
          placeholder="Request ID"
          value={requestIdParam}
          onChange={(e) => setFilter('requestId', e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono text-neutral-900 min-w-[180px]"
        />
      </div>
      {events.length === 0 ? (
        <p className="text-neutral-500 py-8">No audit events match the filters.</p>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-3 py-2 font-medium text-neutral-700">Time</th>
                <th className="px-3 py-2 font-medium text-neutral-700">Actor</th>
                <th className="px-3 py-2 font-medium text-neutral-700">Action</th>
                <th className="px-3 py-2 font-medium text-neutral-700">Entity</th>
                <th className="px-3 py-2 font-medium text-neutral-700">Summary</th>
                <th className="px-3 py-2 font-medium text-neutral-700">RequestId</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => openDrawer(e.id)}
                >
                  <td className="px-3 py-2 text-neutral-600 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1">
                      <Badge variant={roleBadgeVariant(e.actorRole)} className="text-xs">
                        {e.actorRole}
                      </Badge>
                      <span className="text-neutral-600 font-mono text-xs">{shortId(e.actorId)}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-800 font-mono text-xs">{e.action}</td>
                  <td className="px-3 py-2">
                    <span className="text-neutral-600">
                      {e.entityType || '—'} {e.entityId ? shortId(e.entityId) : ''}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-800 max-w-[280px] truncate" title={e.summary}>
                    {e.summary}
                  </td>
                  <td className="px-3 py-2 text-neutral-500 font-mono text-xs">{shortId(e.requestId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pageParam === 0}
            onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(Math.max(0, pageParam - 1)) })}
          >
            Previous
          </Button>
          <span className="text-sm text-neutral-600">
            Page {pageParam + 1} of {totalPages} ({totalElements} total)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pageParam >= totalPages - 1}
            onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(pageParam + 1) })}
          >
            Next
          </Button>
        </div>
      )}

      <Drawer open={drawerOpen} onOpenChange={(o) => !o && closeDrawer()} title="Audit Event Details" side="right">
        {selectedEvent && (
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-neutral-500 block">ID</span>
              <span className="font-mono">{selectedEvent.id}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Time</span>
              <span>{formatDate(selectedEvent.createdAt)}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Request ID</span>
              <span className="font-mono break-all">{selectedEvent.requestId}</span>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => viewTrace(selectedEvent.requestId)}
              >
                View request trace
              </Button>
            </div>
            <div>
              <span className="text-neutral-500 block">Actor</span>
              <span>
                <Badge variant={roleBadgeVariant(selectedEvent.actorRole)}>{selectedEvent.actorRole}</Badge>
                {selectedEvent.actorId && (
                  <span className="ml-2 font-mono text-neutral-600">{selectedEvent.actorId}</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">Action</span>
              <span className="font-mono">{selectedEvent.action}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Entity</span>
              <span>
                {selectedEvent.entityType || '—'} {selectedEvent.entityId ? ` / ${selectedEvent.entityId}` : ''}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">Summary</span>
              <p className="text-neutral-900">{selectedEvent.summary}</p>
            </div>
            {selectedEvent.durationMs != null && (
              <div>
                <span className="text-neutral-500 block">Duration</span>
                <span>{selectedEvent.durationMs} ms</span>
              </div>
            )}
            {selectedEvent.ipAddress && (
              <div>
                <span className="text-neutral-500 block">IP</span>
                <span className="font-mono">{selectedEvent.ipAddress}</span>
              </div>
            )}
            {selectedEvent.userAgent && (
              <div>
                <span className="text-neutral-500 block">User-Agent</span>
                <span className="text-xs break-all">{selectedEvent.userAgent}</span>
              </div>
            )}
            {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
              <div>
                <span className="text-neutral-500 block">Metadata</span>
                <dl className="mt-1 space-y-1 rounded border border-neutral-200 bg-neutral-50 p-2">
                  {Object.entries(selectedEvent.metadata).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="font-mono text-neutral-600 min-w-[100px]">{k}</dt>
                      <dd className="font-mono text-neutral-900 break-all">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}
        {showTrace && traceEvents && traceRequestId && (
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-neutral-900">Request trace: {shortId(traceRequestId)}</h3>
              <Button variant="ghost" size="sm" onClick={clearTrace}>
                Close trace
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {traceEvents.length === 0 ? (
                <p className="text-neutral-500 text-sm">No events for this request.</p>
              ) : (
                traceEvents.map((e) => (
                  <div
                    key={e.id}
                    className="rounded border border-neutral-200 bg-white p-2 text-xs"
                  >
                    <span className="text-neutral-500">{formatDate(e.createdAt)}</span>
                    <span className="mx-2">|</span>
                    <Badge variant={roleBadgeVariant(e.actorRole)} className="text-xs">
                      {e.actorRole}
                    </Badge>
                    <span className="mx-2 font-mono">{e.action}</span>
                    <span className="text-neutral-700">{e.summary}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
