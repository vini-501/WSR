import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { 
  useListNotifications, 
  useGetUnreadNotificationCount, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
  getGetUnreadNotificationCountQueryKey,
  customFetch
} from "@workspace/api-client-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Check, 
  Trash, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Info,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: countData } = useGetUnreadNotificationCount();
  const { data: listData } = useListNotifications({ page: 1, limit: 5 });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Custom delete hook
  const deleteNotif = useMutation({
    mutationFn: async (id: string) => {
      return customFetch<{ success: boolean }>(`/api/notifications/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
    },
  });

  const handleMarkRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    });
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotif.mutate(id);
  };

  const handleNotificationClick = (notif: any) => {
    setIsOpen(false);
    if (!notif.is_read) {
      markRead.mutate({ id: notif.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
        }
      });
    }

    if (notif.entity_type === "report" && notif.entity_id) {
      setLocation(`/reports/${notif.entity_id}`);
    } else if (notif.entity_type === "employee" && notif.entity_id) {
      setLocation(`/employees/${notif.entity_id}`);
    } else if (notif.entity_type === "department" && notif.entity_id) {
      setLocation(`/departments/${notif.entity_id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'approval': return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case 'rejected': return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />;
      case 'deadline': return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'reminder': return <Bell className="h-4 w-4 text-primary shrink-0" />;
      case 'needs_changes': return <FileText className="h-4 w-4 text-amber-500 shrink-0" />;
      default: return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
    }
  };

  const unreadCount = countData?.count ?? 0;
  const notifications = listData?.data ?? [];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl border bg-background/50 hover:bg-accent">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-[380px] p-0 rounded-xl shadow-lg border">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllRead}
              className="text-xs h-7 text-primary hover:text-primary hover:bg-primary/5 px-2"
              disabled={markAllRead.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>

        <div className="max-h-[350px] overflow-y-auto divide-y divide-border">
          {notifications.length > 0 ? (
            notifications.map((notif: any) => (
              <div 
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group flex gap-3 p-4 cursor-pointer hover:bg-accent/40 transition-colors ${!notif.is_read ? 'bg-primary/5' : ''}`}
              >
                <div className="mt-0.5">{getIcon(notif.type)}</div>
                
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs leading-none truncate ${!notif.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-snug line-clamp-2 ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground/80'}`}>
                    {notif.message}
                  </p>

                  {/* Actions row */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      {!notif.is_read && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => handleMarkRead(e, notif.id)}
                          className="h-6 w-6 text-primary hover:bg-primary/10 rounded-md"
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => handleDelete(e, notif.id)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                        title="Delete"
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                    {notif.entity_id && (
                      <span className="text-[9px] font-medium text-primary flex items-center gap-0.5">
                        View <ExternalLink className="h-2 w-2" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs">No notifications yet</p>
            </div>
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <Link href="/notifications">
          <div className="block py-2.5 text-center text-xs font-medium text-primary hover:bg-accent cursor-pointer transition-colors border-t">
            View all notifications
          </div>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
