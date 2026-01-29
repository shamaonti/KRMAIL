import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getStoredTemplates, EmailTemplate, initializeDefaultTemplates } from "@/lib/templates";
import { 
  Lead, 
  sendCampaign, 
  CampaignAnalytics,
  getEmailConfig,
  saveEmailConfig
} from "@/lib/email";
import { 
  Campaign, 
  createCampaign, 
  updateCampaign, 
  validateCampaign,
  getOverallAnalytics
} from "@/lib/campaigns";
import CSVUploader from "@/components/CSVUploader";
import CampaignAnalyticsComponent from "@/components/CampaignAnalytics";
import { 
  Upload, 
  Play, 
  Pause, 
  Eye, 
  Settings,
  Plus,
  Trash2,
  GripVertical as Grip,
  Mail,
  Users,
  Calendar,
  Save,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

const mockInboxes = [
  { id: 1, name: 'primary@company.com', status: 'active' },
  { id: 2, name: 'sales@company.com', status: 'active' },
  { id: 3, name: 'marketing@company.com', status: 'warmup' }
];

const CampaignPage = () => {
  // State management
  const [selectedInboxes, setSelectedInboxes] = useState<number[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [campaignResults, setCampaignResults] = useState<CampaignAnalytics | null>(null);
  const [overallAnalytics, setOverallAnalytics] = useState<CampaignAnalytics | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Campaign settings
  const [timezone, setTimezone] = useState('UTC');
  const [sendingHours, setSendingHours] = useState({ from: '09:00', to: '17:00' });
  const [abTesting, setAbTesting] = useState(false);
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(200);

  // Follow-up settings
  const [followupEnabled, setFollowupEnabled] = useState(false);
  const [followupTemplate, setFollowupTemplate] = useState<EmailTemplate | null>(null);
  const [followupSubject, setFollowupSubject] = useState('Follow-up: Your previous email');
  const [followupDelayHours, setFollowupDelayHours] = useState(0.083); // 5 minutes for testing (5/60 = 0.083 hours)
  const [followupCondition, setFollowupCondition] = useState<'not_opened' | 'not_clicked' | 'always'>('not_opened');

  // Get current user ID from localStorage
  const getCurrentUserId = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || 1;
  };

  const userId = getCurrentUserId();

  // Load templates and initialize default ones
  useEffect(() => {
    initializeDefaultTemplates(userId);
    const userTemplates = getStoredTemplates(userId);
    console.log('🔍 Debug: Loaded templates:', userTemplates.length);
    console.log('🔍 Debug: Template types:', userTemplates.map(t => ({ name: t.name, type: t.template_type })));
    
    setTemplates(userTemplates);
    if (userTemplates.length > 0) {
      setSelectedTemplate(userTemplates[0]);
    }
  }, [userId]);

  // Load overall analytics
  useEffect(() => {
    const analytics = getOverallAnalytics(userId);
    setOverallAnalytics(analytics);
  }, [userId]);

  // Handle CSV upload
  const handleLeadsUploaded = (uploadedLeads: Lead[]) => {
    setLeads(prevLeads => {
      const combinedLeads = [...prevLeads, ...uploadedLeads];
      // Remove duplicates based on email
      const uniqueLeads = combinedLeads.filter((lead, index, self) => 
        index === self.findIndex(l => l.email === lead.email)
      );
      return uniqueLeads;
    });
    setSuccessMessage(`Successfully uploaded ${uploadedLeads.length} leads`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Create campaign
  const handleCreateCampaign = () => {
    if (!selectedTemplate) {
      setErrors(['Please select an email template']);
      return;
    }

    if (leads.length === 0) {
      setErrors(['Please upload leads before creating a campaign']);
      return;
    }

    const campaign = createCampaign(
      userId,
      campaignName,
      emailSubject,
      selectedTemplate,
      leads,
      {
        timezone,
        sendingHours,
        abTesting,
        delayBetweenEmails
      },
      followupEnabled ? {
        enabled: followupEnabled,
        templateId: followupTemplate?.id,
        template: followupTemplate || undefined,
        subject: followupSubject,
        delayHours: followupDelayHours,
        condition: followupCondition
      } : undefined
    );

    setCurrentCampaign(campaign);
    setErrors([]);
    setSuccessMessage('Campaign created successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Send campaign
  const handleSendCampaign = async () => {
    if (!currentCampaign) {
      setErrors(['Please create a campaign first']);
      return;
    }

    const validation = validateCampaign(currentCampaign);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSending(true);
    setSendingProgress(0);
    setErrors([]);

    try {
      // Update campaign status to sending
      const updatedCampaign = updateCampaign(currentCampaign.id, { status: 'sending' });
      setCurrentCampaign(updatedCampaign);

      // Send the campaign
      const { results, analytics } = await sendCampaign(
        currentCampaign.leads,
        currentCampaign.subject,
        currentCampaign.template.content,
        {
          campaignId: currentCampaign.id,
          userId: currentCampaign.userId,
          followupSettings: currentCampaign.followupSettings
        }
      );

      // Update campaign with results
      const finalCampaign = updateCampaign(currentCampaign.id, {
        status: 'sent',
        sentAt: new Date().toISOString()
      });

      setCurrentCampaign(finalCampaign);
      setCampaignResults(analytics);
      setOverallAnalytics(getOverallAnalytics(userId));

      setSuccessMessage(`Campaign sent successfully! ${analytics.totalSent} emails sent.`);
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      setErrors([`Failed to send campaign: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      
      // Update campaign status back to draft
      if (currentCampaign) {
        updateCampaign(currentCampaign.id, { status: 'draft' });
      }
    } finally {
      setIsSending(false);
      setSendingProgress(0);
    }
  };

  // Preview campaign
  const handlePreview = () => {
    if (!selectedTemplate) {
      setErrors(['Please select an email template to preview']);
      return;
    }

    const dlg = window.document.getElementById('preview-modal') as HTMLDialogElement | null;
    if (dlg && typeof dlg.showModal === "function") dlg.showModal();
  };

  // Clear form
  const handleClearForm = () => {
    setCampaignName('');
    setEmailSubject('');
    setSelectedTemplate(templates.length > 0 ? templates[0] : null);
    setLeads([]);
    setCurrentCampaign(null);
    setCampaignResults(null);
    setErrors([]);
    setSuccessMessage('');
  };

  // Manual template initialization for testing
  const handleInitializeTemplates = () => {
    console.log('🔄 Manually initializing templates...');
    initializeDefaultTemplates(userId);
    const userTemplates = getStoredTemplates(userId);
    console.log('✅ Manual init - Loaded templates:', userTemplates.length);
    setTemplates(userTemplates);
    if (userTemplates.length > 0) {
      setSelectedTemplate(userTemplates[0]);
    }
    setSuccessMessage('Templates initialized successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nunito font-semibold" style={{ color: '#012970' }}>Campaign Management</h2>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="border-gray-300"
                onClick={handlePreview}
                disabled={!selectedTemplate}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              
              <Button 
                variant="outline" 
                className="border-gray-300"
                onClick={handleCreateCampaign}
                disabled={!selectedTemplate || leads.length === 0 || !campaignName.trim()}
              >
                <Save className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>

              <Button 
                className="text-white font-medium" 
                style={{ backgroundColor: isSending ? '#dc2626' : '#1e3a8a' }}
                onClick={handleSendCampaign}
                disabled={!currentCampaign || isSending}
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isSending ? 'Sending...' : 'Send Campaign'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Preview Modal */}
      <dialog id="preview-modal" className="rounded-lg open:flex open:flex-col open:items-center open:justify-center w-full max-w-lg md:max-w-xl backdrop:bg-black/30">
        <div className="w-full bg-white rounded-lg p-4 max-w-xl relative">
          <button
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            onClick={() => (window.document.getElementById('preview-modal') as HTMLDialogElement)?.close()}
          >
            ×
          </button>

          <div className="flex justify-between items-center mb-4">
            <span className="font-medium text-lg" style={{color:'#012970'}}>Email Preview</span>
            <div className="space-x-2">
              <Button 
                size="sm" 
                variant={previewMode==="desktop"?"default":"outline"}
                onClick={()=>setPreviewMode("desktop")}
              >Desktop</Button>
              <Button 
                size="sm" 
                variant={previewMode==="mobile"?"default":"outline"}
                onClick={()=>setPreviewMode("mobile")}
              >Mobile</Button>
            </div>
          </div>
          
          <div className={
            previewMode === 'mobile'
              ? 'mx-auto border w-64 h-96 bg-gray-50 rounded-lg p-4 overflow-y-auto'
              : 'border w-full bg-gray-50 rounded p-6'
          }>
            {selectedTemplate ? (
              <>
                <div className="mb-2 text-gray-500 text-xs">{selectedTemplate.subject}</div>
                <div className="font-bold mb-2">{selectedTemplate.name}</div>
                <div className="text-gray-800">
                  {selectedTemplate.contentType === 'html' ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{selectedTemplate.content}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500">
                <div className="mb-2">No template selected</div>
                <div className="text-sm">Create a template in Email Templates page first</div>
              </div>
            )}
          </div>
        </div>
      </dialog>

      <main className="p-6">
        {/* Alerts */}
        {errors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <div key={index} className="text-sm">{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Sending Progress */}
        {isSending && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Sending Campaign...</span>
                <span className="text-sm text-blue-600">{sendingProgress}%</span>
              </div>
              <Progress value={sendingProgress} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign Configuration */}
          <div className="lg:col-span-2">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="font-nunito" style={{ color: '#012970' }}>Campaign Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Campaign Name */}
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name *</Label>
                  <Input 
                    id="campaign-name"
                    placeholder="Enter campaign name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>

                {/* Email Subject */}
                <div className="space-y-2">
                  <Label htmlFor="email-subject">Email Subject *</Label>
                  <Input 
                    id="email-subject"
                    placeholder="Enter email subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                {/* Email Template Selection */}
                <div className="space-y-2">
                  <Label>Email Template *</Label>
                  <Select onValueChange={(value) => {
                    const selectedTemplate = templates.find(t => t.id.toString() === value);
                    if (selectedTemplate) {
                      setSelectedTemplate(selectedTemplate);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={templates.length > 0 ? "Select template" : "No templates available"} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length > 0 ? (
                        templates.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-templates" disabled>
                          Create templates in Email Templates page first
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lead Upload */}
                <div className="space-y-3">
                  <Label>Upload Leads (CSV) *</Label>
                  <CSVUploader 
                    onLeadsUploaded={handleLeadsUploaded}
                    existingLeads={leads}
                  />
                </div>

                {/* Current Campaign Status */}
                {currentCampaign && (
                  <div className="space-y-3">
                    <Label>Current Campaign</Label>
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-green-800">{currentCampaign.name}</h4>
                            <p className="text-sm text-green-600">
                              {currentCampaign.leads.length} leads • {currentCampaign.status}
                            </p>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {currentCampaign.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Debug Template Info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="space-y-3">
                    <Label>Debug: Template Info</Label>
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="text-sm">
                          <p><strong>Total Templates:</strong> {templates.length}</p>
                          <p><strong>Follow-up Templates:</strong> {templates.filter(t => t.template_type === 'followup').length}</p>
                          <p><strong>Marketing Templates:</strong> {templates.filter(t => t.template_type === 'marketing').length}</p>
                          <p><strong>Selected Template:</strong> {selectedTemplate?.name || 'None'}</p>
                          <p><strong>Follow-up Template:</strong> {followupTemplate?.name || 'None'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Campaign Results */}
                {campaignResults && (
                  <div className="space-y-3">
                    <Label>Campaign Results</Label>
                    <CampaignAnalyticsComponent analytics={campaignResults} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Campaign Settings & Analytics */}
          <div className="space-y-6">
            {/* Campaign Settings */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="font-nunito" style={{ color: '#012970' }}>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Time Zone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                      <Input 
                        type="time" 
                        value={sendingHours.from}
                        onChange={(e) => setSendingHours(prev => ({ ...prev, from: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">To</Label>
                      <Input 
                        type="time" 
                        value={sendingHours.to}
                        onChange={(e) => setSendingHours(prev => ({ ...prev, to: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>A/B Testing</Label>
                    <Switch 
                      checked={abTesting}
                      onCheckedChange={setAbTesting}
                    />
                  </div>
                  <p className="text-sm text-gray-500">Test different subject lines</p>
                </div>

                <div className="space-y-2">
                  <Label>Delay Between Emails (ms)</Label>
                  <Input 
                    type="number" 
                    value={delayBetweenEmails}
                    onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value) || 200)}
                    min="100"
                    max="5000"
                  />
                  <p className="text-sm text-gray-500">Recommended: 200-500ms</p>
                </div>

                {/* Follow-up Settings */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Follow-up Email</Label>
                      <Switch 
                        checked={followupEnabled}
                        onCheckedChange={setFollowupEnabled}
                      />
                    </div>
                    <p className="text-sm text-gray-500">Send automatic follow-up emails</p>
                  </div>

                  {followupEnabled && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Follow-up Template</Label>
                        <Select onValueChange={(value) => {
                          const selectedTemplate = templates.find(t => t.id.toString() === value);
                          if (selectedTemplate) {
                            setFollowupTemplate(selectedTemplate);
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select follow-up template" />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const filteredTemplates = templates.filter(t => t.template_type === 'followup' || t.template_type === 'marketing');
                              console.log('🔍 Debug: Follow-up dropdown templates:', filteredTemplates.map(t => ({ name: t.name, type: t.template_type })));
                              
                              // If no follow-up templates found, show all templates as fallback
                              const templatesToShow = filteredTemplates.length > 0 ? filteredTemplates : templates;
                              console.log('🔍 Debug: Templates to show in dropdown:', templatesToShow.length);
                              
                              return templatesToShow.map((template) => (
                                <SelectItem key={template.id} value={template.id.toString()}>
                                  {template.name} {template.template_type !== 'followup' && template.template_type !== 'marketing' ? `(${template.template_type})` : ''}
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Follow-up Subject</Label>
                        <Input 
                          placeholder="Enter follow-up email subject"
                          value={followupSubject}
                          onChange={(e) => setFollowupSubject(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Send After (hours)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={followupDelayHours}
                          onChange={(e) => setFollowupDelayHours(parseFloat(e.target.value) || 0.083)}
                          min="0.01"
                          max="168"
                        />
                        <p className="text-sm text-gray-500">
                          {followupDelayHours < 1 
                            ? `${Math.round(followupDelayHours * 60)} minutes` 
                            : `${followupDelayHours} hours`
                          } (0.01-168 hours, 1 week max)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Send If</Label>
                        <Select value={followupCondition} onValueChange={(value: any) => setFollowupCondition(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
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

            {/* Overall Analytics */}
            {overallAnalytics && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-nunito" style={{ color: '#012970' }}>Overall Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Emails Sent</span>
                      <span className="font-medium">{overallAnalytics.totalSent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Open Rate</span>
                      <span className="font-medium">{overallAnalytics.openRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Click Rate</span>
                      <span className="font-medium">{overallAnalytics.clickRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Reply Rate</span>
                      <span className="font-medium">{overallAnalytics.replyRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Bounce Rate</span>
                      <span className="font-medium">{overallAnalytics.bounceRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="font-nunito" style={{ color: '#012970' }}>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleClearForm}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Form
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('/dashboard/email-templates', '_blank')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleInitializeTemplates}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Initialize Templates
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
};

export default CampaignPage;
