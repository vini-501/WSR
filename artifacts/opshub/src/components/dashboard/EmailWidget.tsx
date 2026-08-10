import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Mail, Send, AlertCircle, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function EmailWidget() {
  const { data: stats } = useQuery({
    queryKey: ["email-stats"],
    queryFn: () => customFetch<any>("/api/email/stats"),
  });

  const recent = stats?.recent_activity || [];

  return (
    <Card className="shadow-sm border-muted-foreground/10 flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-muted/20">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Email Automation Status</CardTitle>
          </div>
          <CardDescription className="text-xs">SMTP delivery metrics & recent activity</CardDescription>
        </div>
        <Link href="/settings/email">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary">
            Settings <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      
      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
        {/* Metric Badges Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Sent Today</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{stats?.sent_today ?? 0}</span>
          </div>

          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Failed</span>
            <span className="text-lg font-bold text-destructive mt-0.5 block">{stats?.failed_count ?? 0}</span>
          </div>

          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Success Rate</span>
            <span className="text-lg font-bold text-primary mt-0.5 block">{stats?.success_rate ?? 100}%</span>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="space-y-2 flex-1">
          <p className="text-xs font-semibold text-muted-foreground">Recent Deliveries</p>
          {recent.length > 0 ? (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {recent.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-2 rounded-lg border bg-card/60 text-xs">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <p className="font-medium truncate text-foreground">{log.recipient}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{log.subject}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {log.status === "sent" ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Sent
                      </span>
                    ) : log.status === "failed" ? (
                      <span className="text-[10px] font-semibold text-destructive flex items-center justify-end gap-1">
                        <AlertCircle className="h-2.5 w-2.5" /> Failed
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-500 flex items-center justify-end gap-1">
                        <Clock className="h-2.5 w-2.5" /> Pending
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground block">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground border rounded-xl bg-muted/20">
              No recent email activity
            </div>
          )}
        </div>

        {/* View All Logs Footer Link */}
        <Link href="/email-logs">
          <div className="pt-2 text-center text-xs font-medium text-primary hover:underline cursor-pointer border-t">
            View full email delivery logs &rarr;
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
