import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Link } from "wouter";
import { 
  Globe, 
  Building2, 
  CalendarClock, 
  Bell, 
  Mail,
  Brain,
  ShieldCheck, 
  Blocks, 
  Save, 
  Loader2,
  Lock,
  ExternalLink,
  Laptop
} from "lucide-react";

const TIMEZONES = [
  { value: "Asia/Kolkata (IST)", label: "🇮🇳 Asia/Kolkata (IST) - Indian Standard Time (UTC+05:30)" },
  { value: "Asia/Singapore", label: "🇸🇬 Asia/Singapore (SGT) - Singapore Time (UTC+08:00)" },
  { value: "Asia/Dubai", label: "🇦🇪 Asia/Dubai (GST) - Gulf Standard Time (UTC+04:00)" },
  { value: "Asia/Tokyo", label: "🇯🇵 Asia/Tokyo (JST) - Japan Standard Time (UTC+09:00)" },
  { value: "Europe/London", label: "🇬🇧 Europe/London (GMT/BST) - London Time (UTC+00:00 / +01:00)" },
  { value: "Europe/Berlin", label: "🇩🇪 Europe/Berlin (CET/CEST) - Central European Time (UTC+01:00 / +02:00)" },
  { value: "America/New_York", label: "🇺🇸 America/New_York (EST/EDT) - Eastern Time (UTC-05:00 / -04:00)" },
  { value: "America/Chicago", label: "🇺🇸 America/Chicago (CST/CDT) - Central Time (UTC-06:00 / -05:00)" },
  { value: "America/Denver", label: "🇺🇸 America/Denver (MST/MDT) - Mountain Time (UTC-07:00 / -06:00)" },
  { value: "America/Los_Angeles", label: "🇺🇸 America/Los_Angeles (PST/PDT) - Pacific Time (UTC-08:00 / -07:00)" },
  { value: "UTC", label: "🌐 UTC - Coordinated Universal Time (UTC+00:00)" }
];

export function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();

  const [formData, setFormData] = useState<any>({});

  // Mocked state for non-functional enterprise settings
  const [mockSecurity, setMockSecurity] = useState({
    mfaEnforced: false,
    ssoOnly: false,
    sessionTimeout: "1h"
  });

  const [mockIntegrations, setMockIntegrations] = useState({
    slack: false,
    teams: false,
    calendar: false
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name,
        timezone: settings.timezone || "Asia/Kolkata (IST)",
        reporting_deadline_day: settings.reporting_deadline_day,
        reporting_deadline_time: settings.reporting_deadline_time,
        theme: settings.theme,
        allow_late_submissions: settings.allow_late_submissions,
        require_manager_approval: settings.require_manager_approval,
        notification_enabled: settings.notification_enabled,
        logo_url: settings.logo_url || ""
      });
    }
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "Settings updated successfully", description: "All configuration adjustments have been applied." });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        if (formData.theme) {
          setTheme(formData.theme);
        }
      },
      onError: (err: any) => {
        toast({ title: "Failed to update settings", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[250px] w-full" />
          <Skeleton className="h-[250px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-2 animate-in fade-in duration-300">
      <form onSubmit={handleSave}>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Company Settings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure global application behavior, reporting policies, security controls, and integrations.
            </p>
          </div>
          <Button 
            type="submit" 
            disabled={updateSettings.isPending}
            className="shadow-sm hover:shadow transition-all duration-200"
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: General, Company, Reporting */}
          <div className="space-y-6">
            
            {/* General Card */}
            <Card className="shadow-sm hover:shadow-md/5 transition-all duration-200 border-muted-foreground/10">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">General Setup</CardTitle>
                  <CardDescription className="text-xs">Configure localization and core preferences.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Global Timezone</Label>
                  <Select 
                    value={formData.timezone || "Asia/Kolkata (IST)"} 
                    onValueChange={v => setFormData({...formData, timezone: v})}
                  >
                    <SelectTrigger className="w-full h-10 border-muted-foreground/20">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This timezone defines deadline checks and submission stamps.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-sm font-medium">Default UI Theme</Label>
                  <Select 
                    value={formData.theme || "light"} 
                    onValueChange={v => setFormData({...formData, theme: v})}
                  >
                    <SelectTrigger className="w-full h-10 border-muted-foreground/20">
                      <SelectValue placeholder="Select UI theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light Mode</SelectItem>
                      <SelectItem value="dark">Dark Mode</SelectItem>
                      <SelectItem value="system">System Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Company Settings Card */}
            <Card className="shadow-sm hover:shadow-md/5 transition-all duration-200 border-muted-foreground/10">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Company Profile</CardTitle>
                  <CardDescription className="text-xs">Configure corporate branding and metadata.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-sm font-medium">Company Name</Label>
                  <Input 
                    id="company_name" 
                    value={formData.company_name || ""} 
                    onChange={e => setFormData({...formData, company_name: e.target.value})} 
                    placeholder="Enter company name"
                    className="h-10 border-muted-foreground/20"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url" className="text-sm font-medium">Branding Logo URL</Label>
                  <Input 
                    id="logo_url" 
                    value={formData.logo_url || ""} 
                    onChange={e => setFormData({...formData, logo_url: e.target.value})} 
                    placeholder="https://example.com/logo.png"
                    className="h-10 border-muted-foreground/20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Reporting Policies Card */}
            <Card className="shadow-sm hover:shadow-md/5 transition-all duration-200 border-muted-foreground/10">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Reporting Policies</CardTitle>
                  <CardDescription className="text-xs">Manage weekly submission windows and reviews.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-5">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Weekly Deadline Day</Label>
                    <Select 
                      value={formData.reporting_deadline_day || "Friday"} 
                      onValueChange={v => setFormData({...formData, reporting_deadline_day: v})}
                    >
                      <SelectTrigger className="h-10 border-muted-foreground/20">
                        <SelectValue />
                      </SelectTrigger>
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
                    <Label className="text-sm font-medium">Deadline Time</Label>
                    <Input 
                      type="time" 
                      value={formData.reporting_deadline_time || "17:00"} 
                      onChange={e => setFormData({...formData, reporting_deadline_time: e.target.value})} 
                      className="h-10 border-muted-foreground/20"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 max-w-[80%]">
                      <Label className="text-sm font-medium">Allow Late Submissions</Label>
                      <p className="text-xs text-muted-foreground">Employees can submit reports after the weekly deadline, flagged as late.</p>
                    </div>
                    <Switch 
                      checked={formData.allow_late_submissions || false} 
                      onCheckedChange={v => setFormData({...formData, allow_late_submissions: v})} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-muted/10">
                    <div className="space-y-0.5 max-w-[80%]">
                      <Label className="text-sm font-medium">Require Manager Approval</Label>
                      <p className="text-xs text-muted-foreground">Submitted weekly reports must be reviewed and approved by department heads.</p>
                    </div>
                    <Switch 
                      checked={formData.require_manager_approval || false} 
                      onCheckedChange={v => setFormData({...formData, require_manager_approval: v})} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Notifications, Security, Integrations */}
          <div className="space-y-6">

            {/* Email Automation Card */}
            <Card className="shadow-sm hover:shadow-md/5 transition-all duration-200 border-primary/20 bg-primary/5">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Email Automation & SMTP</CardTitle>
                  <CardDescription className="text-xs">Manage SMTP credentials, automated triggers, HTML templates, and delivery schedules.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configure Gmail, Outlook, or custom SMTP servers, customize 17 enterprise email templates, and view live delivery logs.
                </p>
                <Link href="/settings/email">
                  <Button type="button" className="w-full h-10 shadow-sm text-xs font-medium">
                    Configure Email Automation & SMTP &rarr;
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* AI Engine Settings Card */}
            <Card className="shadow-sm hover:shadow-md/5 transition-all duration-200 border-purple-500/20 bg-purple-500/5">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
                <div className="p-2 rounded-lg bg-purple-600 text-white">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">AI Executive Engine Setup</CardTitle>
                  <CardDescription className="text-xs">Configure LLM providers, API keys, models, tone, and automated synthesis schedules.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Connect OpenAI GPT-4o, Gemini 1.5 Pro, or Claude 3.5 Sonnet to generate executive briefs, department summaries, and risk recommendations.
                </p>
                <Link href="/settings/ai">
                  <Button type="button" className="w-full h-10 shadow-sm text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white">
                    Configure AI Engine & Models &rarr;
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            {/* Notifications Card */}
            <Card className="shadow-sm hover:shadow-md/5 transition-all duration-200 border-muted-foreground/10">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
                  <CardDescription className="text-xs">Configure alerts and delivery frequencies.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label className="text-sm font-medium">System-wide Notifications</Label>
                    <p className="text-xs text-muted-foreground">Enable automated email and in-app alerts company-wide.</p>
                  </div>
                  <Switch 
                    checked={formData.notification_enabled || false} 
                    onCheckedChange={v => setFormData({...formData, notification_enabled: v})} 
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-muted/30 opacity-75">
                  <div className="space-y-0.5 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Slack Digest Sync</Label>
                      <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                        Pro
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Post weekly completion digests directly to a company Slack channel.</p>
                  </div>
                  <Switch disabled checked={false} />
                </div>
              </CardContent>
            </Card>

            {/* Security & Access Controls Card */}
            <Card className="shadow-sm hover:shadow-md/5 transition-all duration-200 border-muted-foreground/10 relative overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">Security & Access</CardTitle>
                    <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                      Enterprise
                    </span>
                  </div>
                  <CardDescription className="text-xs">Enforce identity standards and active session rules.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-center justify-between opacity-80">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      Enforce Multi-Factor Auth (MFA)
                    </Label>
                    <p className="text-xs text-muted-foreground">Require all users to link authenticator apps or security keys.</p>
                  </div>
                  <Switch 
                    checked={mockSecurity.mfaEnforced} 
                    onCheckedChange={v => setMockSecurity({...mockSecurity, mfaEnforced: v})} 
                    className="data-[state=checked]:bg-amber-600"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-muted/30 opacity-80">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label className="text-sm font-medium">SSO / SAML Authentication</Label>
                    <p className="text-xs text-muted-foreground">Restrict user authentication strictly to corporate Identity Providers (Okta, Entra ID).</p>
                  </div>
                  <Switch 
                    checked={mockSecurity.ssoOnly} 
                    onCheckedChange={v => setMockSecurity({...mockSecurity, ssoOnly: v})}
                    className="data-[state=checked]:bg-amber-600"
                  />
                </div>

                <div className="space-y-2 pt-3 border-t border-muted/30 opacity-80">
                  <Label className="text-sm font-medium">Session Inactivity Timeout</Label>
                  <Select 
                    value={mockSecurity.sessionTimeout} 
                    onValueChange={v => setMockSecurity({...mockSecurity, sessionTimeout: v})}
                  >
                    <SelectTrigger className="h-9 border-muted-foreground/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15m">15 Minutes</SelectItem>
                      <SelectItem value="30m">30 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Integrations Card */}
            <Card className="shadow-sm hover:shadow-md/5 transition-all duration-200 border-muted-foreground/10">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Blocks className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">Integrations</CardTitle>
                    <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                      Add-ons
                    </span>
                  </div>
                  <CardDescription className="text-xs">Connect OpsHub with external communication and calendar suites.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      Slack Integration
                    </Label>
                    <p className="text-xs text-muted-foreground">Deliver notifications and command triggers straight from Slack workspaces.</p>
                  </div>
                  <Switch 
                    checked={mockIntegrations.slack} 
                    onCheckedChange={v => setMockIntegrations({...mockIntegrations, slack: v})} 
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-muted/30">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      Microsoft Teams Integration
                    </Label>
                    <p className="text-xs text-muted-foreground">Sync activity streams and reminder alerts into designated MS Teams channels.</p>
                  </div>
                  <Switch 
                    checked={mockIntegrations.teams} 
                    onCheckedChange={v => setMockIntegrations({...mockIntegrations, teams: v})} 
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-muted/30">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      Calendar Sync
                    </Label>
                    <p className="text-xs text-muted-foreground">Automatically log reporting deadlines on Google Calendar or Outlook accounts.</p>
                  </div>
                  <Switch 
                    checked={mockIntegrations.calendar} 
                    onCheckedChange={v => setMockIntegrations({...mockIntegrations, calendar: v})} 
                  />
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

        {/* Form Footer Save Button */}
        <div className="mt-8 border-t pt-6 flex justify-end">
          <Button 
            type="submit" 
            disabled={updateSettings.isPending}
            className="w-full sm:w-auto h-11 px-8 shadow-sm hover:shadow transition-all duration-200 text-sm font-medium"
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving Configurations...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Save Configuration
              </>
            )}
          </Button>
        </div>

      </form>
    </div>
  );
}