"use client";

import { auditEventsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { AuditEventDto, AuditEventMetadata } from "@drug-store/shared";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@drug-store/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;

const formatMetadata = (metadata: AuditEventMetadata) => {
  const entries = Object.entries(metadata ?? {});
  if (!entries.length) return "—";
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ");
};

export default function AuditLogPage() {
  const { state } = useAuthContext();
  const [events, setEvents] = useState<AuditEventDto[]>([]);
  const [actorUserId, setActorUserId] = useState("");
  const [entityType, setEntityType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const fetchEvents = useCallback(
    async (nextPage: number) => {
      if (!state.tenantId) {
        setEvents([]);
        setTotal(0);
        setPage(1);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await auditEventsApi.listAuditEvents({
          actorUserId: actorUserId.trim() || undefined,
          entityType: entityType.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        setEvents(response.items);
        setTotal(response.total);
        setPage(response.page);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit events");
      } finally {
        setLoading(false);
      }
    },
    [actorUserId, endDate, entityType, startDate, state.tenantId],
  );

  useEffect(() => {
    fetchEvents(1);
  }, [fetchEvents]);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review recent administrative actions for the selected tenant.
        </p>
      </div>

      {!state.tenantId && <Alert variant="warning">Select a tenant to load audit events.</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="audit-actor">
              Actor ID
            </label>
            <Input
              id="audit-actor"
              value={actorUserId}
              onChange={(e) => setActorUserId(e.target.value)}
              placeholder="User ID"
              disabled={!state.tenantId}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-gray-700"
              htmlFor="audit-entity"
            >
              Entity type
            </label>
            <Input
              id="audit-entity"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="tenant, branch, membership"
              disabled={!state.tenantId}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="audit-start">
              Start date
            </label>
            <Input
              id="audit-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!state.tenantId}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="audit-end">
              End date
            </label>
            <Input
              id="audit-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={!state.tenantId}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => fetchEvents(1)}
              disabled={!state.tenantId || loading}
              className="w-full"
            >
              Apply filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
            <table className="w-full text-left text-sm text-on_surface_variant">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Time
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Action
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {!state.tenantId ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-on_surface_variant">
                      Select a tenant to view audit events.
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-on_surface_variant">
                      {loading ? "Loading audit events..." : "No audit events found."}
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="hover:bg-surface_container_high">
                      <td className="px-4 py-3 text-on_surface">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-on_surface">{event.action}</td>
                      <td className="px-4 py-3">{event.actorUserId}</td>
                      <td className="px-4 py-3">
                        <div className="text-on_surface">{event.entityType}</div>
                        <div className="text-xs text-on_surface_variant">{event.entityId}</div>
                      </td>
                      <td className="px-4 py-3">{formatMetadata(event.metadata)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-on_surface_variant">
            <span>
              Showing page {page} of {pageCount} · {total} total
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fetchEvents(page - 1)}
                disabled={!state.tenantId || loading || page <= 1}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => fetchEvents(page + 1)}
                disabled={!state.tenantId || loading || page >= pageCount}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
