import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "@/components/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Eye, Copy, Edit, Trash2, Monitor, Smartphone,
  Save, Wand2, FileText, ChevronDown, ChevronUp, Clock,
} from "lucide-react";

// ─── Signature helpers ────────────────────────────────────────────────────────
const SIG_MARKER = "<!-- __signature__ -->";
const SIG_HTML = `\n${SIG_MARKER}<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;line-height:1.6;">{Signature}</div>`;
const hasSig = (c: string) => c.includes(SIG_MARKER);
const addSig = (c: string) => (hasSig(c) ? c : c + SIG_HTML);
const removeSig = (c: string) => {
  const i = c.indexOf(SIG_MARKER);
  return i === -1 ? c : c.substring(0, i).trimEnd();
};

// ─── Follow-up types ──────────────────────────────────────────────────────────
export type FollowUpCondition = "not_opened" | "not_clicked" | "always" | "no_reply";

export type FollowUpStep = {
  id?: number;               // DB id (undefined = new, set = existing)
  followup_order: number;
  delay_days: number;
  send_condition: FollowUpCondition;
  content: string;
};

export const CONDITION_LABELS: Record<FollowUpCondition, string> = {
  not_opened: "Not Opened",
  not_clicked: "Not Clicked",
  always: "Always",
  no_reply: "No Reply",
};

// ─── DB / API types ───────────────────────────────────────────────────────────
type TemplateType = "marketing" | "transactional" | "newsletter" | "followup";

type DbEmailTemplate = {
  id: number; user_id: number; name: string; subject: string | null;
  content: string | null; template_type: TemplateType; is_default: 0 | 1;
  created_at?: string; updated_at?: string;
  followups?: FollowUpStep[];   // enriched by GET
};

type Performance = { opens: string; clicks: string; replies: string };

export type EmailTemplateUI = {
  id?: number; user_id?: number; name: string; subject: string; content: string;
  contentType: "text" | "html";
  category: "welcome" | "follow-up" | "nurture" | "closing";
  sequence: number; is_default?: 0 | 1; template_type?: TemplateType;
  performance: Performance; lastModified?: string;
  followups: FollowUpStep[];
};

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001") + "/api/email-templates";

function categoryToTemplateType(cat: EmailTemplateUI["category"]): TemplateType {
  switch (cat) {
    case "welcome":   return "transactional";
    case "follow-up": return "followup";
    case "nurture":   return "newsletter";
    default:          return "marketing";
  }
}
function templateTypeToCategory(t: TemplateType): EmailTemplateUI["category"] {
  switch (t) {
    case "transactional": return "welcome";
    case "followup":      return "follow-up";
    case "newsletter":    return "nurture";
    default:              return "closing";
  }
}
function formatLastModified(updated_at?: string, created_at?: string) {
  const d = updated_at || created_at;
  if (!d) return "";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

// ─── API calls ────────────────────────────────────────────────────────────────
async function apiFetchTemplates(userId: number): Promise<DbEmailTemplate[]> {
  const res = await fetch(`${API_BASE}?userId=${userId}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to load templates");
  return json.data as DbEmailTemplate[];
}

async function apiSaveTemplate(
  id: number | undefined,
  payload: {
    user_id: number; name: string; subject: string; content: string;
    template_type: TemplateType; is_default: 0 | 1;
    followups: FollowUpStep[];
  }
): Promise<DbEmailTemplate> {
  const url = id ? `${API_BASE}/${id}` : API_BASE;
  const method = id ? "PUT" : "POST";
  const res = await fetch(url, {
    method, headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to save template");
  return json.data as DbEmailTemplate;
}

async function apiDeleteTemplate(id: number, userId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}?userId=${userId}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to delete template");
}

async function apiDuplicateTemplate(id: number, user_id: number): Promise<DbEmailTemplate> {
  const res = await fetch(`${API_BASE}/${id}/duplicate`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to duplicate template");
  return json.data as DbEmailTemplate;
}

// ─── Follow-up Step Row ───────────────────────────────────────────────────────
const FollowUpStepRow: React.FC<{
  step: FollowUpStep;
  index: number;
  parentSubject: string;
  onChange: (i: number, updated: FollowUpStep) => void;
  onRemove: (i: number) => void;
}> = ({ step, index, parentSubject, onChange, onRemove }) => (
  <div className="flex flex-col gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center justify-center w-6 h-6 bg-purple-600 text-white text-xs font-bold rounded-full">
          {index + 1}
        </span>
        <span className="text-sm font-semibold text-purple-800">Follow-up #{index + 1}</span>
        {parentSubject && (
          <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full border border-purple-200">
            📧 "{parentSubject}"
          </span>
        )}
      </div>
      <Button type="button" size="sm" variant="ghost"
        className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
        onClick={() => onRemove(index)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>

    {/* Delay + Condition */}
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-gray-600 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Send After (days)
        </Label>
        <Input
          type="number" step="1" min="1" max="30"
          value={step.delay_days}
          onChange={(e) => onChange(index, { ...step, delay_days: parseInt(e.target.value) || 1 })}
          className="h-8 text-xs bg-white" placeholder="1"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Send If</Label>
        <Select value={step.send_condition}
          onValueChange={(v) => onChange(index, { ...step, send_condition: v as FollowUpCondition })}>
          <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(CONDITION_LABELS) as FollowUpCondition[]).map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{CONDITION_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Inline content */}
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">Follow-up Email Body</Label>
      <Textarea rows={5}
        placeholder={`Write your follow-up #${index + 1} email here…`}
        value={step.content}
        onChange={(e) => onChange(index, { ...step, content: e.target.value })}
        className="text-xs bg-white resize-y" />
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const EmailTemplatesPage = () => {
  const [templates, setTemplates] = useState<EmailTemplateUI[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateUI | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"templates" | "new">("templates");
  const [formData, setFormData] = useState<EmailTemplateUI | null>(null);
  const [sigEnabled, setSigEnabled] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupSteps, setFollowupSteps] = useState<FollowUpStep[]>([]);
  const { toast } = useToast();

  const userId = useMemo(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.id || 1;
  }, []);

  const blankTemplate: EmailTemplateUI = useMemo(() => ({
    id: undefined, user_id: userId, name: "", subject: "", category: "welcome",
    sequence: 1, content: "", contentType: "html",
    performance: { opens: "0%", clicks: "0%", replies: "0%" },
    lastModified: "", is_default: 0, template_type: "transactional",
    followups: [],
  }), [userId]);

  const dbToUI = (r: DbEmailTemplate): EmailTemplateUI => ({
    id: r.id, user_id: r.user_id, name: r.name,
    subject: r.subject || "", content: r.content || "",
    contentType: "html",
    category: templateTypeToCategory(r.template_type),
    sequence: 1,
    performance: { opens: "0%", clicks: "0%", replies: "0%" },
    lastModified: formatLastModified(r.updated_at, r.created_at),
    is_default: r.is_default, template_type: r.template_type,
    followups: (r.followups || []).map((fu) => ({
      id: fu.id,
      followup_order: fu.followup_order,
      delay_days: fu.delay_days,
      send_condition: fu.send_condition,
      content: fu.content,
    })),
  });

  const loadTemplates = async () => {
    const rows = await apiFetchTemplates(userId);
    setTemplates(rows.map(dbToUI));
  };

  useEffect(() => {
    loadTemplates().catch((e: any) =>
      toast({ title: "Load Failed", description: e.message, variant: "destructive" })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (activeTab === "templates") { setSelectedTemplate(null); setEditMode(false); }
  }, [activeTab]);

  useEffect(() => {
    if (editMode) {
      setFormData({ ...blankTemplate }); setSigEnabled(false);
      setFollowupSteps([]); setFollowupOpen(false);
      setActiveTab("new"); return;
    }
    if (selectedTemplate) {
      setFormData({ ...blankTemplate, ...selectedTemplate });
      setSigEnabled(hasSig(selectedTemplate.content || ""));
      setFollowupSteps(selectedTemplate.followups || []);
      setFollowupOpen((selectedTemplate.followups || []).length > 0);
      setActiveTab("new"); return;
    }
    setFormData(null); setSigEnabled(false); setFollowupSteps([]); setFollowupOpen(false);
  }, [selectedTemplate, editMode, blankTemplate]);

  const handleFormChange = (field: keyof EmailTemplateUI, value: any) =>
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));

  const handleSigToggle = (checked: boolean) => {
    setSigEnabled(checked);
    setFormData((prev) => prev
      ? { ...prev, content: checked ? addSig(prev.content) : removeSig(prev.content) }
      : prev);
  };

  const handleAddFollowup = () => {
    if (followupSteps.length >= 5) return;
    const order = followupSteps.length + 1;
    setFollowupSteps((p) => [...p, {
      followup_order: order, delay_days: 1,
      send_condition: "not_opened", content: "",
    }]);
    setFollowupOpen(true);
  };
  const handleFollowupChange = (i: number, updated: FollowUpStep) =>
    setFollowupSteps((p) => p.map((s, idx) => idx === i ? updated : s));
  const handleFollowupRemove = (i: number) =>
    setFollowupSteps((p) =>
      p.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, followup_order: idx + 1 }))
    );

  const handleSaveTemplate = async () => {
    if (!formData?.name || !formData.subject || !formData.content) {
      toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    for (let i = 0; i < followupSteps.length; i++) {
      if (!followupSteps[i].content.trim()) {
        toast({ title: "Validation Error", description: `Follow-up #${i + 1}: Email body cannot be empty`, variant: "destructive" });
        return;
      }
    }
    try {
      await apiSaveTemplate(formData.id, {
        user_id: userId,
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        content: formData.content,
        template_type: categoryToTemplateType(formData.category),
        is_default: (formData.is_default ?? 0) as 0 | 1,
        followups: followupSteps.map((s, i) => ({
          ...s,
          followup_order: i + 1,
        })),
      });
      toast({ title: formData.id ? "Template Updated" : "Template Saved", description: "Saved successfully" });
      await loadTemplates();
      setActiveTab("templates");
      setEditMode(false);
      setSelectedTemplate(null);
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await apiDeleteTemplate(id, userId);
      await loadTemplates();
      toast({ title: "Template Deleted" });
    } catch (e: any) {
      toast({ title: "Delete Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDuplicateTemplate = async (id: number) => {
    try {
      await apiDuplicateTemplate(id, userId);
      await loadTemplates();
      toast({ title: "Template Duplicated" });
    } catch (e: any) {
      toast({ title: "Duplicate Failed", description: e.message, variant: "destructive" });
    }
  };

  const availableVariables = [
    { name: "Name", description: "Recipient's first name" },
    { name: "Company", description: "Recipient's company" },
    { name: "Email", description: "Recipient's email address" },
    { name: "Date", description: "Current date" },
    { name: "Industry", description: "Company industry" },
    { name: "JobTitle", description: "Recipient's job title" },
    { name: "Signature", description: "Your email signature" },
  ];

  return (
    <div className="h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200 h-16 flex items-center">
        <div className="px-6 w-full flex items-center justify-between">
          <h2 className="text-2xl font-nunito font-semibold" style={{ color: "#012970" }}>
            Email Templates
          </h2>
          <div className="flex gap-3">
            <Button variant="outline" className="border-gray-300" type="button">
              <Wand2 className="mr-2 h-4 w-4" />AI Generate
            </Button>
            <Button type="button" className="text-white font-medium"
              style={{ backgroundColor: "#1e3a8a" }}
              onClick={() => { setSelectedTemplate(null); setEditMode(true); }}>
              <Plus className="mr-2 h-4 w-4" />New Template
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
          </TabsList>

          {/* ── Templates list ──────────────────────────────────────────── */}
          <TabsContent value="templates" className="mt-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="font-nunito" style={{ color: "#012970" }}>Your Templates</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {templates.map((t) => (
                    <div key={t.id}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedTemplate?.id === t.id ? "bg-blue-50 border-blue-200" : ""}`}
                      onClick={() => { setSelectedTemplate(t); setEditMode(false); }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{t.name}</h3>
                          <p className="text-sm text-gray-500 truncate mt-1">{t.subject}</p>
                          <div className="flex flex-wrap items-center mt-2 gap-2">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{t.category}</span>
                            {t.is_default ? <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Default</span> : null}
                            {hasSig(t.content) && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">✍️ Sig</span>}
                            {t.followups.length > 0 && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                🔁 {t.followups.length} Follow-up{t.followups.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">Modified: {t.lastModified || "-"}</p>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <Button type="button" size="sm" variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleDuplicateTemplate(t.id!); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setSelectedTemplate(t); setEditMode(false); }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => { e.stopPropagation(); if (confirm("Delete?")) handleDeleteTemplate(t.id!); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <div className="p-10 text-center text-gray-500">No templates yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Editor ──────────────────────────────────────────────────── */}
          <TabsContent value="new" className="mt-4">
            {formData ? (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="font-nunito font-semibold" style={{ color: "#012970" }}>
                      {editMode ? "Create New Template" : `Editing: ${formData.name || ""}`}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex border border-gray-300 rounded-lg">
                        <Button type="button" size="sm"
                          variant={previewMode === "desktop" ? "default" : "ghost"}
                          className={previewMode === "desktop" ? "bg-gray-900 text-white" : ""}
                          onClick={() => setPreviewMode("desktop")}><Monitor className="h-4 w-4" /></Button>
                        <Button type="button" size="sm"
                          variant={previewMode === "mobile" ? "default" : "ghost"}
                          className={previewMode === "mobile" ? "bg-gray-900 text-white" : ""}
                          onClick={() => setPreviewMode("mobile")}><Smartphone className="h-4 w-4" /></Button>
                      </div>
                      <Button type="button" variant="outline" className="border-gray-300">
                        <Eye className="mr-2 h-4 w-4" />Preview
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="editor" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="editor">Editor</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    {/* ── Editor tab ──────────────────────────────────────── */}
                    <TabsContent value="editor" className="space-y-4 mt-4">

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Template Name</Label>
                          <Input placeholder="Enter template name" value={formData.name}
                            onChange={(e) => handleFormChange("name", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={formData.category} onValueChange={(v) => handleFormChange("category", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="welcome">Welcome</SelectItem>
                              <SelectItem value="follow-up">Follow-up</SelectItem>
                              <SelectItem value="nurture">Nurture</SelectItem>
                              <SelectItem value="closing">Closing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2">
                          <Label>Subject Line</Label>
                          <Input placeholder="Enter email subject" value={formData.subject}
                            onChange={(e) => handleFormChange("subject", e.target.value)} />
                          <p className="text-xs text-gray-500">
                            {formData.subject.length}/60 characters
                            {followupSteps.length > 0 && (
                              <span className="ml-2 text-purple-500">
                                · Used for all {followupSteps.length} follow-up{followupSteps.length > 1 ? "s" : ""} too
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Sequence #</Label>
                          <Input type="number" placeholder="1" value={formData.sequence}
                            onChange={(e) => handleFormChange("sequence", Number(e.target.value || 1))} />
                          <p className="text-xs text-gray-400">UI only</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Content Type</Label>
                        <Select value={formData.contentType} onValueChange={(v) => handleFormChange("contentType", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Normal Text</SelectItem>
                            <SelectItem value="html">HTML</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Main email content */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Email Content</Label>
                          <label className="flex items-center gap-2 cursor-pointer select-none group">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${sigEnabled ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300 group-hover:border-blue-400"}`}
                              onClick={() => handleSigToggle(!sigEnabled)}>
                              {sigEnabled && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="text-sm text-gray-600 font-medium" onClick={() => handleSigToggle(!sigEnabled)}>
                              ✍️ Add Signature in Footer
                            </span>
                          </label>
                        </div>
                        {formData.contentType === "html" ? (
                          <RichTextEditor value={formData.content}
                            onChange={(v) => handleFormChange("content", v)}
                            placeholder="Write your HTML email content here..."
                            height="400px" />
                        ) : (
                          <Textarea rows={12} placeholder="Write your plain text email content here..."
                            value={formData.content}
                            onChange={(e) => handleFormChange("content", e.target.value)} />
                        )}
                      </div>

                      {/* ── Follow-up Sequence Accordion ─────────────────── */}
                      <div className="border border-purple-200 rounded-xl overflow-hidden">
                        <button type="button"
                          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 transition-colors"
                          onClick={() => setFollowupOpen((o) => !o)}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🔁</span>
                            <span className="font-semibold text-purple-800 text-sm">Follow-up Sequence</span>
                            {followupSteps.length > 0 && (
                              <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-bold">
                                {followupSteps.length}/5
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {followupSteps.length < 5 && (
                              <span className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700"
                                onClick={(e) => { e.stopPropagation(); handleAddFollowup(); }}>
                                <Plus className="h-3 w-3" /> Add Follow-up
                              </span>
                            )}
                            {followupOpen
                              ? <ChevronUp className="h-4 w-4 text-purple-600" />
                              : <ChevronDown className="h-4 w-4 text-purple-600" />}
                          </div>
                        </button>

                        {followupOpen && (
                          <div className="p-4 bg-white space-y-3">
                            {followupSteps.length === 0 ? (
                              <div className="text-center py-6 text-gray-400">
                                <div className="text-3xl mb-2">📭</div>
                                <p className="text-sm">No follow-ups yet.</p>
                                <p className="text-xs mt-1">Click "Add Follow-up" (max 5).</p>
                              </div>
                            ) : (
                              <>
                                {followupSteps.map((step, idx) => (
                                  <div key={step.id ?? `new-${idx}`}>
                                    {idx > 0 && (
                                      <div className="flex justify-center my-1">
                                        <div className="w-0.5 h-4 bg-purple-300" />
                                      </div>
                                    )}
                                    <FollowUpStepRow step={step} index={idx}
                                      parentSubject={formData.subject}
                                      onChange={handleFollowupChange}
                                      onRemove={handleFollowupRemove} />
                                  </div>
                                ))}
                                {followupSteps.length < 5 ? (
                                  <Button type="button" variant="outline"
                                    className="w-full border-dashed border-purple-300 text-purple-600 hover:bg-purple-50"
                                    onClick={handleAddFollowup}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Another Follow-up
                                  </Button>
                                ) : (
                                  <p className="text-xs text-center text-amber-600 bg-amber-50 border border-amber-200 rounded py-2">
                                    ⚠️ Maximum 5 follow-ups reached.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-between">
                        <div className="space-x-2">
                          <Button type="button" variant="outline" className="border-gray-300">
                            <Wand2 className="mr-2 h-4 w-4" />AI Improve
                          </Button>
                          <Button type="button" variant="outline" className="border-gray-300">Test A/B</Button>
                        </div>
                        <div className="space-x-2">
                          <Button type="button" variant="outline" className="border-gray-300"
                            onClick={() => setActiveTab("templates")}>Cancel</Button>
                          <Button type="button" className="text-white font-medium"
                            style={{ backgroundColor: "#1e3a8a" }}
                            onClick={handleSaveTemplate}>
                            <Save className="mr-2 h-4 w-4" />Save Template
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ── Preview tab ─────────────────────────────────────── */}
                    <TabsContent value="preview" className="mt-4">
                      <div className={`mx-auto border border-gray-300 rounded-lg p-6 bg-white ${previewMode === "mobile" ? "max-w-sm" : "max-w-2xl"}`}>
                        <div className="border-b border-gray-200 pb-4 mb-4">
                          <h4 className="font-medium">Subject: {formData.subject}</h4>
                          <p className="text-sm text-gray-500">From: you@company.com</p>
                          <p className="text-sm text-gray-500">To: john.doe@prospect.com</p>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <div dangerouslySetInnerHTML={{
                            __html: formData.contentType === "html"
                              ? formData.content
                              : formData.content.replace(/\n/g, "<br/>"),
                          }} />
                        </div>
                        {followupSteps.length > 0 && (
                          <div className="mt-6 space-y-3">
                            <p className="text-xs font-semibold text-purple-600 border-t border-dashed border-purple-200 pt-3">
                              🔁 Follow-up Sequence ({followupSteps.length} step{followupSteps.length > 1 ? "s" : ""}):
                            </p>
                            {followupSteps.map((s, i) => (
                              <div key={i} className="border border-purple-100 rounded-lg p-3 bg-purple-50/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="w-5 h-5 flex items-center justify-center bg-purple-600 text-white rounded-full text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                                  <span className="text-xs text-purple-700 font-medium">
                                    After {s.delay_days} day{s.delay_days > 1 ? "s" : ""} · If {CONDITION_LABELS[s.send_condition]}
                                  </span>
                                  <span className="text-[10px] text-purple-400">· Subject: "{formData.subject}"</span>
                                </div>
                                <p className="text-xs text-gray-600 whitespace-pre-line line-clamp-3">
                                  {s.content || <em className="text-gray-400">No content yet</em>}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* ── Analytics tab ───────────────────────────────────── */}
                    <TabsContent value="analytics" className="mt-4">
                      {formData.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { label: "Open Rate", val: formData.performance.opens, color: "text-blue-600" },
                            { label: "Click Rate", val: formData.performance.clicks, color: "text-green-600" },
                            { label: "Reply Rate", val: formData.performance.replies, color: "text-purple-600" },
                          ].map((m) => (
                            <Card key={m.label} className="border border-gray-200">
                              <CardContent className="p-4 text-center">
                                <div className={`text-2xl font-bold ${m.color}`}>{m.val}</div>
                                <p className="text-sm text-gray-600">{m.label}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 p-4">Save the template first to view analytics.</div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No template selected</h3>
                  <p className="mt-2 text-gray-500">Select a template to edit, or create a new one.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Variables */}
        <Card className="border border-gray-200 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="font-nunito" style={{ color: "#012970" }}>Available Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {availableVariables.map((v, i) => (
                <div key={i} className="p-3 border border-gray-200 rounded-lg text-center">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{`{${v.name}}`}</code>
                  <p className="text-xs text-gray-500 mt-1">{v.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EmailTemplatesPage;