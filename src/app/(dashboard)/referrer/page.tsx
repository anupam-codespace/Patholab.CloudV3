// FILE: src/app/(dashboard)/referrer/page.tsx
// Doctor/Agency Dashboard
// ==========================================
'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DollarSign, TrendingUp, Users, FileText, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';


export default function ReferrerDashboard() {
  // Fetch referrer stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['referrer', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/referrer/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  // Fetch recent referrals
  const { data: referrals } = useQuery({
    queryKey: ['referrer', 'referrals'],
    queryFn: async () => {
      const response = await fetch('/api/referrer/referrals');
      if (!response.ok) throw new Error('Failed to fetch referrals');
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {stats?.referrer?.name}</h1>
          <p className="text-muted-foreground">Track your referrals and commissions</p>
        </div>
        
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Commission"
          value={formatCurrency(stats?.totalCommission || 0)}
          description="All time earnings"
          icon={DollarSign}
          className="border-green-200 dark:border-green-900"
        />

        <StatsCard
          title="This Month"
          value={formatCurrency(stats?.monthlyCommission || 0)}
          description="Current month commission"
          icon={TrendingUp}
          trend={{ value: stats?.commissionTrend || 0, isPositive: stats?.commissionTrend >= 0 }}
        />

        <StatsCard
          title="Pending Payment"
          value={formatCurrency(stats?.pendingCommission || 0)}
          description={`${stats?.pendingCount || 0} referrals`}
          icon={FileText}
          className="border-orange-200 dark:border-orange-900"
        />

        <StatsCard
          title="Total Referrals"
          value={stats?.totalReferrals || 0}
          description="Lifetime referrals"
          icon={Users}
        />
      </div>

      {/* Commission Rate Info */}
      <Card className="border-primary">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Your Commission Rate</p>
              <p className="text-3xl font-bold text-primary">
                {stats?.referrer?.commissionType === 'PERCENTAGE' 
                  ? `${stats?.referrer?.commissionValue}%` 
                  : formatCurrency(stats?.referrer?.commissionValue)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {stats?.referrer?.commissionType === 'PERCENTAGE' ? 'Per test value' : 'Per test'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Laboratory</p>
              <p className="text-lg font-semibold">{stats?.lab?.name}</p>
              <p className="text-sm text-muted-foreground">{stats?.lab?.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Referrals */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Referrals</CardTitle>
          <CardDescription>Your latest patient referrals and commission status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Test #</th>
                  <th className="pb-3 font-medium">Patient</th>
                  <th className="pb-3 font-medium">Test Name</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Commission</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {referrals?.referrals?.map((referral: any) => (
                  <tr key={referral.id} className="hover:bg-muted/50">
                    <td className="py-3 text-sm">{formatDate(referral.createdAt)}</td>
                    <td className="py-3 font-medium">{referral.test?.testNumber}</td>
                    <td className="py-3">{referral.test?.patient?.name}</td>
                    <td className="py-3">{referral.test?.testName}</td>
                    <td className="py-3">{formatCurrency(referral.testAmount)}</td>
                    <td className="py-3 font-semibold text-green-600">
                      {formatCurrency(referral.commissionAmount)}
                    </td>
                    <td className="py-3">
                      {referral.commissionPaid ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Paid on {formatDate(referral.paidAt)}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
            <CardDescription>Last 6 months commission summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.monthlyBreakdown?.map((month: any) => (
                <div key={month.month} className="flex items-center justify-between">
                  <span className="text-sm">{month.month}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {month.referrals} referrals
                    </span>
                    <span className="font-semibold">{formatCurrency(month.commission)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Referred Tests</CardTitle>
            <CardDescription>Most frequently referred tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.topTests?.map((test: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{test.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{test.count} tests</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(test.commission)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}