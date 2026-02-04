import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "@/components/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Eye,
  Copy,
  Edit,
  Trash2,
  Monitor,
  Smartphone,
  Save,
  Wand2,
  FileText,
} from "lucide-react";

/**
 * DB schema fields (email_templates):
 * id, user_id, name, subject, content, template_type, is_default, created_at, updated_at
 */

type TemplateType = "marketing" | "transactional" | "newsletter" | "followup";

type DbEmailTemplate = {
  id: number;
  user_id: number;
  name: string;
  subject: string | null;
  content: string | null;
  template_type: TemplateType;
  is_default: 0 | 1;
  created_at?: string;
  updated_at?: string;
};

type Performance = { opens: string; clicks: string; replies: string };

// UI fields include extra fields that aren't in DB.
// We keep them for UI only.
export type EmailTemplateUI = {
  id?: number;
  user_id?: number;
  name: string;
  subject: string;
  content: string;
  contentType: "text" | "html";
  category: "welcome" | "follow-up" | "nurture" | "closing";
  sequence: number;
  is_default?: 0 | 1;
  template_type?: TemplateType;
  performance: Performance;
  lastModified?: string;
};

const API_BASE = "http://localhost:3001/api/email-templates";

// ---- helpers (category <-> template_type) ----
function categoryToTemplateType(cat: EmailTemplateUI["category"]): TemplateType {
  switch (cat) {
    case "welcome":
      return "transactional";
    case "follow-up":
      return "followup";
    case "nurture":
      return "newsletter";
    case "closing":
    default:
      return "marketing";
  }
}

function templateTypeToCategory(t: TemplateType): EmailTemplateUI["category"] {
  switch (t) {
    case "transactional":
      return "welcome";
    case "followup":
      return "follow-up";
    case "newsletter":
      return "nurture";
    case "marketing":
    default:
      return "closing";
  }
}

function formatLastModified(updated_at?: string, created_at?: string) {
  const d = updated_at || created_at;
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

// ---- API calls (DB only) ----
async function apiFetchTemplates(userId: number): Promise<DbEmailTemplate[]> {
  const res = await fetch(`${API_BASE}?userId=${userId}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to load templates");
  return json.data as DbEmailTemplate[];
}

async function apiCreateTemplate(payload: {
  user_id: number;
  name: string;
  subject: string;
  content: string;
  template_type: TemplateType;
  is_default?: 0 | 1;
}): Promise<DbEmailTemplate> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to create template");
  return json.data as DbEmailTemplate;
}

async function apiUpdateTemplate(
  id: number,
  payload: {
    user_id: number;
    name: string;
    subject: string;
    content: string;
    template_type: TemplateType;
    is_default?: 0 | 1;
  }
): Promise<DbEmailTemplate> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to update template");
  return json.data as DbEmailTemplate;
}

async function apiDeleteTemplate(id: number, userId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}?userId=${userId}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to delete template");
}

async function apiDuplicateTemplate(id: number, user_id: number): Promise<DbEmailTemplate> {
  const res = await fetch(`${API_BASE}/${id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to duplicate template");
  return json.data as DbEmailTemplate;
}

const EmailTemplatesPage = () => {
  const [templates, setTemplates] = useState<EmailTemplateUI[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateUI | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"templates" | "new">("templates");
  const [formData, setFormData] = useState<EmailTemplateUI | null>(null);
  const { toast } = useToast();

  // Current user ID from localStorage (as you had)
  const userId = useMemo(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.id || 1;
  }, []);

  const blankTemplate: EmailTemplateUI = useMemo(
    () => ({
      id: undefined,
      user_id: userId,
      name: "",
      subject: "",
      category: "welcome",
      sequence: 1,
      content: "",
      contentType: "html",
      performance: { opens: "0%", clicks: "0%", replies: "0%" },
      lastModified: "",
      is_default: 0,
      template_type: "transactional",
    }),
    [userId]
  );

  const loadTemplates = async () => {
    const rows = await apiFetchTemplates(userId);
    const ui = rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      subject: r.subject || "",
      content: r.content || "",
      contentType: "html" as const, // DB doesn't store this yet; keep default
      category: templateTypeToCategory(r.template_type),
      sequence: 1, // not in DB; keep UI default
      performance: { opens: "0%", clicks: "0%", replies: "0%" }, // UI only
      lastModified: formatLastModified(r.updated_at, r.created_at),
      is_default: r.is_default,
      template_type: r.template_type,
    }));
    setTemplates(ui);
  };

  useEffect(() => {
    loadTemplates().catch((e: any) => {
      toast({
        title: "Load Failed",
        description: e.message || "Failed to load templates",
        variant: "destructive",
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (activeTab === "templates") {
      setSelectedTemplate(null);
      setEditMode(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (editMode) {
      setFormData({ ...blankTemplate });
      setActiveTab("new");
      return;
    }

    if (selectedTemplate) {
      setFormData({ ...blankTemplate, ...selectedTemplate });
      setActiveTab("new");
      return;
    }

    setFormData(null);
  }, [selectedTemplate, editMode, blankTemplate]);

  const handleFormChange = (field: keyof EmailTemplateUI, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveTemplate = async () => {
    if (!formData || !formData.name || !formData.subject || !formData.content) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        user_id: userId,
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        content: formData.content,
        template_type: categoryToTemplateType(formData.category),
        is_default: (formData.is_default ?? 0) as 0 | 1,
      };

      if (formData.id) {
        await apiUpdateTemplate(formData.id, payload);
        toast({ title: "Template Updated", description: "Updated successfully" });
      } else {
        await apiCreateTemplate(payload);
        toast({ title: "Template Saved", description: "Saved successfully" });
      }

      await loadTemplates();
      setActiveTab("templates");
      setEditMode(false);
      setSelectedTemplate(null);
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await apiDeleteTemplate(templateId, userId);
      await loadTemplates();
      toast({ title: "Template Deleted", description: "Deleted successfully" });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTemplate = async (templateId: number) => {
    try {
      await apiDuplicateTemplate(templateId, userId);
      await loadTemplates();
      toast({ title: "Template Duplicated", description: "Duplicated successfully" });
    } catch (error: any) {
      toast({
        title: "Duplicate Failed",
        description: error.message || "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  const availableVariables = [
    { name: "Name", description: "Recipient's first name" },
    { name: "Company", description: "Recipient's company" },
    { name: "Email", description: "Recipient's email address" },
    { name: "Date", description: "Current date" },
    { name: "Industry", description: "Company industry" },
    { name: "JobTitle", description: "Recipient's job title" },
  ];

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nunito font-semibold" style={{ color: "#012970" }}>
              Email Templates
            </h2>
            <div className="flex gap-3">
              <Button variant="outline" className="border-gray-300" type="button">
                <Wand2 className="mr-2 h-4 w-4" />
                AI Generate
              </Button>
              <Button
                type="button"
                className="text-white font-medium"
                style={{ backgroundColor: "#1e3a8a" }}
                onClick={() => {
                  setSelectedTemplate(null);
                  setEditMode(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="font-nunito" style={{ color: "#012970" }}>
                  Your Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedTemplate?.id === template.id ? "bg-blue-50 border-blue-200" : ""
                      }`}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setEditMode(false);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <p className="text-sm text-gray-500 truncate mt-1">{template.subject}</p>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className="text-xs text-gray-500">Seq: {template.sequence}</span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {template.category}
                            </span>
                            {template.is_default ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                Default
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            Modified: {template.lastModified || "-"}
                          </p>
                        </div>

                        <div className="flex flex-col space-y-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateTemplate(template.id!);
                            }}
                            title="Duplicate template"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTemplate(template);
                              setEditMode(false);
                            }}
                            title="Edit template"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Are you sure you want to delete this template?")) {
                                handleDeleteTemplate(template.id!);
                              }
                            }}
                            title="Delete template"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {templates.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">No templates yet.</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                        <Button
                          type="button"
                          size="sm"
                          variant={previewMode === "desktop" ? "default" : "ghost"}
                          className={previewMode === "desktop" ? "bg-gray-900 text-white" : ""}
                          onClick={() => setPreviewMode("desktop")}
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={previewMode === "mobile" ? "default" : "ghost"}
                          className={previewMode === "mobile" ? "bg-gray-900 text-white" : ""}
                          onClick={() => setPreviewMode("mobile")}
                        >
                          <Smartphone className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button type="button" variant="outline" className="border-gray-300">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
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

                    <TabsContent value="editor" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="template-name">Template Name</Label>
                          <Input
                            id="template-name"
                            placeholder="Enter template name"
                            value={formData.name}
                            onChange={(e) => handleFormChange("name", e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="template-category">Category</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => handleFormChange("category", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
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
                          <Label htmlFor="subject-line">Subject Line</Label>
                          <Input
                            id="subject-line"
                            placeholder="Enter email subject"
                            value={formData.subject}
                            onChange={(e) => handleFormChange("subject", e.target.value)}
                          />
                          <p className="text-xs text-gray-500">
                            Character count: {formData.subject.length}/60 (optimal)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sequence-number">Sequence #</Label>
                          <Input
                            id="sequence-number"
                            type="number"
                            placeholder="1"
                            value={formData.sequence}
                            onChange={(e) =>
                              handleFormChange("sequence", Number(e.target.value || 1))
                            }
                          />
                          <p className="text-xs text-gray-400">UI only (not saved in DB)</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template-content-type">Content Type</Label>
                        <Select
                          value={formData.contentType}
                          onValueChange={(value) => handleFormChange("contentType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select content type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Normal Text</SelectItem>
                            <SelectItem value="html">HTML</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">UI only (not saved in DB)</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email-content">Email Content</Label>
                        {formData.contentType === "html" ? (
                          <RichTextEditor
                            value={formData.content}
                            onChange={(value) => handleFormChange("content", value)}
                            placeholder="Write your HTML email content here..."
                            height="400px"
                          />
                        ) : (
                          <Textarea
                            id="email-content"
                            rows={12}
                            placeholder="Write your plain text email content here..."
                            value={formData.content}
                            onChange={(e) => handleFormChange("content", e.target.value)}
                          />
                        )}
                      </div>

                      <div className="flex justify-between">
                        <div className="space-x-2">
                          <Button type="button" variant="outline" className="border-gray-300">
                            <Wand2 className="mr-2 h-4 w-4" />
                            AI Improve
                          </Button>
                          <Button type="button" variant="outline" className="border-gray-300">
                            Test A/B
                          </Button>
                        </div>

                        <div className="space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-gray-300"
                            onClick={() => setActiveTab("templates")}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            className="text-white font-medium"
                            style={{ backgroundColor: "#1e3a8a" }}
                            onClick={handleSaveTemplate}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save Template
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="mt-4">
                      <div
                        className={`mx-auto border border-gray-300 rounded-lg p-6 bg-white ${
                          previewMode === "mobile" ? "max-w-sm" : "max-w-2xl"
                        }`}
                      >
                        <div className="border-b border-gray-200 pb-4 mb-4">
                          <h4 className="font-medium">Subject: {formData.subject}</h4>
                          <p className="text-sm text-gray-500">From: you@company.com</p>
                          <p className="text-sm text-gray-500">To: john.doe@prospect.com</p>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <div
                            dangerouslySetInnerHTML={{
                              __html:
                                formData.contentType === "html"
                                  ? formData.content
                                  : formData.content.replace(/\n/g, "<br/>"),
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="analytics" className="mt-4">
                      {formData.id ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border border-gray-200">
                              <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                  {formData.performance.opens}
                                </div>
                                <p className="text-sm text-gray-600">Open Rate</p>
                              </CardContent>
                            </Card>
                            <Card className="border border-gray-200">
                              <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {formData.performance.clicks}
                                </div>
                                <p className="text-sm text-gray-600">Click Rate</p>
                              </CardContent>
                            </Card>
                            <Card className="border border-gray-200">
                              <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                  {formData.performance.replies}
                                </div>
                                <p className="text-sm text-gray-600">Reply Rate</p>
                              </CardContent>
                            </Card>
                          </div>

                          <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-2">Performance Insights</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                              <li>• Analytics is UI-only right now</li>
                              <li>• DB me performance store nahi ho raha</li>
                              <li>• Chaho to me columns add karke save karwa dunga</li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 p-4">
                          Save the template first to view analytics.
                        </div>
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
                  <p className="mt-2 text-gray-500">
                    Select a template from the list to edit, or create a new one.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Variables Helper */}
        <Card className="border border-gray-200 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="font-nunito" style={{ color: "#012970" }}>
              Available Variables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {availableVariables.map((variable, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg text-center">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                    {`{${variable.name}}`}
                  </code>
                  <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default EmailTemplatesPage;