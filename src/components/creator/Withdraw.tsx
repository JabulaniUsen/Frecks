'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DollarSign, AlertCircle, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getCreatorBalance, getCreatorWithdrawals } from '@/lib/supabase/queries'
import { createWithdrawal } from '@/lib/supabase/mutations'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'

const Withdraw = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['creator-balance', user?.id],
    queryFn: () => getCreatorBalance(user!.id),
    enabled: !!user?.id,
  })

  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['creator-withdrawals', user?.id],
    queryFn: () => getCreatorWithdrawals(user!.id),
    enabled: !!user?.id,
  })

  const withdrawalMutation = useMutation({
    mutationFn: async (withdrawalAmount: number) => {
      if (!user?.id) throw new Error('User not authenticated')
      if (!balance) throw new Error('Balance information not available')

      const bankDetails = {
        bank_account_name: balance.bank_account_name || '',
        bank_account_number: balance.bank_account_number || '',
        bank_name: balance.bank_name || '',
        bank_code: balance.bank_code || '',
      }

      if (!bankDetails.bank_account_name || !bankDetails.bank_account_number) {
        throw new Error('Please add your bank account details in Settings first')
      }

      return createWithdrawal(user.id, withdrawalAmount, bankDetails)
    },
    onSuccess: () => {
      toast.success('Withdrawal request submitted successfully!')
      setAmount('')
      queryClient.invalidateQueries({ queryKey: ['creator-balance'] })
      queryClient.invalidateQueries({ queryKey: ['creator-withdrawals'] })
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit withdrawal request')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const withdrawalAmount = parseFloat(amount)

    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (withdrawalAmount > accountBalance) {
      toast.error('Insufficient balance')
      return
    }

    if (withdrawalAmount < 1000) {
      toast.error('Minimum withdrawal amount is ₦1,000')
      return
    }

    withdrawalMutation.mutate(withdrawalAmount)
  }

  if (balanceLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const accountBalance = Number(balance?.account_balance) || 0
  const hasBankDetails = balance?.bank_account_name && balance?.bank_account_number

  return (
    <div className="p-3 md:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Withdraw Funds</h2>
        <p className="text-muted-foreground mt-1">Request a withdrawal from your account balance</p>
      </div>

      {/* Account Balance Card */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm opacity-90">Available Balance</p>
            <h3 className="text-3xl font-bold">₦{accountBalance.toLocaleString()}</h3>
          </div>
        </div>
        <Link href="/transactions">
          <Button variant="secondary" size="sm" className="mt-4">
            View Transaction History
          </Button>
        </Link>
      </div>

      {/* Bank Account Warning */}
      {!hasBankDetails && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
              Bank Account Required
            </p>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Please add your bank account details in Settings before requesting a withdrawal.
            </p>
          </div>
        </div>
      )}

      {/* Withdrawal Form */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="text-lg font-bold mb-4">Request Withdrawal</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1000"
              max={accountBalance}
              step="100"
              className="mt-2"
              disabled={!hasBankDetails || withdrawalMutation.isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum withdrawal: ₦1,000
            </p>
          </div>

          {hasBankDetails && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-semibold mb-2">Withdrawal will be sent to:</p>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Account Name:</span> {balance?.bank_account_name}</p>
                <p><span className="text-muted-foreground">Bank:</span> {balance?.bank_name}</p>
                <p><span className="text-muted-foreground">Account Number:</span> {balance?.bank_account_number}</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={!hasBankDetails || withdrawalMutation.isPending || accountBalance < 1000}
            className="w-full"
          >
            {withdrawalMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Request Withdrawal'
            )}
          </Button>
        </form>
      </div>

      {/* Recent Withdrawals */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border">
          <h3 className="text-lg font-bold">Recent Withdrawals</h3>
        </div>

        {withdrawalsLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading withdrawals...</p>
          </div>
        ) : !withdrawals || withdrawals.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No withdrawals yet</h3>
            <p className="text-muted-foreground">
              Your withdrawal requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {withdrawals.slice(0, 5).map((withdrawal: any) => (
              <div key={withdrawal.id} className="p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">₦{Number(withdrawal.amount).toLocaleString()}</p>
                      <Badge
                        variant={
                          withdrawal.status === 'approved' || withdrawal.status === 'completed'
                            ? 'default'
                            : withdrawal.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className="text-xs"
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
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {withdrawal.bank_name} • {withdrawal.bank_account_number?.slice(-4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(withdrawal.created_at), 'MMM d, yyyy • h:mm a')}
                    </p>
                    {withdrawal.admin_note && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <p className="font-semibold mb-1">Admin Note:</p>
                        <p className="text-muted-foreground">{withdrawal.admin_note}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {withdrawals && withdrawals.length > 5 && (
          <div className="p-4 border-t border-border text-center">
            <Link href="/transactions">
              <Button variant="ghost" size="sm">
                View All Withdrawals
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default Withdraw
