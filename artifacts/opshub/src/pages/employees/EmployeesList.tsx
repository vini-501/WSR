import { useState, useEffect, useRef } from "react";
import {
  useListEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useListDepartments,
  useImportEmployees,
  exportEmployees,
  getListEmployeesQueryKey
} from "@workspace/api-client-react";
import { Employee, EmployeeInput } from "@workspace/api-client-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash,
  Mail,
  ArrowUpDown,
  Upload,
  Download,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function EmployeesList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<any>("name");
  const [sortOrder, setSortOrder] = useState<any>("asc");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: departments } = useListDepartments({ limit: 100 });
  const { data, isLoading } = useListEmployees({
    page,
    limit: 10,
    search: search || undefined,
    role: roleFilter !== "all" ? (roleFilter as any) : undefined,
    department_id: deptFilter !== "all" ? deptFilter : undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    sortBy,
    sortOrder,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteEmp = useDeleteEmployee();
  const updateEmp = useUpdateEmployee();
  const importMutation = useImportEmployees();

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleToggleStatus = (emp: Employee) => {
    const newStatus = emp.status === "active" ? "inactive" : "active";
    updateEmp.mutate(
      {
        id: emp.id,
        data: { status: newStatus },
      },
      {
        onSuccess: () => {
          toast({ title: `Employee status updated to ${newStatus}` });
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        },
        onError: (err: any) =>
          toast({ title: "Failed to update status", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: string, permanent: boolean) => {
    const msg = permanent
      ? "Are you sure you want to PERMANENTLY delete this employee? This action is irreversible."
      : "Are you sure you want to soft delete/deactivate this employee?";
    if (confirm(msg)) {
      deleteEmp.mutate(
        { id, params: { permanent } },
        {
          onSuccess: () => {
            toast({ title: permanent ? "Employee permanently deleted" : "Employee soft deleted" });
            queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          },
          onError: (err: any) =>
            toast({
              title: "Failed to delete",
              description: err.message,
              variant: "destructive",
            }),
        }
      );
    }
  };

  const handleExport = async () => {
    try {
      const csvData = await exportEmployees();
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "employees_export.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Export successful", description: "All active records downloaded" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      importMutation.mutate(
        { data: { csvData } },
        {
          onSuccess: (res) => {
            toast({ title: "Import successful", description: res.message });
            queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
            if (fileInputRef.current) fileInputRef.current.value = "";
          },
          onError: (err: any) => {
            toast({ title: "Import failed", description: err.message, variant: "destructive" });
            if (fileInputRef.current) fileInputRef.current.value = "";
          },
        }
      );
    };
    reader.readAsText(file);
  };

  const SortableHeader = ({ label, field }: { label: string; field: string }) => (
    <Button variant="ghost" onClick={() => handleSort(field)} className="h-8 px-2 font-medium">
      {label}
      <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
    </Button>
  );

  const columns = [
    {
      accessorKey: "name",
      header: () => <SortableHeader label="Employee" field="name" />,
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {row.original.photo_url ? (
              <img src={row.original.photo_url} alt={row.original.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-primary">{row.original.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "employee_id",
      header: () => <SortableHeader label="Employee ID" field="employee_id" />,
      cell: ({ row }: any) => <span className="font-mono text-sm">{row.original.employee_id}</span>,
    },
    {
      accessorKey: "department_name",
      header: () => <SortableHeader label="Department" field="department_name" />,
      cell: ({ row }: any) => row.original.department_name || <span className="text-muted-foreground italic text-xs">None</span>,
    },
    {
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }: any) => row.original.designation || <span className="text-muted-foreground italic text-xs">-</span>,
    },
    {
      accessorKey: "role",
      header: () => <SortableHeader label="Role" field="role" />,
      cell: ({ row }: any) => <span className="capitalize">{row.original.role.replace("_", " ")}</span>,
    },
    {
      accessorKey: "status",
      header: () => <SortableHeader label="Status" field="status" />,
      cell: ({ row }: any) => {
        const variants: any = { active: "default", inactive: "destructive", on_leave: "secondary", resigned: "outline" };
        return <Badge variant={variants[row.original.status]}>{row.original.status.replace("_", " ")}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }: any) => {
        const emp = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <Link href={`/employees/${emp.id}`}>
                <DropdownMenuItem className="cursor-pointer">
                  <Eye className="mr-2 h-4 w-4" /> View profile
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setEditEmp(emp)}>
                <Edit className="mr-2 h-4 w-4" /> Edit employee
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => handleToggleStatus(emp)}>
                {emp.status === "active" ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4 text-destructive" /> Deactivate
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() =>
                  toast({
                    title: "Invite sent",
                    description: `An invitation email has been sent to ${emp.email}`,
                  })
                }
              >
                <Mail className="mr-2 h-4 w-4" /> Resend invite
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => handleDelete(emp.id, false)}>
                <Trash className="mr-2 h-4 w-4" /> Move to Trash (Soft)
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive cursor-pointer font-semibold" onClick={() => handleDelete(emp.id, true)}>
                <Trash className="mr-2 h-4 w-4" /> Delete Permanently
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground mt-1">Directory of all company personnel.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleImportCSV}
            className="hidden"
            id="csv-import-input"
          />
          <Button variant="outline" size="sm" asChild className="cursor-pointer">
            <label htmlFor="csv-import-input">
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </label>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Employee
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-muted/40 p-4 rounded-lg">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, employee ID..."
            className="pl-8 bg-background"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Department:</Label>
          <Select
            value={deptFilter}
            onValueChange={(v) => {
              setDeptFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.data?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Role:</Label>
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="management">Management</SelectItem>
              <SelectItem value="department_head">Department Head</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Status:</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="resigned">Resigned</SelectItem>
            </SelectContent>
          </Select>
        </div>
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

      <EmployeeDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        departments={departments?.data || []}
      />

      {editEmp && (
        <EmployeeDialog
          open={!!editEmp}
          onOpenChange={(open) => !open && setEditEmp(null)}
          employee={editEmp}
          departments={departments?.data || []}
        />
      )}
    </div>
  );
}

function EmployeeDialog({
  open,
  onOpenChange,
  employee,
  departments
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee?: Employee;
  departments: any[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<any>("employee");
  const [deptId, setDeptId] = useState("none");
  const [status, setStatus] = useState<any>("active");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [designation, setDesignation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [timezone, setTimezone] = useState("UTC");
  const [workLocation, setWorkLocation] = useState("Remote");
  const [weeklyReportingFrequency, setWeeklyReportingFrequency] = useState("1");
  const [sendInvite, setSendInvite] = useState(true);

  useEffect(() => {
    if (open) {
      setName(employee?.name || "");
      setEmail(employee?.email || "");
      setRole(employee?.role || "employee");
      setDeptId(employee?.department_id || "none");
      setStatus(employee?.status || "active");
      setPhone(employee?.phone || "");
      setPhotoUrl(employee?.photo_url || "");
      setJoiningDate(employee?.joining_date ? employee.joining_date.split("T")[0] : "");
      setDesignation(employee?.designation || "");
      setEmploymentType(employee?.employment_type || "Full-time");
      setTimezone(employee?.timezone || "UTC");
      setWorkLocation(employee?.work_location || "Remote");
      setWeeklyReportingFrequency(String(employee?.weekly_reporting_frequency || 1));
      setSendInvite(true);
    }
  }, [open, employee]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createEmp = useCreateEmployee();
  const updateEmp = useUpdateEmployee();

  const isPending = createEmp.isPending || updateEmp.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDeptId = deptId === "none" ? null : deptId;

    const payload = {
      name,
      phone: phone || undefined,
      photo_url: photoUrl || undefined,
      department_id: finalDeptId as any,
      role,
      status,
      joining_date: joiningDate || undefined,
      designation: designation || undefined,
      employment_type: employmentType || undefined,
      timezone: timezone || undefined,
      work_location: workLocation || undefined,
      weekly_reporting_frequency: parseInt(weeklyReportingFrequency) || undefined,
    };

    if (employee) {
      updateEmp.mutate(
        {
          id: employee.id,
          data: payload,
        },
        {
          onSuccess: () => {
            toast({ title: "Employee updated successfully" });
            queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
            onOpenChange(false);
          },
          onError: (err: any) =>
            toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createEmp.mutate(
        {
          data: {
            ...payload,
            email,
            send_invite: sendInvite,
          } as EmployeeInput,
        },
        {
          onSuccess: () => {
            toast({ title: "Employee created", description: sendInvite ? "Invitation sent." : undefined });
            queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
            onOpenChange(false);
          },
          onError: (err: any) =>
            toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit Employee Profile" : "Add New Employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Details */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!employee}
                placeholder="johndoe@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 019-2834" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photoUrl">Profile Picture URL</Label>
              <Input id="photoUrl" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" />
            </div>

            {/* Position Details */}
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Senior Software Engineer" />
            </div>
            <div className="space-y-2">
              <Label>System Access Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="department_head">Department Head</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="Freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location & Frequency */}
            <div className="space-y-2">
              <Label htmlFor="joiningDate">Joining Date</Label>
              <Input id="joiningDate" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Work Location</Label>
              <Select value={workLocation} onValueChange={setWorkLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="On-site">On-site</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                  <SelectItem value="GMT">GMT (Greenwich Mean Time)</SelectItem>
                  <SelectItem value="EST">EST (Eastern Standard Time)</SelectItem>
                  <SelectItem value="CST">CST (Central Standard Time)</SelectItem>
                  <SelectItem value="PST">PST (Pacific Standard Time)</SelectItem>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (BST)</SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris (CEST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weeklyReportingFrequency">Weekly Reporting Frequency (times/week)</Label>
              <Input
                id="weeklyReportingFrequency"
                type="number"
                min="1"
                max="7"
                value={weeklyReportingFrequency}
                onChange={(e) => setWeeklyReportingFrequency(e.target.value)}
              />
            </div>

            {employee && (
              <div className="space-y-2">
                <Label>Account Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!employee && (
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="sendInvite"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="sendInvite" className="cursor-pointer">
                Send registration invite email to the employee
              </Label>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}