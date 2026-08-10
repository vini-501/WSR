import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useGetReport, useCreateReport, useUpdateReport, useSubmitReport, useListReports } from "@workspace/api-client-react";
import { ReportInput, ReportUpdate } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Send, Copy } from "lucide-react";
import { getListReportsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export function ReportForm() {
  const params = useParams();
  const isNew = !params.id || params.id === "new";
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const [formData, setFormData] = useState<ReportInput>({
    week_start: new Date().toISOString().split('T')[0],
    achievements: "",
    completed_tasks: "",
    ongoing_tasks: "",
    blockers: "",
    next_week_plans: "",
    support_needed: "",
    additional_notes: "",
    overall_progress: 0
  });

  const { data: report, isLoading } = useGetReport(id, { 
    query: { enabled: !isNew, queryKey: ['/api/reports', id] } 
  });

  const { data: userReports } = useListReports({
    employee_id: profile?.id || undefined,
    limit: 1
  }, {
    query: {
      enabled: isNew && !!profile?.id,
      queryKey: ['/api/reports', 'list-last-week', profile?.id]
    }
  });

  const lastReport = userReports?.data?.[0];

  useEffect(() => {
    if (report && !isNew) {
      setFormData({
        week_start: report.week_start,
        achievements: report.achievements,
        completed_tasks: report.completed_tasks,
        ongoing_tasks: report.ongoing_tasks || "",
        blockers: report.blockers || "",
        next_week_plans: report.next_week_plans,
        support_needed: report.support_needed || "",
        additional_notes: report.additional_notes || "",
        overall_progress: report.overall_progress || 0
      });
    }
  }, [report, isNew]);

  const createReport = useCreateReport();
  const updateReport = useUpdateReport();
  const submitReport = useSubmitReport();

  const isPending = createReport.isPending || updateReport.isPending || submitReport.isPending;

  const handleDuplicate = () => {
    if (!lastReport) return;
    setFormData({
      ...formData,
      achievements: lastReport.achievements,
      completed_tasks: lastReport.completed_tasks,
      ongoing_tasks: lastReport.ongoing_tasks || "",
      blockers: lastReport.blockers || "",
      next_week_plans: lastReport.next_week_plans,
      support_needed: lastReport.support_needed || "",
      additional_notes: lastReport.additional_notes || "",
      overall_progress: lastReport.overall_progress || 0
    });
    toast({
      title: "Report Duplicated",
      description: `Copied details from your report for week of ${lastReport.week_start}`
    });
  };

  const handleSave = (e: React.FormEvent, submit: boolean = false) => {
    e.preventDefault();
    
    if (isNew) {
      createReport.mutate({ data: formData }, {
        onSuccess: (newReport) => {
          if (submit) {
            submitReport.mutate({ id: newReport.id }, {
              onSuccess: () => {
                toast({ title: "Report submitted successfully" });
                queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
                setLocation("/reports");
              }
            });
          } else {
            toast({ title: "Draft saved" });
            queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
            setLocation(`/reports`);
          }
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    } else {
      updateReport.mutate({ id, data: formData }, {
        onSuccess: () => {
          if (submit) {
            submitReport.mutate({ id }, {
              onSuccess: () => {
                toast({ title: "Report submitted successfully" });
                queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
                setLocation("/reports");
              }
            });
          } else {
            toast({ title: "Draft updated" });
            queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
            setLocation("/reports");
          }
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    }
  };

  if (!isNew && isLoading) {
    return <div className="p-8 text-center">Loading report...</div>;
  }

  const isReadOnly = !isNew && report?.status !== 'draft' && report?.status !== 'needs_changes';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <Link href="/reports" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Reports
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNew ? 'New Weekly Report' : isReadOnly ? 'View Report' : 'Edit Report'}
          </h1>
          <p className="text-muted-foreground mt-1">Detail your progress, blockers, and plans.</p>
        </div>
      </div>

      <Card>
        <form onSubmit={(e) => handleSave(e, false)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Report Details</CardTitle>
              <div className="flex items-center gap-2">
                {isNew && lastReport && (
                  <Button type="button" variant="outline" size="sm" onClick={handleDuplicate}>
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Duplicate Last Week
                  </Button>
                )}
                {!isNew && report && (
                  <div className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-muted">
                    Status: <span className="capitalize">{report.status.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="week_start">Week Starting</Label>
                <Input 
                  id="week_start" 
                  type="date" 
                  value={formData.week_start} 
                  onChange={e => setFormData({...formData, week_start: e.target.value})}
                  required 
                  disabled={isReadOnly || !isNew}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="overall_progress">Overall Progress</Label>
                  <span className="text-sm font-semibold text-primary">{formData.overall_progress ?? 0}%</span>
                </div>
                <input
                  id="overall_progress"
                  type="range"
                  min="0"
                  max="100"
                  value={formData.overall_progress ?? 0}
                  onChange={e => setFormData({...formData, overall_progress: parseInt(e.target.value)})}
                  disabled={isReadOnly}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 mt-2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="achievements">Key Achievements</Label>
              <Textarea 
                id="achievements" 
                placeholder="What were your major wins this week?" 
                className="min-h-[100px]"
                value={formData.achievements}
                onChange={e => setFormData({...formData, achievements: e.target.value})}
                required
                disabled={isReadOnly}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="completed_tasks">Completed Tasks</Label>
                <Textarea 
                  id="completed_tasks" 
                  placeholder="List the specific tasks you finished" 
                  className="min-h-[100px]"
                  value={formData.completed_tasks}
                  onChange={e => setFormData({...formData, completed_tasks: e.target.value})}
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ongoing_tasks">Ongoing Tasks</Label>
                <Textarea 
                  id="ongoing_tasks" 
                  placeholder="What tasks are currently in progress?" 
                  className="min-h-[100px]"
                  value={formData.ongoing_tasks}
                  onChange={e => setFormData({...formData, ongoing_tasks: e.target.value})}
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="blockers">Blockers (Optional)</Label>
                <Textarea 
                  id="blockers" 
                  placeholder="Anything slowing you down?" 
                  className="min-h-[100px]"
                  value={formData.blockers}
                  onChange={e => setFormData({...formData, blockers: e.target.value})}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_week_plans">Plans for Next Week</Label>
                <Textarea 
                  id="next_week_plans" 
                  placeholder="What are your priorities?" 
                  className="min-h-[100px]"
                  value={formData.next_week_plans}
                  onChange={e => setFormData({...formData, next_week_plans: e.target.value})}
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="support_needed">Support Needed (Optional)</Label>
                <Textarea 
                  id="support_needed" 
                  placeholder="Any help required from management or tools?" 
                  className="min-h-[100px]"
                  value={formData.support_needed}
                  onChange={e => setFormData({...formData, support_needed: e.target.value})}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="additional_notes">Additional Notes / Comments (Optional)</Label>
                <Textarea 
                  id="additional_notes" 
                  placeholder="Any other comments or details?" 
                  className="min-h-[100px]"
                  value={formData.additional_notes}
                  onChange={e => setFormData({...formData, additional_notes: e.target.value})}
                  disabled={isReadOnly}
                />
              </div>
            </div>
            
            {!isNew && report?.review_comment && (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                  Reviewer Feedback
                  <span className="text-xs text-muted-foreground font-normal">from {report.reviewer_name}</span>
                </h4>
                <p className="text-sm">{report.review_comment}</p>
              </div>
            )}
          </CardContent>
          
          {!isReadOnly && (
            <CardFooter className="flex justify-between border-t pt-6">
              <Button type="button" variant="outline" onClick={(e) => handleSave(e, false)} disabled={isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
              <Button type="button" onClick={(e) => handleSave(e, true)} disabled={isPending}>
                <Send className="mr-2 h-4 w-4" />
                Submit for Review
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>
    </div>
  );
}