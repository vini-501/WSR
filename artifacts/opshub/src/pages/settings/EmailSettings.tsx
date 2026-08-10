import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { customFetch } from "@workspace/api-client-react";
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
  Send, 
  Eye, 
  Save, 
  Loader2, 
  Check, 
  AlertCircle, 
  Server, 
  CalendarClock, 
  Sliders,
  CheckCircle2,
  RefreshCw
} from "lucide-react";

const TEMPLATES_LIST = [
  { id: "weekly_reminder", name: "Weekly Deadline Reminder", category: "Weekly Reports" },
  { id: "overdue_reminder", name: "Overdue Submission Alert", category: "Weekly Reports" },
  { id: "submission_confirmation", name: "Report Submission Confirmation", category: "Weekly Reports" },
  { id: "dept_head_review", name: "Department Head Review Alert", category: "Approval Workflow" },
  { id: "report_approved", name: "Report Approved Notice", category: "Approval Workflow" },
  { id: "report_rejected", name: "Report Rejected Notice", category: "Approval Workflow" },
  { id: "changes_requested", name: "Changes Requested Notice", category: "Approval Workflow" },
  { id: "report_resubmitted", name: "Report Resubmission Notice", category: "Approval Workflow" },
  { id: "dept_completion_summary", name: "Weekly Department Summary", category: "Management" },
  { id: "executive_summary", name: "Weekly Executive Summary", category: "Management" },
  { id: "pending_approval_summary", name: "Pending Approval Summary", category: "Management" },
  { id: "late_submission_summary", name: "Late Submission Summary", category: "Management" },
  { id: "welcome_email", name: "Welcome Email", category: "Employee Management" },
  { id: "account_activation", name: "Account Activation Email", category: "Employee Management" },
  { id: "password_reset", name: "Password Reset Request", category: "Employee Management" },
  { id: "role_update", name: "Role Update Notification", category: "Employee Management" },
  { id: "department_transfer", name: "Department Transfer Notification", category: "Employee Management" },
];

export function EmailSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<any>({
    enabled: true,
    provider: "gmail",
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: "",
    smtp_pass: "",
    from_name: "Ellipsonic WCR",
    from_email: "notifications@ellipsonic.com",
    reminder_day: "Friday",
    reminder_time: "10:00",
    summary_schedule_day: "Monday",
    summary_schedule_time: "09:00",
    timezone: "Asia/Kolkata (IST)",
    triggers: {
      weekly_reminder: true,
      overdue_reminder: true,
      submission_confirmation: true,
      dept_head_review: true,
      report_approved: true,
      report_rejected: true,
      changes_requested: true,
      report_resubmitted: true,
      dept_completion: true,
      executive_summary: true,
      pending_approval_summary: true,
      late_submission_summary: true,
      welcome_email: true,
      account_activation: true,
      password_reset: true,
      role_update: true,
      department_transfer: true,
    },
  });

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("weekly_reminder");
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Fetch Settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["email-settings"],
    queryFn: () => customFetch<any>("/api/email/settings"),
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        enabled: settings.enabled ?? true,
        provider: settings.provider || "gmail",
        smtp_host: settings.smtp_host || "smtp.gmail.com",
        smtp_port: settings.smtp_port || 587,
        smtp_secure: settings.smtp_secure ?? false,
        smtp_user: settings.smtp_user || "",
        smtp_pass: settings.smtp_pass || "",
        from_name: settings.from_name || "Ellipsonic WCR",
        from_email: settings.from_email || "notifications@ellipsonic.com",
        reminder_day: settings.reminder_day || "Friday",
        reminder_time: settings.reminder_time || "10:00",
        summary_schedule_day: settings.summary_schedule_day || "Monday",
        summary_schedule_time: settings.summary_schedule_time || "09:00",
        timezone: settings.timezone || "Asia/Kolkata (IST)",
        triggers: settings.triggers || formData.triggers,
      });
    }
  }, [settings]);

  // Update Settings Mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => customFetch("/api/email/settings", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: "Email Settings Saved", description: "SMTP configuration and trigger rules updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message || "Failed to update email settings", variant: "destructive" });
    },
  });

  // Send Test Email Mutation
  const testMutation = useMutation({
    mutationFn: (email: string) => customFetch("/api/email/test", { method: "POST", body: JSON.stringify({ recipientEmail: email }) }),
    onSuccess: () => {
      toast({ title: "Test Email Dispatched", description: `A test email has been queued for ${testEmail}` });
      setTestModalOpen(false);
      setTestEmail("");
    },
    onError: (err: any) => {
      toast({ title: "Test Email Failed", description: err.message || "Could not dispatch test email", variant: "destructive" });
    },
  });

  // Fetch Template Preview
  const handlePreviewTemplate = async (templateId: string) => {
    setSelectedTemplate(templateId);
    setLoadingPreview(true);
    setPreviewModalOpen(true);
    try {
      const data = await customFetch<any>(`/api/email/templates/preview?templateId=${templateId}`);
      setPreviewData(data);
    } catch (err) {
      toast({ title: "Preview Error", description: "Failed to render email template", variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    let host = formData.smtp_host;
    let port = formData.smtp_port;
    let secure = formData.smtp_secure;

    if (provider === "gmail") {
      host = "smtp.gmail.com";
      port = 587;
      secure = false;
    } else if (provider === "outlook") {
      host = "smtp.office365.com";
      port = 587;
      secure = false;
    }

    setFormData({ ...formData, provider, smtp_host: host, smtp_port: port, smtp_secure: secure });
  };

  const toggleTrigger = (key: string) => {
    setFormData({
      ...formData,
      triggers: {
        ...formData.triggers,
        [key]: !formData.triggers[key],
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto px-4 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-2 animate-in fade-in duration-300">
      <form onSubmit={handleSubmit}>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text flex items-center gap-3">
              <Mail className="h-8 w-8 text-primary" /> Email Automation Settings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure SMTP servers, delivery schedules, automated event triggers, and templates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setTestModalOpen(true)}
              className="h-10 text-xs"
            >
              <Send className="mr-2 h-4 w-4" /> Send Test Email
            </Button>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="h-10 text-xs shadow-sm hover:shadow"
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Email Settings
            </Button>
          </div>
        </div>

        {/* Global Switch Banner */}
        <Card className={`border shadow-sm mb-6 ${formData.enabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${formData.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Global Email Automation Engine</h3>
                <p className="text-xs text-muted-foreground">
                  {formData.enabled ? "Automated email notifications and digest reports are ACTIVE." : "Global email dispatching is currently DISABLED."}
                </p>
              </div>
            </div>
            <Switch 
              checked={formData.enabled} 
              onCheckedChange={(val) => setFormData({ ...formData, enabled: val })} 
            />
          </CardContent>
        </Card>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* SMTP Configuration Card */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">SMTP Service Setup</CardTitle>
                <CardDescription className="text-xs">Configure host credentials for Gmail, Outlook, or custom SMTP servers.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">SMTP Provider</Label>
                <Select value={formData.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail SMTP (smtp.gmail.com)</SelectItem>
                    <SelectItem value="outlook">Microsoft Outlook (smtp.office365.com)</SelectItem>
                    <SelectItem value="custom">Custom SMTP Server</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">SMTP Host</Label>
                  <Input 
                    value={formData.smtp_host} 
                    onChange={e => setFormData({...formData, smtp_host: e.target.value})}
                    placeholder="smtp.gmail.com"
                    disabled={formData.provider !== "custom"}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">SMTP Port</Label>
                  <Input 
                    type="number" 
                    value={formData.smtp_port} 
                    onChange={e => setFormData({...formData, smtp_port: parseInt(e.target.value) || 587})}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">From Name</Label>
                  <Input 
                    value={formData.from_name} 
                    onChange={e => setFormData({...formData, from_name: e.target.value})}
                    placeholder="Ellipsonic WCR"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">From Email Address</Label>
                  <Input 
                    type="email"
                    value={formData.from_email} 
                    onChange={e => setFormData({...formData, from_email: e.target.value})}
                    placeholder="notifications@ellipsonic.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">SMTP Username / Email</Label>
                  <Input 
                    type="email"
                    value={formData.smtp_user} 
                    onChange={e => setFormData({...formData, smtp_user: e.target.value})}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">SMTP Password / App Key</Label>
                  <Input 
                    type="password"
                    value={formData.smtp_pass} 
                    onChange={e => setFormData({...formData, smtp_pass: e.target.value})}
                    placeholder="App password or secret"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">SSL / TLS Secure Connection</Label>
                  <p className="text-xs text-muted-foreground">Enable direct SSL/TLS security wrapper (Port 465).</p>
                </div>
                <Switch 
                  checked={formData.smtp_secure} 
                  onCheckedChange={v => setFormData({...formData, smtp_secure: v})} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule Settings Card */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Delivery Schedule Controls</CardTitle>
                <CardDescription className="text-xs">Configure automated reminder times and executive digest schedules.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Weekly Reminder Day</Label>
                  <Select value={formData.reminder_day} onValueChange={v => setFormData({...formData, reminder_day: v})}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Thursday">Thursday</SelectItem>
                      <SelectItem value="Friday">Friday</SelectItem>
                      <SelectItem value="Saturday">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reminder Time</Label>
                  <Input 
                    type="time" 
                    value={formData.reminder_time} 
                    onChange={e => setFormData({...formData, reminder_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Executive Digest Day</Label>
                  <Select value={formData.summary_schedule_day} onValueChange={v => setFormData({...formData, summary_schedule_day: v})}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Friday">Friday</SelectItem>
                      <SelectItem value="Monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Digest Delivery Time</Label>
                  <Input 
                    type="time" 
                    value={formData.summary_schedule_time} 
                    onChange={e => setFormData({...formData, summary_schedule_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-muted/20">
                <Label className="text-sm font-medium">Delivery Timezone</Label>
                <Select value={formData.timezone} onValueChange={v => setFormData({...formData, timezone: v})}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata (IST)">🇮🇳 Asia/Kolkata (IST) - UTC+05:30</SelectItem>
                    <SelectItem value="Asia/Singapore">🇸🇬 Asia/Singapore (SGT) - UTC+08:00</SelectItem>
                    <SelectItem value="Europe/London">🇬🇧 Europe/London (GMT) - UTC+00:00</SelectItem>
                    <SelectItem value="America/New_York">🇺🇸 America/New_York (EST) - UTC-05:00</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Trigger Toggles & Template Preview Grid */}
        <Card className="mt-6 shadow-sm border-muted-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Automated Trigger Rules & Templates</CardTitle>
                <CardDescription className="text-xs">Enable or disable individual notification triggers and preview HTML templates.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES_LIST.map((tmpl) => (
                <div key={tmpl.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/40 transition-colors">
                  <div className="space-y-1 pr-2 min-w-0">
                    <p className="text-xs font-semibold truncate">{tmpl.name}</p>
                    <span className="text-[10px] text-muted-foreground capitalize">{tmpl.category}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handlePreviewTemplate(tmpl.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      title="Preview Template"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Switch 
                      checked={formData.triggers[tmpl.id] ?? true} 
                      onCheckedChange={() => toggleTrigger(tmpl.id)} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Action */}
        <div className="mt-6 flex justify-end">
          <Button 
            type="submit" 
            disabled={saveMutation.isPending}
            className="h-11 px-8 shadow-sm hover:shadow"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving Settings...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" /> Save Email Configurations
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Test Email Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Send Test Email
            </DialogTitle>
            <DialogDescription>
              Dispatches a test email using your currently saved SMTP settings to verify server connectivity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Recipient Email Address</Label>
              <Input 
                type="email" 
                placeholder="name@company.com" 
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => testEmail && testMutation.mutate(testEmail)}
              disabled={!testEmail || testMutation.isPending}
            >
              {testMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Test Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Template Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" /> Template Live HTML Preview
              </span>
              <Select value={selectedTemplate} onValueChange={handlePreviewTemplate}>
                <SelectTrigger className="w-56 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES_LIST.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DialogTitle>
            {previewData?.subject && (
              <DialogDescription className="text-xs font-mono pt-1 text-foreground">
                <strong>Subject:</strong> {previewData.subject}
              </DialogDescription>
            )}
          </DialogHeader>

          {loadingPreview ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : previewData?.html ? (
            <div className="border rounded-xl p-4 bg-muted/20 my-2 overflow-x-auto">
              <iframe 
                srcDoc={previewData.html} 
                className="w-full h-[500px] border-none rounded-lg bg-white"
                title="Email Preview"
              />
            </div>
          ) : (
            <p className="text-center py-8 text-sm text-muted-foreground">Select a template to view preview.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewModalOpen(false)}>Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
