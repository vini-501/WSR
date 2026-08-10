import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Save, Loader2, Key, Sliders, CalendarClock, ShieldCheck } from "lucide-react";

export function AiSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<any>({
    enabled: true,
    provider: "openai",
    api_key: "",
    model: "gpt-4o",
    summary_length: "standard",
    tone: "executive",
    auto_schedule: "weekly_digest",
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => customFetch<any>("/api/ai/settings"),
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        enabled: settings.enabled ?? true,
        provider: settings.provider || "openai",
        api_key: settings.api_key || "",
        model: settings.model || "gpt-4o",
        summary_length: settings.summary_length || "standard",
        tone: settings.tone || "executive",
        auto_schedule: settings.auto_schedule || "weekly_digest",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => customFetch("/api/ai/settings", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: "AI Settings Saved", description: "AI engine parameters updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message || "Failed to save AI settings", variant: "destructive" });
    },
  });

  const handleProviderChange = (provider: string) => {
    let model = formData.model;
    if (provider === "openai") model = "gpt-4o";
    else if (provider === "gemini") model = "gemini-1.5-pro";
    else if (provider === "anthropic") model = "claude-3-5-sonnet";

    setFormData({ ...formData, provider, model });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-2 animate-in fade-in duration-300">
      <form onSubmit={handleSubmit}>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <Brain className="h-8 w-8 text-primary" /> AI Engine Settings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure LLM providers, API keys, synthesis tone, summary length, and automatic generation schedules.
            </p>
          </div>

          <Button type="submit" disabled={saveMutation.isPending} className="h-10 text-xs shadow-sm">
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save AI Settings
          </Button>
        </div>

        {/* Global Switch Banner */}
        <Card className={`border shadow-sm mb-6 ${formData.enabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${formData.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Global AI Summary Engine</h3>
                <p className="text-xs text-muted-foreground">
                  {formData.enabled ? "Automated AI business synthesis & health scoring are ACTIVE." : "Global AI summary generation is currently DISABLED."}
                </p>
              </div>
            </div>
            <Switch
              checked={formData.enabled}
              onCheckedChange={(val) => setFormData({ ...formData, enabled: val })}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LLM Provider Configuration */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">LLM Provider & Credentials</CardTitle>
                <CardDescription className="text-xs">Select AI vendor and manage API credentials securely.</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">AI Provider</Label>
                <Select value={formData.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                    <SelectItem value="gemini">Google Gemini (1.5 Pro)</SelectItem>
                    <SelectItem value="anthropic">Anthropic Claude (3.5 Sonnet)</SelectItem>
                    <SelectItem value="custom">Custom Endpoint (OpenAI Compatible)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Model Selection</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="gpt-4o"
                />
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-sm font-medium">API Key</Label>
                <Input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="sk-proj-..."
                />
                <p className="text-[11px] text-muted-foreground">
                  API key is encrypted. If left empty, system runs on zero-cost built-in analytical engine.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Synthesis Tone & Output Settings */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-muted/30">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Synthesis Tone & Schedule</CardTitle>
                <CardDescription className="text-xs">Customize executive summary style and generation timing.</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Executive Tone</Label>
                  <Select value={formData.tone} onValueChange={(v) => setFormData({ ...formData, tone: v })}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive">Executive (High Level)</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="technical">Technical & Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Summary Length</Label>
                  <Select value={formData.summary_length} onValueChange={(v) => setFormData({ ...formData, summary_length: v })}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise (Bullet Points)</SelectItem>
                      <SelectItem value="standard">Standard (Balanced)</SelectItem>
                      <SelectItem value="detailed">Detailed Brief</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-muted/20">
                <Label className="text-sm font-medium">Generation Schedule</Label>
                <Select value={formData.auto_schedule} onValueChange={(v) => setFormData({ ...formData, auto_schedule: v })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly_digest">Weekly Digest Trigger</SelectItem>
                    <SelectItem value="on_submit">On WCR Completion</SelectItem>
                    <SelectItem value="manual">Manual Trigger Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending} className="h-11 px-8 shadow-sm">
            {saveMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Save AI Engine Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
