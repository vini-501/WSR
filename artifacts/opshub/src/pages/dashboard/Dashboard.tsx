import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useListDepartments, 
  useListEmployees,
  useGetDashboardRecentActivity,
  useGetDashboardUpcomingDeadlines,
  customFetch
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileEdit,
  RefreshCw,
  TrendingUp,
  Calendar,
  X,
  Award,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Percent
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { EmailWidget } from "@/components/dashboard/EmailWidget";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#94a3b8", "#ef4444", "#8b5cf6"];

// Helper to pre-calculate the list of Mondays
const getMondays = () => {
  const list = [];
  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = (currentDay === 0 ? -6 : 1) - currentDay;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() + mondayOffset);

  for (let i = 0; i < 8; i++) {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() - i * 7);
    list.push(d.toISOString().split("T")[0]);
  }
  return list;
};

// Custom React Query hook for `/api/dashboard/analytics`
export function useGetDashboardAnalytics(params: {
  week_start?: string;
  department_id?: string;
  employee_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["dashboard-analytics", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val) {
          queryParams.append(key, val);
        }
      });
      const url = `/api/dashboard/analytics?${queryParams.toString()}`;
      return customFetch<any>(url);
    },
    refetchInterval: 5000, // Real-time automatic updates every 5s!
  });
}

export function Dashboard() {
  const { profile } = useAuth();

  // State for filters
  const [weekStart, setWeekStart] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Determine active tab: if employee, force 'employee'. Else default to 'executive'.
  const defaultTab = profile?.role === "employee" ? "employee" : "executive";
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Set default filters based on role
  useEffect(() => {
    if (profile) {
      if (profile.role === "employee") {
        setActiveTab("employee");
        setEmployeeId(profile.id);
        if (profile.department_id) {
          setDepartmentId(profile.department_id);
        }
      } else if (profile.role === "department_head" && profile.department_id) {
        setDepartmentId(profile.department_id);
      }
    }
  }, [profile]);

  // List of Mondays for filter
  const mondays = getMondays();

  // Fetch departments list
  const { data: deptsData } = useListDepartments({ limit: 100 });
  const departmentsList = deptsData?.data || [];

  // Fetch employees list
  const employeeFilterParams = profile?.role === "department_head" && profile.department_id
    ? { department_id: profile.department_id, limit: 100 }
    : { limit: 100 };
  const { data: empsData } = useListEmployees(employeeFilterParams);
  const employeesList = empsData?.data || [];

  // Fetch unified filterable analytics
  const { 
    data: analytics, 
    isLoading: analyticsLoading, 
    isFetching: analyticsFetching, 
    refetch 
  } = useGetDashboardAnalytics({
    week_start: weekStart,
    department_id: departmentId,
    employee_id: employeeId,
    status: status,
    start_date: startDate,
    end_date: endDate,
  });

  // Keep existing dashboard elements (Recent Activity & Upcoming Deadlines)
  const { data: recentActivity, isLoading: activityLoading } = useGetDashboardRecentActivity({ limit: 5 });
  const { data: deadlines, isLoading: deadlinesLoading } = useGetDashboardUpcomingDeadlines();

  const handleResetFilters = () => {
    setWeekStart("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    if (profile?.role !== "employee") {
      setEmployeeId("");
    }
    if (profile?.role !== "employee" && profile?.role !== "department_head") {
      setDepartmentId("");
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "submitted": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "under_review": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "needs_changes": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "rejected": return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "draft": return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      default: return "bg-slate-100 text-slate-400";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Dashboard Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights and status overview of company reporting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {analyticsFetching && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse mr-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Syncing live data...
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
            <RefreshCw className={`h-4.5 w-4.5 mr-1.5 ${analyticsFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sleek Glassmorphic Filter Bar */}
      <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          {/* Week Start selector */}
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Reporting Week</label>
            <Select value={weekStart} onValueChange={setWeekStart}>
              <SelectTrigger className="bg-background/80">
                <SelectValue placeholder="Current Week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_weeks">All Weeks</SelectItem>
                {mondays.map((monday) => (
                  <SelectItem key={monday} value={monday}>
                    Week of {format(new Date(monday), "MMM d, yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Selector (Locked for Dept Head, hidden for Employee) */}
          {profile?.role !== "employee" && (
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Department</label>
              <Select 
                value={departmentId} 
                onValueChange={setDepartmentId}
                disabled={profile?.role === "department_head"}
              >
                <SelectTrigger className="bg-background/80">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_depts">All Departments</SelectItem>
                  {departmentsList.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Employee Selector (Hidden for Employee) */}
          {profile?.role !== "employee" && (
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Employee</label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="bg-background/80">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_emps">All Employees</SelectItem>
                  {employeesList.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status Selector */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Report Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-background/80">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_statuses">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="needs_changes">Needs Changes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range selection */}
          <div className="flex gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Start Date</label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="h-9 bg-background/80 w-[140px]" 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">End Date</label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="h-9 bg-background/80 w-[140px]" 
              />
            </div>
          </div>

          {/* Reset Filters */}
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9 text-muted-foreground">
            <X className="h-4 w-4 mr-1.5" />
            Reset
          </Button>
        </CardContent>
      </Card>

      {/* Tabs navigation for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {profile?.role !== "employee" && (
          <TabsList className="bg-muted/60 p-1 border border-border/20">
            <TabsTrigger value="executive" className="px-4 py-2">Executive Dashboard</TabsTrigger>
            <TabsTrigger value="departments" className="px-4 py-2">Department Analytics</TabsTrigger>
            <TabsTrigger value="employee" className="px-4 py-2">Employee Analytics</TabsTrigger>
          </TabsList>
        )}

        {/* Tab 1: Executive Dashboard */}
        <TabsContent value="executive" className="space-y-6">
          {analyticsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : analytics ? (
            <>
              {/* Executive Metrics Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                <StatCard title="Total Employees" value={analytics.stats.total_employees} icon={Users} />
                <StatCard title="Active Departments" value={analytics.stats.active_departments} icon={Building2} />
                <StatCard title="Reports Submitted" value={analytics.stats.reports_submitted} icon={FileText} />
                <StatCard title="Pending Reports" value={analytics.stats.pending_reports} icon={Clock} alert={analytics.stats.pending_reports > 0} />
                <StatCard title="Approved Reports" value={analytics.stats.approved_reports} icon={CheckCircle2} />
                <StatCard title="Rejected Reports" value={analytics.stats.rejected_reports} icon={AlertCircle} alert={analytics.stats.rejected_reports > 0} />
                <StatCard title="Draft Reports" value={analytics.stats.draft_reports} icon={FileEdit} />
                <StatCard title="Submission Rate" value={`${analytics.stats.submission_rate_pct}%`} icon={Percent} />
                <StatCard title="Approval Rate" value={`${analytics.stats.approval_rate_pct}%`} icon={Percent} />
                <StatCard title="Dept Completion" value={`${analytics.stats.department_completion_rate}%`} icon={Clock} />
                
                <Card className="col-span-2 bg-gradient-to-br from-primary/5 to-primary/0 border-primary/20">
                  <CardContent className="p-6 flex flex-col justify-between h-full min-h-[110px]">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary">Overall Company Progress</p>
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-2 mt-2">
                      <div className="text-3xl font-bold">{analytics.stats.overall_company_progress}%</div>
                      <Progress value={analytics.stats.overall_company_progress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Visualizations and Charts Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* 1. Weekly Submission Trend */}
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Weekly Submission Trend
                    </CardTitle>
                    <CardDescription>Status history of report submissions over the last 8 weeks.</CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.charts.weekly_submission_trend} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }} />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          <Area type="monotone" name="Submitted" dataKey="submitted" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSubmitted)" />
                          <Area type="monotone" name="Approved" dataKey="approved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" />
                          <Line type="monotone" name="Rejected" dataKey="rejected" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 3 }} />
                          <Line type="monotone" name="Late Submissions" dataKey="late" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Report Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Report Status Distribution</CardTitle>
                    <CardDescription>Breakdown of report states in selected timeframe.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center items-center">
                    <div className="h-[300px] w-full flex flex-col justify-between">
                      <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analytics.charts.status_distribution.filter((d: any) => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {analytics.charts.status_distribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                        {analytics.charts.status_distribution.map((entry: any, index: number) => (
                          <div key={entry.name} className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-semibold">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Department Completion rates */}
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Department-wise Completion Rate</CardTitle>
                    <CardDescription>Submission coverage percentages by department.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.charts.department_completion} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="department_name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }} />
                          <Bar dataKey="completion_pct" name="Completion Rate (%)" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={45}>
                            {analytics.charts.department_completion.map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.completion_pct >= 100 ? '#10b981' : entry.completion_pct >= 75 ? 'var(--primary)' : '#f59e0b'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Approval vs Pending comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Approved vs Pending</CardTitle>
                    <CardDescription>Comparison of approved reviews vs outstanding backlog.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.charts.approval_vs_pending} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }} />
                          <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={60}>
                            <Cell fill="#10b981" />
                            <Cell fill="#3b82f6" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 5. Monthly Reporting Trends */}
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Reporting Trends</CardTitle>
                    <CardDescription>Submitted and approved reports volume over the last 6 months.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.charts.monthly_trends} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorMonthSub" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }} />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          <Area type="monotone" name="Reports Submitted" dataKey="submitted" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMonthSub)" />
                          <Area type="monotone" name="Reports Approved" dataKey="approved" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                          <Line type="monotone" name="Reports Rejected" dataKey="rejected" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 3 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Feed/Sideboards section: Recent Activity, Upcoming Deadlines, & Email Widget */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity Logs</CardTitle>
                    <CardDescription>Latest actions logged on WCR reports.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activityLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                      </div>
                    ) : recentActivity?.length ? (
                      <div className="space-y-6">
                        {recentActivity.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              {activity.user_photo ? (
                                <img src={activity.user_photo} alt={activity.user_name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="text-xs font-semibold text-primary">{(activity.user_name || "S").charAt(0)}</span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-sm">
                                <span className="font-semibold text-foreground">{activity.user_name || "System"}</span> {activity.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(activity.created_at), "MMM d, h:mm a")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-8 text-center">No recent activity</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upcoming Schedules & Deadlines</CardTitle>
                    <CardDescription>Department submission windows and timelines.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {deadlinesLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                      </div>
                    ) : deadlines?.length ? (
                      <div className="space-y-4">
                        {deadlines.map((deadline, i) => (
                          <div key={i} className="flex items-center justify-between p-3.5 border border-border/50 rounded-xl bg-card hover:bg-muted/20 transition-all">
                            <div>
                              <p className="font-semibold text-sm">{deadline.department_name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(deadline.deadline), "EEEE, MMM d")}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-0.5 ${
                                deadline.days_remaining <= 1 
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              }`}>
                                {deadline.days_remaining} {deadline.days_remaining === 1 ? 'day' : 'days'} left
                              </span>
                              <p className="text-[11px] text-muted-foreground mt-1.5">
                                {deadline.submitted_count} / {deadline.total_count} reports
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-8 text-center">No upcoming deadlines</div>
                    )}
                  </CardContent>
                </Card>

                <EmailWidget />
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Tab 2: Department Analytics */}
        <TabsContent value="departments" className="space-y-6">
          {analyticsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : analytics?.departments ? (
            <div className="grid gap-6">
              {analytics.departments.map((dept: any) => (
                <Card key={dept.department_id} className="border-border/60 hover:border-primary/20 transition-all">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-xl font-bold">{dept.department_name}</CardTitle>
                      <CardDescription>Departmental performance indicators and trends.</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-sm font-semibold bg-primary/5">
                      {dept.total_employees} Employees
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-6 items-center">
                      <div className="space-y-4 col-span-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Reports Submitted</span>
                            <p className="text-xl font-bold">{dept.reports_submitted}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Pending Approval</span>
                            <p className="text-xl font-bold">{dept.pending_reports}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Approval Rate</span>
                            <p className="text-xl font-bold text-emerald-500">{dept.approval_rate}%</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Completion Rate</span>
                            <p className="text-xl font-bold">{dept.completion_percentage}%</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span>Reporting Cycle Completion</span>
                            <span>{dept.completion_percentage}%</span>
                          </div>
                          <Progress value={dept.completion_percentage} className="h-2" />
                        </div>
                      </div>

                      {/* Department Weekly Sparkline */}
                      <div className="h-[90px] w-full border border-border/40 rounded-xl p-3 bg-muted/10">
                        <span className="text-[10px] font-bold text-muted-foreground block mb-2">Trend (Last 8 Weeks)</span>
                        <ResponsiveContainer width="100%" height="70%">
                          <BarChart data={dept.weekly_performance_trend}>
                            <Bar dataKey="submitted" fill="var(--primary)" radius={[2, 2, 0, 0]} />
                            <Tooltip contentStyle={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No departments analytics available.</div>
          )}
        </TabsContent>

        {/* Tab 3: Employee Analytics */}
        <TabsContent value="employee" className="space-y-6">
          {/* If an employee is selected, render their individual dashboard */}
          {employeeId && employeeId !== "all_emps" ? (
            analytics?.employees?.find((e: any) => e.employee_id === employeeId) ? (
              (() => {
                const emp = analytics.employees.find((e: any) => e.employee_id === employeeId);
                return (
                  <div className="space-y-6">
                    {/* Selected Employee card */}
                    <Card className="bg-gradient-to-r from-card via-card to-primary/5 border-primary/20">
                      <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xl font-bold border-2 border-primary/20">
                            {emp.photo_url ? (
                              <img src={emp.photo_url} alt={emp.employee_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              emp.employee_name.charAt(0)
                            )}
                          </div>
                          <div className="space-y-1">
                            <h2 className="text-2xl font-bold">{emp.employee_name}</h2>
                            <p className="text-sm text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8 bg-background/50 p-4 rounded-xl border border-border/40">
                          <div className="text-center sm:text-left">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Submissions</span>
                            <p className="text-lg font-extrabold mt-0.5">{emp.submission_count}</p>
                          </div>
                          <div className="text-center sm:text-left">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Approvals</span>
                            <p className="text-lg font-extrabold mt-0.5 text-emerald-500">{emp.approval_count}</p>
                          </div>
                          <div className="text-center sm:text-left">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Missed Reports</span>
                            <p className={`text-lg font-extrabold mt-0.5 ${emp.missed_reports_count > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                              {emp.missed_reports_count}
                            </p>
                          </div>
                          <div className="text-center sm:text-left">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Completion</span>
                            <p className="text-lg font-extrabold mt-0.5 text-primary">
                              {Math.round(((8 - emp.missed_reports_count) / 8) * 100)}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Missed report warning callout */}
                    {emp.missed_reports_count > 0 && (
                      <div className="flex gap-3 p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl text-rose-500 items-start">
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm">Missed Submissions Alert</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            This employee has missed submissions for the following reporting weeks:
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {emp.missed_weeks.map((week: string) => (
                              <Badge key={week} variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px]">
                                Week of {format(new Date(week), "MMM d")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Timeline status of reports */}
                      <Card className="col-span-2">
                        <CardHeader>
                          <CardTitle className="text-base font-bold">Report Status Timeline</CardTitle>
                          <CardDescription>Overview of reports status and ratings over the last 8 weeks.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="relative border-l border-border/80 pl-6 ml-4 space-y-6 py-2">
                            {emp.status_timeline.map((t: any) => (
                              <div key={t.week} className="relative">
                                {/* Timeline Dot */}
                                <span className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background flex items-center justify-center ${
                                  t.status === "approved" ? "bg-emerald-500" :
                                  t.status === "submitted" ? "bg-blue-500" :
                                  t.status === "under_review" ? "bg-amber-500" :
                                  t.status === "needs_changes" ? "bg-purple-500" :
                                  t.status === "rejected" ? "bg-rose-500" :
                                  t.status === "draft" ? "bg-slate-500" :
                                  "bg-slate-300"
                                }`} />
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      Week of {format(new Date(t.week), "MMMM d, yyyy")}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className={`text-[10px] capitalize ${getStatusBadgeColor(t.status)}`}>
                                        {t.status === "missing" ? "No report submitted" : t.status.replace("_", " ")}
                                      </Badge>
                                    </div>
                                  </div>
                                  {t.status !== "missing" && (
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-medium text-muted-foreground">Self Progress:</span>
                                      <div className="w-[100px] flex items-center gap-1.5">
                                        <Progress value={t.progress} className="h-1.5" />
                                        <span className="text-[10px] font-bold">{t.progress}%</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Weekly Progress Trend Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base font-bold">Weekly Performance Trend</CardTitle>
                          <CardDescription>Overall progress metrics recorded per week.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={emp.weekly_progress}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="week" stroke="#888888" fontSize={10} tickFormatter={(val) => format(new Date(val), "MMM d")} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={10} domain={[0, 100]} unit="%" tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: '12px' }} />
                                <Line type="monotone" dataKey="progress" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 text-muted-foreground">Selected employee not found in the scoped list.</div>
            )
          ) : (
            /* Otherwise, list all employees in scope with their statistics */
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Employee Analytics Overview</CardTitle>
                <CardDescription>Select an employee from the dropdown above or click details to inspect submission histories.</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : analytics?.employees?.length ? (
                  <div className="border border-border/40 rounded-xl overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground bg-muted/30 uppercase font-semibold border-b border-border/40">
                          <tr>
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Submitted (Last 8 Wks)</th>
                            <th className="px-6 py-4">Approved Reports</th>
                            <th className="px-6 py-4">Missed Reports</th>
                            <th className="px-6 py-4">Average Progress</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {analytics.employees.map((emp: any) => {
                            const avgProg = emp.weekly_progress.length > 0
                              ? Math.round(emp.weekly_progress.reduce((acc: number, cur: any) => acc + cur.progress, 0) / emp.weekly_progress.length)
                              : 0;
                            return (
                              <tr key={emp.employee_id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-xs text-primary">
                                    {emp.photo_url ? (
                                      <img src={emp.photo_url} alt={emp.employee_name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                      emp.employee_name.charAt(0)
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold">{emp.employee_name}</p>
                                    <p className="text-xs text-muted-foreground font-normal">{emp.email}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-semibold">{emp.submission_count} / 8 weeks</td>
                                <td className="px-6 py-4 font-semibold text-emerald-500">{emp.approval_count}</td>
                                <td className="px-6 py-4">
                                  {emp.missed_reports_count > 0 ? (
                                    <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-xs font-semibold">
                                      {emp.missed_reports_count} Missed
                                    </Badge>
                                  ) : (
                                    <span className="text-emerald-500 font-semibold text-xs flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Perfect
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="w-[120px] flex items-center gap-2">
                                    <Progress value={avgProg} className="h-1.5" />
                                    <span className="font-semibold text-xs">{avgProg}%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setEmployeeId(emp.employee_id)}
                                    className="h-8 text-xs hover:bg-primary/5 hover:text-primary transition-all"
                                  >
                                    Inspect Analytics
                                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">No employees found.</div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, alert = false }: { title: string, value: string | number, icon: any, alert?: boolean }) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className={`h-4.5 w-4.5 ${alert ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
        </div>
        <div className="text-2xl font-bold mt-1 tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}