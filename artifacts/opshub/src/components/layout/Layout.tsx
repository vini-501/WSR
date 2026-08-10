import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getListNotificationsQueryKey, getGetUnreadNotificationCountQueryKey } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`db-notifications-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          // Invalidate React Query keys so the Bell dropdown and Notification Center auto-refresh
          queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });

          // Fire a toast for new notifications
          if (payload.eventType === "INSERT") {
            const newNotif = payload.new as any;
            toast({
              title: newNotif.title || "New Notification",
              description: newNotif.message || "",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient, toast]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header />
        <div className="container mx-auto p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}