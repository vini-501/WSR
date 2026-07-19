import { useGetManagementSummary, useGetManagementDepartmentCompletion, useGetTopContributors } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle2, TrendingUp, TrendingDown, Target } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export function Management() {
  const { data: summary, isLoading: summaryLoading } = useGetManagementSummary();
  const { data: deptCompletion, isLoading: deptLoading } = useGetManagementDepartmentCompletion();
  const { data: contributors, isLoading: contributorsLoading } = useGetTopContributors({ limit: 5 });

  const completionColumns = [
    {
      accessorKey: "department_name",
      header: "Department",
      cell: ({ row }: any) => <span className="font-medium">{row.original.department_name}</span>,
    },
    {
      accessorKey: "head_name",
      header: "Lead",
      cell: ({ row }: any) => row.original.head_name || <span className="text-muted-foreground italic">None</span>,
    },
    {
      accessorKey: "completion_pct",
      header: "Completion",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <Progress value={row.original.completion_pct} className="w-[60%]" />
          <span className="text-sm font-medium">{row.original.completion_pct}%</span>
        </div>
      ),
    },
    {
      accessorKey: "submitted",
      header: "Submitted",
      cell: ({ row }: any) => `${row.original.submitted} / ${row.original.total_employees}`,
    },
    {
      accessorKey: "late",
      header: "Late",
      cell: ({ row }: any) => row.original.late > 0 ? <span className="text-destructive font-medium">{row.original.late}</span> : "0",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executive Summary</h1>
        <p className="text-muted-foreground mt-1">High-level overview of company operations and compliance.</p>
      </div>

      {summaryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Reports" 
            value={summary.total_reports_this_week} 
            subtitle="Expected this week"
            icon={FileText} 
          />
          <StatCard 
            title="Completion Rate" 
            value={`${summary.completion_rate_pct}%`} 
            subtitle="Company-wide average"
            icon={Target} 
            trend={summary.completion_rate_pct >= 80 ? 'up' : 'down'}
          />
          <StatCard 
            title="Pending Reviews" 
            value={summary.pending_reviews} 
            subtitle="Awaiting manager action"
            icon={Clock} 
            alert={summary.pending_reviews > 10}
          />
          <StatCard 
            title="Departments on Track" 
            value={`${summary.departments_on_track} / ${summary.departments_on_track + summary.departments_behind}`} 
            subtitle="Met submission targets"
            icon={CheckCircle2} 
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Department Compliance</CardTitle>
            <CardDescription>Current week reporting status by department.</CardDescription>
          </CardHeader>
          <CardContent>
            {deptLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : deptCompletion ? (
              <DataTable columns={completionColumns} data={deptCompletion} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Contributors</CardTitle>
            <CardDescription>Most consistent reporting streaks.</CardDescription>
          </CardHeader>
          <CardContent>
            {contributorsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : contributors?.length ? (
              <div className="space-y-6">
                {contributors.map((user, idx) => (
                  <div key={user.employee_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary shrink-0 relative">
                        {user.employee_photo ? (
                          <img src={user.employee_photo} alt={user.employee_name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          user.employee_name.charAt(0)
                        )}
                        {idx === 0 && <span className="absolute -top-2 -right-2 bg-amber-100 p-1 rounded-full text-amber-600"><Target className="h-3 w-3" /></span>}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{user.employee_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{user.department_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">{user.streak_weeks} weeks</p>
                      <p className="text-xs text-muted-foreground">{user.on_time_pct}% on time</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">No data available yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, alert = false, trend }: { title: string, value: string | number, subtitle: string, icon: any, alert?: boolean, trend?: 'up' | 'down' }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className={`h-4 w-4 ${alert ? 'text-destructive' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          {trend && (
            <span className={`flex items-center text-xs font-medium ${trend === 'up' ? 'text-emerald-500' : 'text-destructive'}`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}