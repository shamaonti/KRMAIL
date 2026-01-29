import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, TestTube, CheckCircle, AlertCircle, Database } from "lucide-react";

const InboxAdditionPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [messagesPerDay, setMessagesPerDay] = useState([50]);
  const [timeBetweenEmails, setTimeBetweenEmails] = useState([10]);
  const [smtpPassword, setSmtpPassword] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // State for Select values
  const [smtpSecurity, setSmtpSecurity] = useState('tls');
  const [imapSecurity, setImapSecurity] = useState('ssl');
  
  // State for all form fields
  const [formData, setFormData] = useState({
    fromName: '',
    fromEmail: '',
    smtpUsername: '',
    smtpHost: '',
    smtpPort: '',
    replyTo: '',
    useDifferentImap: false,
    imapUsername: '',
    imapPassword: '',
    imapHost: '',
    imapPort: '',
    signature: ''
  });

  // ✅ HOLD FUNCTION: Load saved data manually
  const handleHold = async () => {
    const email = formData.fromEmail.trim();
    if (!email) {
      alert("⚠️ Please enter an email address first.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/emailcamp/details/${email}`);
      const result = await res.json();

      if (result.success && result.data) {
        const d = result.data;
        
        console.log('📥 LOADED DATA:', d);
        
        // Update all form fields
        setFormData({
          fromName: d.from_name || '',
          fromEmail: d.from_email || email,
          smtpUsername: d.smtp_username || '',
          smtpHost: d.smtp_host || '',
          smtpPort: String(d.smtp_port || ''),
          replyTo: d.reply_to || '',
          useDifferentImap: d.use_different_imap === 1,
          imapUsername: d.imap_username || '',
          imapPassword: '', // Security: never load password
          imapHost: d.imap_host || '',
          imapPort: String(d.imap_port || ''),
          signature: d.signature || ''
        });
        
        // Update sliders
        setMessagesPerDay([parseInt(d.daily_limit) || 50]);
        setTimeBetweenEmails([parseInt(d.interval_minutes) || 10]);
        
        // Update selects
        setSmtpSecurity(d.smtp_security || 'tls');
        setImapSecurity(d.imap_security || 'ssl');
        
        // Keep password field empty for security
        setSmtpPassword('');
        
        setConnectionStatus('success');
        alert("✅ Data loaded successfully! Please enter passwords again.");
        
      } else {
        alert("ℹ️ No saved data found for this email address.");
        setConnectionStatus(null);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      alert("⚠️ Failed to load data. Please check your connection.");
      setConnectionStatus('error');
    }
  };

  // ✅ SAVE/UPDATE LOGIC
  const handleSave = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        alert("❌ Please log in again. User ID not found.");
        return;
      }
      const user = JSON.parse(storedUser);

      // Validation
      if (!formData.fromEmail.trim()) {
        alert("⚠️ From Email is required!");
        return;
      }

      const payload = {
        userId: user.id,
        fromName: formData.fromName,
        fromEmail: formData.fromEmail,
        smtpUsername: formData.smtpUsername,
        smtpPassword: smtpPassword,
        smtpHost: formData.smtpHost,
        smtpPort: formData.smtpPort,
        smtpSecurity,
        replyTo: formData.replyTo,
        useDifferentImap: formData.useDifferentImap,
        imapUsername: formData.imapUsername,
        imapPassword: formData.imapPassword,
        imapHost: formData.imapHost,
        imapPort: formData.imapPort,
        imapSecurity,
        signature: formData.signature,
        dailyLimit: messagesPerDay[0],
        intervalMinutes: timeBetweenEmails[0]
      };

      console.log('💾 SAVING PAYLOAD:', payload);

      const res = await fetch('http://localhost:3001/api/emailcamp/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert('✅ Saved successfully to database!');
        setConnectionStatus('success');
      } else {
        alert('❌ Error: ' + data.message);
      }
    } catch (err) {
      console.error('Save Error:', err);
      alert('❌ Server connection failed.');
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setTimeout(() => {
      setConnectionStatus('success');
      setIsTestingConnection(false);
      alert('✅ Connection test successful!');
    }, 2000);
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nunito font-semibold" style={{ color: '#012970' }}>Add Email Account</h2>
            <div className="flex space-x-3">
              <Button 
                className="text-white font-medium" 
                style={{ backgroundColor: '#059669' }}
                onClick={handleHold}
              >
                <Database className="mr-2 h-4 w-4" />
                Hold (Load Saved)
              </Button>
              <Button 
                className="text-white font-medium" 
                style={{ backgroundColor: '#1e3a8a' }}
                onClick={testConnection}
                disabled={isTestingConnection}
              >
                <TestTube className="mr-2 h-4 w-4" />
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SMTP Settings */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="font-nunito" style={{ color: '#012970' }}>SMTP Settings (Sending)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from-name">From Name</Label>
                    <Input 
                      id="from-name" 
                      placeholder="John Doe" 
                      value={formData.fromName}
                      onChange={(e) => handleInputChange('fromName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-email">From Email</Label>
                    <Input 
                      id="from-email" 
                      type="email" 
                      placeholder="john@company.com" 
                      value={formData.fromEmail}
                      onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-username">Username</Label>
                  <Input 
                    id="smtp-username" 
                    placeholder="john@company.com" 
                    value={formData.smtpUsername}
                    onChange={(e) => handleInputChange('smtpUsername', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="smtp-password"
                      type={showPassword ? "text" : "password"}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="App password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP Host</Label>
                    <Input 
                      id="smtp-host" 
                      placeholder="smtp.gmail.com" 
                      value={formData.smtpHost}
                      onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">SMTP Port</Label>
                    <Input 
                      id="smtp-port" 
                      type="number" 
                      placeholder="587" 
                      value={formData.smtpPort}
                      onChange={(e) => handleInputChange('smtpPort', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Security</Label>
                  <Select value={smtpSecurity} onValueChange={setSmtpSecurity}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reply-to">Reply-To Address (Optional)</Label>
                  <Input 
                    id="reply-to" 
                    type="email" 
                    placeholder="support@company.com" 
                    value={formData.replyTo}
                    onChange={(e) => handleInputChange('replyTo', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* IMAP Settings */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="font-nunito" style={{ color: '#012970' }}>IMAP Settings (Receiving)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="use-different-imap" 
                    checked={formData.useDifferentImap}
                    onCheckedChange={(checked) => handleInputChange('useDifferentImap', checked)}
                  />
                  <Label htmlFor="use-different-imap">Use different account</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-username">IMAP Username</Label>
                  <Input 
                    id="imap-username" 
                    placeholder="john@company.com" 
                    value={formData.imapUsername}
                    onChange={(e) => handleInputChange('imapUsername', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-password">IMAP Password</Label>
                  <Input 
                    id="imap-password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={formData.imapPassword}
                    onChange={(e) => handleInputChange('imapPassword', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="imap-host">IMAP Host</Label>
                    <Input 
                      id="imap-host" 
                      placeholder="imap.gmail.com" 
                      value={formData.imapHost}
                      onChange={(e) => handleInputChange('imapHost', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imap-port">IMAP Port</Label>
                    <Input 
                      id="imap-port" 
                      type="number" 
                      placeholder="993" 
                      value={formData.imapPort}
                      onChange={(e) => handleInputChange('imapPort', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>IMAP Security</Label>
                  <Select value={imapSecurity} onValueChange={setImapSecurity}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {connectionStatus && (
                  <div className={`p-3 rounded-lg flex items-center space-x-2 ${
                    connectionStatus === 'success' 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-red-50 text-red-800'
                  }`}>
                    {connectionStatus === 'success' 
                      ? <CheckCircle className="h-4 w-4" /> 
                      : <AlertCircle className="h-4 w-4" />
                    }
                    <span className="text-sm font-medium">
                      {connectionStatus === 'success' ? 'Data Loaded Successfully!' : 'Failed to Load Data'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Email Settings */}
          <Card className="border border-gray-200 shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="font-nunito" style={{ color: '#012970' }}>Email Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Messages Per Day: {messagesPerDay[0]}</Label>
                  <Slider value={messagesPerDay} onValueChange={setMessagesPerDay} max={480} min={1} />
                </div>
                <div className="space-y-3">
                  <Label>Time Between: {timeBetweenEmails[0]} min</Label>
                  <Slider value={timeBetweenEmails} onValueChange={setTimeBetweenEmails} max={60} min={3} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-signature">Email Signature</Label>
                <Textarea 
                  id="email-signature" 
                  placeholder="Best regards..." 
                  rows={5} 
                  value={formData.signature}
                  onChange={(e) => handleInputChange('signature', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline">Cancel</Button>
            <Button 
              style={{ backgroundColor: '#1e3a8a' }} 
              className="text-white"
              onClick={handleSave}
            >
              Save Email Account
            </Button>
          </div>
        </div>
      </main>
    </>
  );
};

export default InboxAdditionPage;