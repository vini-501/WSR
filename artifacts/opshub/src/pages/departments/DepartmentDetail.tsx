import { useParams, Link } from "wouter";
import { useGetDepartment, useListEmployees } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, Calendar, Settings } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

export function DepartmentDetail() {
  const params = useParams();
  const id = params.id as string;

  const { data: dept, isLoading: deptLoading } = useGetDepartment(id, { query: { enabled: !!id, queryKey: ['/api/departments', id] } });
  const { data: employeesData, isLoading: employeesLoading } = useListEmployees({ department_id: id, limit: 50 });

  if (deptLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!dept) {
    return <div>Department not found</div>;
  }

  const columns = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            {row.original.photo_url ? (
              <img src={row.original.photo_url} alt={row.original.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-primary">{row.original.name.charAt(0)}</span>
            )}
          </div>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }: any) => <span className="capitalize">{row.original.role.replace('_', ' ')}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
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
      cell: ({ row }: any) => (
        <Link href={`/employees/${row.original.id}`} className="text-primary hover:underline text-sm font-medium">
          View Profile
        </Link>
      ),
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link href="/departments" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Departments
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {dept.name}
            <Badge variant={dept.status === 'active' ? 'default' : 'secondary'}>{dept.status}</Badge>
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{dept.description || "No description provided."}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg"><Users className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Department Head</p>
              <p className="text-lg font-bold">{dept.head_name || "Unassigned"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg"><Calendar className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reporting Frequency</p>
              <p className="text-lg font-bold capitalize">{dept.reporting_frequency}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg"><Settings className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Team Size</p>
              <p className="text-lg font-bold">{dept.employee_count} employees</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : employeesData?.data ? (
            <DataTable columns={columns} data={employeesData.data} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">No employees found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}