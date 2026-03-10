import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Bell, Database, MessageSquare } from "lucide-react";

const API_BASE =
  (import.meta.env.VITE_API_URL || "http://localhost:3001") +
  "/api/auth";

const SettingsPage = () => {
  const [storedUser, setStoredUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFA, setTwoFA] = useState(false);
  const [apiKey, setApiKey] = useState("mk_1234567890abcdef");

  const [campaignUpdates, setCampaignUpdates] = useState(false);
  const [emailReplies, setEmailReplies] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [systemAlerts, setSystemAlerts] = useState(false);

  const [hubspotApiKey, setHubspotApiKey] = useState("");
  const [salesforceConnected, setSalesforceConnected] = useState(false);
  const [zapierConnected, setZapierConnected] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);

  const [currentPlan, setCurrentPlan] = useState("Professional");
  const [monthlyLimit, setMonthlyLimit] = useState(10000);

  const [feedbackType, setFeedbackType] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setStoredUser(user);
    if (user?.name) {
      const [first, last] = user.name.split(" ");
      setFirstName(first || "");
      setLastName(last || "");
    }
    setEmail(user?.email || "");
    setCompany(user?.company || "");
    setCity(user?.city || "");
    setCountry(user?.country || "");
  }, []);

  const handleSaveSection = async (section: string) => {
    if (!storedUser?.id) { alert("User not found. Please login again."); return; }
    setLoading(true);
    let payload: any = { userId: storedUser.id };

    switch (section) {
      case "profile":
        payload.name = `${firstName} ${lastName}`;
        payload.email = email;
        payload.company = company;
        payload.city = city;
        payload.country = country;
        break;
      case "security":
        if (newPassword && newPassword !== confirmPassword) {
          alert("Passwords do not match.");
          setLoading(false);
          return;
        }
        payload.security = { password: newPassword, twoFAEnabled: twoFA ? 1 : 0, apiKey };
        break;
      case "notifications":
        payload.notifications = {
          emailAlerts: emailReplies ? 1 : 0,
          smsAlerts: systemAlerts ? 1 : 0,
          campaignUpdates: campaignUpdates ? 1 : 0,
          weeklyReports: weeklyReports ? 1 : 0,
        };
        break;
      case "integrations":
        payload.integrations = {
          hubspot: hubspotApiKey ? 1 : 0,
          slack: slackConnected ? 1 : 0,
          salesforce: salesforceConnected ? 1 : 0,
          zapier: zapierConnected ? 1 : 0,
        };
        break;
      case "billing":
        payload.billing = { plan: currentPlan, monthlyLimit };
        break;
      case "feedback":
        payload.feedback = { type: feedbackType, message: feedbackMessage };
        break;
    }

    try {
      const res = await fetch(`${API_BASE}/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alert(`${section.toUpperCase()} updated successfully ✅`);
        if (section === "profile") {
          const updatedUser = { ...storedUser, name: `${firstName} ${lastName}`, email, company, city, country };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setStoredUser(updatedUser);
        }
      } else {
        alert(data.message || "Update failed");
      }
    } catch (err: any) {
      console.error("Update error:", err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  // ── No internal header — Dashboard TopHeader handles title ──
  return (
    <main className="p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="profile">
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          {/* PROFILE */}
          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[#012970]">
                  <User className="mr-2" /> Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  <Input placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                <Input placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
                  <Input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} />
                </div>
                <Button onClick={() => handleSaveSection("profile")} disabled={loading}>
                  {loading ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECURITY */}
          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[#012970]">
                  <Shield className="mr-2" /> Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Current Password" type="password" value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)} />
                <Input placeholder="New Password" type="password" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} />
                <Input placeholder="Confirm New Password" type="password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} />
                <div className="flex items-center justify-between">
                  <Label>Two-Factor Authentication</Label>
                  <Switch checked={twoFA} onCheckedChange={setTwoFA} />
                </div>
                <div>
                  <Label>API Key</Label>
                  <Input value={apiKey} onChange={e => setApiKey(e.target.value)} />
                </div>
                <Button onClick={() => handleSaveSection("security")} disabled={loading}>
                  {loading ? "Saving..." : "Save Security Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[#012970]">
                  <Bell className="mr-2" /> Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Campaign Updates", value: campaignUpdates, setter: setCampaignUpdates },
                  { label: "Email Replies", value: emailReplies, setter: setEmailReplies },
                  { label: "Weekly Reports", value: weeklyReports, setter: setWeeklyReports },
                  { label: "System Alerts", value: systemAlerts, setter: setSystemAlerts },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <Label>{item.label}</Label>
                    <Switch checked={item.value} onCheckedChange={item.setter} />
                  </div>
                ))}
                <Button onClick={() => handleSaveSection("notifications")} disabled={loading}>
                  {loading ? "Saving..." : "Save Notifications"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INTEGRATIONS */}
          <TabsContent value="integrations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[#012970]">
                  <Database className="mr-2" /> Integrations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>HubSpot API Key</Label>
                  <Input placeholder="Enter HubSpot API Key" value={hubspotApiKey}
                    onChange={e => setHubspotApiKey(e.target.value)} />
                </div>
                {[
                  { label: "Salesforce", value: salesforceConnected, setter: setSalesforceConnected },
                  { label: "Zapier", value: zapierConnected, setter: setZapierConnected },
                  { label: "Slack", value: slackConnected, setter: setSlackConnected },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <Label>{item.label}</Label>
                    <Switch checked={item.value} onCheckedChange={item.setter} />
                  </div>
                ))}
                <Button onClick={() => handleSaveSection("integrations")} disabled={loading}>
                  {loading ? "Saving..." : "Save Integrations"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BILLING */}
          <TabsContent value="billing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[#012970]">
                  <Database className="mr-2" /> Billing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Plan</Label>
                  <Input value={currentPlan} onChange={e => setCurrentPlan(e.target.value)} />
                </div>
                <div>
                  <Label>Monthly Email Limit</Label>
                  <Input type="number" value={monthlyLimit}
                    onChange={e => setMonthlyLimit(Number(e.target.value))} />
                </div>
                <Button onClick={() => handleSaveSection("billing")} disabled={loading}>
                  {loading ? "Saving..." : "Save Billing"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FEEDBACK */}
          <TabsContent value="feedback" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[#012970]">
                  <MessageSquare className="mr-2" /> Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Feedback Type</Label>
                  <Select value={feedbackType} onValueChange={setFeedbackType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="general">General Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea placeholder="Write your feedback..." rows={5}
                    value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} />
                </div>
                <Button onClick={() => handleSaveSection("feedback")} disabled={loading}>
                  {loading ? "Sending..." : "Send Feedback"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default SettingsPage;