import { useState } from "react";
import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Clock, AlertCircle, FileText, Info } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { getListNotificationsQueryKey, getGetUnreadNotificationCountQueryKey } from "@workspace/api-client-react";

export function Notifications() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListNotifications({ page, limit: 20 });
  const queryClient = useQueryClient();

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkRead = (id: string) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'approval': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'rejected': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'deadline': return <Clock className="h-5 w-5 text-amber-500" />;
      case 'reminder': return <Bell className="h-5 w-5 text-primary" />;
      case 'needs_changes': return <FileText className="h-5 w-5 text-amber-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated on your reports and tasks.</p>
        </div>
        {data?.unread_count ? (
          <Button variant="outline" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
            Mark all as read
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="border-none shadow-sm"><CardContent className="h-24 p-6" /></Card>
          ))}
        </div>
      ) : data?.data?.length ? (
        <div className="space-y-4">
          {data.data.map(notif => (
            <Card 
              key={notif.id} 
              className={`transition-colors ${!notif.is_read ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
            >
              <CardContent className="p-4 sm:p-6 flex gap-4">
                <div className="mt-1 shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className={`text-base ${!notif.is_read ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(notif.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className={`text-sm ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {notif.message}
                  </p>
                  
                  {!notif.is_read && (
                    <div className="pt-2">
                      <Button variant="ghost" size="sm" className="h-8 text-xs px-2 -ml-2 text-primary" onClick={() => handleMarkRead(notif.id)}>
                        Mark as read
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {data.total_pages > 1 && (
            <div className="flex justify-center pt-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.total_pages}>Next</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-card">
          <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium">All caught up</h3>
          <p className="text-muted-foreground mt-1">You have no notifications at the moment.</p>
        </div>
      )}
    </div>
  );
}