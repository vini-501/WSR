import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Mail, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Send, 
  RotateCcw,
  Loader2,
  Filter
} from "lucide-react";
import { format } from "date-fns";

export function EmailLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [triggerFilter, setTriggerFilter] = useState("all");
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch Email Stats
  const { data: stats } = useQuery({
    queryKey: ["email-stats"],
    queryFn: () => customFetch<any>("/api/email/stats"),
  });

  // Fetch Delivery Logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ["email-logs", page, search, statusFilter, triggerFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
      });
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (triggerFilter !== "all") params.append("trigger_event", triggerFilter);

      return customFetch<any>(`/api/email/logs?${params.toString()}`);
    },
  });

  // Retry Mutation
  const retryMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/email/logs/${id}/retry`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Email Retried", description: "Email has been re-dispatched to queue." });
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      queryClient.invalidateQueries({ queryKey: ["email-stats"] });
    },
    onError: (err: any) => {
      toast({ title: "Retry Failed", description: err.message || "Could not retry email", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" /> Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1 font-medium">
            <AlertCircle className="h-3 w-3" /> Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1 font-medium">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-2 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary" /> Email Delivery Logs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor real-time automated email delivery history, inspect failures, and retry dispatches.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["email-logs"] });
            queryClient.invalidateQueries({ queryKey: ["email-stats"] });
          }}
          className="h-9 text-xs"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh Activity
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-muted-foreground/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Emails Sent Today</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {stats?.sent_today ?? 0}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Send className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted-foreground/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Failed Emails</p>
              <h3 className="text-2xl font-bold mt-1 text-destructive">
                {stats?.failed_count ?? 0}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted-foreground/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Queue</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-500">
                {stats?.pending_count ?? 0}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted-foreground/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Success Rate</p>
              <h3 className="text-2xl font-bold mt-1 text-primary">
                {stats?.success_rate ?? 100}%
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by recipient email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex border rounded-lg p-0.5 bg-muted/30">
              {["all", "sent", "failed", "pending"].map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className="h-8 px-3 text-xs capitalize"
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Logs Table */}
      <Card className="border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : logsData?.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground">
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Subject / Event</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {logsData.data.map((log: any) => (
                  <tr key={log.id} className="hover:bg-accent/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">
                      {log.recipient}
                    </td>
                    <td className="p-4 space-y-0.5">
                      <p className="font-semibold text-foreground">{log.subject}</p>
                      <Badge variant="outline" className="text-[10px] capitalize font-normal">
                        {log.trigger_event.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "PPP 'at' p")}
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      {log.error_details && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedError(log.error_details)}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <AlertCircle className="h-3.5 w-3.5 mr-1" /> Error Info
                        </Button>
                      )}
                      {log.status === "failed" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => retryMutation.mutate(log.id)}
                          disabled={retryMutation.isPending}
                          className="h-8 text-xs"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retry Send
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logsData.total_pages > 1 && (
              <div className="flex justify-between items-center p-4 border-t bg-muted/10">
                <span className="text-xs text-muted-foreground">
                  Page {logsData.page} of {logsData.total_pages} ({logsData.total} total logs)
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1}
                    className="h-8 text-xs"
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => p + 1)} 
                    disabled={page >= logsData.total_pages}
                    className="h-8 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 space-y-3">
            <Mail className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <h3 className="font-semibold text-base">No Email Delivery Logs Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Automated email delivery events will be logged here as workflows trigger.
            </p>
          </div>
        )}
      </Card>

      {/* Error Details Modal */}
      <Dialog open={Boolean(selectedError)} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Delivery Error Details
            </DialogTitle>
            <DialogDescription>
              Below are the exception trace details returned by the SMTP server.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted rounded-xl font-mono text-xs text-destructive border border-destructive/20 overflow-x-auto my-2">
            {selectedError}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedError(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
