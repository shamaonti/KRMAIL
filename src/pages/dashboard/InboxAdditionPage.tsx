import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, TestTube, Database } from "lucide-react";

const InboxAdditionPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [messagesPerDay, setMessagesPerDay] = useState([50]);
  const [timeBetweenEmails, setTimeBetweenEmails] = useState([10]);

  const [formData, setFormData] = useState({
    useDifferentImap: false,
    signature: ''
  });

  const [smtpConfigs, setSmtpConfigs] = useState([
    {
      id: 1,
      fromName: '',
      fromEmail: '',
      smtpUsername: '',
      smtpPassword: '',
      smtpHost: '',
      smtpPort: '',
      smtpSecurity: 'tls',
      replyTo: ''
    }
  ]);

  const [imapConfigs, setImapConfigs] = useState([
    {
      id: 1,
      imapUsername: '',
      imapPassword: '',
      imapHost: '',
      imapPort: '993',
      imapSecurity: 'ssl'
    }
  ]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSMTPConfig = () => {
    setSmtpConfigs([...smtpConfigs, {
      id: Date.now(),
      fromName: '',
      fromEmail: '',
      smtpUsername: '',
      smtpPassword: '',
      smtpHost: '',
      smtpPort: '',
      smtpSecurity: 'tls',
      replyTo: ''
    }]);
  };

  const handleSMTPChange = (id, field, value) => {
    setSmtpConfigs(smtpConfigs.map(cfg =>
      cfg.id === id ? { ...cfg, [field]: value } : cfg
    ));
  };

  const addIMAPConfig = () => {
    setImapConfigs([...imapConfigs, {
      id: Date.now() + 1,
      imapUsername: '',
      imapPassword: '',
      imapHost: '',
      imapPort: '993',
      imapSecurity: 'ssl'
    }]);
  };

  const handleIMAPChange = (id, field, value) => {
    setImapConfigs(imapConfigs.map(cfg =>
      cfg.id === id ? { ...cfg, [field]: value } : cfg
    ));
  };

  const handleHold = async () => {
    const email = smtpConfigs[0]?.fromEmail.trim();
    if (!email) { 
      alert("⚠️ Please enter an email first"); 
      return; 
    }

    try {
      const res = await fetch(`http://localhost:3001/api/emailcamp/details/${email}`);
      const result = await res.json();

      if (result.success && result.data) {
        const d = result.data;

        setSmtpConfigs([{
          id: 1,
          fromName: d.from_name || '',
          fromEmail: d.from_email || email,
          smtpUsername: d.smtp_username || '',
          smtpPassword: '',
          smtpHost: d.smtp_host || '',
          smtpPort: String(d.smtp_port || ''),
          smtpSecurity: d.smtp_security || 'tls',
          replyTo: d.reply_to || ''
        }]);

        setImapConfigs([{
          id: 1,
          imapUsername: d.imap_username || '',
          imapPassword: '',
          imapHost: d.imap_host || '',
          imapPort: String(d.imap_port || '993'),
          imapSecurity: d.imap_security || 'ssl'
        }]);

        setFormData({
          useDifferentImap: d.use_different_imap === 1,
          signature: d.signature || ''
        });

        setMessagesPerDay([parseInt(d.daily_limit) || 50]);
        setTimeBetweenEmails([parseInt(d.interval_minutes) || 10]);

        alert("✅ Data loaded successfully!");
      } else {
        alert("ℹ️ No saved data found.");
      }
    } catch (err) {
      alert("⚠️ Load failed.");
    }
  };

  const handleSave = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        alert("❌ Please log in again.");
        return;
      }
      const user = JSON.parse(storedUser);

      // Loop and save each SMTP/IMAP pair
      for (let i = 0; i < smtpConfigs.length; i++) {
        const smtp = smtpConfigs[i];
        const imap = imapConfigs[i] || imapConfigs[0];

        if (!smtp.fromEmail) continue;

        const payload = {
          userId: user.id,
          // Sending fields
          fromName: smtp.fromName,
          fromEmail: smtp.fromEmail,
          smtpUsername: smtp.smtpUsername,
          smtpPassword: smtp.smtpPassword,
          smtpHost: smtp.smtpHost,
          smtpPort: smtp.smtpPort,
          smtpSecurity: smtp.smtpSecurity,
          replyTo: smtp.replyTo,
          // Receiving fields
          imapUsername: imap.imapUsername,
          imapPassword: imap.imapPassword,
          imapHost: imap.imapHost,
          imapPort: imap.imapPort,
          imapSecurity: imap.imapSecurity,
          // Settings
          useDifferentImap: formData.useDifferentImap ? 1 : 0,
          signature: formData.signature,
          dailyLimit: messagesPerDay[0],
          intervalMinutes: timeBetweenEmails[0]
        };

        const response = await fetch('http://localhost:3001/api/emailcamp/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Save failed at server");
      }

      alert("✅ All configurations saved successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Error while saving.");
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold" style={{ color: '#012970' }}>Add Email Account</h2>
          <div className="flex space-x-2">
            <Button style={{ backgroundColor: '#059669' }} className="text-white py-2 px-3" onClick={handleHold}>
              <Database className="mr-1 h-4 w-4" /> Hold
            </Button>
            <Button style={{ backgroundColor: '#1e3a8a' }} className="text-white py-2 px-3">
              <TestTube className="mr-1 h-4 w-4" /> Test
            </Button>
          </div>
        </div>
      </header>

      <main className="p-3 md:p-6 bg-gray-100 min-h-screen">
        <Card className="w-full shadow-lg border bg-white">
          <CardContent className="p-4 space-y-6">

            {/* SMTP SECTION */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-bold">SMTP Settings (Sending)</h3>
                <Button size="sm" style={{ backgroundColor: '#1e3a8a', color: 'white' }} onClick={addSMTPConfig}>
                  + Add SMTP
                </Button>
              </div>

              {smtpConfigs.map(config => (
                <div key={config.id} className="mb-4 relative border p-3 rounded-md bg-white shadow">
                  <button
                    className="absolute top-2 right-2 text-red-500 font-bold text-lg"
                    onClick={() => setSmtpConfigs(smtpConfigs.filter(c => c.id !== config.id))}
                  >
                    &times;
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-sm">From Name</Label>
                      <Input placeholder="Enter sender name" value={config.fromName} onChange={e => handleSMTPChange(config.id, 'fromName', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">From Email</Label>
                      <Input placeholder="example@email.com" type="email" value={config.fromEmail} onChange={e => handleSMTPChange(config.id, 'fromEmail', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">Username</Label>
                      <Input placeholder="SMTP username" value={config.smtpUsername} onChange={e => handleSMTPChange(config.id, 'smtpUsername', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">Password</Label>
                      <div className="relative">
                        <Input placeholder="SMTP password" type={showPassword ? "text" : "password"} value={config.smtpPassword} onChange={e => handleSMTPChange(config.id, 'smtpPassword', e.target.value)} />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">SMTP Host</Label>
                      <Input placeholder="smtp.yourmail.com" value={config.smtpHost} onChange={e => handleSMTPChange(config.id, 'smtpHost', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">SMTP Port</Label>
                      <Input placeholder="587" value={config.smtpPort} onChange={e => handleSMTPChange(config.id, 'smtpPort', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">Security</Label>
                      <Select value={config.smtpSecurity} onValueChange={val => handleSMTPChange(config.id, 'smtpSecurity', val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Reply To</Label>
                      <Input placeholder="reply@email.com" value={config.replyTo} onChange={e => handleSMTPChange(config.id, 'replyTo', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <hr />

            {/* IMAP SECTION */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-bold">IMAP Settings (Receiving)</h3>
                <Button size="sm" style={{ backgroundColor: '#1e3a8a', color: 'white' }} onClick={addIMAPConfig}>
                  + Add IMAP
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Switch checked={formData.useDifferentImap} onCheckedChange={v => handleInputChange('useDifferentImap', v)} />
                <Label className="text-sm">Use different account for receiving</Label>
              </div>

              {imapConfigs.map(config => (
                <div key={config.id} className="mb-4 relative border p-3 rounded-md bg-white shadow">
                  <button
                    className="absolute top-2 right-2 text-red-500 font-bold text-lg"
                    onClick={() => setImapConfigs(imapConfigs.filter(c => c.id !== config.id))}
                  >
                    &times;
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-sm">IMAP Username</Label>
                      <Input placeholder="IMAP username" value={config.imapUsername} onChange={e => handleIMAPChange(config.id, 'imapUsername', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">IMAP Password</Label>
                      <Input placeholder="IMAP password" type="password" value={config.imapPassword} onChange={e => handleIMAPChange(config.id, 'imapPassword', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">IMAP Host</Label>
                      <Input placeholder="imap.yourmail.com" value={config.imapHost} onChange={e => handleIMAPChange(config.id, 'imapHost', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">IMAP Port</Label>
                      <Input placeholder="993" value={config.imapPort} onChange={e => handleIMAPChange(config.id, 'imapPort', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">IMAP Security</Label>
                      <Select value={config.imapSecurity} onValueChange={val => handleIMAPChange(config.id, 'imapSecurity', val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ssl">SSL</SelectItem>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <hr />

            {/* EMAIL SETTINGS */}
            <div>
              <h3 className="text-base font-bold mb-2">Email Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="flex justify-between text-sm">
                    <span>Messages Per Day</span>
                    <span>{messagesPerDay[0]}</span>
                  </Label>
                  <Slider value={messagesPerDay} onValueChange={setMessagesPerDay} max={480} min={1} />
                </div>
                <div>
                  <Label className="flex justify-between text-sm">
                    <span>Time Between Emails (mins)</span>
                    <span>{timeBetweenEmails[0]}</span>
                  </Label>
                  <Slider value={timeBetweenEmails} onValueChange={setTimeBetweenEmails} max={60} min={3} />
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-sm">Email Signature</Label>
                <Textarea placeholder="Write your email signature here..." value={formData.signature} onChange={e => handleInputChange('signature', e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline">Cancel</Button>
              <Button style={{ backgroundColor: '#1e3a8a' }} className="text-white" onClick={handleSave}>
                Save Email Account
              </Button>
            </div>

          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default InboxAdditionPage;