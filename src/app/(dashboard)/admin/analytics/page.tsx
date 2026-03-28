'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  format, subDays, startOfDay, endOfDay, startOfYear, startOfMonth, 
  endOfMonth, parseISO 
} from 'date-fns';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { 
  Download, Calendar as CalendarIcon, RefreshCcw, 
  MapPin, Users, Activity, DollarSign, FileSpreadsheet, 
  FileText, Share2, TrendingUp, TrendingDown, Building2
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Charts
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

// --- CONSTANTS & UTILS ---
const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#ec4899'];

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumSignificantDigits: 10 
  }).format(val);

// Animations
const containerVar = { 
  hidden: { opacity: 0 }, 
  show: { opacity: 1, transition: { staggerChildren: 0.1 } } 
};
const itemVar = { 
  hidden: { y: 20, opacity: 0 }, 
  show: { y: 0, opacity: 1 } 
};

export default function AdvancedAnalyticsPage() {
  // 1. STATE
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState('30d');

  // 2. DATA FETCHING
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['advanced-analytics', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });
      const res = await fetch(`/api/admin/analytics?${params}`);
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    placeholderData: (previousData) => previousData // Keep old data while fetching new
  });

  // 3. HANDLERS
  const handlePresetChange = (value: string) => {
    setActiveTab(value);
    const now = new Date();
    
    switch (value) {
      case 'today':
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case 'yesterday':
        const yest = subDays(now, 1);
        setDateRange({ from: startOfDay(yest), to: endOfDay(yest) });
        break;
      case '7d':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case '30d':
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case 'month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'year':
        setDateRange({ from: startOfYear(now), to: now });
        break;
    }
  };

  const handleExport = async (formatType: 'csv' | 'pdf' | 'excel') => {
    if (!data) return;

    const fromStr = dateRange.from.toISOString();
    const toStr = dateRange.to.toISOString();

    // A. EXCEL EXPORT (Server-Side)
    if (formatType === 'excel') {
      try {
        toast.loading('Generating Excel Report...');
        const response = await fetch(`/api/admin/analytics/export/excel?from=${fromStr}&to=${toStr}`);
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        saveAs(blob, `GlobPath_Analytics_${format(new Date(), 'yyyyMMdd')}.xlsx`);
        toast.dismiss();
        toast.success('Excel downloaded successfully');
      } catch (error) {
        toast.dismiss();
        toast.error('Failed to download Excel');
      }
    } 
    
    // B. PDF EXPORT (Client-Side Snapshot)
    else if (formatType === 'pdf') {
      const dashboardElement = document.getElementById('analytics-dashboard-container');
      if (!dashboardElement) return;

      try {
        toast.loading('Generating PDF...');
        
        const canvas = await html2canvas(dashboardElement, {
          scale: 1.5, // Balance quality vs size
          useCORS: true,
          logging: false,
          ignoreElements: (element) => element.id === 'no-print' // Ignore export buttons
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });

        const imgWidth = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Analytics_Dashboard_${format(new Date(), 'yyyyMMdd')}.pdf`);
        
        toast.dismiss();
        toast.success('PDF generated successfully');
      } catch (error) {
        console.error(error);
        toast.dismiss();
        toast.error('Failed to generate PDF');
      }
    }
    
    // C. CSV EXPORT (Client-Side)
    else if (formatType === 'csv') {
      try {
        const headers = ['Date', 'Revenue'];
        const rows = data.charts.revenueOverTime.map((row: any) => `${row.date},${row.revenue}`);
        const csvContent = [headers.join(','), ...rows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        saveAs(blob, `analytics_data_${format(new Date(), 'yyyyMMdd')}.csv`);
        toast.success('CSV Downloaded');
      } catch (error) {
        toast.error('Failed to generate CSV');
      }
    }
  };

  if (isLoading && !data) return <AnalyticsSkeleton />;

  return (
    <motion.div 
      id="analytics-dashboard-container"
      variants={containerVar}
      initial="hidden"
      animate="show"
      className="space-y-6 p-8 min-h-screen bg-muted/5 text-foreground"
    >
      {/* --- HEADER CONTROLS --- */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Analytics Intelligence</h1>
           <p className="text-muted-foreground mt-1">
             Insights from <span className="font-semibold text-primary">{format(dateRange.from, 'MMM dd')}</span> to <span className="font-semibold text-primary">{format(dateRange.to, 'MMM dd, yyyy')}</span>
           </p>
        </div>

        <div id="no-print" className="flex flex-wrap items-center gap-2">
            {/* Quick Filters */}
            <Tabs value={activeTab} onValueChange={handlePresetChange} className="hidden lg:block">
                <TabsList>
                    <TabsTrigger value="today">Today</TabsTrigger>
                    <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
                    <TabsTrigger value="7d">7D</TabsTrigger>
                    <TabsTrigger value="30d">30D</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="year">Year</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Custom Date Picker */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className={!['today','yesterday','7d','30d','month','year'].includes(activeTab) ? "border-primary" : ""}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {activeTab && activeTab !== 'custom' ? 'Custom Range' : 'Select Date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="range"
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => {
                            if (range?.from) {
                                setDateRange({ from: range.from, to: range.to || range.from });
                                setActiveTab('custom');
                            }
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            
            {/* Export Menu */}
            <Select onValueChange={(v) => handleExport(v as any)}>
                <SelectTrigger className="w-[140px]">
                    <Download className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="csv"><div className="flex items-center"><FileText className="mr-2 h-4 w-4" /> CSV Raw</div></SelectItem>
                    <SelectItem value="excel"><div className="flex items-center"><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel Report</div></SelectItem>
                    <SelectItem value="pdf"><div className="flex items-center"><Share2 className="mr-2 h-4 w-4" /> PDF Visual</div></SelectItem>
                </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isRefetching}>
                <RefreshCcw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
        </div>
      </div>

      {/* --- 1. KPI CARDS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         <MetricCard 
           title="Total Revenue" 
           value={formatCurrency(data.kpi.revenue)} 
           trend="+12.5%" 
           trendUp={true} 
           icon={DollarSign} 
           color="text-green-600" 
         />
         <MetricCard 
           title="Active Labs" 
           value={data.kpi.activeLabs} 
           trend="+4" 
           trendUp={true} 
           icon={Building2} 
           color="text-blue-600" 
         />
         <MetricCard 
           title="Total Tests" 
           value={data.kpi.tests.toLocaleString()} 
           trend="-2.1%" 
           trendUp={false} 
           icon={Activity} 
           color="text-purple-600" 
         />
         <MetricCard 
           title="Total Patients" 
           value={data.kpi.patients.toLocaleString()} 
           trend="+8.4%" 
           trendUp={true} 
           icon={Users} 
           color="text-orange-600" 
         />
      </div>

      {/* --- 2. MAIN CHARTS --- */}
      <div className="grid gap-6 lg:grid-cols-7">
        
        {/* Revenue Area Chart */}
        <motion.div variants={itemVar} className="col-span-4 lg:col-span-5">
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Revenue Trends</CardTitle>
                    <CardDescription>Financial performance over selected period</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.charts.revenueOverTime}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                            <XAxis 
                              dataKey="date" 
                              axisLine={false} 
                              tickLine={false} 
                              fontSize={12} 
                              className="text-muted-foreground" 
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              fontSize={12} 
                              className="text-muted-foreground"
                              tickFormatter={(v) => `₹${v/1000}k`} 
                            />
                            <Tooltip 
                                contentStyle={{ 
                                  borderRadius: '8px', 
                                  backgroundColor: 'var(--background)', 
                                  border: '1px solid var(--border)' 
                                }} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="revenue" 
                              stroke="#2563eb" 
                              strokeWidth={3} 
                              fill="url(#colorRev)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </motion.div>

        {/* Geographic Distribution (Bar Chart Horizontal) */}
        <motion.div variants={itemVar} className="col-span-4 lg:col-span-2">
            <Card className="shadow-sm h-full">
                <CardHeader>
                    <CardTitle>Labs by Region</CardTitle>
                    <CardDescription>Top states by lab count</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.charts.geoData} layout="vertical" margin={{ left: 0, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} fontSize={11} interval={0} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </motion.div>
      </div>

      {/* --- 3. DEMOGRAPHICS & SEGMENTATION --- */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Gender Split (Pie) */}
        <motion.div variants={itemVar}>
          <Card>
              <CardHeader>
                  <CardTitle>Patient Gender</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={data.charts.demographics.gender}
                              cx="50%" cy="50%"
                              innerRadius={60} outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {data.charts.demographics.gender.map((_:any, i:number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px' }} />
                          <Legend verticalAlign="bottom" />
                      </PieChart>
                  </ResponsiveContainer>
              </CardContent>
          </Card>
        </motion.div>

        {/* Age Groups (Bar) */}
        <motion.div variants={itemVar}>
          <Card>
              <CardHeader>
                  <CardTitle>Patient Age Groups</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.charts.demographics.age}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                          <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                          <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                  </ResponsiveContainer>
              </CardContent>
          </Card>
        </motion.div>

        {/* User Roles (Donut) */}
        <motion.div variants={itemVar}>
          <Card>
               <CardHeader>
                  <CardTitle>System Users</CardTitle>
              </CardHeader>
               <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={data.charts.userRoles}
                              cx="50%" cy="50%"
                              innerRadius={60} outerRadius={80}
                              dataKey="value"
                          >
                              {data.charts.userRoles.map((_:any, i:number) => (
                                <Cell key={i} fill={COLORS[(i+2) % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px' }} />
                          <Legend verticalAlign="bottom" />
                      </PieChart>
                  </ResponsiveContainer>
              </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* --- 4. TOP PERFORMERS TABLE --- */}
      <motion.div variants={itemVar}>
        <Card>
          <CardHeader>
              <CardTitle>Top Performing Labs (Selected Period)</CardTitle>
              <CardDescription>Ranked by revenue generated within the current filter</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                          <tr>
                              <th className="px-4 py-3 rounded-tl-lg">Rank</th>
                              <th className="px-4 py-3">Lab Name</th>
                              <th className="px-4 py-3">Location</th>
                              <th className="px-4 py-3 text-right">Tests Count</th>
                              <th className="px-4 py-3 text-right rounded-tr-lg">Revenue</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {data.topPerformers.map((lab: any, index: number) => (
                              <tr key={index} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3 font-medium text-muted-foreground">#{index + 1}</td>
                                  <td className="px-4 py-3 font-medium text-primary">{lab.name}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{lab.location}</td>
                                  <td className="px-4 py-3 text-right">
                                    <Badge variant="secondary">{lab.tests}</Badge>
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold">{formatCurrency(lab.revenue)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}

// --- SUB-COMPONENTS ---

function MetricCard({ title, value, trend, trendUp, icon: Icon, color }: any) {
    return (
        <motion.div variants={itemVar}>
          <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                  <div className={`p-2 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="flex items-center mt-1 text-xs">
                     {trendUp ? <TrendingUp className="h-3 w-3 text-green-500 mr-1" /> : <TrendingDown className="h-3 w-3 text-red-500 mr-1" />}
                     <span className={trendUp ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>{trend}</span>
                     <span className="text-muted-foreground ml-1">vs prev period</span>
                  </div>
              </CardContent>
          </Card>
        </motion.div>
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-64" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
            <div className="grid gap-6 lg:grid-cols-7">
                <Skeleton className="col-span-5 h-[400px] rounded-xl" />
                <Skeleton className="col-span-2 h-[400px] rounded-xl" />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-[300px] rounded-xl" />)}
            </div>
        </div>
    );
}