import { useState } from "react";
import { 
  useListNotifications, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
  getGetUnreadNotificationCountQueryKey,
  customFetch
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Info, 
  Search, 
  Trash2, 
  Check, 
  X,
  ExternalLink,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { useQueryClient, useMutation } from "@tanstack/react-query";

type NotificationType = 'all' | 'reminder' | 'approval' | 'rejected' | 'deadline' | 'announcement' | 'needs_changes';

export function Notifications() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<NotificationType>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [, setLocation] = useLocation();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query notifications with search, type (category), and unreadOnly filters
  const { data, isLoading } = useListNotifications({ 
    page, 
    limit: 15,
    unread_only: unreadOnly || undefined,
    ...({
      type: category !== "all" ? category : undefined,
      search: search || undefined
    } as any)
  });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Custom Mutation for Delete Individual
  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      return customFetch<{ success: boolean }>(`/api/notifications/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({ title: "Notification deleted" });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
    }
  });

  // Custom Mutation for Delete All
  const deleteAllNotifications = useMutation({
    mutationFn: async () => {
      return customFetch<{ success: boolean }>("/api/notifications", {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({ title: "All notifications deleted" });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
    }
  });

  // Custom Mutation for Mark Unread
  const markUnread = useMutation({
    mutationFn: async (id: string) => {
      return customFetch<{ success: boolean }>(`/api/notifications/${id}/unread`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      toast({ title: "Marked as unread" });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
    }
  });

  const handleMarkRead = (id: string) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    });
  };

  const handleMarkUnread = (id: string) => {
    markUnread.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id);
  };

  const handleDeleteAll = () => {
    if (window.confirm("Are you sure you want to delete all notifications? This action cannot be undone.")) {
      deleteAllNotifications.mutate();
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "All notifications marked as read" });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    });
  };

  const handleNotificationClick = (notif: any) => {
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
      case 'approval': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'rejected': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'deadline': return <Clock className="h-5 w-5 text-amber-500" />;
      case 'reminder': return <Bell className="h-5 w-5 text-primary" />;
      case 'needs_changes': return <FileText className="h-5 w-5 text-amber-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const categories: { value: NotificationType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'reminder', label: 'Reminders' },
    { value: 'approval', label: 'Approvals' },
    { value: 'rejected', label: 'Rejections' },
    { value: 'deadline', label: 'Deadlines' },
    { value: 'announcement', label: 'Announcements' },
    { value: 'needs_changes', label: 'Needs Changes' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Center</h1>
          <p className="text-muted-foreground mt-1">Manage and track your WCR notifications, alerts, and broadcasts.</p>
        </div>
        <div className="flex items-center gap-2">
          {data?.unread_count ? (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
              <Check className="h-4 w-4 mr-2" /> Mark all read
            </Button>
          ) : null}
          {data?.data?.length ? (
            <Button variant="destructive" size="sm" onClick={handleDeleteAll} disabled={deleteAllNotifications.isPending}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete all
            </Button>
          ) : null}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex border rounded-lg p-0.5 bg-muted/30 overflow-x-auto max-w-full">
              {categories.map((cat) => (
                <Button
                  key={cat.value}
                  variant={category === cat.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setCategory(cat.value);
                    setPage(1);
                  }}
                  className="h-8 px-3 text-xs"
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            <Button
              variant={unreadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setUnreadOnly(!unreadOnly);
                setPage(1);
              }}
              className="h-8 text-xs shrink-0"
            >
              Unread Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="border-none shadow-sm animate-pulse">
              <CardContent className="h-24 p-6 bg-card" />
            </Card>
          ))}
        </div>
      ) : data?.data?.length ? (
        <div className="space-y-4">
          {data.data.map(notif => (
            <Card 
              key={notif.id} 
              className={`transition-all hover:shadow-md border ${
                !notif.is_read ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-card'
              }`}
            >
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="mt-1 shrink-0 p-2 rounded-xl bg-muted/40">
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={`text-base leading-snug truncate ${!notif.is_read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                      {notif.title}
                    </h4>
                    <Badge variant="secondary" className="capitalize text-[10px] h-4 px-1.5 font-normal shrink-0">
                      {notif.type.replace('_', ' ')}
                    </Badge>
                    {notif.entity_type && (
                      <Badge variant="outline" className="capitalize text-[10px] h-4 px-1.5 font-normal text-primary border-primary/20 shrink-0">
                        {notif.entity_type}
                      </Badge>
                    )}
                  </div>
                  
                  <p className={`text-sm leading-relaxed ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground/80'}`}>
                    {notif.message}
                  </p>
                  
                  <div className="text-xs text-muted-foreground pt-1 flex items-center gap-3">
                    <span>{format(new Date(notif.created_at), "PPP 'at' p")}</span>
                    {notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />}
                    {notif.is_read && <span className="text-[10px] text-muted-foreground/60">Read</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 shrink-0">
                  {notif.entity_id && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleNotificationClick(notif)}
                      className="h-8 text-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View details
                    </Button>
                  )}
                  
                  {!notif.is_read ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleMarkRead(notif.id)}
                      className="h-8 text-xs text-primary hover:bg-primary/5"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleMarkUnread(notif.id)}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      title="Mark as unread"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(notif.id)}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {data.total_pages > 1 && (
            <div className="flex justify-between items-center pt-4">
              <span className="text-xs text-muted-foreground">
                Page {data.page} of {data.total_pages}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => p - 1)} 
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => p + 1)} 
                  disabled={page >= data.total_pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-2xl bg-card shadow-sm space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground/30">
            <Bell className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight">No notifications found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {search || category !== 'all' || unreadOnly
                ? "Try adjusting your filters or search term to see more results."
                : "You're completely caught up! We will let you know when something comes in."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}