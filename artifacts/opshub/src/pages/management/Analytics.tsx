import { useGetAnalyticsOverview, useGetWeeklyTrends, useGetMonthlyTrends, useGetEmployeeActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";

export function Analytics() {
  const { data: overview, isLoading: overviewLoading } = useGetAnalyticsOverview();
  const { data: weeklyTrends, isLoading: weeklyLoading } = useGetWeeklyTrends({ weeks: 12 });
  const { data: monthlyTrends, isLoading: monthlyLoading } = useGetMonthlyTrends({ months: 6 });
  const { data: activity, isLoading: activityLoading } = useGetEmployeeActivity({ limit: 10 });

  const activityColumns = [
    {
      accessorKey: "employee_name",
      header: "Employee",
      cell: ({ row }: any) => <span className="font-medium">{row.original.employee_name}</span>,
    },
    {
      accessorKey: "department_name",
      header: "Department",
    },
    {
      accessorKey: "total_reports",
      header: "Total Submissions",
    },
    {
      accessorKey: "on_time_pct",
      header: "On-Time Rate",
      cell: ({ row }: any) => (
        <span className={row.original.on_time_pct >= 90 ? 'text-emerald-600 font-medium' : row.original.on_time_pct <= 50 ? 'text-destructive font-medium' : ''}>
          {row.original.on_time_pct}%
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep dive into reporting metrics and historical trends.</p>
      </div>

      {overviewLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
        </div>
      ) : overview ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">All-Time Reports</p>
              <p className="text-3xl font-bold tracking-tight mt-2">{overview.total_reports_all_time.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Avg. Submission Rate</p>
              <p className="text-3xl font-bold tracking-tight mt-2 text-emerald-600">{overview.submission_rate_pct}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Late Submissions</p>
              <p className="text-3xl font-bold tracking-tight mt-2 text-amber-500">{overview.late_submission_pct}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Avg. Approval Time</p>
              <p className="text-3xl font-bold tracking-tight mt-2">{overview.avg_approval_time_hours} hrs</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>12-Week Submission Trend</CardTitle>
            <CardDescription>Volume of reports submitted over the last quarter.</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : weeklyTrends ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
                    <Area type="monotone" dataKey="submitted" stroke="var(--primary)" fillOpacity={1} fill="url(#colorSub)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Approval Breakdown</CardTitle>
            <CardDescription>Status distribution over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : monthlyTrends ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="approved" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="rejected" stackId="a" fill="#ef4444" />
                    <Bar dataKey="late" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Activity Metrics</CardTitle>
          <CardDescription>Detailed engagement statistics per employee.</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : activity ? (
            <DataTable columns={activityColumns} data={activity} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}