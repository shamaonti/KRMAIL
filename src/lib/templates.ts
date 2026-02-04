// Template management functions for localStorage
export interface EmailTemplate {
  id: number;
  user_id: number;
  name: string;
  subject: string;
  content: string;
  contentType: 'text' | 'html';
  category: string;
  template_type: 'marketing' | 'transactional' | 'newsletter' | 'followup';
  sequence: number;
  variables: string[];
  lastModified: string;
  performance?: {
    opens: string;
    clicks: string;
    replies: string;
  };
}

const TEMPLATES_STORAGE_KEY = 'mailskrap_templates';

export const getStoredTemplates = (userId: number): EmailTemplate[] => {
  const templates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
  const allTemplates = templates ? JSON.parse(templates) : [];
  return allTemplates.filter((template: EmailTemplate) => template.user_id === userId);
};

export const saveTemplate = (template: Omit<EmailTemplate, 'id' | 'lastModified'>): EmailTemplate => {
  console.log('💾 saveTemplate called with:', template.name, 'Type:', template.template_type);
  const allTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
  const templates = allTemplates ? JSON.parse(allTemplates) : [];
  console.log('📦 Current templates in storage:', templates.length);
  
  const newTemplate: EmailTemplate = {
    ...template,
    id: templates.length + 1,
    lastModified: new Date().toISOString().split('T')[0]
  };
  
  templates.push(newTemplate);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  console.log('✅ Template saved successfully. Total templates now:', templates.length);
  
  return newTemplate;
};

export const updateTemplate = (templateId: number, updates: Partial<EmailTemplate>): EmailTemplate => {
  const allTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
  const templates = allTemplates ? JSON.parse(allTemplates) : [];
  
  const templateIndex = templates.findIndex((t: EmailTemplate) => t.id === templateId);
  if (templateIndex === -1) {
    throw new Error('Template not found');
  }
  
  templates[templateIndex] = {
    ...templates[templateIndex],
    ...updates,
    lastModified: new Date().toISOString().split('T')[0]
  };
  
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  return templates[templateIndex];
};

export const deleteTemplate = (templateId: number, userId: number): boolean => {
  const allTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
  const templates = allTemplates ? JSON.parse(allTemplates) : [];
  
  const filteredTemplates = templates.filter((t: EmailTemplate) => 
    !(t.id === templateId && t.user_id === userId)
  );
  
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filteredTemplates));
  return true;
};

export const duplicateTemplate = (templateId: number, userId: number): EmailTemplate => {
  const allTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
  const templates = allTemplates ? JSON.parse(allTemplates) : [];
  
  const originalTemplate = templates.find((t: EmailTemplate) => t.id === templateId && t.user_id === userId);
  if (!originalTemplate) {
    throw new Error('Template not found');
  }
  
  const duplicatedTemplate: EmailTemplate = {
    ...originalTemplate,
    id: templates.length + 1,
    name: `${originalTemplate.name} (Copy)`,
    lastModified: new Date().toISOString().split('T')[0]
  };
  
  templates.push(duplicatedTemplate);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  
  return duplicatedTemplate;
};

// Extract variables from template content
export const extractVariables = (content: string): string[] => {
  const variableRegex = /\{([^}]+)\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = variableRegex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
};

// Initialize with some default templates
export const initializeDefaultTemplates = (userId: number) => {
  console.log('🔄 Initializing default templates for user:', userId);
  const existingTemplates = getStoredTemplates(userId);
  console.log('📦 Existing templates found:', existingTemplates.length);
  
  if (existingTemplates.length === 0) {
    console.log('📝 No existing templates, creating defaults...');
    const defaultTemplates = [
      {
        user_id: userId,
        name: 'Welcome Email',
        subject: 'Welcome to {Company}! Let\'s get started',
        category: 'Welcome',
        template_type: 'marketing' as const,
        sequence: 1,
        content: '<h2>Hi {Name},</h2><p>Welcome to our service! We\'re excited to have you on board.</p><p>Best regards,<br>The {Company} Team</p>',
        contentType: 'html' as const,
        variables: ['Name', 'Company'],
        performance: { opens: '28%', clicks: '4.5%', replies: '2.1%' }
      },
      {
        user_id: userId,
        name: 'Follow-up Email',
        subject: 'Did you see our previous email?',
        category: 'Follow-up',
        template_type: 'followup' as const,
        sequence: 2,
        content: '<h2>Following up on our previous email</h2><p>Hi {FirstName},</p><p>I wanted to follow up on the email I sent you earlier. I hope you found it helpful!</p><p>If you have any questions or would like to learn more, please don\'t hesitate to reach out.</p><p>Best regards,<br>The MailSkrap Team</p>',
        contentType: 'html' as const,
        variables: ['FirstName'],
        performance: { opens: '22%', clicks: '3.2%', replies: '1.8%' }
      },
      {
        user_id: userId,
        name: 'Newsletter Template',
        subject: 'Monthly Newsletter - {Date}',
        category: 'Newsletter',
        template_type: 'newsletter' as const,
        sequence: 1,
        content: '<h1>Monthly Newsletter</h1><p>Hi {Name},</p><p>Here are the latest updates and news from our team at {Company}.</p><h3>This Month\'s Highlights:</h3><ul><li>Feature updates</li><li>Company news</li><li>Industry insights</li></ul><p>Thank you for being part of our community!</p>',
        contentType: 'html' as const,
        variables: ['Name', 'Company', 'Date'],
        performance: { opens: '35%', clicks: '8.2%', replies: '0.5%' }
      }
    ];
    
    defaultTemplates.forEach(template => {
      console.log('💾 Saving template:', template.name, 'Type:', template.template_type);
      saveTemplate(template);
    });
    console.log('✅ Default templates created successfully');
  } else {
    console.log('✅ Templates already exist, skipping initialization');
  }
};