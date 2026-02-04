import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "@/components/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { 
  getStoredTemplates, 
  saveTemplate, 
  updateTemplate, 
  deleteTemplate, 
  duplicateTemplate,
  extractVariables,
  initializeDefaultTemplates,
  EmailTemplate 
} from "@/lib/templates";
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
  BarChart3,
  FileText
} from "lucide-react";

const EmailTemplatesPage = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [formData, setFormData] = useState<Partial<EmailTemplate> | null>(null);
  const { toast } = useToast();

  // Get current user ID from localStorage
  const getCurrentUserId = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || 1;
  };

  const userId = getCurrentUserId();

  // Load templates on component mount
  useEffect(() => {
    initializeDefaultTemplates(userId);
    loadTemplates();
  }, [userId]);

  const loadTemplates = () => {
    const userTemplates = getStoredTemplates(userId);
    setTemplates(userTemplates);
  };

  useEffect(() => {
    if (activeTab === 'templates') {
      setSelectedTemplate(null);
      setEditMode(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const newTemplateData: Partial<EmailTemplate> = {
      id: undefined,
      name: '',
      subject: '',
      category: 'welcome',
      sequence: 1,
      content: '',
      contentType: 'html', // Default to HTML for rich editor
      performance: { opens: '0%', clicks: '0%', replies: '0%' }
    };

    if (editMode) {
      setFormData(newTemplateData);
      setActiveTab('new');
    } else if (selectedTemplate) {
      setFormData({ ...newTemplateData, ...selectedTemplate });
      setActiveTab('new');
    } else {
      setFormData(null);
    }
  }, [selectedTemplate, editMode]);
  
  const handleFormChange = (field: keyof EmailTemplate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveTemplate = async () => {
    if (!formData || !formData.name || !formData.subject || !formData.content) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const variables = extractVariables(formData.subject + ' ' + formData.content);
      
      const templateData = {
        user_id: userId,
        name: formData.name,
        subject: formData.subject,
        content: formData.content,
        contentType: formData.contentType || 'text' as const,
        category: formData.category || 'welcome',
        sequence: formData.sequence || 1,
        variables,
        performance: formData.performance || { opens: '0%', clicks: '0%', replies: '0%' }
      };

      if (formData.id) {
        // Update existing template
        updateTemplate(formData.id, templateData);
        toast({
          title: "Template Updated",
          description: "Your email template has been updated successfully"
        });
      } else {
        // Create new template
        saveTemplate(templateData);
        toast({
          title: "Template Saved",
          description: "Your email template has been saved successfully"
        });
      }

      loadTemplates();
      setActiveTab('templates');
      setEditMode(false);
      setSelectedTemplate(null);
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save template",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      deleteTemplate(templateId, userId);
      loadTemplates();
      toast({
        title: "Template Deleted",
        description: "Template has been deleted successfully"
      });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateTemplate = async (templateId: number) => {
    try {
      duplicateTemplate(templateId, userId);
      loadTemplates();
      toast({
        title: "Template Duplicated",
        description: "Template has been duplicated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Duplicate Failed",
        description: error.message || "Failed to duplicate template",
        variant: "destructive"
      });
    }
  };

  const availableVariables = [
    { name: 'Name', description: 'Recipient\'s first name' },
    { name: 'Company', description: 'Recipient\'s company' },
    { name: 'Email', description: 'Recipient\'s email address' },
    { name: 'Date', description: 'Current date' },
    { name: 'Industry', description: 'Company industry' },
    { name: 'JobTitle', description: 'Recipient\'s job title' }
  ];

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nunito font-semibold" style={{ color: '#012970' }}>Email Templates</h2>
            <div className="flex gap-3">
              <Button variant="outline" className="border-gray-300">
                <Wand2 className="mr-2 h-4 w-4" />
                AI Generate
              </Button>
              <Button 
                className="text-white font-medium" 
                style={{ backgroundColor: '#1e3a8a' }}
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates" className="mt-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="font-nunito" style={{ color: '#012970' }}>Your Templates</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {templates.map((template) => (
                    <div 
                      key={template.id}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedTemplate?.id === template.id ? 'bg-blue-50 border-blue-200' : ''
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
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            Modified: {template.lastModified}
                          </p>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateTemplate(template.id);
                            }}
                            title="Duplicate template"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button 
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
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this template?')) {
                                handleDeleteTemplate(template.id);
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="new" className="mt-4">
            {formData ? (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="font-nunito font-semibold" style={{ color: '#012970' }}>
                      {editMode ? 'Create New Template' : `Editing: ${formData.name}`}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex border border-gray-300 rounded-lg">
                        <Button
                          size="sm"
                          variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                          className={previewMode === 'desktop' ? 'bg-gray-900 text-white' : ''}
                          onClick={() => setPreviewMode('desktop')}
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                          className={previewMode === 'mobile' ? 'bg-gray-900 text-white' : ''}
                          onClick={() => setPreviewMode('mobile')}
                        >
                          <Smartphone className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="outline" className="border-gray-300">
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
                            onChange={(e) => handleFormChange('name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="template-category">Category</Label>
                          <Select value={formData.category} onValueChange={(value) => handleFormChange('category', value)}>
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
                            onChange={(e) => handleFormChange('subject', e.target.value)}
                          />
                          <p className="text-xs text-gray-500">Character count: {formData.subject.length}/60 (optimal)</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sequence-number">Sequence #</Label>
                          <Input 
                            id="sequence-number" 
                            type="number"
                            placeholder="1"
                            value={formData.sequence}
                            onChange={(e) => handleFormChange('sequence', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template-content-type">Content Type</Label>
                        <Select value={formData.contentType} onValueChange={(value) => handleFormChange('contentType', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select content type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Normal Text</SelectItem>
                            <SelectItem value="html">HTML</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email-content">Email Content</Label>
                        {formData.contentType === 'html' ? (
                          <RichTextEditor
                            value={formData.content}
                            onChange={(value) => handleFormChange('content', value)}
                            placeholder="Write your HTML email content here..."
                            height="400px"
                          />
                        ) : (
                          <Textarea 
                            id="email-content" 
                            rows={12}
                            placeholder="Write your plain text email content here..."
                            value={formData.content}
                            onChange={(e) => handleFormChange('content', e.target.value)}
                          />
                        )}
                      </div>

                      <div className="flex justify-between">
                        <div className="space-x-2">
                          <Button variant="outline" className="border-gray-300">
                            <Wand2 className="mr-2 h-4 w-4" />
                            AI Improve
                          </Button>
                          <Button variant="outline" className="border-gray-300">
                            Test A/B
                          </Button>
                        </div>
                        <div className="space-x-2">
                          <Button 
                            variant="outline" 
                            className="border-gray-300"
                            onClick={() => setActiveTab('templates')}
                          >
                            Cancel
                          </Button>
                          <Button 
                            className="text-white font-medium" 
                            style={{ backgroundColor: '#1e3a8a' }}
                            onClick={handleSaveTemplate}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save Template
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="mt-4">
                      <div className={`mx-auto border border-gray-300 rounded-lg p-6 bg-white ${
                        previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
                      }`}>
                        <div className="border-b border-gray-200 pb-4 mb-4">
                          <h4 className="font-medium">Subject: {formData.subject}</h4>
                          <p className="text-sm text-gray-500">From: you@company.com</p>
                          <p className="text-sm text-gray-500">To: john.doe@prospect.com</p>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <div dangerouslySetInnerHTML={{ 
                            __html: formData.contentType === 'html' ? formData.content : formData.content.replace(/\n/g, '<br/>') 
                          }} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="analytics" className="mt-4">
                      {formData.id && (
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
                              <li>• This template performs 15% above average</li>
                              <li>• Best sending time: Tuesday 10 AM</li>
                              <li>• Consider A/B testing the subject line</li>
                            </ul>
                          </div>
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
                  <p className="mt-2 text-gray-500">Select a template from the list to edit, or create a new one.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Variables Helper */}
        <Card className="border border-gray-200 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="font-nunito" style={{ color: '#012970' }}>Available Variables</CardTitle>
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