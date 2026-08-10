import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  useGetEmployee,
  useListReports,
  useListDepartments,
  useUpdateEmployee,
  getListEmployeesQueryKey
} from "@workspace/api-client-react";
import { Employee, EmployeeInput } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  Globe,
  MapPin,
  Clock,
  Edit2,
  FileText,
  User
} from "lucide-react";
import { format } from "date-fns";

export function EmployeeDetail() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: emp, isLoading: empLoading } = useGetEmployee(id, {
    query: { enabled: !!id, queryKey: ["/api/employees", id] }
  });
  const { data: reportsData, isLoading: reportsLoading } = useListReports({ employee_id: id, limit: 10 });
  const { data: departments } = useListDepartments({ limit: 100 });

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
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">Employee not found</h2>
        <Link href="/employees" className="text-primary hover:underline mt-2 inline-block">
          Return to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link
          href="/employees"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Employees
        </Link>
        <Button onClick={() => setIsEditOpen(true)} size="sm">
          <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="h-32 bg-primary/10"></div>
        <CardContent className="relative pt-0 pb-6 px-6 sm:px-10">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 sm:-mt-16 mb-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {emp.photo_url ? (
                <img src={emp.photo_url} alt={emp.name || "Employee"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-muted-foreground">{(emp.name || "Employee").charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold">{emp.name || "Employee"}</h1>
                <Badge variant={emp.status === "active" ? "default" : emp.status === "on_leave" ? "secondary" : "destructive"}>
                  {emp.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-muted-foreground capitalize">
                {emp.designation || "No Designation Assigned"} • {emp.role.replace("_", " ")}
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-6 border-t">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
              <span>{emp.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
              <span>{emp.phone || "No Phone Added"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
              <span>{emp.department_name || "Unassigned Department"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
              <span>{emp.joining_date ? `Joined ${format(new Date(emp.joining_date), "MMM d, yyyy")}` : "No Join Date"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Weekly Reports</TabsTrigger>
          <TabsTrigger value="line">Reporting Line</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Profile Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Employee ID</span>
                  <span className="font-mono font-medium">{emp.employee_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Employment Type</span>
                  <span className="font-medium">{emp.employment_type || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Work Location</span>
                  <span className="font-medium">{emp.work_location || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Timezone</span>
                  <span className="font-medium flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-muted-foreground" /> {emp.timezone || "-"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Weekly Reporting Frequency</span>
                  <span className="font-medium flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" /> {emp.weekly_reporting_frequency || 1} report/week
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" /> Manager Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {emp.manager_name ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-full">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{emp.manager_name}</p>
                        <p className="text-xs text-muted-foreground">Direct Supervisor</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No manager assigned yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reports History</CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : reportsData?.data?.length ? (
                <div className="space-y-4">
                  {reportsData.data.map((report) => (
                    <Link key={report.id} href={`/reports/${report.id}`}>
                      <div className="block border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium group-hover:text-primary transition-colors">
                            Week of {format(new Date(report.week_start), "MMMM d, yyyy")}
                          </div>
                          <Badge
                            variant={
                              report.status === "approved"
                                ? "default"
                                : report.status === "rejected"
                                ? "destructive"
                                : report.status === "needs_changes"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {report.status.replace("_", " ")}
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
        </TabsContent>

        <TabsContent value="line">
          <Card>
            <CardHeader>
              <CardTitle>Reporting Hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              {emp.manager_name ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{emp.manager_name}</p>
                      <p className="text-xs text-muted-foreground">Manager</p>
                    </div>
                  </div>
                  <div className="w-px h-6 bg-border ml-5 -my-2"></div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-full">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{emp.name || "Employee"}</p>
                      <p className="text-xs text-muted-foreground">Employee</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No reporting line configuration.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isEditOpen && (
        <EmployeeEditDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          employee={emp}
          departments={departments?.data || []}
        />
      )}
    </div>
  );
}

function EmployeeEditDialog({
  open,
  onOpenChange,
  employee,
  departments
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee: Employee;
  departments: any[];
}) {
  const [name, setName] = useState(employee.name || "");
  const [phone, setPhone] = useState(employee.phone || "");
  const [photoUrl, setPhotoUrl] = useState(employee.photo_url || "");
  const [role, setRole] = useState<any>(employee.role || "employee");
  const [deptId, setDeptId] = useState(employee.department_id || "none");
  const [status, setStatus] = useState<any>(employee.status || "active");
  const [joiningDate, setJoiningDate] = useState(employee.joining_date ? employee.joining_date.split("T")[0] : "");
  const [designation, setDesignation] = useState(employee.designation || "");
  const [employmentType, setEmploymentType] = useState(employee.employment_type || "Full-time");
  const [timezone, setTimezone] = useState(employee.timezone || "UTC");
  const [workLocation, setWorkLocation] = useState(employee.work_location || "Remote");
  const [weeklyReportingFrequency, setWeeklyReportingFrequency] = useState(String(employee.weekly_reporting_frequency || 1));

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateEmp = useUpdateEmployee();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDeptId = deptId === "none" ? null : deptId;

    updateEmp.mutate(
      {
        id: employee.id,
        data: {
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
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Profile updated successfully" });
          queryClient.invalidateQueries({ queryKey: ["/api/employees", employee.id] });
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          onOpenChange(false);
        },
        onError: (err: any) =>
          toast({ title: "Error updating profile", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-photo">Profile Picture URL</Label>
              <Input id="edit-photo" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-designation">Designation</Label>
              <Input id="edit-designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
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
            <div className="space-y-2">
              <Label htmlFor="edit-joining">Joining Date</Label>
              <Input id="edit-joining" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
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
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="GMT">GMT</SelectItem>
                  <SelectItem value="EST">EST</SelectItem>
                  <SelectItem value="CST">CST</SelectItem>
                  <SelectItem value="PST">PST</SelectItem>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                  <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-frequency">Weekly Reporting Frequency</Label>
              <Input
                id="edit-frequency"
                type="number"
                min="1"
                max="7"
                value={weeklyReportingFrequency}
                onChange={(e) => setWeeklyReportingFrequency(e.target.value)}
              />
            </div>
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
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateEmp.isPending}>
              {updateEmp.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}