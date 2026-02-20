import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Trash2, Save, Send, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import CSVUploader from "@/components/CSVUploader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lead {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  [key: string]: any;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  template_type: 'marketing' | 'transactional' | 'newsletter' | 'followup';
  contentType?: 'html' | 'text';
}

interface Campaign {
  id: number;
  userId: number;
  name: string;
  subject: string;
  template: any;
  leads: Lead[];
  status: string;
  createdAt: string;
  scheduledAt?: string;
  settings?: any;
  followupSettings?: any;
  sentCount?: number;
  openedCount?: number;
  clickedCount?: number;
  bouncedCount?: number;
  totalRecipients?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDbDatetime(localVal: string): string {
  if (!localVal) return "";
  return localVal.replace("T", " ") + ":00";
}

function formatDisplay(dt: string | undefined): string {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function localDatetimeMin(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeJsonParse<T = any>(s: string | null, fallback: T): T {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * ✅ FIX: Case-insensitive field getter for lead objects
 * CSV columns like "Name", "NAME", "name" sab handle karta hai
 */
function getLeadField(lead: Lead, ...fieldNames: string[]): string {
  if (!lead || typeof lead !== "object") return "";
  const keys = Object.keys(lead);
  for (const field of fieldNames) {
    // Exact match first
    if (typeof lead[field] === "string" && lead[field].trim()) return lead[field].trim();
    // Case-insensitive match
    const found = keys.find(k => k.toLowerCase() === field.toLowerCase());
    if (found && typeof lead[found] === "string" && lead[found].trim()) return lead[found].trim();
  }
  return "";
}

/**
 * ✅ FIX: Extract name from lead — handles Name, name, NAME, firstName+lastName
 */
function extractLeadName(lead: Lead): string {
  // Try "name" / "Name" / "NAME"
  const name = getLeadField(lead, "name");
  if (name) return name;

  // Try firstName + lastName combo
  const first = getLeadField(lead, "firstName", "first_name", "First Name", "FirstName");
  const last = getLeadField(lead, "lastName", "last_name", "Last Name", "LastName");
  const full = `${first} ${last}`.trim();
  return full || "-";
}

/**
 * ✅ FIX: Extract email — handles "Email", "email", "EMAIL"
 */
function extractLeadEmail(lead: Lead): string {
  return getLeadField(lead, "email", "Email", "EMAIL") || lead.email || "";
}

/**
 * ✅ FIX: Extract company — handles "Company", "company", "COMPANY"
 */
function extractLeadCompany(lead: Lead): string {
  return getLeadField(lead, "company", "Company", "COMPANY") || "-";
}

// ─── Component ───────────────────────────────────────────────────────────────

const CampaignPage = () => {
  const [campaignName, setCampaignName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [showLeadsDialog, setShowLeadsDialog] = useState(false);

  // Campaign settings
  const [timezone, setTimezone] = useState('UTC');
  const [sendingHours, setSendingHours] = useState({ from: '09:00', to: '17:00' });
  const [abTesting, setAbTesting] = useState(false);
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(200);
  const [maxLevel, setMaxLevel] = useState(100);

  // Follow-up settings
  const [followupEnabled, setFollowupEnabled] = useState(false);
  const [followupTemplate, setFollowupTemplate] = useState<EmailTemplate | null>(null);
  const [followupSubject, setFollowupSubject] = useState('Follow-up: Your previous email');
  const [followupDelayHours, setFollowupDelayHours] = useState(0.083);
  const [followupCondition, setFollowupCondition] = useState<'not_opened' | 'not_clicked' | 'always' | 'no_reply'>('not_opened');

  // Pagination / search
  const [scheduleAt, setScheduleAt] = useState('');
  const [sendingCampaignId, setSendingCampaignId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const PAGE_SIZE = 10;

  const getCurrentUserId = () => {
    const user = safeJsonParse<{ id?: number }>(localStorage.getItem('user'), {});
    return toNum(user?.id) ?? 1;
  };

  const userId = getCurrentUserId();
  const navigate = useNavigate();

  // ─── API Calls ──────────────────────────────────────────────────────────────

  const loadEmailTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/email-templates?userId=${userId}`);
      const data = await res.json();
      const templatesFromApi = Array.isArray(data.data) ? data.data : data.data?.templates || [];
      if (templatesFromApi.length === 0) setErrors(["No email templates found in database"]);
      setTemplates(templatesFromApi);
      if (!selectedTemplate && templatesFromApi.length > 0) setSelectedTemplate(templatesFromApi[0]);
    } catch (err) {
      console.error(err);
      setErrors(["Failed to load email templates"]);
    }
  };

  useEffect(() => {
    loadEmailTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true);
    setErrors([]);
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns?userId=${userId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        const backendCampaigns: Campaign[] = (data.data || [])
          .map((c: any) => {
            const idNum = toNum(c.id);
            if (!idNum) return null;
            return {
              id: idNum,
              userId: toNum(c.userId) ?? userId,
              name: c.name,
              subject: c.subject,
              template: c.template,
              leads: c.leads || [],
              status: c.status,
              createdAt: c.createdAt,
              scheduledAt: c.scheduledAt,
              settings: c.settings,
              followupSettings: c.followupSettings,
              sentCount: c.sentCount,
              openedCount: c.openedCount,
              clickedCount: c.clickedCount,
              bouncedCount: c.bouncedCount,
              totalRecipients: c.totalRecipients,
            } as Campaign;
          })
          .filter(Boolean);
        setCampaigns(backendCampaigns);
      } else {
        setErrors([data.message || 'Failed to load campaigns']);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setErrors([`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setCampaigns([]);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleLeadsUploaded = (uploadedLeads: Lead[]) => {
    setLeads(prevLeads => {
      const combined = [...prevLeads, ...uploadedLeads];
      return combined.filter((lead, index, self) =>
        index === self.findIndex(l => extractLeadEmail(l) === extractLeadEmail(lead))
      );
    });
  };

  const handleClearAllLeads = () => {
    setLeads([]);
    setShowLeadsDialog(false);
    setSuccessMessage("All leads cleared");
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  const handleCreateCampaign = async () => {
    setErrors([]);
    if (!campaignName.trim()) { setErrors(['Campaign name is required']); return; }
    if (!emailSubject.trim()) { setErrors(['Email subject is required']); return; }
    if (!selectedTemplate) { setErrors(['Please select an email template']); return; }
    if (leads.length === 0) { setErrors(['Please upload leads before creating a campaign']); return; }
    if (followupEnabled && !followupTemplate) { setErrors(['Please select a follow-up template when follow-up is enabled']); return; }

    try {
      const campaignData = {
        userId,
        name: campaignName,
        subject: emailSubject,
        templateId: selectedTemplate.id,
        template: selectedTemplate,
        leads,
        runAt: scheduleAt ? toDbDatetime(scheduleAt) : null,
        settings: { timezone, sendingHours, abTesting, delayBetweenEmails, maxLevel },
        followupSettings: followupEnabled ? {
          enabled: followupEnabled,
          templateId: followupTemplate?.id,
          template: followupTemplate,
          subject: followupSubject,
          delayHours: followupDelayHours,
          condition: followupCondition
        } : undefined
      };

      const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });

      const raw = await response.text();
      const data = safeJsonParse<any>(raw, null);

      if (!response.ok) throw new Error(data?.message || `HTTP error! status: ${response.status}`);

      if (data?.success) {
        const newId = toNum(data.campaignId);
        if (!newId) throw new Error("Campaign created but invalid campaignId returned from API");

        setCurrentCampaign({
          id: newId,
          userId,
          name: campaignName,
          subject: emailSubject,
          template: selectedTemplate,
          leads,
          status: scheduleAt ? 'scheduled' : 'draft',
          createdAt: new Date().toISOString(),
          settings: campaignData.settings,
          followupSettings: campaignData.followupSettings
        });

        await loadCampaigns();
        setSuccessMessage(
          scheduleAt
            ? `Campaign scheduled for ${formatDisplay(toDbDatetime(scheduleAt))}`
            : 'Campaign saved to database successfully!'
        );
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrors([data?.message || 'Failed to save campaign']);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      setErrors([`Failed to save to database: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  const handleSendCampaign = async (campaign: Campaign) => {
    try {
      const safeId = toNum(campaign?.id);
      if (!safeId) { setErrors([`Invalid campaign ID: ${String(campaign?.id)}`]); return; }

      setSendingCampaignId(safeId);
      setIsSending(true);
      setErrors([]);

      const res = await fetch(`${API_BASE_URL}/api/campaigns/${safeId}/send`, { method: "POST" });
      const raw = await res.text();
      const data = safeJsonParse<any>(raw, null);

      if (!res.ok) throw new Error(data?.message || raw || `Send failed (HTTP ${res.status})`);
      if (!data?.success) throw new Error(data?.message || "Send failed");

      await loadCampaigns();
      setSuccessMessage(`Campaign "${campaign.name}" sent successfully (${data.sentCount})`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Send failed"]);
    } finally {
      setIsSending(false);
      setSendingCampaignId(null);
      setSendingProgress(0);
    }
  };

  const handlePreview = () => {
    if (!selectedTemplate) { setErrors(['Please select an email template to preview']); return; }
    const dlg = document.getElementById('preview-modal') as HTMLDialogElement | null;
    if (dlg && typeof dlg.showModal === "function") dlg.showModal();
  };

  const handleDeleteCampaign = async (campaignId: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    const safeId = toNum(campaignId);
    if (!safeId) { setErrors([`Invalid campaign ID: ${String(campaignId)}`]); return; }

    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${safeId}`, { method: 'DELETE' });
      const raw = await response.text();
      const data = safeJsonParse<any>(raw, null);
      if (!response.ok) throw new Error(data?.message || raw || `Delete failed (HTTP ${response.status})`);
      if (data?.success) {
        await loadCampaigns();
        setSuccessMessage('Campaign deleted');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors([data?.message || 'Failed to delete campaign']);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setErrors([`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  // ─── Derived State ──────────────────────────────────────────────────────────

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedCampaigns = filteredCampaigns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(filteredCampaigns.length / PAGE_SIZE);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <header className="bg-card shadow-sm border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">Campaign Management</h2>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handlePreview} disabled={!selectedTemplate}>
              <Eye className="mr-2 h-4 w-4" /> Preview
            </Button>
            <Button
              onClick={handleCreateCampaign}
              disabled={!selectedTemplate || leads.length === 0 || !campaignName.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              {scheduleAt ? 'Schedule Campaign' : 'Save Campaign'}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Preview Modal ─────────────────────────────────────────────────────── */}
      <dialog id="preview-modal" className="rounded-lg backdrop:bg-black/30 p-0 w-full max-w-2xl">
        <div className="bg-card rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">Email Preview</h3>
            <div className="flex gap-2">
              <Button size="sm" variant={previewMode === "desktop" ? "default" : "outline"} onClick={() => setPreviewMode("desktop")}>Desktop</Button>
              <Button size="sm" variant={previewMode === "mobile" ? "default" : "outline"} onClick={() => setPreviewMode("mobile")}>Mobile</Button>
              <button
                className="ml-4 text-muted-foreground hover:text-foreground"
                onClick={() => (document.getElementById('preview-modal') as HTMLDialogElement)?.close()}
              >✕</button>
            </div>
          </div>
          <div className={previewMode === 'mobile' ? 'mx-auto w-80 border rounded-lg p-4 bg-muted' : 'border rounded p-6 bg-muted'}>
            {selectedTemplate ? (
              <>
                <div className="text-xs text-muted-foreground mb-2">{emailSubject || selectedTemplate.subject}</div>
                <div className="font-bold mb-2">{selectedTemplate.name}</div>
                <div className="text-foreground">
                  {selectedTemplate.contentType === 'html'
                    ? <div dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
                    : <div style={{ whiteSpace: 'pre-wrap' }}>{selectedTemplate.content}</div>
                  }
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">No template selected</div>
            )}
          </div>
        </div>
      </dialog>

      {/* ── Show Leads Dialog ─────────────────────────────────────────────────── */}
      <dialog
        open={showLeadsDialog}
        className="rounded-lg backdrop:bg-black/30 p-0 w-full max-w-3xl"
        onClose={() => setShowLeadsDialog(false)}
      >
        <div className="bg-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Uploaded Leads ({leads.length})</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLeadsDialog(false)}>Close</Button>
              <Button variant="destructive" onClick={handleClearAllLeads} disabled={leads.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear All
              </Button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No leads uploaded
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((l, i) => (
                    <TableRow key={`${extractLeadEmail(l)}-${i}`}>
                      <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                      {/* ✅ FIX: extractLeadEmail — handles "Email", "email", "EMAIL" */}
                      <TableCell className="font-mono text-sm">{extractLeadEmail(l)}</TableCell>
                      {/* ✅ FIX: extractLeadName — handles "Name", "name", "firstName+lastName" */}
                      <TableCell>{extractLeadName(l)}</TableCell>
                      {/* ✅ FIX: extractLeadCompany — handles "Company", "company" */}
                      <TableCell>{extractLeadCompany(l)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </dialog>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <main className="p-6">
        {errors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.map((e, i) => <div key={i}>{e}</div>)}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">{successMessage}</AlertDescription>
          </Alert>
        )}

        {isSending && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-primary">Sending Campaign...</span>
                <span className="text-sm text-primary">{sendingProgress}%</span>
              </div>
              <Progress value={sendingProgress} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Campaign Setup ──────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Campaign Setup</CardTitle></CardHeader>
              <CardContent className="space-y-4">

                <div>
                  <Label>Campaign Name *</Label>
                  <Input placeholder="Enter campaign name" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
                </div>

                <div>
                  <Label>Email Subject *</Label>
                  <Input placeholder="Enter email subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                </div>

                <div>
                  <Label>Email Template *</Label>
                  <Select
                    value={selectedTemplate?.id.toString()}
                    onValueChange={value => {
                      const t = templates.find(t => t.id.toString() === value);
                      if (t) setSelectedTemplate(t);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Schedule At (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={e => setScheduleAt(e.target.value)}
                    min={localDatetimeMin()}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {scheduleAt
                      ? `Will be sent at ${formatDisplay(toDbDatetime(scheduleAt))}`
                      : 'Leave empty to save as draft and send manually'}
                  </p>
                </div>

                {/* ── Upload Leads ─────────────────────────────────────────────── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="m-0">Upload Leads (CSV) *</Label>
                      <Badge variant="secondary">{leads.length} leads</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowLeadsDialog(true)}
                        disabled={leads.length === 0}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Show Leads
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleClearAllLeads}
                        disabled={leads.length === 0}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <CSVUploader onLeadsUploaded={handleLeadsUploaded} existingLeads={leads} />
                </div>

                {currentCampaign && (
                  <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-green-800 dark:text-green-200">{currentCampaign.name}</h4>
                        <p className="text-sm text-green-600 dark:text-green-300">
                          {currentCampaign.leads?.length || 0} leads • {currentCampaign.status}
                        </p>
                      </div>
                      <Badge>{currentCampaign.status}</Badge>
                    </CardContent>
                  </Card>
                )}

              </CardContent>
            </Card>
          </div>

          {/* ── Right: Settings ───────────────────────────────────────────────── */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">

                <div className="space-y-2">
                  <Label>Time Zone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">EST</SelectItem>
                      <SelectItem value="PST">PST</SelectItem>
                      <SelectItem value="GMT">GMT</SelectItem>
                      <SelectItem value="IST">IST (India)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sending Hours</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm">From</Label>
                      <Input type="time" value={sendingHours.from} onChange={e => setSendingHours(p => ({ ...p, from: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-sm">To</Label>
                      <Input type="time" value={sendingHours.to} onChange={e => setSendingHours(p => ({ ...p, to: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>A/B Testing</Label>
                  <Switch checked={abTesting} onCheckedChange={setAbTesting} />
                </div>

                <div className="space-y-2">
                  <Label>Delay Between Emails (ms)</Label>
                  <Input type="number" value={delayBetweenEmails} onChange={e => setDelayBetweenEmails(parseInt(e.target.value) || 200)} min="100" max="5000" />
                </div>

                <div className="space-y-2">
                  <Label>Max Level (Per Sender)</Label>
                  <Input type="number" value={maxLevel} onChange={e => setMaxLevel(parseInt(e.target.value) || 100)} min="1" max="1000" placeholder="Emails per sender per round" />
                  <p className="text-xs text-muted-foreground">Maximum number of emails to send per sender in each round</p>
                </div>

                {/* ── Follow-up ─────────────────────────────────────────────────── */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Follow-up Email</Label>
                    <Switch checked={followupEnabled} onCheckedChange={setFollowupEnabled} />
                  </div>

                  {followupEnabled && (
                    <div className="space-y-4">
                      <div>
                        <Label>Follow-up Template</Label>
                        <Select
                          value={followupTemplate?.id ? String(followupTemplate.id) : undefined}
                          onValueChange={value => {
                            const t = templates.find(t => t.id.toString() === value);
                            if (t) setFollowupTemplate(t);
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Select follow-up template" /></SelectTrigger>
                          <SelectContent>
                            {templates.map(t => (
                              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Follow-up Subject</Label>
                        <Input value={followupSubject} onChange={e => setFollowupSubject(e.target.value)} />
                      </div>

                      <div>
                        <Label>Send After (hours)</Label>
                        <Input type="number" step="0.01" value={followupDelayHours} onChange={e => setFollowupDelayHours(parseFloat(e.target.value) || 0.083)} min="0.01" max="168" />
                      </div>

                      <div>
                        <Label>Send If</Label>
                        <Select value={followupCondition} onValueChange={v => setFollowupCondition(v as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_opened">Original email not opened</SelectItem>
                            <SelectItem value="not_clicked">Original email not clicked</SelectItem>
                            <SelectItem value="always">Always send follow-up</SelectItem>
                            <SelectItem value="no_reply">No reply received</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Campaign Table ────────────────────────────────────────────────────── */}
        <div className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Database Campaigns</CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-64"
                />
                <Button size="sm" variant="outline" onClick={loadCampaigns} disabled={isLoadingCampaigns}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCampaigns ? "animate-spin" : ""}`} /> Reload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCampaigns ? (
                <div className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading from database...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No campaigns in database</div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Scheduled At</TableHead>
                          <TableHead className="text-center">Recipients</TableHead>
                          <TableHead className="text-center">Sent</TableHead>
                          <TableHead className="text-center">Opened</TableHead>
                          <TableHead className="text-center">Clicked</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedCampaigns.map(c => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <p className="font-medium">{c.name}</p>
                              <p className="text-sm text-muted-foreground">{c.subject}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                c.status === 'sent' ? 'default' :
                                c.status === 'scheduled' ? 'secondary' :
                                c.status === 'sending' ? 'destructive' : 'outline'
                              }>
                                {c.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {c.scheduledAt
                                ? <span className="text-sm">{formatDisplay(c.scheduledAt)}</span>
                                : <span className="text-muted-foreground text-sm">-</span>
                              }
                            </TableCell>
                            <TableCell className="text-center">{c.totalRecipients ?? c.leads?.length ?? 0}</TableCell>
                            <TableCell className="text-center">{c.sentCount ?? 0}</TableCell>
                            <TableCell className="text-center">{c.openedCount ?? 0}</TableCell>
                            <TableCell className="text-center">{c.clickedCount ?? 0}</TableCell>
                            <TableCell>{new Date(c.createdAt).toLocaleDateString("en-IN")}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {(c.status === 'draft' || c.status === 'scheduled') && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSendCampaign(c)}
                                    disabled={isSending && sendingCampaignId === c.id}
                                    title="Send now"
                                    className="text-primary hover:text-primary"
                                  >
                                    {isSending && sendingCampaignId === c.id
                                      ? <Loader2 className="h-4 w-4 animate-spin" />
                                      : <Send className="h-4 w-4" />
                                    }
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/campaign-result/${c.id}`)} title="View results">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteCampaign(c.id)} disabled={c.status === "sending"} title="Delete">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, filteredCampaigns.length)} of {filteredCampaigns.length} campaigns
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <Button key={page} size="sm" variant={currentPage === page ? 'default' : 'outline'} onClick={() => setCurrentPage(page)} className="min-w-10">
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default CampaignPage;