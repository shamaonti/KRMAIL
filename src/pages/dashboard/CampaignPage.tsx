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

// Types
interface Lead {
  email: string;
  name?: string;
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
  id: string;
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

const API_BASE_URL = 'http://localhost:3001';

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

  // Campaign settings
  const [timezone, setTimezone] = useState('UTC');
  const [sendingHours, setSendingHours] = useState({ from: '09:00', to: '17:00' });
  const [abTesting, setAbTesting] = useState(false);
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(200);

  // Follow-up settings
  const [followupEnabled, setFollowupEnabled] = useState(false);
  const [followupTemplate, setFollowupTemplate] = useState<EmailTemplate | null>(null);
  const [followupSubject, setFollowupSubject] = useState('Follow-up: Your previous email');
  const [followupDelayHours, setFollowupDelayHours] = useState(0.083);
  const [followupCondition, setFollowupCondition] = useState<'not_opened' | 'not_clicked' | 'always'>('not_opened');

  // Schedule settings
  const [scheduleAt, setScheduleAt] = useState('');
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);

  const getCurrentUserId = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || 1;
  };

  const userId = getCurrentUserId();
  const navigate = useNavigate();

  const loadEmailTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/email-templates?userId=${userId}`);
      const data = await res.json();
      const templatesFromApi = Array.isArray(data.data) ? data.data : data.data?.templates || [];
      if (templatesFromApi.length === 0) {
        setErrors(["No email templates found in database"]);
      }
      setTemplates(templatesFromApi);
      if (!selectedTemplate && templatesFromApi.length > 0) {
        setSelectedTemplate(templatesFromApi[0]);
      }
    } catch (err) {
      console.error(err);
      setErrors(["Failed to load email templates"]);
    }
  };

  useEffect(() => {
    loadEmailTemplates();
  }, [userId]);

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true);
    setErrors([]);
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns?userId=${userId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        const backendCampaigns = data.data.map((c: any) => ({
          id: c.id,
          userId: c.userId,
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
        }));
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
  }, [userId]);

  const handleLeadsUploaded = (uploadedLeads: Lead[]) => {
    setLeads(prevLeads => {
      const combinedLeads = [...prevLeads, ...uploadedLeads];
      const uniqueLeads = combinedLeads.filter((lead, index, self) =>
        index === self.findIndex(l => l.email === lead.email)
      );
      return uniqueLeads;
    });
    setSuccessMessage(`Successfully uploaded ${uploadedLeads.length} leads`);
    setTimeout(() => setSuccessMessage(''), 3000);
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
        runAt: scheduleAt || null,
        settings: { timezone, sendingHours, abTesting, delayBetweenEmails },
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

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.success) {
        const newCampaign: Campaign = {
          id: data.campaignId.toString(),
          userId,
          name: campaignName,
          subject: emailSubject,
          template: selectedTemplate,
          leads,
          status: 'draft',
          createdAt: new Date().toISOString(),
          settings: campaignData.settings,
          followupSettings: campaignData.followupSettings
        };
        setCurrentCampaign(newCampaign);
        await loadCampaigns();
        setSuccessMessage('Campaign saved to database successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors([data.message || 'Failed to save campaign']);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      setErrors([`Failed to save to database: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  const handleSendCampaign = async (campaign: Campaign) => {
      try {

         if (!campaign.id || isNaN(Number(campaign.id))) {
    setErrors(["Invalid campaign ID"]);
    return;
  }
        setSendingCampaignId(campaign.id);
        setIsSending(true);
        setErrors([]);

        const res = await fetch(
          `${API_BASE_URL}/api/campaigns/${campaign.id}/send`,
          { method: "POST" }
        );

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message);
        }

        await loadCampaigns();

        setSuccessMessage(
          `Campaign "${campaign.name}" sent successfully (${data.sentCount})`
        );
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

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await loadCampaigns();
        setSuccessMessage('Campaign deleted');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors([data.message || 'Failed to delete campaign']);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setErrors([`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  return (
    <>
      <header className="bg-card shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Campaign Management</h2>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handlePreview} disabled={!selectedTemplate}>
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
              <Button onClick={handleCreateCampaign} disabled={!selectedTemplate || leads.length === 0 || !campaignName.trim()}>
                <Save className="mr-2 h-4 w-4" /> {scheduleAt ? 'Schedule Campaign' : 'Save Campaign'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Preview Modal */}
      <dialog id="preview-modal" className="rounded-lg backdrop:bg-black/30 p-0 w-full max-w-2xl">
        <div className="bg-card rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">Email Preview</h3>
            <div className="flex gap-2">
              <Button size="sm" variant={previewMode === "desktop" ? "default" : "outline"} onClick={() => setPreviewMode("desktop")}>Desktop</Button>
              <Button size="sm" variant={previewMode === "mobile" ? "default" : "outline"} onClick={() => setPreviewMode("mobile")}>Mobile</Button>
              <button className="ml-4 text-muted-foreground hover:text-foreground" onClick={() => (document.getElementById('preview-modal') as HTMLDialogElement)?.close()}>✕</button>
            </div>
          </div>
          <div className={previewMode === 'mobile' ? 'mx-auto w-80 border rounded-lg p-4 bg-muted' : 'border rounded p-6 bg-muted'}>
            {selectedTemplate ? (
              <>
                <div className="text-xs text-muted-foreground mb-2">{emailSubject || selectedTemplate.subject}</div>
                <div className="font-bold mb-2">{selectedTemplate.name}</div>
                <div className="text-foreground">
                  {selectedTemplate.contentType === 'html' ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{selectedTemplate.content}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8"><p>No template selected</p></div>
            )}
          </div>
        </div>
      </dialog>

      <main className="p-6">
        {errors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.map((error, i) => <div key={i}>{error}</div>)}</AlertDescription>
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
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Campaign Setup</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Campaign Name *</Label>
                  <Input placeholder="Enter campaign name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                </div>
                <div>
                  <Label>Email Subject *</Label>
                  <Input placeholder="Enter email subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                </div>
                <div>
                  <Label>Email Template *</Label>
                  <Select value={selectedTemplate?.id.toString()} onValueChange={(value) => {
                    const template = templates.find(t => t.id.toString() === value);
                    if (template) setSelectedTemplate(template);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>{template.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                 <div>
                  <Label>Schedule At (optional)</Label>
                  <Input 
                    type="datetime-local" 
                    value={scheduleAt} 
                    onChange={(e) => setScheduleAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {scheduleAt ? `Will be sent at ${new Date(scheduleAt).toLocaleString()}` : 'Leave empty to save as draft and send manually'}
                  </p>
                </div>
                 <div>
                  <Label>Upload Leads (CSV) * ({leads.length} leads)</Label>
                  <CSVUploader onLeadsUploaded={handleLeadsUploaded} existingLeads={leads} />
                </div>
                {currentCampaign && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-green-800">{currentCampaign.name}</h4>
                          <p className="text-sm text-green-600">
                            {currentCampaign.leads?.length || 0} leads • {currentCampaign.status}
                          </p>
                        </div>
                        <Badge>{currentCampaign.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
               
                {currentCampaign && (
                  <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-green-800 dark:text-green-200">{currentCampaign.name}</h4>
                          <p className="text-sm text-green-600 dark:text-green-300">{currentCampaign.leads?.length || 0} leads • {currentCampaign.status}</p>
                        </div>
                        <Badge>{currentCampaign.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>

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
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sending Hours</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm">From</Label>
                      <Input type="time" value={sendingHours.from} onChange={(e) => setSendingHours(prev => ({ ...prev, from: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-sm">To</Label>
                      <Input type="time" value={sendingHours.to} onChange={(e) => setSendingHours(prev => ({ ...prev, to: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>A/B Testing</Label>
                    <Switch checked={abTesting} onCheckedChange={setAbTesting} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Delay Between Emails (ms)</Label>
                  <Input type="number" value={delayBetweenEmails} onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value) || 200)} min="100" max="5000" />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Follow-up Email</Label>
                    <Switch checked={followupEnabled} onCheckedChange={setFollowupEnabled} />
                  </div>
                  {followupEnabled && (
                    <div className="space-y-4">
                      <div>
                        <Label>Follow-up Template</Label>
                        <Select onValueChange={(value) => {
                          const selectedTemplate = templates.find(t => t.id.toString() === value);
                          if (selectedTemplate) setFollowupTemplate(selectedTemplate);
                        }}>
                          <SelectTrigger><SelectValue placeholder="Select follow-up template" /></SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id.toString()}>{template.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Follow-up Subject</Label>
                        <Input value={followupSubject} onChange={(e) => setFollowupSubject(e.target.value)} />
                      </div>
                      <div>
                        <Label>Send After (hours)</Label>
                        <Input type="number" step="0.01" value={followupDelayHours} onChange={(e) => setFollowupDelayHours(parseFloat(e.target.value) || 0.083)} min="0.01" max="168" />
                      </div>
                      <div>
                        <Label>Send If</Label>
                        <Select value={followupCondition} onValueChange={(value: any) => setFollowupCondition(value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_opened">Original email not opened</SelectItem>
                            <SelectItem value="not_clicked">Original email not clicked</SelectItem>
                            <SelectItem value="always">Always send follow-up</SelectItem>
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

        {/* Campaign Table */}
        <div className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Database Campaigns</CardTitle>
              <Button size="sm" variant="outline" onClick={loadCampaigns} disabled={isLoadingCampaigns}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCampaigns ? "animate-spin" : ""}`} /> Reload
              </Button>
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
                      {campaigns.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{c.name}</p>
                              <p className="text-sm text-muted-foreground">{c.subject}</p>
                            </div>
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
                            {c.scheduledAt ? (
                              <span className="text-sm">{new Date(c.scheduledAt).toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{c.totalRecipients ?? c.leads?.length ?? 0}</TableCell>
                          <TableCell className="text-center">{c.sentCount ?? 0}</TableCell>
                          <TableCell className="text-center">{c.openedCount ?? 0}</TableCell>
                          <TableCell className="text-center">{c.clickedCount ?? 0}</TableCell>
                          <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
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
                                  {isSending && sendingCampaignId === c.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default CampaignPage;
