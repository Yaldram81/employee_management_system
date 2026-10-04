/**
 * Shared Component Library — Reusable UI components that eliminate duplication
 * across employee, manager, and admin views.
 *
 * Usage:
 *   import { DataCard, StatusBadge, EmptyState, FileUploader, FilterBar } from '@/components/ems/shared/components';
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Upload, FileIcon, X, Search, Filter, ChevronLeft, ChevronRight,
  Inbox, AlertCircle, Loader2, Download, Trash2, FileText, Image, Archive,
} from 'lucide-react';
import { useUploadFile, useDeleteFile, useFiles } from '@/lib/query-hooks';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Status Color Map ───────────────────────────────────────────────────────

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  // Attendance
  present: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  absent: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  late: { bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
  'half-day': { bg: 'bg-orange-500/10', text: 'text-orange-500', dot: 'bg-orange-500' },
  holiday: { bg: 'bg-purple-500/10', text: 'text-purple-500', dot: 'bg-purple-500' },
  weekend: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500' },
  // Leave / Request / Task
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  cancelled: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500' },
  escalated: { bg: 'bg-orange-500/10', text: 'text-orange-500', dot: 'bg-orange-500' },
  // Task
  todo: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500' },
  'in-progress': { bg: 'bg-blue-500/10', text: 'text-blue-500', dot: 'bg-blue-500' },
  'in-review': { bg: 'bg-purple-500/10', text: 'text-purple-500', dot: 'bg-purple-500' },
  done: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  blocked: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  // Complaint
  open: { bg: 'bg-blue-500/10', text: 'text-blue-500', dot: 'bg-blue-500' },
  investigating: { bg: 'bg-purple-500/10', text: 'text-purple-500', dot: 'bg-purple-500' },
  'in-progress': { bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
  resolved: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  closed: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500' },
  // Payroll
  draft: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500' },
  reviewed: { bg: 'bg-blue-500/10', text: 'text-blue-500', dot: 'bg-blue-500' },
  paid: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  'on-hold': { bg: 'bg-orange-500/10', text: 'text-orange-500', dot: 'bg-orange-500' },
};

// ─── DataCard ───────────────────────────────────────────────────────────────

interface DataCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
  onClick?: () => void;
}

export function DataCard({ title, value, subtitle, icon, trend, className = '', onClick }: DataCardProps) {
  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                <span>{trend.value >= 0 ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── StatusBadge ────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/_/g, '-');
  const colors = statusColors[normalizedStatus] || { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500' };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <Badge
      variant="outline"
      className={`${colors.bg} ${colors.text} border-0 font-medium ${sizeClasses[size]} ${className}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors.dot} mr-1.5`} />
      {normalizedStatus.replace(/-/g, ' ')}
    </Badge>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
        {icon || <Inbox className="h-8 w-8 text-muted-foreground/50" />}
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
      {description && <p className="text-xs text-muted-foreground max-w-sm">{description}</p>}
      {action && (
        <Button size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ─── FileUploader ───────────────────────────────────────────────────────────

interface FileUploaderProps {
  entityType: string;
  entityId: string;
  category?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
}

export function FileUploader({
  entityType, entityId, category = 'general',
  maxFiles = 5, acceptedTypes,
}: FileUploaderProps) {
  const { data: files, isLoading } = useFiles(entityType, entityId);
  const uploadMutation = useUploadFile();
  const deleteMutation = useDeleteFile();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const currentCount = (files as any[])?.length || 0;

    for (const file of fileArray.slice(0, maxFiles - currentCount)) {
      try {
        await uploadMutation.mutateAsync({ entityType, entityId, file, category });
        toast.success(`Uploaded: ${file.name}`);
      } catch (err) {
        toast.error(`Failed to upload: ${file.name}`);
      }
    }
  }, [entityType, entityId, category, maxFiles, uploadMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

  const handleDelete = useCallback(async (fileId: string) => {
    try {
      await deleteMutation.mutateAsync({ fileId, entityType, entityId });
      toast.success('File deleted');
    } catch {
      toast.error('Failed to delete file');
    }
  }, [entityType, entityId, deleteMutation]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-muted-foreground/20 hover:border-muted-foreground/40'
        }`}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          Drop files here or <span className="text-emerald-500 font-medium">browse</span>
        </p>
        <p className="text-xs text-muted-foreground/50 mt-1">Max {maxFiles} files, 10MB each</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={acceptedTypes?.join(',')}
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
      </div>

      {/* File List */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading files...
        </div>
      ) : files && files.length > 0 ? (
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {files.map((file: any) => (
              <div key={file.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 text-muted-foreground">{getFileIcon(file.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{file.originalName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                          <a href={file.url} download>
                            <Download className="h-3 w-3" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(file.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : null}
    </div>
  );
}

// ─── FilterBar ──────────────────────────────────────────────────────────────

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Array<{
    key: string;
    label: string;
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
  }>;
}

export function FilterBar({ searchValue, onSearchChange, searchPlaceholder = 'Search...', filters }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 h-9"
        />
      </div>
      {filters?.map((filter) => (
        <select
          key={filter.key}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
    </div>
  );
}

// ─── ConfirmationDialog ─────────────────────────────────────────────────────

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open, onOpenChange, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'default', onConfirm, isLoading,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PaginatedTable ─────────────────────────────────────────────────────────

interface PaginatedTableProps<T> {
  data: T[];
  columns: Array<{ key: string; label: string; render?: (item: T) => React.ReactNode }>;
  pageSize?: number;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function PaginatedTable<T extends Record<string, any>>({
  data, columns, pageSize = 10, onRowClick, emptyMessage = 'No data',
}: PaginatedTableProps<T>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, idx) => (
                <TableRow
                  key={item.id || idx}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(item) : item[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.length)} of {data.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ErrorBoundary Fallback ─────────────────────────────────────────────────

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  title?: string;
}

export function ErrorFallback({ error, resetErrorBoundary, title = 'Something went wrong' }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
      {error?.message && <p className="text-xs text-muted-foreground max-w-sm">{error.message}</p>}
      {resetErrorBoundary && (
        <Button size="sm" variant="outline" className="mt-4" onClick={resetErrorBoundary}>
          Try again
        </Button>
      )}
    </div>
  );
}
