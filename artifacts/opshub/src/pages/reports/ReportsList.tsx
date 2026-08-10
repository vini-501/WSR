import { useState } from "react";
import { useListReports, useCreateReport, useListDepartments } from "@workspace/api-client-react";
import { ReportInput } from "@workspace/api-client-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreHorizontal, Eye, PlusCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export function ReportsList() {
  const { profile } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<any>("");
  const [deptFilter, setDeptFilter] = useState<string>("");

  const { data: departments } = useListDepartments({ limit: 100 });
  const { data, isLoading } = useListReports({ 
    page, 
    limit: 10, 
    search,
    status: statusFilter || undefined,
    department_id: profile?.role === 'department_head' ? profile.department_id || undefined : (deptFilter || undefined),
    employee_id: profile?.role === 'employee' ? profile.id : undefined
  });

  const columns = [
    {
      accessorKey: "employee_name",
      header: "Employee",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {row.original.employee_photo ? (
              <img src={row.original.employee_photo} alt={row.original.employee_name || "System"} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-[10px] font-medium text-primary">{(row.original.employee_name || "System").charAt(0)}</span>
            )}
          </div>
          <span className="font-medium">{row.original.employee_name || "System"}</span>
        </div>
      ),
    },
    {
      accessorKey: "department_name",
      header: "Department",
      cell: ({ row }: any) => row.original.department_name || <span className="text-muted-foreground italic">None</span>,
    },
    {
      accessorKey: "week_start",
      header: "Week Of",
      cell: ({ row }: any) => format(new Date(row.original.week_start), "MMM d, yyyy"),
    },
    {
      accessorKey: "overall_progress",
      header: "Progress",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <div className="w-12 bg-secondary rounded-full h-1.5 shrink-0">
            <div 
              className="bg-primary h-1.5 rounded-full" 
              style={{ width: `${row.original.overall_progress ?? 0}%` }}
            />
          </div>
          <span className="text-xs font-medium">{row.original.overall_progress ?? 0}%</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const variants: any = { 
          draft: 'outline', 
          submitted: 'default', 
          under_review: 'default',
          approved: 'default', 
          rejected: 'destructive',
          needs_changes: 'secondary'
        };
        const colors: any = {
          under_review: 'bg-blue-500 hover:bg-blue-600 text-white',
          approved: 'bg-emerald-500 hover:bg-emerald-600',
          needs_changes: 'bg-amber-500 hover:bg-amber-600 text-white'
        };
        
        return (
          <Badge variant={variants[row.original.status]} className={colors[row.original.status] || ''}>
            {row.original.status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: "submitted_at",
      header: "Submitted",
      cell: ({ row }: any) => row.original.submitted_at ? format(new Date(row.original.submitted_at), "MMM d") : <span className="text-muted-foreground">-</span>,
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <Link href={`/reports/${row.original.id}`}>
              <DropdownMenuItem className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4" /> View report
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Reports</h1>
          <p className="text-muted-foreground mt-1">
            {profile?.role === 'employee' ? 'Manage your weekly progress updates.' : 'Review and monitor team progress.'}
          </p>
        </div>
        {profile?.role === 'employee' && (
          <Button onClick={() => setLocation("/reports/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Report
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        
        {profile?.role !== 'employee' && profile?.role !== 'department_head' && (
          <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.data?.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="needs_changes">Needs Changes</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data ? (
        <DataTable
          columns={columns}
          data={data.data}
          pagination={{
            pageIndex: data.page - 1,
            pageSize: data.limit,
            pageCount: data.total_pages,
            onPageChange: (p) => setPage(p + 1),
          }}
        />
      ) : null}
    </div>
  );
}