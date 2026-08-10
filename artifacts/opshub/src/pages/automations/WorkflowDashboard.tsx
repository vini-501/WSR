import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Zap,
  Play,
  Settings2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  ShieldAlert,
  ArrowRight,
  Loader2,
  Server,
  Layers,
  Activity,
  Sliders
} from "lucide-react";

export function WorkflowDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedWf, setSelectedWf] = useState<any>(null);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [scheduleCron, setScheduleCron] = useState("");

  // Fetch Workflow Stats
  const { data: stats } = useQuery({
    queryKey: ["workflow-stats"],
    queryFn: () => customFetch<any>("/api/workflows/stats"),
  });

  // Fetch Workflows
  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows-list"],
    queryFn: () => customFetch<any[]>("/api/workflows"),
  });

  // Fetch Escalations Ledger
  const { data: escalations } = useQuery({
    queryKey: ["workflow-escalations"],
    queryFn: () => customFetch<any[]>("/api/workflows/escalations"),
  });

  // Update Workflow Mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => customFetch(`/api/workflows/${data.id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: "Workflow Saved", description: "Workflow configuration and n8n webhook updated." });
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["workflows-list"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-stats"] });
    },
  });

  // Manual Trigger Mutation
  const runMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/workflows/${id}/run`, { method: "POST" }),
    onSuccess: (res: any) => {
      toast({
        title: "Workflow Dispatched",
        description: res.resultMessage || "Workflow execution completed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["workflow-stats"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-logs"] });
    },
    onError: (err: any) => {
      toast({ title: "Execution Failed", description: err.message || "Could not trigger workflow", variant: "destructive" });
    },
  });

  const handleOpenEdit = (wf: any) => {
    setSelectedWf(wf);
    setN8nWebhookUrl(wf.n8n_webhook_url || "");
    setScheduleCron(wf.schedule_cron || "0 10 * * 5");
    setEditModalOpen(true);
  };

  const handleToggleWorkflow = (wf: any) => {
    updateMutation.mutate({ id: wf.id, enabled: !wf.enabled });
  };

  const handleSaveSettings = () => {
    if (selectedWf) {
      updateMutation.mutate({
        id: selectedWf.id,
        n8n_webhook_url: n8nWebhookUrl,
        schedule_cron: scheduleCron,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-2 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" /> Workflow Automation Dashboard (n8n)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Automate weekly reminders, overdue escalations, AI briefs, and executive digest dispatches with n8n webhooks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/automations/logs">
            <Button variant="outline" size="sm" className="h-9 text-xs">
              <Activity className="mr-1.5 h-3.5 w-3.5" /> View Execution Logs
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["workflows-list"] });
              queryClient.invalidateQueries({ queryKey: ["workflow-stats"] });
            }}
            className="h-9 text-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh Status
          </Button>
        </div>
      </div>

      {/* Analytics Cards Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-muted-foreground/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Workflows</p>
              <h3 className="text-2xl font-bold mt-1 text-primary">{stats?.active_workflows ?? 0}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted-foreground/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Success Rate</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {stats?.success_rate ?? 100}%
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted-foreground/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Failed Runs</p>
              <h3 className="text-2xl font-bold mt-1 text-destructive">{stats?.failed_count ?? 0}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted-foreground/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Runs Logged</p>
              <h3 className="text-2xl font-bold mt-1">{stats?.total_runs ?? 0}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows Management Table */}
      <Card className="shadow-sm border-muted-foreground/10 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-muted/20">
          <div>
            <CardTitle className="text-lg font-bold">Automated Workflows Catalogue</CardTitle>
            <CardDescription className="text-xs">Configure schedules, n8n webhooks, and trigger manual executions.</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-semibold bg-primary/5">
            n8n Webhooks Supported
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : workflows?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground">
                    <th className="p-4">Workflow</th>
                    <th className="p-4">Trigger & Schedule</th>
                    <th className="p-4">n8n Status</th>
                    <th className="p-4">Last Run</th>
                    <th className="p-4">State</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {workflows.map((wf) => (
                    <tr key={wf.id} className="hover:bg-accent/30 transition-colors">
                      <td className="p-4 space-y-1 max-w-xs">
                        <p className="font-bold text-foreground text-sm flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary shrink-0" /> {wf.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{wf.description}</p>
                      </td>
                      <td className="p-4 space-y-1">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {wf.trigger_type}
                        </Badge>
                        <p className="font-mono text-[10px] text-muted-foreground">{wf.schedule_cron}</p>
                      </td>
                      <td className="p-4">
                        {wf.n8n_webhook_url ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1 font-medium">
                            <Server className="h-3 w-3" /> Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            Built-in Engine
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {wf.last_run_at ? (
                          formatDistanceToNow(new Date(wf.last_run_at), { addSuffix: true })
                        ) : (
                          "Never"
                        )}
                      </td>
                      <td className="p-4">
                        <Switch
                          checked={wf.enabled}
                          onCheckedChange={() => handleToggleWorkflow(wf)}
                          disabled={updateMutation.isPending}
                        />
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(wf)}
                          className="h-8 text-xs"
                        >
                          <Settings2 className="h-3.5 w-3.5 mr-1" /> Configure
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runMutation.mutate(wf.id)}
                          disabled={runMutation.isPending}
                          className="h-8 text-xs text-primary border-primary/20 hover:bg-primary/10"
                        >
                          <Play className="h-3.5 w-3.5 mr-1 fill-primary" /> Run Now
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">No workflows configured.</div>
          )}
        </CardContent>
      </Card>

      {/* Escalation History Ledger Section */}
      <Card className="shadow-sm border-muted-foreground/10">
        <CardHeader className="flex flex-row items-center gap-3 pb-3 border-b border-muted/20">
          <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Overdue Escalation History Ledger</CardTitle>
            <CardDescription className="text-xs">Level 1 (Employee Alert), Level 2 (Dept Head), Level 3 (Management) history.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {escalations?.length ? (
            <div className="space-y-2">
              {escalations.map((esc) => (
                <div key={esc.id} className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <p className="font-semibold text-foreground">{esc.employee_name} • Week of {esc.week_start}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{esc.notes}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={
                      esc.level === 3 ? "bg-destructive text-destructive-foreground" :
                      esc.level === 2 ? "bg-amber-500 text-white" :
                      "bg-blue-500 text-white"
                    }>
                      Level {esc.level} Escalation
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(esc.escalated_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">No active overdue escalations.</div>
          )}
        </CardContent>
      </Card>

      {/* Configure Workflow Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" /> Configure {selectedWf?.name}
            </DialogTitle>
            <DialogDescription>
              Set schedule cron expression or attach a self-hosted n8n webhook URL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">n8n Webhook URL (Optional)</Label>
              <Input
                placeholder="https://n8n.yourcompany.com/webhook/wcr-reminder"
                value={n8nWebhookUrl}
                onChange={(e) => setN8nWebhookUrl(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                If provided, events will trigger webhooks directly on your n8n workflow server.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Schedule Cron Expression</Label>
              <Input
                placeholder="0 10 * * 5"
                value={scheduleCron}
                onChange={(e) => setScheduleCron(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground font-mono">
                Standard 5-field cron syntax (min hr day mo dow). Default: Friday 10:00 AM.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
