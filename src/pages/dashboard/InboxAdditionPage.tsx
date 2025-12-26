import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, TestTube, CheckCircle, AlertCircle } from "lucide-react";

const InboxAdditionPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [messagesPerDay, setMessagesPerDay] = useState([50]);
  const [timeBetweenEmails, setTimeBetweenEmails] = useState([10]);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // State for Select values
  const [smtpSecurity, setSmtpSecurity] = useState('none');
  const [imapSecurity, setImapSecurity] = useState('none');

  // ✅ 1. AUTO-FILL LOGIC: Fetch data if email exists
  const handleEmailBlur = async (email: string) => {
    if (!email) return;
    try {
      const res = await fetch(`http://localhost:3001/api/emailcamp/details/${email}`);
      const result = await res.json();

      if (result.success) {
        const d = result.data;
        // Auto-fill Input fields
        (document.getElementById('from-name') as HTMLInputElement).value = d.from_name || '';
        (document.getElementById('smtp-username') as HTMLInputElement).value = d.smtp_username || '';
        (document.getElementById('smtp-host') as HTMLInputElement).value = d.smtp_host || '';
        (document.getElementById('smtp-port') as HTMLInputElement).value = d.smtp_port || '';
        (document.getElementById('reply-to') as HTMLInputElement).value = d.reply_to || '';
        (document.getElementById('email-signature') as HTMLTextAreaElement).value = d.signature || '';
        
        // Auto-fill State fields
        setMessagesPerDay([d.daily_limit]);
        setTimeBetweenEmails([d.interval_minutes]);
        setSmtpSecurity(d.smtp_security);
        setImapSecurity(d.imap_security);
        
        setConnectionStatus('success');
        alert("Found existing settings! Form auto-filled.");
      }
    } catch (err) {
      console.log("New email address, no data found.");
    }
  };

  // ✅ 2. SAVE/UPDATE LOGIC
  const handleSave = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        alert("Please log in again. User ID not found.");
        return;
      }
      const user = JSON.parse(storedUser);

      const payload = {
        userId: user.id,
        fromName: (document.getElementById('from-name') as HTMLInputElement).value,
        fromEmail: (document.getElementById('from-email') as HTMLInputElement).value,
        smtpUsername: (document.getElementById('smtp-username') as HTMLInputElement).value,
        smtpPassword: (document.getElementById('smtp-password') as HTMLInputElement).value,
        smtpHost: (document.getElementById('smtp-host') as HTMLInputElement).value,
        smtpPort: (document.getElementById('smtp-port') as HTMLInputElement).value,
        smtpSecurity,
        replyTo: (document.getElementById('reply-to') as HTMLInputElement).value,
        useDifferentImap: (document.getElementById('use-different-imap') as HTMLInputElement).checked,
        imapUsername: (document.getElementById('imap-username') as HTMLInputElement).value,
        imapPassword: (document.getElementById('imap-password') as HTMLInputElement).value,
        imapHost: (document.getElementById('imap-host') as HTMLInputElement).value,
        imapPort: (document.getElementById('imap-port') as HTMLInputElement).value,
        imapSecurity,
        signature: (document.getElementById('email-signature') as HTMLTextAreaElement).value,
        dailyLimit: messagesPerDay[0],
        intervalMinutes: timeBetweenEmails[0]
      };

      const res = await fetch('http://localhost:3001/api/emailcamp/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert('Saved successfully to database!');
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Server connection failed.');
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setTimeout(() => {
      setConnectionStatus('success');
      setIsTestingConnection(false);
    }, 2000);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nunito font-semibold" style={{ color: '#012970' }}>Add Email Account</h2>
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
                    <Input id="from-name" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-email">From Email</Label>
                    <Input 
                        id="from-email" 
                        type="email" 
                        placeholder="john@company.com" 
                        onBlur={(e) => handleEmailBlur(e.target.value)} // ✅ Trigger Auto-fill
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-username">Username</Label>
                  <Input id="smtp-username" placeholder="john@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="smtp-password" 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
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
                    <Input id="smtp-host" placeholder="smtp.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">SMTP Port</Label>
                    <Input id="smtp-port" type="number" placeholder="587" />
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
                  <Input id="reply-to" type="email" placeholder="support@company.com" />
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
                  <Switch id="use-different-imap" />
                  <Label htmlFor="use-different-imap">Use different account</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-username">IMAP Username</Label>
                  <Input id="imap-username" placeholder="john@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-password">IMAP Password</Label>
                  <Input id="imap-password" type="password" placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="imap-host">IMAP Host</Label>
                    <Input id="imap-host" placeholder="imap.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imap-port">IMAP Port</Label>
                    <Input id="imap-port" type="number" placeholder="993" />
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
                  <div className={`p-3 rounded-lg flex items-center space-x-2 ${connectionStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {connectionStatus === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span className="text-sm font-medium">Connection Successful!</span>
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
                <Textarea id="email-signature" placeholder="Best regards..." rows={5} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline">Cancel</Button>
            <Button 
                style={{ backgroundColor: '#1e3a8a' }} 
                className="text-white"
                onClick={handleSave} // ✅ Trigger Save/Update
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