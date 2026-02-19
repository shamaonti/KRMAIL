import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, TestTube } from "lucide-react";
const API_BASE =
  (import.meta.env.VITE_API_URL || "http://localhost:3001") +
  "/api/emailcamp";

const InboxAdditionPage = () => {
  const [showPassword, setShowPassword] = useState({});
  const [messagesPerDay, setMessagesPerDay] = useState([50]);
  const [timeBetweenEmails, setTimeBetweenEmails] = useState([10]);

  const [formData, setFormData] = useState({
    useDifferentImap: false,
    // ✅ signature yahan se HATA diya — ab har config mein hoga
  });

  // ✅ Combined configs - ek ID ke liye SMTP + IMAP + Signature teeno
  const [emailConfigs, setEmailConfigs] = useState([
    {
      id: 1,
      recordId: null,
      // SMTP fields
      fromName: '',
      fromEmail: '',
      smtpUsername: '',
      smtpPassword: '',
      smtpHost: '',
      smtpPort: '',
      smtpSecurity: 'tls',
      replyTo: '',
      // IMAP fields
      imapUsername: '',
      imapPassword: '',
      imapHost: '',
      imapPort: '993',
      imapSecurity: 'ssl',
      // ✅ Per-account signature
      signature: ''
    }
  ]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addEmailConfig = () => {
    setEmailConfigs([...emailConfigs, {
      id: Date.now(),
      recordId: null,
      fromName: '',
      fromEmail: '',
      smtpUsername: '',
      smtpPassword: '',
      smtpHost: '',
      smtpPort: '',
      smtpSecurity: 'tls',
      replyTo: '',
      imapUsername: '',
      imapPassword: '',
      imapHost: '',
      imapPort: '993',
      imapSecurity: 'ssl',
      // ✅ Naye account ka apna alag signature
      signature: ''
    }]);
  };

  const handleConfigChange = (id, field, value) => {
    setEmailConfigs(emailConfigs.map(cfg =>
      cfg.id === id ? { ...cfg, [field]: value } : cfg
    ));
  };

  const removeConfig = (id) => {
    if (emailConfigs.length > 1) {
      setEmailConfigs(emailConfigs.filter(c => c.id !== id));
    }
  };

  const togglePasswordVisibility = (id) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCurrentUserId = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || 1;
  };

  const loadSavedData = async () => {
    try {
      const userId = getCurrentUserId();
      const res = await fetch(
        `${API_BASE}/details/${userId}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
      const result = await res.json();
      
      if (!result.success || !result.data || result.data.length === 0) {
        console.log("No saved data found.");
        return;
      }

      const configs = result.data.map((d, index) => ({
        id: Date.now() + index,
        recordId: d.id,
        // SMTP
        fromName: d.from_name || '',
        fromEmail: d.from_email || '',
        smtpUsername: d.smtp_username || '',
        smtpPassword: '',
        smtpHost: d.smtp_host || '',
        smtpPort: String(d.smtp_port || ''),
        smtpSecurity: d.smtp_security || 'tls',
        replyTo: d.reply_to || '',
        // IMAP
        imapUsername: d.imap_username || '',
        imapPassword: '',
        imapHost: d.imap_host || '',
        imapPort: String(d.imap_port || '993'),
        imapSecurity: d.imap_security || 'ssl',
        // ✅ Har account ka apna signature DB se load hoga
        signature: d.signature || ''
      }));

      setEmailConfigs(configs);

      // Common settings from first record
      const d0 = result.data[0];
      setFormData({
        useDifferentImap: d0.use_different_imap === 1,
        // ✅ signature yahan se hata diya
      });

      setMessagesPerDay([Number(d0.daily_limit) || 50]);
      setTimeBetweenEmails([Number(d0.interval_minutes) || 10]);

      console.log("✅ Data loaded successfully!");
    } catch (err) {
      console.error(err);
      console.log("⚠️ Failed to load data.");
    }
  };

  useEffect(() => {
    loadSavedData();
  }, []);

  const handleSave = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        alert("❌ Please log in again.");
        return;
      }
      const user = JSON.parse(storedUser);

      for (let config of emailConfigs) {
        if (!config.fromEmail) continue;

        const payload = {
          userId: user.id,
          recordId: config.recordId,
          // SMTP
          fromName: config.fromName,
          fromEmail: config.fromEmail,
          smtpUsername: config.smtpUsername,
          smtpPassword: config.smtpPassword,
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          smtpSecurity: config.smtpSecurity,
          replyTo: config.replyTo,
          // IMAP
          imapUsername: config.imapUsername,
          imapPassword: config.imapPassword,
          imapHost: config.imapHost,
          imapPort: config.imapPort,
          imapSecurity: config.imapSecurity,
          // Settings
          useDifferentImap: formData.useDifferentImap ? 1 : 0,
          // ✅ Har config ka apna signature save hoga
          signature: config.signature,
          dailyLimit: messagesPerDay[0],
          intervalMinutes: timeBetweenEmails[0]
        };

        const response = await fetch(`${API_BASE}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Save failed at server");
      }

      alert("✅ All configurations saved successfully!");
      await loadSavedData();
      
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
            <Button style={{ backgroundColor: '#1e3a8a' }} className="text-white py-2 px-3">
              <TestTube className="mr-1 h-4 w-4" /> Test
            </Button>
          </div>
        </div>
      </header>

      <main className="p-3 md:p-6 bg-gray-100 min-h-screen">
        <Card className="w-full shadow-lg border bg-white">
          <CardContent className="p-4 space-y-6">

            {/* COMBINED EMAIL CONFIGS */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold">Email Accounts</h3>
                <Button 
                  size="sm" 
                  style={{ backgroundColor: '#1e3a8a', color: 'white' }} 
                  onClick={addEmailConfig}
                >
                  + Add Email Account
                </Button>
              </div>

              {emailConfigs.map((config) => (
                <div key={config.id} className="mb-6 relative border-2 p-4 rounded-lg bg-gray-50 shadow">
                  {/* Remove button */}
                  {emailConfigs.length > 1 && (
                    <button
                      className="absolute top-2 right-2 text-red-500 font-bold text-xl hover:text-red-700"
                      onClick={() => removeConfig(config.id)}
                    >
                      &times;
                    </button>
                  )}

                  {config.recordId && (
                    <div className="text-xs text-blue-600 font-semibold mb-3">
                      📧 Account ID: {config.recordId}
                    </div>
                  )}

                  {/* SMTP SETTINGS */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">
                      📤 SMTP Settings (Sending)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-sm">From Name</Label>
                        <Input 
                          placeholder="Sender name" 
                          value={config.fromName} 
                          onChange={e => handleConfigChange(config.id, 'fromName', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label className="text-sm">From Email*</Label>
                        <Input 
                          placeholder="example@email.com" 
                          type="email" 
                          value={config.fromEmail} 
                          onChange={e => handleConfigChange(config.id, 'fromEmail', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label className="text-sm">SMTP Username</Label>
                        <Input 
                          placeholder="SMTP username" 
                          value={config.smtpUsername} 
                          onChange={e => handleConfigChange(config.id, 'smtpUsername', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label className="text-sm">SMTP Password</Label>
                        <div className="relative">
                          <Input 
                            placeholder="SMTP password" 
                            type={showPassword[config.id] ? "text" : "password"} 
                            value={config.smtpPassword} 
                            onChange={e => handleConfigChange(config.id, 'smtpPassword', e.target.value)} 
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="absolute right-1 top-1" 
                            onClick={() => togglePasswordVisibility(config.id)}
                          >
                            {showPassword[config.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">SMTP Host</Label>
                        <Input 
                          placeholder="smtp.gmail.com" 
                          value={config.smtpHost} 
                          onChange={e => handleConfigChange(config.id, 'smtpHost', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label className="text-sm">SMTP Port</Label>
                        <Input 
                          placeholder="587" 
                          value={config.smtpPort} 
                          onChange={e => handleConfigChange(config.id, 'smtpPort', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Security</Label>
                        <Select 
                          value={config.smtpSecurity} 
                          onValueChange={val => handleConfigChange(config.id, 'smtpSecurity', val)}
                        >
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
                        <Input 
                          placeholder="reply@email.com" 
                          value={config.replyTo} 
                          onChange={e => handleConfigChange(config.id, 'replyTo', e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* IMAP SETTINGS */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">
                      📥 IMAP Settings (Receiving)
                    </h4>
                    
                    <div className="flex items-center gap-2 mb-3 bg-blue-50 p-2 rounded">
                      <Switch 
                        checked={formData.useDifferentImap} 
                        onCheckedChange={v => handleInputChange('useDifferentImap', v)} 
                      />
                      <Label className="text-sm font-semibold">Use different account for receiving emails</Label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div>
                        <Label className="text-sm">IMAP Username</Label>
                        <Input 
                          placeholder="IMAP username" 
                          value={config.imapUsername} 
                          onChange={e => handleConfigChange(config.id, 'imapUsername', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label className="text-sm">IMAP Password</Label>
                        <Input 
                          placeholder="IMAP password" 
                          type="password" 
                          value={config.imapPassword} 
                          onChange={e => handleConfigChange(config.id, 'imapPassword', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label className="text-sm">IMAP Host</Label>
                        <Input 
                          placeholder="imap.gmail.com" 
                          value={config.imapHost} 
                          onChange={e => handleConfigChange(config.id, 'imapHost', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label className="text-sm">IMAP Port</Label>
                        <Input 
                          placeholder="993" 
                          value={config.imapPort} 
                          onChange={e => handleConfigChange(config.id, 'imapPort', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label className="text-sm">IMAP Security</Label>
                        <Select 
                          value={config.imapSecurity} 
                          onValueChange={val => handleConfigChange(config.id, 'imapSecurity', val)}
                        >
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

                  {/* ✅ EMAIL SIGNATURE — Per Account, Card ke andar */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-2">
                      ✍️ Email Signature
                    </h4>
                    <Textarea
                      placeholder={`Write signature for ${config.fromEmail || 'this account'}...`}
                      value={config.signature}
                      onChange={e => handleConfigChange(config.id, 'signature', e.target.value)}
                      rows={3}
                    />
                  </div>

                </div>
              ))}
            </div>

            {/* EMAIL SETTINGS */}
            <div>
              <h3 className="text-base font-bold mb-3">Email Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex justify-between text-sm mb-2">
                    <span>Messages Per Day</span>
                    <span className="font-semibold text-blue-600">{messagesPerDay[0]}</span>
                  </Label>
                  <Slider 
                    value={messagesPerDay} 
                    onValueChange={setMessagesPerDay} 
                    max={20000} 
                    min={1} 
                  />
                </div>
                <div>
                  <Label className="flex justify-between text-sm mb-2">
                    <span>Time Between Emails (mins)</span>
                    <span className="font-semibold text-blue-600">{timeBetweenEmails[0]}</span>
                  </Label>
                  <Slider 
                    value={timeBetweenEmails} 
                    onValueChange={setTimeBetweenEmails} 
                    max={60} 
                    min={3} 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline">Cancel</Button>
              <Button 
                style={{ backgroundColor: '#1e3a8a' }} 
                className="text-white px-6" 
                onClick={handleSave}
              >
                💾 Save All Accounts
              </Button>
            </div>

          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default InboxAdditionPage;