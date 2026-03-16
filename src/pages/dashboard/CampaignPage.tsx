import React, { useEffect, useState } from "react";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useHeaderActions } from "@/components/Header";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Follow-up types ──────────────────────────────────────────────────────────
type FollowUpCondition = "not_opened" | "not_clicked" | "always" | "no_reply";
type FollowUpStep = {
  id?: number;
  followup_order: number;
  delay_days: number;
  send_condition: FollowUpCondition;
  content: string;
};
const CONDITION_LABELS: Record<FollowUpCondition, string> = {
  not_opened: "Not Opened", not_clicked: "Not Clicked",
  always: "Always",         no_reply: "No Reply",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lead {
  email: string; name?: string; firstName?: string; lastName?: string;
  company?: string; [key: string]: any;
}
interface EmailTemplate {
  id: number; name: string; subject: string; content: string;
  template_type: 'marketing' | 'transactional' | 'newsletter' | 'followup';
  contentType?: 'html' | 'text';
  followups?: FollowUpStep[];
}
interface Campaign {
  id: number; userId: number; name: string; subject: string; template: any;
  leads: Lead[]; status: string; createdAt: string; scheduledAt?: string;
  settings?: any; followupSettings?: any;
  sentCount?: number; openedCount?: number; clickedCount?: number;
  bouncedCount?: number; totalRecipients?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert datetime-local input value to DB string (IST as-is, no UTC conversion)
 * Input:  "2026-03-16T14:21"
 * Output: "2026-03-16 14:21:00"
 */
function toDbDatetime(v: string): string {
  if (!v) return "";
  return v.replace("T", " ") + ":00";
}

/**
 * Display IST time correctly — handles 2 cases from MySQL/Node.js driver:
 *
 * Case A — UTC ISO string (MySQL driver auto-converts DATETIME to JS Date):
 *   "2026-03-16T09:32:00.000Z"  → add +5:30 → show 3:02 pm IST ✅
 *
 * Case B — Plain IST string (stored/returned as string):
 *   "2026-03-16 15:02:00"  → use directly as IST ✅
 */
function formatDisplay(dt?: string | Date): string {
  if (!dt) return "-";

  const raw = String(dt).trim();
  const p   = (n: number) => String(n).padStart(2, "0");

  // Case A: has Z or +offset → it's UTC, add IST offset to convert
  if (raw.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(raw)) {
    const istMs   = new Date(raw).getTime() + 5.5 * 60 * 60 * 1000;
    const istDate = new Date(istMs);
    const h  = istDate.getUTCHours();
    return `${istDate.getUTCDate()}/${istDate.getUTCMonth() + 1}/${istDate.getUTCFullYear()}, ${h % 12 || 12}:${p(istDate.getUTCMinutes())} ${h >= 12 ? "pm" : "am"}`;
  }

  // Case B: plain IST string "2026-03-16 15:02:00" — use as-is
  const s          = raw.replace("T", " ").replace(/\.\d+$/, "");
  const [dp = "", tp = ""] = s.split(" ");
  const [y = "", mo = "", d = ""] = dp.split("-");
  const ts = tp.split(":");
  const h  = parseInt(ts[0] || "0", 10);
  const mi = ts[1] || "00";
  return `${parseInt(d)}/${parseInt(mo)}/${y}, ${h % 12 || 12}:${mi} ${h >= 12 ? "pm" : "am"}`;
}

/**
 * Min value for datetime-local input — current IST time
 * Works correctly on both local (IST) and production (UTC) servers
 * because we use IST offset manually
 */
function localDatetimeMin(): string {
  // Get current IST time regardless of server timezone
  const nowUTC = Date.now();
  const istOffset = 5.5 * 60 * 60 * 1000; // +5:30
  const istNow = new Date(nowUTC + istOffset);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${istNow.getUTCFullYear()}-${p(istNow.getUTCMonth() + 1)}-${p(istNow.getUTCDate())}T${p(istNow.getUTCHours())}:${p(istNow.getUTCMinutes())}`;
}

function toNum(v: any): number | null { const n = Number(v); return Number.isFinite(n) ? n : null; }

function safeJsonParse<T = any>(s: string | null, fallback: T): T {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
}

function getLeadField(lead: Lead, ...fields: string[]): string {
  if (!lead || typeof lead !== "object") return "";
  const keys = Object.keys(lead);
  for (const f of fields) {
    if (typeof lead[f] === "string" && lead[f].trim()) return lead[f].trim();
    const found = keys.find(k => k.toLowerCase() === f.toLowerCase());
    if (found && typeof lead[found] === "string" && lead[found].trim()) return lead[found].trim();
  }
  return "";
}
function extractLeadName(lead: Lead): string {
  const name = getLeadField(lead, "name");
  if (name) return name;
  const first = getLeadField(lead, "firstName", "first_name", "First Name");
  const last  = getLeadField(lead, "lastName",  "last_name",  "Last Name");
  return `${first} ${last}`.trim() || "-";
}
function extractLeadEmail(lead: Lead): string {
  return getLeadField(lead, "email", "Email", "EMAIL") || lead.email || "";
}
function extractLeadCompany(lead: Lead): string {
  return getLeadField(lead, "company", "Company", "COMPANY") || "-";
}

// ─── Component ────────────────────────────────────────────────────────────────
const CampaignPage = () => {
  const { setHeaderActions } = useHeaderActions();

  const [campaignName,       setCampaignName]       = useState('');
  const [selectedTemplate,   setSelectedTemplate]   = useState<EmailTemplate | null>(null);
  const [leads,              setLeads]              = useState<Lead[]>([]);
  const [isSending,          setIsSending]          = useState(false);
  const [sendingProgress,    setSendingProgress]    = useState(0);
  const [previewMode,        setPreviewMode]        = useState<"desktop" | "mobile">("desktop");
  const [templates,          setTemplates]          = useState<EmailTemplate[]>([]);
  const [currentCampaign,    setCurrentCampaign]    = useState<Campaign | null>(null);
  const [campaigns,          setCampaigns]          = useState<Campaign[]>([]);
  const [errors,             setErrors]             = useState<string[]>([]);
  const [successMessage,     setSuccessMessage]     = useState('');
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [showLeadsDialog,    setShowLeadsDialog]    = useState(false);

  // ✅ Default timezone = IST
  const [timezone,           setTimezone]           = useState('IST');
  const [sendingHours,       setSendingHours]       = useState({ from: '09:00', to: '17:00' });

  const [abTesting,          setAbTesting]          = useState(false);
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(200);
  const [maxLevel,           setMaxLevel]           = useState(100);
  const [followupEnabled,    setFollowupEnabled]    = useState(false);
  const [scheduleAt,         setScheduleAt]         = useState('');
  const [sendingCampaignId,  setSendingCampaignId]  = useState<number | null>(null);
  const [currentPage,        setCurrentPage]        = useState(1);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [inboxEmails,        setInboxEmails]        = useState<{ id: number; from_name: string; from_email: string }[]>([]);
  const [selectedInboxIds,   setSelectedInboxIds]   = useState<number[]>([]);
  const [inboxDropdownOpen,  setInboxDropdownOpen]  = useState(false);
  const PAGE_SIZE = 10;

  // ── Auto-sync sending hours from scheduleAt ────────────────────────────────
  // scheduleAt = "2026-03-16T14:21" (IST time picked by user)
  // From = that time, To = +8 hours
  useEffect(() => {
    if (!scheduleAt) return;
    // Parse the datetime-local value as IST
    // "2026-03-16T14:21" split to get hours/minutes directly
    const timePart = scheduleAt.split("T")[1] || "09:00";
    const [hStr, mStr] = timePart.split(":");
    const fromH = parseInt(hStr, 10);
    const fromM = parseInt(mStr, 10);
    const p = (n: number) => String(n).padStart(2, "0");

    const toTotalMins = fromH * 60 + fromM + 8 * 60;
    const toH = Math.floor(toTotalMins / 60) % 24;
    const toM = toTotalMins % 60;

    setSendingHours({ from: `${p(fromH)}:${p(fromM)}`, to: `${p(toH)}:${p(toM)}` });
  }, [scheduleAt]);

  const userId = (() => {
    const u = safeJsonParse<{ id?: number }>(localStorage.getItem('user'), {});
    return toNum(u?.id) ?? 1;
  })();
  const navigate = useNavigate();

  const templateFollowups: FollowUpStep[] = selectedTemplate?.followups || [];

  // ── API calls ──────────────────────────────────────────────────────────────
  const loadEmailTemplates = async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/api/email-templates?userId=${userId}`);
      const data = await res.json();
      const list: EmailTemplate[] = Array.isArray(data.data) ? data.data : data.data?.templates || [];
      if (list.length === 0) setErrors(["No email templates found"]);
      setTemplates(list);
      if (!selectedTemplate && list.length > 0) setSelectedTemplate(list[0]);
    } catch { setErrors(["Failed to load email templates"]); }
  };

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true); setErrors([]);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/campaigns?userId=${userId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setCampaigns((data.data || []).map((c: any) => {
          const id = toNum(c.id); if (!id) return null;
          return {
            id, userId: toNum(c.userId) ?? userId,
            name: c.name, subject: c.subject, template: c.template,
            leads: c.leads || [], status: c.status,
            createdAt: c.createdAt, scheduledAt: c.scheduledAt,
            settings: c.settings, followupSettings: c.followupSettings,
            sentCount: c.sentCount, openedCount: c.openedCount,
            clickedCount: c.clickedCount, bouncedCount: c.bouncedCount,
            totalRecipients: c.totalRecipients,
          } as Campaign;
        }).filter(Boolean));
      } else setErrors([data.message || 'Failed to load campaigns']);
    } catch (e) {
      setErrors([`Failed to connect: ${e instanceof Error ? e.message : 'Unknown'}`]);
      setCampaigns([]);
    } finally { setIsLoadingCampaigns(false); }
  };

  const loadInboxEmails = async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/api/emailcamp/details/${userId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setInboxEmails(data.data);
        if (data.data.length > 0) setSelectedInboxIds([data.data[0].id]);
      }
    } catch { setErrors(["Failed to load inbox emails"]); }
  };

  useEffect(() => { loadEmailTemplates(); }, [userId]);
  useEffect(() => { loadCampaigns();       }, [userId]);
  useEffect(() => { loadInboxEmails();     }, [userId]);

  // ── Inject header buttons ──────────────────────────────────────────────────
  useEffect(() => {
    setHeaderActions([
      {
        label:    "Preview",
        variant:  "outline",
        icon:     <Eye className="h-4 w-4" />,
        onClick:  handlePreview,
        disabled: !selectedTemplate,
      },
      {
        label:    scheduleAt ? "Schedule Campaign" : "Save Campaign",
        variant:  "default",
        icon:     <Save className="h-4 w-4" />,
        onClick:  handleCreateCampaign,
        disabled: !selectedTemplate || leads.length === 0 || !campaignName.trim(),
      },
    ]);
  }, [selectedTemplate, leads, campaignName, scheduleAt, followupEnabled]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLeadsUploaded = (uploaded: Lead[]) => {
    setLeads((prev) => {
      const combined = [...prev, ...uploaded];
      return combined.filter((l, i, self) =>
        i === self.findIndex(x => extractLeadEmail(x) === extractLeadEmail(l))
      );
    });
  };

  const handleClearAllLeads = () => {
    setLeads([]); setShowLeadsDialog(false);
    setSuccessMessage("All leads cleared");
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  const handleCreateCampaign = async () => {
    setErrors([]);
    if (!campaignName.trim())              { setErrors(['Campaign name is required']);          return; }
    if (!selectedTemplate)                 { setErrors(['Please select an email template']);    return; }
    if (!selectedTemplate.subject?.trim()) { setErrors(['Selected template has no subject']);   return; }
    if (leads.length === 0)                { setErrors(['Please upload leads']);                return; }
    if (selectedInboxIds.length === 0)     { setErrors(['Please select at least one inbox email']); return; }

    try {
      const campaignData = {
        userId,
        name:       campaignName,
        subject:    selectedTemplate.subject,
        templateId: selectedTemplate.id,
        template:   selectedTemplate,
        leads,
        inboxAccountId: selectedInboxIds.join(','),
        // ✅ Send IST datetime string as-is (no UTC conversion)
        runAt: scheduleAt ? toDbDatetime(scheduleAt) : null,
        settings: { timezone, sendingHours, abTesting, delayBetweenEmails, maxLevel },
        followupSettings: followupEnabled
          ? {
              enabled:    true,
              steps:      templateFollowups,
              templateId: selectedTemplate.id,
              subject:    selectedTemplate.subject,
              delayHours: templateFollowups.length > 0 ? (templateFollowups[0].delay_days ?? 1) * 24 : 24,
              condition:  templateFollowups.length > 0 ? templateFollowups[0].send_condition : 'not_opened',
            }
          : undefined,
      };

      const res  = await fetch(`${API_BASE_URL}/api/campaigns`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
      const data = safeJsonParse<any>(await res.text(), null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      if (data?.success) {
        const newId = toNum(data.campaignId);
        if (!newId) throw new Error("Invalid campaignId returned");
        setCurrentCampaign({
          id: newId, userId, name: campaignName,
          subject: selectedTemplate.subject, template: selectedTemplate,
          leads, status: scheduleAt ? 'scheduled' : 'draft',
          createdAt: new Date().toISOString(),
          settings: campaignData.settings,
          followupSettings: campaignData.followupSettings,
        });
        await loadCampaigns();
        // ✅ Show IST time in success message
        setSuccessMessage(scheduleAt
          ? `Scheduled for ${formatDisplay(toDbDatetime(scheduleAt))}`
          : 'Campaign saved successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
      } else setErrors([data?.message || 'Failed to save campaign']);
    } catch (e) {
      setErrors([`Failed to save: ${e instanceof Error ? e.message : 'Unknown'}`]);
    }
  };

  const handleSendCampaign = async (campaign: Campaign) => {
    const safeId = toNum(campaign?.id);
    if (!safeId) { setErrors(["Invalid campaign ID"]); return; }
    setSendingCampaignId(safeId); setIsSending(true); setErrors([]);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/campaigns/${safeId}/send`, {
        method: "POST", headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inboxAccountId: selectedInboxIds.join(',') }),
      });
      const data = safeJsonParse<any>(await res.text(), null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      if (!data?.success) throw new Error(data?.message || "Send failed");
      await loadCampaigns();
      setSuccessMessage(`Campaign "${campaign.name}" sent (${data.sentCount})`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e) { setErrors([e instanceof Error ? e.message : "Send failed"]); }
    finally { setIsSending(false); setSendingCampaignId(null); setSendingProgress(0); }
  };

  const handlePreview = () => {
    if (!selectedTemplate) { setErrors(['Please select a template']); return; }
    (document.getElementById('preview-modal') as HTMLDialogElement)?.showModal?.();
  };

  const handleDeleteCampaign = async (campaignId: number) => {
    if (!confirm('Delete this campaign?')) return;
    const safeId = toNum(campaignId);
    if (!safeId) { setErrors(["Invalid ID"]); return; }
    try {
      const res  = await fetch(`${API_BASE_URL}/api/campaigns/${safeId}`, { method: 'DELETE' });
      const data = safeJsonParse<any>(await res.text(), null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      if (data?.success) {
        await loadCampaigns();
        setSuccessMessage('Deleted');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else setErrors([data?.message || 'Failed']);
    } catch (e) { setErrors([`Delete failed: ${e instanceof Error ? e.message : 'Unknown'}`]); }
  };

  const filtered  = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Preview Modal */}
      <dialog id="preview-modal" className="rounded-lg backdrop:bg-black/30 p-0 w-full max-w-2xl">
        <div className="bg-card rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Email Preview</h3>
            <div className="flex gap-2">
              <Button size="sm" variant={previewMode === "desktop" ? "default" : "outline"} onClick={() => setPreviewMode("desktop")}>Desktop</Button>
              <Button size="sm" variant={previewMode === "mobile"  ? "default" : "outline"} onClick={() => setPreviewMode("mobile")}>Mobile</Button>
              <button className="ml-4 text-muted-foreground hover:text-foreground"
                onClick={() => (document.getElementById('preview-modal') as HTMLDialogElement)?.close()}>✕</button>
            </div>
          </div>
          <div className={previewMode === 'mobile' ? 'mx-auto w-80 border rounded-lg p-4 bg-muted' : 'border rounded p-6 bg-muted'}>
            {selectedTemplate ? (
              <>
                <div className="text-xs text-muted-foreground mb-2 font-medium">
                  Subject: {selectedTemplate.subject || "(no subject)"}
                </div>
                <div className="font-bold mb-2">{selectedTemplate.name}</div>
                <div className="text-foreground text-sm">
                  {selectedTemplate.contentType === 'html'
                    ? <div dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
                    : <div style={{ whiteSpace: 'pre-wrap' }}>{selectedTemplate.content}</div>}
                </div>
                {templateFollowups.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-dashed border-purple-200 space-y-2">
                    <p className="text-xs font-semibold text-purple-600">
                      🔁 {templateFollowups.length} Follow-up{templateFollowups.length > 1 ? "s" : ""}:
                    </p>
                    {templateFollowups.map((s, i) => (
                      <div key={i} className="border border-purple-100 rounded p-2 bg-purple-50/50">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center bg-purple-600 text-white rounded-full text-[9px] font-bold">{i + 1}</span>
                          <span className="text-xs text-purple-700 font-medium">
                            After {s.delay_days} day{s.delay_days > 1 ? "s" : ""} · {CONDITION_LABELS[s.send_condition]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 ml-5">{s.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">No template selected</div>
            )}
          </div>
        </div>
      </dialog>

      {/* Leads Dialog */}
      <dialog open={showLeadsDialog} className="rounded-lg backdrop:bg-black/30 p-0 w-full max-w-3xl"
        onClose={() => setShowLeadsDialog(false)}>
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
                  <TableHead>#</TableHead><TableHead>Email</TableHead>
                  <TableHead>Name</TableHead><TableHead>Company</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0
                  ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No leads</TableCell></TableRow>
                  : leads.map((l, i) => (
                    <TableRow key={`${extractLeadEmail(l)}-${i}`}>
                      <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{extractLeadEmail(l)}</TableCell>
                      <TableCell>{extractLeadName(l)}</TableCell>
                      <TableCell>{extractLeadCompany(l)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </dialog>

      {/* Main Content */}
      <main className="p-6 h-[calc(100vh-72px)] overflow-y-auto">
        {errors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.map((e, i) => <div key={i}>{e}</div>)}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}
        {isSending && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-primary">Sending...</span>
                <span className="text-sm text-primary">{sendingProgress}%</span>
              </div>
              <Progress value={sendingProgress} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Campaign Setup ── */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Campaign Setup</CardTitle></CardHeader>
              <CardContent className="space-y-4">

                {/* Campaign Name */}
                <div>
                  <Label>Campaign Name *</Label>
                  <Input placeholder="Enter campaign name" value={campaignName}
                    onChange={e => setCampaignName(e.target.value)} />
                </div>

                {/* Email Template */}
                <div>
                  <Label>Email Template *</Label>
                  <Select value={selectedTemplate?.id.toString()}
                    onValueChange={v => {
                      const t = templates.find(t => t.id.toString() === v);
                      if (t) { setSelectedTemplate(t); setFollowupEnabled(false); }
                    }}>
                    <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate?.subject && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Subject: <span className="font-medium text-foreground">{selectedTemplate.subject}</span>
                    </p>
                  )}
                </div>

                {/* Inbox Email */}
                <div>
                  <Label>Send From (Inbox Email) *</Label>
                  <div className="border rounded-md mt-1">
                    <div
                      className="flex flex-wrap gap-1 px-3 py-2 min-h-[40px] cursor-pointer items-center"
                      onClick={() => setInboxDropdownOpen(prev => !prev)}
                    >
                      {selectedInboxIds.length === 0 ? (
                        <span className="text-muted-foreground text-sm flex-1">Select inbox email(s)...</span>
                      ) : (
                        inboxEmails
                          .filter(e => selectedInboxIds.includes(e.id))
                          .map(e => (
                            <span key={e.id} className="flex items-center gap-1 bg-blue-900 text-white text-xs px-2 py-1 rounded-md">
                              {e.from_name ? `${e.from_name} <${e.from_email}>` : e.from_email}
                              <button
                                onClick={ev => {
                                  ev.stopPropagation();
                                  setSelectedInboxIds(prev => prev.filter(id => id !== e.id));
                                }}
                                className="ml-1 text-white hover:text-red-300 font-bold"
                              >×</button>
                            </span>
                          ))
                      )}
                      <span className="ml-auto text-muted-foreground text-xs">{inboxDropdownOpen ? '▲' : '▼'}</span>
                    </div>
                    {inboxDropdownOpen && (
                      <div className="border-t p-3 space-y-2 max-h-48 overflow-y-auto">
                        {inboxEmails.length === 0 ? (
                          <p className="text-xs text-amber-600">⚠️ No inbox emails found. Please add one in Inbox Addition.</p>
                        ) : (
                          inboxEmails.map(email => (
                            <div key={email.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`inbox-${email.id}`}
                                checked={selectedInboxIds.includes(email.id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedInboxIds(prev => [...prev, email.id]);
                                  } else {
                                    setSelectedInboxIds(prev => prev.filter(id => id !== email.id));
                                  }
                                }}
                                className="w-4 h-4 cursor-pointer accent-blue-500"
                              />
                              <label htmlFor={`inbox-${email.id}`} className="text-sm cursor-pointer">
                                {email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule At */}
                <div>
                  <Label>Schedule At — IST (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={e => setScheduleAt(e.target.value)}
                    min={localDatetimeMin()}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {scheduleAt
                      ? `✅ Will send at ${formatDisplay(toDbDatetime(scheduleAt))} IST`
                      : 'Leave empty to save as draft'}
                  </p>
                </div>

                {/* Leads Upload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="m-0">Upload Leads (CSV) *</Label>
                      <Badge variant="secondary">{leads.length} leads</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowLeadsDialog(true)} disabled={leads.length === 0}>
                        <Eye className="mr-2 h-4 w-4" />Show Leads
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleClearAllLeads} disabled={leads.length === 0}>
                        <Trash2 className="mr-2 h-4 w-4" />Clear All
                      </Button>
                    </div>
                  </div>
                  <CSVUploader onLeadsUploaded={handleLeadsUploaded} existingLeads={leads} />
                </div>

                {/* Current Campaign Status */}
                {currentCampaign && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-green-800">{currentCampaign.name}</h4>
                        <p className="text-sm text-green-600">{currentCampaign.leads?.length || 0} leads · {currentCampaign.status}</p>
                      </div>
                      <Badge>{currentCampaign.status}</Badge>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Settings ── */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">

                {/* Time Zone — IST default */}
                <div className="space-y-2">
                  <Label>Time Zone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IST">IST (India) ✅</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">EST</SelectItem>
                      <SelectItem value="PST">PST</SelectItem>
                      <SelectItem value="GMT">GMT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sending Hours — auto-set from scheduleAt */}
                <div className="space-y-2">
                  <Label>Sending Hours (IST)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm">From</Label>
                      <Input type="time" value={sendingHours.from}
                        onChange={e => setSendingHours(p => ({ ...p, from: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-sm">To</Label>
                      <Input type="time" value={sendingHours.to}
                        onChange={e => setSendingHours(p => ({ ...p, to: e.target.value }))} />
                    </div>
                  </div>
                  {scheduleAt && (
                    <p className="text-xs text-blue-600">
                      ℹ️ Auto-set from schedule time (+8 hrs window)
                    </p>
                  )}
                </div>

                {/* A/B Testing */}
                <div className="flex items-center justify-between">
                  <Label>A/B Testing</Label>
                  <Switch checked={abTesting} onCheckedChange={setAbTesting} />
                </div>

                {/* Delay Between Emails */}
                <div className="space-y-2">
                  <Label>Delay Between Emails (ms)</Label>
                  <Input type="number" value={delayBetweenEmails}
                    onChange={e => setDelayBetweenEmails(parseInt(e.target.value) || 200)}
                    min="100" max="5000" />
                </div>

                {/* Max Level */}
                <div className="space-y-2">
                  <Label>Max Level (Per Sender)</Label>
                  <Input type="number" value={maxLevel}
                    onChange={e => setMaxLevel(parseInt(e.target.value) || 100)}
                    min="1" max="1000" />
                  <p className="text-xs text-muted-foreground">Max emails per sender per round</p>
                </div>

                {/* Follow-up Toggle */}
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">Follow-up Emails</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Use sequence from template</p>
                    </div>
                    <Switch checked={followupEnabled} onCheckedChange={setFollowupEnabled} />
                  </div>

                  {followupEnabled ? (
                    <div className="px-3 py-2.5 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                      <p className="text-xs font-semibold text-purple-700">
                        🔁 {templateFollowups.length} step{templateFollowups.length > 1 ? "s" : ""} will run:
                      </p>
                      {templateFollowups.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center bg-purple-200 text-purple-800 rounded-full text-[9px] font-bold">{i + 1}</span>
                          <span className="text-purple-600">After {s.delay_days} day{s.delay_days > 1 ? "s" : ""}</span>
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[9px]">
                            {CONDITION_LABELS[s.send_condition]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-500">
                        ✅ {templateFollowups.length} follow-up{templateFollowups.length > 1 ? "s" : ""} ready. Toggle on to enable.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Campaign Table ── */}
        <div className="mt-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 z-40 bg-card">
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
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No campaigns</div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-30 bg-card">
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Scheduled At (IST)</TableHead>
                          <TableHead className="text-center">Recipients</TableHead>
                          <TableHead className="text-center">Sent</TableHead>
                          <TableHead className="text-center">Opened</TableHead>
                          <TableHead className="text-center">Clicked</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map(c => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <p className="font-medium">{c.name}</p>
                              <p className="text-sm text-muted-foreground">{c.subject}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                c.status === 'sent'      ? 'default'     :
                                c.status === 'scheduled' ? 'secondary'   :
                                c.status === 'sending'   ? 'destructive' : 'outline'
                              }>{c.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {c.scheduledAt
                                ? <span className="text-sm">{formatDisplay(c.scheduledAt)}</span>
                                : <span className="text-muted-foreground text-sm">-</span>}
                            </TableCell>
                            <TableCell className="text-center">{c.totalRecipients ?? c.leads?.length ?? 0}</TableCell>
                            <TableCell className="text-center">{c.sentCount   ?? 0}</TableCell>
                            <TableCell className="text-center">{c.openedCount ?? 0}</TableCell>
                            <TableCell className="text-center">{c.clickedCount ?? 0}</TableCell>
                            <TableCell>
                              {/* createdAt from DB is also IST plain string */}
                              {formatDisplay(c.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {(c.status === 'draft' || c.status === 'scheduled') && (
                                  <Button size="sm" variant="ghost"
                                    onClick={() => handleSendCampaign(c)}
                                    disabled={isSending && sendingCampaignId === c.id}
                                    className="text-primary hover:text-primary">
                                    {isSending && sendingCampaignId === c.id
                                      ? <Loader2 className="h-4 w-4 animate-spin" />
                                      : <Send className="h-4 w-4" />}
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost"
                                  onClick={() => navigate(`/dashboard/campaign-result/${c.id}`)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost"
                                  onClick={() => handleDeleteCampaign(c.id)}
                                  disabled={c.status === "sending"}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}>Previous</Button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button key={page} size="sm"
                            variant={currentPage === page ? 'default' : 'outline'}
                            onClick={() => setCurrentPage(page)}
                            className="min-w-10">{page}</Button>
                        ))}
                        <Button size="sm" variant="outline"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}>Next</Button>
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