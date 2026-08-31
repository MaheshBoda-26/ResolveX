'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge, BadgeProps } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Separator } from '@/shared/components/ui/separator';
import { cn } from '@/shared/utils/utils';
import { useHandoffs, Handoff, HandoffFilters, HandoffSort, HandoffStatus } from '@/shared/lib/api';

const STATUS_COLORS: Record<HandoffStatus, 'warning' | 'info' | 'success'> = {
  pending: 'warning',
  accepted: 'info',
  completed: 'success',
};

function PriorityBadge({ priority }: { priority: Handoff['priority'] }) {
  const colors: Record<Handoff['priority'], BadgeProps['variant']> = {
    critical: 'error',
    high: 'warning',
    medium: 'info',
    low: 'default',
  };
  return <Badge variant={colors[priority]} className="capitalize">{priority}</Badge>;
}

function StatusBadge({ status }: { status: HandoffStatus }) {
  const labels: Record<HandoffStatus, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    completed: 'Completed',
  };
  return <Badge variant={STATUS_COLORS[status]}>{labels[status]}</Badge>;
}

interface SortableHeaderProps {
  label: string;
  field: HandoffSort['field'];
  currentSort: HandoffSort;
  onSort: (field: HandoffSort['field']) => void;
}

function SortableHeader({ label, field, currentSort, onSort }: SortableHeaderProps) {
  const isActive = currentSort.field === field;
  const direction = isActive ? currentSort.direction : 'asc';
  return (
    <th
      className="px-4 py-3 text-left text-small font-medium text-text-secondary cursor-pointer hover:text-text-primary select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (
          direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
        {!isActive && <ArrowUpDown className="h-4 w-4 text-text-muted" />}
      </div>
    </th>
  );
}

interface HandoffRowProps {
  handoff: Handoff;
  onClick: () => void;
}

function HandoffRow({ handoff, onClick }: HandoffRowProps) {
  return (
    <tr
      className="cursor-pointer hover:bg-secondary-soft/50 transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="font-medium text-text-primary">{handoff.customer.name}</div>
        <div className="text-caption text-text-muted">{handoff.customer.email}</div>
      </td>
      <td className="px-4 py-3 max-w-xs">
        <div className="text-body-medium text-text-primary line-clamp-1">{handoff.issueSummary}</div>
      </td>
      <td className="px-4 py-3 max-w-xs hidden md:table-cell">
        <div className="text-body-medium text-text-secondary line-clamp-1">{handoff.reason}</div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <PriorityBadge priority={handoff.priority} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-body-medium text-text-secondary">
        {new Date(handoff.createdAt).toLocaleString()}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={handoff.status} />
      </td>
    </tr>
  );
}

export function HandoffList({ onSelect }: { onSelect: (handoff: Handoff) => void }) {
  const [filters, setFilters] = useState<HandoffFilters>({});
  const [sort, setSort] = useState<HandoffSort>({ field: 'createdAt', direction: 'desc' });
  const [search, setSearch] = useState('');

  const { data: handoffs, isLoading, error, refetch } = useHandoffs(filters, sort);

  const handleSort = (field: HandoffSort['field']) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredHandoffs = useMemo(() => {
    if (!handoffs) return [];
    let result = [...handoffs];

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.customer.name.toLowerCase().includes(lowerSearch) ||
          h.customer.email.toLowerCase().includes(lowerSearch) ||
          h.issueSummary.toLowerCase().includes(lowerSearch) ||
          h.reason.toLowerCase().includes(lowerSearch)
      );
    }

    return result;
  }, [handoffs, search]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-secondary-soft rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-error-default">Failed to load handoffs</p>
          <Button variant="outline" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b border-border-default space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search handoffs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters((prev) => ({ ...prev, status: 'pending' }))}
              className={cn(filters.status === 'pending' && 'bg-brand-primary-soft text-brand-primary border-brand-primary')}
            >
              <Filter className="h-4 w-4 mr-1" />
              Pending
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters((prev) => ({ ...prev, status: 'accepted' }))}
              className={cn(filters.status === 'accepted' && 'bg-brand-primary-soft text-brand-primary border-brand-primary')}
            >
              Accepted
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters((prev) => ({ ...prev, status: 'completed' }))}
              className={cn(filters.status === 'completed' && 'bg-brand-primary-soft text-brand-primary border-brand-primary')}
            >
              Completed
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFilters({})}>
              All
            </Button>
          </div>
        </div>
        <Separator />
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-surface-default/80 backdrop-blur-sm z-10">
            <tr className="border-b border-border-default">
              <SortableHeader label="Customer" field="customer" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Issue Summary" field="customer" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Reason" field="customer" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Priority" field="priority" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Created" field="createdAt" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Status" field="customer" currentSort={sort} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {filteredHandoffs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                  No handoffs found
                </td>
              </tr>
            ) : (
              filteredHandoffs.map((handoff) => (
                <HandoffRow
                  key={handoff.id}
                  handoff={handoff}
                  onClick={() => onSelect(handoff)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-border-default flex items-center justify-between text-caption text-text-muted">
        <span>{filteredHandoffs.length} handoff(s)</span>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>
    </Card>
  );
}