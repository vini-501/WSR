import { useParams, Link } from "wouter";
import { useGetEmployee, useListReports } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Phone, Calendar, Building2, Briefcase } from "lucide-react";
import { format } from "date-fns";

export function EmployeeDetail() {
  const params = useParams();
  const id = params.id as string;

  const { data: emp, isLoading: empLoading } = useGetEmployee(id, { query: { enabled: !!id, queryKey: ['/api/employees', id] } });
  const { data: reportsData, isLoading: reportsLoading } = useListReports({ employee_id: id, limit: 5 });

  if (empLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!emp) {
    return <div>Employee not found</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link href="/employees" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Employees
      </Link>

      <Card className="overflow-hidden">
        <div className="h-32 bg-primary/10"></div>
        <CardContent className="relative pt-0 pb-6 px-6 sm:px-10">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 sm:-mt-16 mb-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {emp.photo_url ? (
                <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-muted-foreground">{emp.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold">{emp.name}</h1>
                <Badge variant={emp.status === 'active' ? 'default' : emp.status === 'on_leave' ? 'secondary' : 'destructive'}>
                  {emp.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-muted-foreground capitalize">{emp.role.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-6 border-t">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{emp.email}</span>
            </div>
            {emp.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{emp.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{emp.department_name || "Unassigned"}</span>
            </div>
            {emp.joining_date && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Joined {format(new Date(emp.joining_date), "MMM yyyy")}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : reportsData?.data?.length ? (
              <div className="space-y-4">
                {reportsData.data.map(report => (
                  <Link key={report.id} href={`/reports/${report.id}`}>
                    <div className="block border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium group-hover:text-primary transition-colors">
                          Week of {format(new Date(report.week_start), "MMM d, yyyy")}
                        </div>
                        <Badge variant={
                          report.status === 'approved' ? 'default' : 
                          report.status === 'rejected' ? 'destructive' : 
                          report.status === 'needs_changes' ? 'secondary' : 'outline'
                        }>
                          {report.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{report.achievements}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                No reports submitted yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reporting Line</CardTitle>
          </CardHeader>
          <CardContent>
            {emp.manager_name ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-full"><Briefcase className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium">{emp.manager_name}</p>
                    <p className="text-xs text-muted-foreground">Manager</p>
                  </div>
                </div>
                <div className="w-px h-6 bg-border ml-5 -my-2"></div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-full"><Briefcase className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">Employee</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No direct manager assigned.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}