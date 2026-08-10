import { useState, useEffect } from "react";
import { useListDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from "@workspace/api-client-react";
import { Department, DepartmentInput } from "@workspace/api-client-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash } from "lucide-react";
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
import { getListDepartmentsQueryKey } from "@workspace/api-client-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

export function DepartmentsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deptToDeleteId, setDeptToDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useListDepartments({ page, limit: 10, search });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteDept = useDeleteDepartment();

  const confirmDelete = () => {
    if (!deptToDeleteId) return;
    deleteDept.mutate({ id: deptToDeleteId }, {
      onSuccess: () => {
        toast({ title: "Department deleted" });
        queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
        setDeptToDeleteId(null);
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
        setDeptToDeleteId(null);
      }
    });
  };

  const columns = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }: any) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "head_name",
      header: "Department Head",
      cell: ({ row }: any) => row.original.head_name || <span className="text-muted-foreground italic">Unassigned</span>,
    },
    {
      accessorKey: "employee_count",
      header: "Employees",
    },
    {
      accessorKey: "reporting_frequency",
      header: "Frequency",
      cell: ({ row }: any) => <span className="capitalize">{row.original.reporting_frequency}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }: any) => {
        const dept = row.original;
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
              <Link href={`/departments/${dept.id}`}>
                <DropdownMenuItem className="cursor-pointer">
                  <Eye className="mr-2 h-4 w-4" /> View details
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setEditDept(dept)}>
                <Edit className="mr-2 h-4 w-4" /> Edit department
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer" onSelect={() => setDeptToDeleteId(dept.id)}>
                <Trash className="mr-2 h-4 w-4" /> Delete
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
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground mt-1">Manage company departments and reporting rules.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Department
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
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

      <DepartmentDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
      />
      
      {editDept && (
        <DepartmentDialog 
          open={!!editDept} 
          onOpenChange={(open) => !open && setEditDept(null)} 
          department={editDept} 
        />
      )}

      <AlertDialog open={!!deptToDeleteId} onOpenChange={(open) => !open && setDeptToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will soft-delete the department and disassociate all members belonging to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DepartmentDialog({ open, onOpenChange, department }: { open: boolean, onOpenChange: (o: boolean) => void, department?: Department }) {
  const [name, setName] = useState(department?.name || "");
  const [description, setDescription] = useState(department?.description || "");
  const [frequency, setFrequency] = useState<any>(department?.reporting_frequency || "weekly");
  const [status, setStatus] = useState<any>(department?.status || "active");

  useEffect(() => {
    if (open) {
      setName(department?.name || "");
      setDescription(department?.description || "");
      setFrequency(department?.reporting_frequency || "weekly");
      setStatus(department?.status || "active");
    }
  }, [open, department]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();

  const isPending = createDept.isPending || updateDept.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: DepartmentInput = {
      name,
      description,
      reporting_frequency: frequency,
      status
    };

    if (department) {
      updateDept.mutate({ id: department.id, data }, {
        onSuccess: () => {
          toast({ title: "Department updated" });
          queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
          onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    } else {
      createDept.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Department created" });
          queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
          onOpenChange(false);
          setName("");
          setDescription("");
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? 'Edit Department' : 'Add Department'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Reporting Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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