// FILE: src/components/charts/SubscriptionChart.tsx
// Subscription metrics chart
// ==========================================
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
} from 'recharts';
import { Users, TrendingUp } from 'lucide-react';

interface SubscriptionChartProps {
  data: Array<{
    month: string;
    newSubscribers: number;
    churned: number;
    total: number;
  }>;
}

export function SubscriptionChart({ data }: SubscriptionChartProps) {
  const totalSubscribers = data[data.length - 1]?.total || 0;
  const growth = data.length > 1
    ? ((data[data.length - 1].total - data[0].total) / data[0].total) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Subscription Growth
            </CardTitle>
            <CardDescription>New subscribers and churn rate</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{totalSubscribers}</p>
            <p className="text-sm text-muted-foreground">Active Subscribers</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="mb-2 font-semibold">{payload[0].payload.month}</p>
                      {payload.map((entry: any) => (
                        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
                          {entry.name}: {entry.value}
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="total"
              fill="url(#colorTotal)"
              stroke="hsl(var(--primary))"
              name="Total Subscribers"
            />
            <Bar
              dataKey="newSubscribers"
              fill="hsl(142, 71%, 45%)"
              name="New Subscribers"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="churned"
              fill="hsl(0, 84%, 60%)"
              name="Churned"
              radius={[8, 8, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span className={growth >= 0 ? 'text-green-500' : 'text-red-500'}>
            {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% growth this period
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
