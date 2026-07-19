import { useState } from "react";
import { useListEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useListDepartments } from "@workspace/api-client-react";
import { Employee, EmployeeInput } from "@workspace/api-client-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash, Mail } from "lucide-react";
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
import { getListEmployeesQueryKey } from "@workspace/api-client-react";

export function EmployeesList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<any>("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);

  const { data: departments } = useListDepartments({ limit: 100 });
  const { data, isLoading } = useListEmployees({ 
    page, 
    limit: 10, 
    search,
    role: roleFilter || undefined,
    department_id: deptFilter || undefined
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteEmp = useDeleteEmployee();

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to deactivate this employee?")) {
      deleteEmp.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Employee removed" });
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        },
        onError: (err: any) => toast({ title: "Failed to remove", description: err.message, variant: "destructive" })
      });
    }
  };

  const columns = [
    {
      accessorKey: "name",
      header: "Employee",
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
      accessorKey: "department_name",
      header: "Department",
      cell: ({ row }: any) => row.original.department_name || <span className="text-muted-foreground italic">None</span>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }: any) => <span className="capitalize">{row.original.role.replace('_', ' ')}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const variants: any = { active: 'default', inactive: 'destructive', on_leave: 'secondary' };
        return <Badge variant={variants[row.original.status]}>{row.original.status.replace('_', ' ')}</Badge>;
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
              <DropdownMenuItem className="cursor-pointer" onClick={() => toast({ title: "Invite sent", description: `An invitation email has been sent to ${emp.email}`})}>
                <Mail className="mr-2 h-4 w-4" /> Resend invite
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => handleDelete(emp.id)}>
                <Trash className="mr-2 h-4 w-4" /> Deactivate
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
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
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
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
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

function EmployeeDialog({ open, onOpenChange, employee, departments }: { open: boolean, onOpenChange: (o: boolean) => void, employee?: Employee, departments: any[] }) {
  const [name, setName] = useState(employee?.name || "");
  const [email, setEmail] = useState(employee?.email || "");
  const [role, setRole] = useState<any>(employee?.role || "employee");
  const [deptId, setDeptId] = useState(employee?.department_id || "");
  const [status, setStatus] = useState<any>(employee?.status || "active");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createEmp = useCreateEmployee();
  const updateEmp = useUpdateEmployee();

  const isPending = createEmp.isPending || updateEmp.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (employee) {
      updateEmp.mutate({ 
        id: employee.id, 
        data: { name, role, department_id: deptId, status } 
      }, {
        onSuccess: () => {
          toast({ title: "Employee updated" });
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    } else {
      createEmp.mutate({ 
        data: { name, email, role, department_id: deptId, send_invite: true } as EmployeeInput
      }, {
        onSuccess: () => {
          toast({ title: "Employee created", description: "Invitation sent." });
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!!employee} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {employee && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}