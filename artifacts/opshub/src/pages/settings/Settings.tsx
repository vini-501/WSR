import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useTheme } from "@/components/theme-provider";

export function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name,
        timezone: settings.timezone,
        reporting_deadline_day: settings.reporting_deadline_day,
        reporting_deadline_time: settings.reporting_deadline_time,
        theme: settings.theme,
        allow_late_submissions: settings.allow_late_submissions,
        require_manager_approval: settings.require_manager_approval,
        notification_enabled: settings.notification_enabled
      });
    }
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "Settings updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        if (formData.theme) {
          setTheme(formData.theme);
        }
      },
      onError: (err: any) => toast({ title: "Failed to update", description: err.message, variant: "destructive" })
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-muted-foreground mt-1">Configure global application behavior and policies.</p>
      </div>

      <form onSubmit={handleSave}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>General Setup</CardTitle>
            <CardDescription>Basic company information and localization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input 
                  id="company_name" 
                  value={formData.company_name || ""} 
                  onChange={e => setFormData({...formData, company_name: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={formData.timezone || "UTC"} onValueChange={v => setFormData({...formData, timezone: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Reporting Policies</CardTitle>
            <CardDescription>Rules for report submissions and approvals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 border-b pb-6">
              <div className="space-y-2">
                <Label>Weekly Deadline Day</Label>
                <Select value={formData.reporting_deadline_day || "Friday"} onValueChange={v => setFormData({...formData, reporting_deadline_day: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Thursday">Thursday</SelectItem>
                    <SelectItem value="Friday">Friday</SelectItem>
                    <SelectItem value="Saturday">Saturday</SelectItem>
                    <SelectItem value="Sunday">Sunday</SelectItem>
                    <SelectItem value="Monday">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deadline Time</Label>
                <Input 
                  type="time" 
                  value={formData.reporting_deadline_time || "17:00"} 
                  onChange={e => setFormData({...formData, reporting_deadline_time: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Late Submissions</Label>
                  <p className="text-sm text-muted-foreground">Employees can submit reports after the deadline (flagged as late).</p>
                </div>
                <Switch 
                  checked={formData.allow_late_submissions || false} 
                  onCheckedChange={v => setFormData({...formData, allow_late_submissions: v})} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Manager Approval</Label>
                  <p className="text-sm text-muted-foreground">Reports must be reviewed by department heads.</p>
                </div>
                <Switch 
                  checked={formData.require_manager_approval || false} 
                  onCheckedChange={v => setFormData({...formData, require_manager_approval: v})} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>System Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-0.5">
                <Label>System Notifications</Label>
                <p className="text-sm text-muted-foreground">Enable email and in-app notifications company-wide.</p>
              </div>
              <Switch 
                checked={formData.notification_enabled || false} 
                onCheckedChange={v => setFormData({...formData, notification_enabled: v})} 
              />
            </div>
            
            <div className="space-y-2 pt-2">
              <Label>Default UI Theme</Label>
              <Select value={formData.theme || "light"} onValueChange={v => setFormData({...formData, theme: v})}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light Mode</SelectItem>
                  <SelectItem value="dark">Dark Mode</SelectItem>
                  <SelectItem value="system">System Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-6">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}