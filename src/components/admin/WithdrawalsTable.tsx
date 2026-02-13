'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle2, XCircle, Clock, Loader2, Eye } from 'lucide-react'
import { getAllWithdrawals } from '@/lib/supabase/queries'
import { approveWithdrawal, rejectWithdrawal } from '@/lib/supabase/mutations'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'

export default function WithdrawalsTable() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [adminNote, setAdminNote] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['all-withdrawals'],
    queryFn: getAllWithdrawals,
  })

  const approveMutation = useMutation({
    mutationFn: async ({ withdrawalId, note }: { withdrawalId: string; note?: string }) => {
      if (!user?.id) throw new Error('User not authenticated')
      return approveWithdrawal(withdrawalId, user.id, note)
    },
    onSuccess: () => {
      toast.success('Withdrawal approved successfully!')
      queryClient.invalidateQueries({ queryKey: ['all-withdrawals'] })
      setDialogOpen(false)
      setSelectedWithdrawal(null)
      setAdminNote('')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve withdrawal')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ withdrawalId, note }: { withdrawalId: string; note: string }) => {
      if (!user?.id) throw new Error('User not authenticated')
      return rejectWithdrawal(withdrawalId, user.id, note)
    },
    onSuccess: () => {
      toast.success('Withdrawal rejected successfully!')
      queryClient.invalidateQueries({ queryKey: ['all-withdrawals'] })
      setDialogOpen(false)
      setSelectedWithdrawal(null)
      setAdminNote('')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject withdrawal')
    },
  })

  const handleAction = () => {
    if (!selectedWithdrawal) return

    if (actionType === 'approve') {
      approveMutation.mutate({
        withdrawalId: selectedWithdrawal.id,
        note: adminNote || undefined,
      })
    } else {
      if (!adminNote.trim()) {
        toast.error('Please provide a reason for rejection')
        return
      }
      rejectMutation.mutate({
        withdrawalId: selectedWithdrawal.id,
        note: adminNote,
      })
    }
  }

  const openActionDialog = (withdrawal: any, type: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal)
    setActionType(type)
    setAdminNote('')
    setDialogOpen(true)
  }

  const filteredWithdrawals = withdrawals?.filter((w: any) => {
    if (filterStatus === 'all') return true
    return w.status === filterStatus
  })

  const stats = {
    pending: withdrawals?.filter((w: any) => w.status === 'pending').length || 0,
    approved: withdrawals?.filter((w: any) => w.status === 'approved').length || 0,
    rejected: withdrawals?.filter((w: any) => w.status === 'rejected').length || 0,
    total: withdrawals?.length || 0,
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Loading withdrawals...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Requests</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-orange-500/10 rounded-lg border border-orange-500/20 p-4">
          <p className="text-sm text-orange-800 dark:text-orange-200 mb-1">Pending</p>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.pending}</p>
        </div>
        <div className="bg-green-500/10 rounded-lg border border-green-500/20 p-4">
          <p className="text-sm text-green-800 dark:text-green-200 mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.approved}</p>
        </div>
        <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200 mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.rejected}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('all')}
        >
          All
        </Button>
        <Button
          variant={filterStatus === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('pending')}
        >
          Pending
        </Button>
        <Button
          variant={filterStatus === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('approved')}
        >
          Approved
        </Button>
        <Button
          variant={filterStatus === 'rejected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('rejected')}
        >
          Rejected
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Creator</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Bank Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredWithdrawals || filteredWithdrawals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <p className="text-muted-foreground">No withdrawal requests found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredWithdrawals.map((withdrawal: any) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{withdrawal.creator?.full_name || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">{withdrawal.creator?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-lg">₦{Number(withdrawal.amount).toLocaleString()}</p>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{withdrawal.bank_account_name}</p>
                      <p className="text-muted-foreground">{withdrawal.bank_name}</p>
                      <p className="text-muted-foreground font-mono">{withdrawal.bank_account_number}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        withdrawal.status === 'approved' || withdrawal.status === 'completed'
                          ? 'default'
                          : withdrawal.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {withdrawal.status === 'approved' ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</>
                      ) : withdrawal.status === 'pending' ? (
                        <><Clock className="w-3 h-3 mr-1" /> Pending</>
                      ) : withdrawal.status === 'rejected' ? (
                        <><XCircle className="w-3 h-3 mr-1" /> Rejected</>
                      ) : (
                        withdrawal.status
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{format(new Date(withdrawal.created_at), 'MMM d, yyyy')}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(withdrawal.created_at), 'h:mm a')}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    {withdrawal.status === 'pending' ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openActionDialog(withdrawal, 'approve')}
                          className="gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openActionDialog(withdrawal, 'reject')}
                          className="gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {withdrawal.admin_note && (
                          <p className="italic">"{withdrawal.admin_note}"</p>
                        )}
                        {withdrawal.approved_at && (
                          <p className="text-xs mt-1">
                            {format(new Date(withdrawal.approved_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Confirm that you want to approve this withdrawal request.'
                : 'Provide a reason for rejecting this withdrawal request.'}
            </DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Creator:</span>
                  <span className="font-medium">{selectedWithdrawal.creator?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="font-bold text-lg">₦{Number(selectedWithdrawal.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bank:</span>
                  <span className="font-medium">{selectedWithdrawal.bank_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account:</span>
                  <span className="font-mono text-sm">{selectedWithdrawal.bank_account_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account Name:</span>
                  <span className="font-medium">{selectedWithdrawal.bank_account_name}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="admin-note">
                  {actionType === 'approve' ? 'Note (Optional)' : 'Reason for Rejection *'}
                </Label>
                <Textarea
                  id="admin-note"
                  placeholder={
                    actionType === 'approve'
                      ? 'Add any notes about this approval...'
                      : 'Explain why this withdrawal is being rejected...'
                  }
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              {approveMutation.isPending || rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : actionType === 'approve' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
