import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Download,
  Edit,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Award,
  Zap,
  TrendingUp,
  Building2,
  Brain,
  Sliders,
  Save,
  Loader2,
  FileText,
  Lightbulb
} from "lucide-react";

const getMondays = () => {
  const list = [];
  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = (currentDay === 0 ? -6 : 1) - currentDay;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() + mondayOffset);

  for (let i = 0; i < 8; i++) {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() - i * 7);
    list.push(d.toISOString().split("T")[0]);
  }
  return list;
};

export function AiInsights() {
  const mondays = getMondays();
  const [selectedWeek, setSelectedWeek] = useState<string>(mondays[0]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editedText, setEditedText] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch Executive AI Summary
  const { data: summaryResponse, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["ai-summary-executive", selectedWeek],
    queryFn: () => customFetch<any>(`/api/ai/summary/executive?week_start=${selectedWeek}`),
  });

  // Force Regenerate Mutation
  const regenerateMutation = useMutation({
    mutationFn: () => customFetch(`/api/ai/summary/executive/regenerate`, {
      method: "POST",
      body: JSON.stringify({ week_start: selectedWeek })
    }),
    onSuccess: () => {
      toast({ title: "AI Summary Regenerated", description: "Fresh executive insights have been synthesized." });
      queryClient.invalidateQueries({ queryKey: ["ai-summary-executive", selectedWeek] });
    },
    onError: (err: any) => {
      toast({ title: "Regeneration Failed", description: err.message || "Failed to regenerate AI summary", variant: "destructive" });
    },
  });

  // Save Manual Edits Mutation
  const saveEditsMutation = useMutation({
    mutationFn: (newText: string) => {
      const updatedData = {
        ...summaryResponse.data,
        executive_summary_text: newText,
      };
      return customFetch("/api/ai/summary/executive", {
        method: "PUT",
        body: JSON.stringify({ week_start: selectedWeek, summary_data: updatedData }),
      });
    },
    onSuccess: () => {
      toast({ title: "Summary Updated", description: "Your manual edits have been saved to version history." });
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["ai-summary-executive", selectedWeek] });
    },
  });

  // Export PDF / HTML Report
  const handleExportPDF = async () => {
    try {
      const res: any = await customFetch("/api/ai/summary/export-pdf", {
        method: "POST",
        body: JSON.stringify({ week_start: selectedWeek }),
      });

      const blob = new Blob([res.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename || `AI_Executive_Summary_${selectedWeek}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Report Exported", description: `Downloaded ${res.filename}` });
    } catch (err) {
      toast({ title: "Export Failed", description: "Could not export report", variant: "destructive" });
    }
  };

  // Copy to Clipboard
  const handleCopyClipboard = () => {
    if (summaryResponse?.data?.executive_summary_text) {
      navigator.clipboard.writeText(summaryResponse.data.executive_summary_text);
      toast({ title: "Copied to Clipboard", description: "AI Executive Brief copied successfully." });
    }
  };

  const data = summaryResponse?.data;
  const metadata = summaryResponse?.metadata;

  const getHealthBadge = (health: string) => {
    switch (health) {
      case "Excellent":
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold gap-1"><CheckCircle2 className="h-3 w-3" /> Excellent</Badge>;
      case "Healthy":
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs font-semibold gap-1"><Sparkles className="h-3 w-3" /> Healthy</Badge>;
      case "Warning":
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-semibold gap-1"><AlertTriangle className="h-3 w-3" /> Warning</Badge>;
      case "Critical":
        return <Badge variant="destructive" className="text-xs font-semibold gap-1"><ShieldAlert className="h-3 w-3" /> Critical</Badge>;
      default:
        return <Badge variant="outline">{health}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-2 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" /> AI Executive Summary & Insights
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            AI-driven business intelligence, company health indicators, blocker detection, and actionable recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-52 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mondays.map((monday) => (
                <SelectItem key={monday} value={monday}>
                  Week of {format(new Date(monday), "MMM d, yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending || isFetching}
            className="h-9 text-xs shadow-sm hover:shadow"
          >
            {regenerateMutation.isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5 text-primary" />
            )}
            Regenerate Summary
          </Button>

          <Button variant="outline" size="sm" onClick={handleCopyClipboard} className="h-9 text-xs">
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Brief
          </Button>

          <Button size="sm" onClick={handleExportPDF} className="h-9 text-xs shadow-sm">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data ? (
        <>
          {/* Top Metric Cards Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border-muted-foreground/10 bg-gradient-to-br from-card to-primary/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Company Health Status</p>
                  <div className="mt-2">{getHealthBadge(data.company_health_score)}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-muted-foreground/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">AI Productivity Score</p>
                  <h3 className="text-2xl font-bold mt-1 text-primary">{data.productivity_score}%</h3>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Zap className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-muted-foreground/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">WCR Coverage</p>
                  <h3 className="text-2xl font-bold mt-1">{data.submission_rate_pct}%</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{data.total_submitted} Reports Filed</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-muted-foreground/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Approval SLA Rate</p>
                  <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{data.approval_rate_pct}%</h3>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Executive Summary Brief Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-muted/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-bold">Executive AI Summary Brief</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Synthesized for week of {selectedWeek} • Version {metadata?.version ?? 1} • Model: {metadata?.model ?? "gpt-4o"}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditedText(data.executive_summary_text);
                  setEditModalOpen(true);
                }}
                className="h-8 text-xs text-primary hover:bg-primary/10"
              >
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit Brief
              </Button>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm leading-relaxed text-foreground/90 font-sans whitespace-pre-wrap">
                {data.executive_summary_text}
              </p>
            </CardContent>
          </Card>

          {/* Grid Layout: Achievements, Risks, Action Items */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Major Achievements */}
            <Card className="shadow-sm border-muted-foreground/10">
              <CardHeader className="flex flex-row items-center gap-2 pb-3 border-b border-muted/20">
                <Award className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-base font-semibold">Major Achievements</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                {data.major_achievements?.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-card text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <p className="leading-relaxed text-foreground">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Critical Risks & Blockers */}
            <Card className="shadow-sm border-muted-foreground/10">
              <CardHeader className="flex flex-row items-center gap-2 pb-3 border-b border-muted/20">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base font-semibold">Key Blockers & Risks</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                {data.key_blockers_and_risks?.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-destructive/20 bg-destructive/5 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                    <p className="leading-relaxed text-foreground">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* High Priority Action Items */}
            <Card className="shadow-sm border-muted-foreground/10">
              <CardHeader className="flex flex-row items-center gap-2 pb-3 border-b border-muted/20">
                <TrendingUp className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Action Items for Leadership</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                {data.high_priority_action_items?.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-primary/5 border-primary/20 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="leading-relaxed text-foreground">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* AI Actionable Recommendations Grid */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center gap-2 pb-3 border-b border-muted/20">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <div>
                <CardTitle className="text-base font-semibold">Actionable AI Recommendations</CardTitle>
                <CardDescription className="text-xs">Strategic management advice synthesized from reporting telemetry.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.ai_recommendations?.map((rec: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold capitalize">
                        {rec.category}
                      </Badge>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rec.impact === 'High' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {rec.impact} Impact
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs text-foreground">{rec.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Department AI Performance Summaries Grid */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-muted/20">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-semibold">Department AI Summaries</CardTitle>
                  <CardDescription className="text-xs">Breakdown by department completion, risks, and status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.department_breakdown?.map((dept: any) => (
                  <div key={dept.department_id} className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-foreground">{dept.department_name}</h4>
                      <Badge className={
                        dept.status === "On Track" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]" : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                      }>
                        {dept.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-y py-2">
                      <div>
                        <span className="text-muted-foreground text-[10px]">Coverage</span>
                        <p className="font-semibold">{dept.completion_rate}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px]">Active Risks</span>
                        <p className="font-semibold">{dept.risks_count}</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{dept.summary}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Edit Summary Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" /> Edit Executive Brief
            </DialogTitle>
            <DialogDescription>
              Modify the AI summary before sending or exporting. Changes are saved as a new version.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <Textarea
              rows={8}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="text-xs leading-relaxed"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveEditsMutation.mutate(editedText)}
              disabled={saveEditsMutation.isPending}
            >
              {saveEditsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Edited Summary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
