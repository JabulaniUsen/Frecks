'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Loader2, DollarSign } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { getWalletTransactions, getCreatorWithdrawals, getCreatorBalance } from '@/lib/supabase/queries'
import { format } from 'date-fns'
import Link from 'next/link'

export default function TransactionsPage() {
  const { profile, loading: authLoading, user } = useAuth()
  const router = useRouter()

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['creator-balance', user?.id],
    queryFn: () => getCreatorBalance(user!.id),
    enabled: !!user?.id && profile?.role === 'creator',
  })

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['wallet-transactions', user?.id],
    queryFn: () => getWalletTransactions(user!.id),
    enabled: !!user?.id && profile?.role === 'creator',
  })

  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['creator-withdrawals', user?.id],
    queryFn: () => getCreatorWithdrawals(user!.id),
    enabled: !!user?.id && profile?.role === 'creator',
  })

  useEffect(() => {
    if (!authLoading && (!user || !profile)) {
      router.replace('/auth/signin?redirect=/transactions')
      return
    }
    if (!authLoading && profile?.role !== 'creator') {
      router.replace('/dashboard/user')
      return
    }
  }, [profile, authLoading, user, router])

  if (authLoading || balanceLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <Footer />
      </div>
    )
  }

  if (!user || !profile || profile.role !== 'creator') {
    return null
  }

  const accountBalance = Number(balance?.account_balance) || 0

  // Combine transactions and withdrawals into a single timeline
  const allTransactions = [
    ...(transactions || []).map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      status: t.status,
      description: t.description,
      created_at: t.created_at,
      isWithdrawal: false,
    })),
    ...(withdrawals || []).map((w: any) => ({
      id: w.id,
      type: 'withdrawal',
      amount: -w.amount,
      status: w.status,
      description: `Withdrawal to ${w.bank_name} ${w.bank_account_number?.slice(-4)}`,
      created_at: w.created_at,
      isWithdrawal: true,
      withdrawal: w,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Link href="/dashboard/creator">
                <Button variant="ghost" className="gap-2 mb-4">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
              <p className="text-muted-foreground">View all your earnings and withdrawals</p>
            </div>

            {/* Account Balance Card */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 md:p-8 text-primary-foreground mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm opacity-90">Available Balance</p>
                  <h2 className="text-3xl md:text-4xl font-bold">
                    ₦{accountBalance.toLocaleString()}
                  </h2>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/dashboard/creator?tab=withdraw">
                  <Button variant="secondary" className="gap-2">
                    <ArrowUpRight className="w-4 h-4" />
                    Request Withdrawal
                  </Button>
                </Link>
              </div>
            </div>

            {/* Transactions List */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-4 md:p-6 border-b border-border">
                <h3 className="text-lg font-bold">All Transactions</h3>
              </div>

              {transactionsLoading || withdrawalsLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Loading transactions...</p>
                </div>
              ) : allTransactions.length === 0 ? (
                <div className="p-12 text-center">
                  <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No transactions yet</h3>
                  <p className="text-muted-foreground">
                    Your transaction history will appear here once you start earning from events.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {allTransactions.map((transaction: any) => {
                    const isPositive = transaction.amount > 0
                    const isWithdrawal = transaction.isWithdrawal

                    return (
                      <div key={transaction.id} className="p-4 md:p-6 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              isPositive ? 'bg-green-500/10' : 'bg-orange-500/10'
                            }`}>
                              {isPositive ? (
                                <ArrowDownRight className="w-5 h-5 text-green-600" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5 text-orange-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold mb-1 truncate">
                                {transaction.description || 
                                  (transaction.type === 'earning' ? 'Event Earnings' : 
                                   transaction.type === 'withdrawal' ? 'Withdrawal' : 
                                   transaction.type)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(transaction.created_at), 'MMM d, yyyy • h:mm a')}
                              </p>
                              {isWithdrawal && transaction.withdrawal && (
                                <div className="mt-2">
                                  <Badge
                                    variant={
                                      transaction.status === 'approved' || transaction.status === 'completed'
                                        ? 'default'
                                        : transaction.status === 'pending'
                                        ? 'secondary'
                                        : 'destructive'
                                    }
                                    className="text-xs"
                                  >
                                    {transaction.status}
                                  </Badge>
                                  {transaction.withdrawal.admin_note && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Note: {transaction.withdrawal.admin_note}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-lg font-bold ${
                              isPositive ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {isPositive ? '+' : ''}₦{Math.abs(transaction.amount).toLocaleString()}
                            </p>
                            {!isWithdrawal && (
                              <Badge
                                variant={
                                  transaction.status === 'completed'
                                    ? 'default'
                                    : transaction.status === 'pending'
                                    ? 'secondary'
                                    : 'destructive'
                                }
                                className="text-xs mt-1"
                              >
                                {transaction.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
