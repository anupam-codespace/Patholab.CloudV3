// FILE: src/components/charts/TestsChart.tsx
// Test statistics chart
// ==========================================
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TestTube, Activity } from 'lucide-react';

interface TestsChartProps {
  data: Array<{
    name: string;
    value: number;
    status?: string;
  }>;
  variant?: 'bar' | 'pie';
  title?: string;
  description?: string;
}

const COLORS = {
  PENDING: 'hsl(45, 93%, 47%)',
  IN_PROGRESS: 'hsl(217, 91%, 60%)',
  COMPLETED: 'hsl(142, 71%, 45%)',
  CANCELLED: 'hsl(0, 84%, 60%)',
};

const STATUS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function TestsChart({
  data,
  variant = 'bar',
  title = 'Test Statistics',
  description = 'Overview of laboratory tests',
}: TestsChartProps) {
  const totalTests = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{totalTests}</p>
            <p className="text-sm text-muted-foreground">Total Tests</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {variant === 'bar' ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
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
                        <p className="font-semibold">{payload[0].payload.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Tests: {payload[0].value}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col gap-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.status
                          ? COLORS[entry.status as keyof typeof COLORS]
                          : STATUS_COLORS[index % STATUS_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-lg">
                          <p className="font-semibold">{payload[0].name}</p>
                          <p className="text-sm text-muted-foreground">
                            Tests: {payload[0].value}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-2">
              {data.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: item.status
                        ? COLORS[item.status as keyof typeof COLORS]
                        : STATUS_COLORS[index % STATUS_COLORS.length],
                    }}
                  />
                  <span className="text-sm">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 text-primary" />
          <span>
            Average daily tests: {Math.round(totalTests / 30)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
