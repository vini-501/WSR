import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetReport, useApproveReport, useRejectReport, useRequestReportChanges, useReviewReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Calendar, User, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getGetReportQueryKey, getListReportsQueryKey } from "@workspace/api-client-react";

export function ReportDetail() {
  const params = useParams();
  const id = params.id as string;
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'changes' | null>(null);
  const [comment, setComment] = useState("");

  const { data: report, isLoading } = useGetReport(id, { query: { enabled: !!id, queryKey: ['/api/reports', id] } });

  const approveReport = useApproveReport();
  const rejectReport = useRejectReport();
  const requestChanges = useRequestReportChanges();
  const reviewReport = useReviewReport();

  const isPending = approveReport.isPending || rejectReport.isPending || requestChanges.isPending || reviewReport.isPending;

  useEffect(() => {
    if (
      report &&
      report.status === 'submitted' &&
      (profile?.role === 'admin' || profile?.role === 'management' || profile?.role === 'department_head') &&
      profile?.id !== report.employee_id
    ) {
      reviewReport.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetReportQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        }
      });
    }
  }, [report?.status, profile?.role, id]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!report) return <div>Report not found</div>;

  const canReview = ['submitted', 'under_review'].includes(report.status) && (profile?.role === 'admin' || profile?.role === 'management' || profile?.role === 'department_head');

  const handleReview = () => {
    if (!reviewAction) return;

    const actionMap = {
      approve: approveReport,
      reject: rejectReport,
      changes: requestChanges
    };

    const action = actionMap[reviewAction];
    
    action.mutate({ id, data: { comment } }, {
      onSuccess: () => {
        toast({ title: `Report ${reviewAction === 'changes' ? 'changes requested' : reviewAction + 'd'}` });
        queryClient.invalidateQueries({ queryKey: getGetReportQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        setReviewAction(null);
        setComment("");
      },
      onError: (err: any) => toast({ title: "Action failed", description: err.message, variant: "destructive" })
    });
  };

  const statusColors: any = {
    draft: 'outline',
    submitted: 'default',
    under_review: 'bg-blue-500 hover:bg-blue-600 text-white',
    approved: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    rejected: 'destructive',
    needs_changes: 'bg-amber-500 hover:bg-amber-600 text-white'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <Link href="/reports" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Reports
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Weekly Report
            <Badge className={statusColors[report.status] || ''}>
              {report.status.replace('_', ' ')}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">Submitted on {report.submitted_at ? format(new Date(report.submitted_at), "PPP") : "Not submitted"}</p>
        </div>

        {canReview && (
          <div className="flex gap-2">
            <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setReviewAction('changes')}>
              <AlertCircle className="mr-2 h-4 w-4" /> Request Changes
            </Button>
            <Button variant="destructive" onClick={() => setReviewAction('reject')}>
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setReviewAction('approve')}>
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </Button>
          </div>
        )}
        
        {report.status === 'draft' && profile?.id === report.employee_id && (
          <Link href={`/reports/${report.id}/edit`}>
            <Button>Continue Editing</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg"><User className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Employee</p>
              <p className="font-bold">{report.employee_name}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg"><Building2 className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Department</p>
              <p className="font-bold">{report.department_name || "N/A"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg"><Calendar className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Week Starting</p>
              <p className="font-bold">{format(new Date(report.week_start), "MMM d, yyyy")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
              <p className="font-bold text-primary">{report.overall_progress ?? 0}%</p>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all" 
                style={{ width: `${report.overall_progress ?? 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {report.review_comment && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              Reviewer Feedback
              <span className="text-sm font-normal text-muted-foreground">— {report.reviewer_name}</span>
            </h3>
            <p className="text-sm">{report.review_comment}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Report Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Key Achievements</h3>
            <div className="whitespace-pre-wrap bg-muted/30 p-4 rounded-lg text-sm border">{report.achievements}</div>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Completed Tasks</h3>
              <div className="whitespace-pre-wrap bg-muted/30 p-4 rounded-lg text-sm border min-h-[100px]">{report.completed_tasks}</div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Ongoing Tasks</h3>
              <div className="whitespace-pre-wrap bg-muted/30 p-4 rounded-lg text-sm border min-h-[100px]">{report.ongoing_tasks}</div>
            </div>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Blockers</h3>
              <div className="whitespace-pre-wrap bg-muted/30 p-4 rounded-lg text-sm border min-h-[100px]">
                {report.blockers || <span className="text-muted-foreground italic text-xs">None reported.</span>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Next Week's Plans</h3>
              <div className="whitespace-pre-wrap bg-muted/30 p-4 rounded-lg text-sm border min-h-[100px]">{report.next_week_plans}</div>
            </div>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Support Needed</h3>
              <div className="whitespace-pre-wrap bg-muted/30 p-4 rounded-lg text-sm border min-h-[100px]">
                {report.support_needed || <span className="text-muted-foreground italic text-xs">No support requested.</span>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Additional Notes / Comments</h3>
              <div className="whitespace-pre-wrap bg-muted/30 p-4 rounded-lg text-sm border min-h-[100px]">
                {report.additional_notes || <span className="text-muted-foreground italic text-xs">No additional comments.</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!reviewAction} onOpenChange={(open) => !open && setReviewAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' && 'Approve Report'}
              {reviewAction === 'reject' && 'Reject Report'}
              {reviewAction === 'changes' && 'Request Changes'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Add a comment (Optional)</label>
              <Textarea 
                placeholder="Provide feedback to the employee..." 
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewAction(null)}>Cancel</Button>
            <Button 
              onClick={handleReview} 
              disabled={isPending}
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
              className={reviewAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : reviewAction === 'changes' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
            >
              {isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}