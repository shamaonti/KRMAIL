import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, TestTube, Save, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useHeaderActions } from "@/components/Header"; // ← ADD

const API_BASE =
  (import.meta.env.VITE_API_URL || "http://localhost:3001") +
  "/api/emailcamp";

const InboxAdditionPage = () => {
  const { setHeaderActions } = useHeaderActions(); // ← ADD

const [showPassword, setShowPassword] = useState({});
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountPage, setAccountPage] = useState(1);
  const ACCOUNT_PAGE_SIZE = 10;
  const [messagesPerDay, setMessagesPerDay] = useState([50]);
  const [timeBetweenEmails, setTimeBetweenEmails] = useState([10]);

  const [formData, setFormData] = useState({
    useDifferentImap: false,
  });

  const [emailConfigs, setEmailConfigs] = useState([
    {
      id: 1,
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
      signature: ''
    }]);
  };

  const handleConfigChange = (id, field, value) => {
    setEmailConfigs(emailConfigs.map(cfg =>
      cfg.id === id ? { ...cfg, [field]: value } : cfg
    ));
  };

  const removeConfig = async (id) => {
    if (emailConfigs.length <= 1) return;

    const confirmed = window.confirm("⚠️ Are you sure you want to delete this account?");
    if (!confirmed) {
      alert("❌ Deletion cancelled!");
      return;
    }
    const config = emailConfigs.find(c => c.id === id);

    if (config?.recordId) {
      try {
        const res = await fetch(`${API_BASE}/delete/${config.recordId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const result = await res.json();
        if (!result.success) {
          alert("❌ Failed to delete: " + result.message);
          return;
        }
      } catch (err) {
        alert("❌ Error deleting account.");
        return;
      }
    }

    setEmailConfigs(prev => prev.filter(c => c.id !== id));
    alert("✅ Account removed successfully!");
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
      const res = await fetch(`${API_BASE}/details/${userId}`, {
        method: 'GET',
        credentials: 'include',
      });
      const result = await res.json();

      if (!result.success || !result.data || result.data.length === 0) return;

      // Only load into TABLE — do NOT fill the form
      setSavedAccounts(result.data);

    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { loadSavedData(); }, []);

  const handleEdit = (account) => {
    setEditingId(account.id);
    setEmailConfigs([{
      id: Date.now(),
      recordId: account.id,
      fromName: account.from_name || '',
      fromEmail: account.from_email || '',
      smtpUsername: account.smtp_username || '',
      smtpPassword: '',
      smtpHost: account.smtp_host || '',
      smtpPort: String(account.smtp_port || ''),
      smtpSecurity: account.smtp_security || 'tls',
      replyTo: account.reply_to || '',
      imapUsername: account.imap_username || '',
      imapPassword: '',
      imapHost: account.imap_host || '',
      imapPort: String(account.imap_port || '993'),
      imapSecurity: account.imap_security || 'ssl',
      signature: account.signature || ''
    }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm("⚠️ Are you sure you want to delete this account?")) return;
    try {
      const res = await fetch(`${API_BASE}/delete/${accountId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await res.json();
      if (result.success) {
        alert("✅ Account deleted!");
        await loadSavedData();
      } else {
        alert("❌ Failed: " + result.message);
      }
    } catch {
      alert("❌ Error deleting.");
    }
  };

  const handleTestConnection = async (config) => {
    try {
      if (!config.smtpHost || !config.smtpPort || !config.smtpUsername || !config.smtpPassword) {
        alert("❌ Please fill all SMTP details first");
        return;
      }
      const response = await fetch(`${API_BASE}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          smtpUsername: config.smtpUsername,
          smtpPassword: config.smtpPassword,
          smtpSecurity: config.smtpSecurity
        })
      });
      const result = await response.json();
      alert(result.success ? "✅ Test Connection Successful" : "❌ " + result.message);
    } catch {
      alert("❌ Connection Failed");
    }
  };

  const handleSave = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) { alert("❌ Please log in again."); return; }
      const user = JSON.parse(storedUser);

     // ✅ FIRST: Check SMTP before saving
      for (let config of emailConfigs) {
        if (!config.fromEmail) continue;

        if (!config.smtpHost || !config.smtpPort || !config.smtpUsername || !config.smtpPassword) {
          alert(`❌ Please fill all SMTP details for: ${config.fromEmail}`);
          return;
        }

        const testRes = await fetch(`${API_BASE}/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            smtpHost: config.smtpHost,
            smtpPort: config.smtpPort,
            smtpUsername: config.smtpUsername,
            smtpPassword: config.smtpPassword,
            smtpSecurity: config.smtpSecurity
          })
        });
        const testResult = await testRes.json();

        if (!testResult.success) {
          alert(`❌ Wrong SMTP password for: ${config.fromEmail}\nSave blocked!`);
          return; // 🚫 STOP — don't save
        }
      }

      // ✅ SECOND: SMTP verified — now save
      for (let config of emailConfigs) {
        if (!config.fromEmail) continue;
        const payload = {
          userId: user.id,
          recordId: editingId,
          fromName: config.fromName,
          fromEmail: config.fromEmail,
          smtpUsername: config.smtpUsername,
          smtpPassword: config.smtpPassword,
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          smtpSecurity: config.smtpSecurity,
          replyTo: config.replyTo,
          imapUsername: config.imapUsername,
          imapPassword: config.imapPassword,
          imapHost: config.imapHost,
          imapPort: config.imapPort,
          imapSecurity: config.imapSecurity,
          useDifferentImap: formData.useDifferentImap ? 1 : 0,
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
      setEditingId(null);
      setEmailConfigs([{
        id: Date.now(), recordId: null,
        fromName: '', fromEmail: '', smtpUsername: '', smtpPassword: '',
        smtpHost: '', smtpPort: '', smtpSecurity: 'tls', replyTo: '',
        imapUsername: '', imapPassword: '', imapHost: '',
        imapPort: '993', imapSecurity: 'ssl', signature: ''
      }]);
    } catch (err) {
      console.error(err);
      alert("❌ Error while saving.");
    }
  };

  // ── Inject buttons into global TopHeader ──────────────────────────────────
  useEffect(() => {
    setHeaderActions([]);
  }, []);

  return (
    // ── LOCAL <header> REMOVED — buttons now in global TopHeader ──
    <main className="p-3 md:p-6 bg-gray-100 h-[calc(100vh-64px)] overflow-y-auto">
      <Card className="w-full shadow-lg border bg-white">
        <CardContent className="p-4 space-y-6">

          {/* COMBINED EMAIL CONFIGS */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold">Email Accounts</h3>
            </div>

            {emailConfigs.map((config) => (
              <div key={config.id} className="mb-6 relative border-2 p-4 rounded-lg bg-gray-50 shadow">
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    style={{ backgroundColor: '#1e3a8a', color: 'white' }}
                    className="h-7 px-2 flex items-center gap-1"
                    onClick={() => handleTestConnection(config)}
                  >
                    <TestTube className="h-4 w-4" />
                    <span className="hidden sm:inline">Test Connection</span>
                  </Button>
                  {emailConfigs.length > 1 && (
                    <button
                      className="text-red-500 font-bold text-xl hover:text-red-700"
                      onClick={() => removeConfig(config.id)}
                    >
                      &times;
                    </button>
                  )}
                </div>

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
                      <Input placeholder="Sender name" value={config.fromName}
                        onChange={e => handleConfigChange(config.id, 'fromName', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">From Email*</Label>
                      <Input placeholder="example@email.com" type="email" value={config.fromEmail}
                        onChange={e => handleConfigChange(config.id, 'fromEmail', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">SMTP Username</Label>
                      <Input placeholder="SMTP username" value={config.smtpUsername}
                        onChange={e => handleConfigChange(config.id, 'smtpUsername', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">SMTP Password</Label>
                      <div className="relative">
                        <Input placeholder="SMTP password" type={showPassword[config.id] ? "text" : "password"}
                          value={config.smtpPassword}
                          onChange={e => handleConfigChange(config.id, 'smtpPassword', e.target.value)} />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1"
                          onClick={() => togglePasswordVisibility(config.id)}>
                          {showPassword[config.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">SMTP Host</Label>
                      <Input placeholder="smtp.gmail.com" value={config.smtpHost}
                        onChange={e => handleConfigChange(config.id, 'smtpHost', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">SMTP Port</Label>
                      <Input placeholder="587" value={config.smtpPort}
                        onChange={e => handleConfigChange(config.id, 'smtpPort', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">Security</Label>
                      <Select value={config.smtpSecurity}
                        onValueChange={val => handleConfigChange(config.id, 'smtpSecurity', val)}>
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
                      <Input placeholder="reply@email.com" value={config.replyTo}
                        onChange={e => handleConfigChange(config.id, 'replyTo', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* IMAP SETTINGS */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">
                    📥 IMAP Settings (Receiving)
                  </h4>
                  <div className="flex items-center gap-2 mb-3 bg-blue-50 p-2 rounded">
                    <Switch checked={formData.useDifferentImap}
                      onCheckedChange={v => handleInputChange('useDifferentImap', v)} />
                    <Label className="text-sm font-semibold">Use different account for receiving emails</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-sm">IMAP Username</Label>
                      <Input placeholder="IMAP username" value={config.imapUsername}
                        onChange={e => handleConfigChange(config.id, 'imapUsername', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">IMAP Password</Label>
                      <Input placeholder="IMAP password" type="password" value={config.imapPassword}
                        onChange={e => handleConfigChange(config.id, 'imapPassword', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">IMAP Host</Label>
                      <Input placeholder="imap.gmail.com" value={config.imapHost}
                        onChange={e => handleConfigChange(config.id, 'imapHost', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">IMAP Port</Label>
                      <Input placeholder="993" value={config.imapPort}
                        onChange={e => handleConfigChange(config.id, 'imapPort', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm">IMAP Security</Label>
                      <Select value={config.imapSecurity}
                        onValueChange={val => handleConfigChange(config.id, 'imapSecurity', val)}>
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
{/* EMAIL SIGNATURE */}
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
                <Slider value={messagesPerDay} onValueChange={setMessagesPerDay} max={20000} min={1} />
              </div>
              <div>
                <Label className="flex justify-between text-sm mb-2">
                  <span>Time Between Emails (mins)</span>
                  <span className="font-semibold text-blue-600">{timeBetweenEmails[0]}</span>
                </Label>
                <Slider value={timeBetweenEmails} onValueChange={setTimeBetweenEmails} max={60} min={3} />
              </div>
            </div>
          </div>

         

      {/* SAVE BUTTON */}
          <div className="flex justify-center pt-2 pb-4">
            <Button
              onClick={handleSave}
              style={{ backgroundColor: '#1e3a8a', color: 'white' }}
              className="flex items-center gap-2 px-6"
            >
             <Save className="h-4 w-4" />
              {editingId ? 'Update Account' : 'Save All Accounts'}
            </Button>
          </div>

        </CardContent>
      </Card>

     {/* DATABASE EMAIL ACCOUNTS TABLE */}
      {savedAccounts.length > 0 && (
        <div className="mt-6">
          <Card className="w-full shadow-lg border bg-white overflow-hidden">
            <div className="flex flex-row items-center justify-between p-4 border-b">
              <h3 className="text-base font-bold">Database Email Accounts</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={accountSearch}
                  onChange={e => { setAccountSearch(e.target.value); setAccountPage(1); }}
                  className="border rounded px-3 py-1 text-sm w-52"
                />
                <Button size="sm" variant="outline" onClick={loadSavedData}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Reload
                </Button>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-3 text-left font-semibold">Account</th>
                      <th className="p-3 text-left font-semibold">SMTP Host</th>
                      <th className="p-3 text-left font-semibold">Port</th>
                      <th className="p-3 text-left font-semibold">Security</th>
                      <th className="p-3 text-left font-semibold">IMAP Host</th>
                      <th className="p-3 text-left font-semibold">Reply To</th>
                      <th className="p-3 text-left font-semibold">ID</th>
                      <th className="p-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedAccounts
                      .filter(a =>
                        (a.from_name || '').toLowerCase().includes(accountSearch.toLowerCase()) ||
                        (a.from_email || '').toLowerCase().includes(accountSearch.toLowerCase()) ||
                        (a.smtp_host || '').toLowerCase().includes(accountSearch.toLowerCase())
                      )
                      .slice((accountPage - 1) * ACCOUNT_PAGE_SIZE, accountPage * ACCOUNT_PAGE_SIZE)
                      .map((a, i) => (
                        <tr key={a.id} className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="p-3">
                            <p className="font-medium">{a.from_name || '-'}</p>
                            <p className="text-xs text-gray-500">{a.from_email || '-'}</p>
                          </td>
                          <td className="p-3">{a.smtp_host || '-'}</td>
                          <td className="p-3">{a.smtp_port || '-'}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-800 text-white">
                              {a.smtp_security?.toUpperCase() || '-'}
                            </span>
                          </td>
                          <td className="p-3">{a.imap_host || '-'}</td>
                          <td className="p-3">{a.reply_to || '-'}</td>
                          <td className="p-3">{a.id}</td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(a)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                title="Edit"
                              >✏️</button>
                              <Button size="sm" variant="ghost"
                                onClick={() => handleDelete(a.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* PAGINATION */}
              {(() => {
                const filtered = savedAccounts.filter(a =>
                  (a.from_name || '').toLowerCase().includes(accountSearch.toLowerCase()) ||
                  (a.from_email || '').toLowerCase().includes(accountSearch.toLowerCase()) ||
                  (a.smtp_host || '').toLowerCase().includes(accountSearch.toLowerCase())
                );
                const totalPages = Math.ceil(filtered.length / ACCOUNT_PAGE_SIZE);
                if (totalPages <= 1) return null;
                return (
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-gray-500">
                      Showing {((accountPage-1)*ACCOUNT_PAGE_SIZE)+1}–{Math.min(accountPage*ACCOUNT_PAGE_SIZE, filtered.length)} of {filtered.length}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setAccountPage(p => Math.max(1, p-1))} disabled={accountPage === 1}>Previous</Button>
                      {Array.from({ length: totalPages }, (_, i) => i+1).map(page => (
                        <Button key={page} size="sm" variant={accountPage === page ? 'default' : 'outline'}
                          onClick={() => setAccountPage(page)} className="min-w-10">{page}</Button>
                      ))}
                      <Button size="sm" variant="outline" onClick={() => setAccountPage(p => Math.min(totalPages, p+1))} disabled={accountPage === totalPages}>Next</Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

    </main>    
  );
};

export default InboxAdditionPage;