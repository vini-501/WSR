import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useGetReport, useCreateReport, useUpdateReport, useSubmitReport } from "@workspace/api-client-react";
import { ReportInput, ReportUpdate } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Send } from "lucide-react";
import { getListReportsQueryKey } from "@workspace/api-client-react";

export function ReportForm() {
  const params = useParams();
  const isNew = !params.id || params.id === "new";
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ReportInput>({
    week_start: new Date().toISOString().split('T')[0],
    achievements: "",
    completed_tasks: "",
    blockers: "",
    next_week_plans: "",
    additional_notes: ""
  });

  const { data: report, isLoading } = useGetReport(id, { 
    query: { enabled: !isNew, queryKey: ['/api/reports', id] } 
  });

  useEffect(() => {
    if (report && !isNew) {
      setFormData({
        week_start: report.week_start,
        achievements: report.achievements,
        completed_tasks: report.completed_tasks,
        blockers: report.blockers || "",
        next_week_plans: report.next_week_plans,
        additional_notes: report.additional_notes || ""
      });
    }
  }, [report, isNew]);

  const createReport = useCreateReport();
  const updateReport = useUpdateReport();
  const submitReport = useSubmitReport();

  const isPending = createReport.isPending || updateReport.isPending || submitReport.isPending;

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

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isNew ? 'New Weekly Report' : isReadOnly ? 'View Report' : 'Edit Report'}
        </h1>
        <p className="text-muted-foreground mt-1">Detail your progress, blockers, and plans.</p>
      </div>

      <Card>
        <form onSubmit={(e) => handleSave(e, false)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Report Details</CardTitle>
              {!isNew && report && (
                <div className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-muted">
                  Status: <span className="capitalize">{report.status.replace('_', ' ')}</span>
                </div>
              )}
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

            <div className="space-y-2">
              <Label htmlFor="additional_notes">Additional Notes (Optional)</Label>
              <Input 
                id="additional_notes" 
                value={formData.additional_notes}
                onChange={e => setFormData({...formData, additional_notes: e.target.value})}
                disabled={isReadOnly}
              />
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