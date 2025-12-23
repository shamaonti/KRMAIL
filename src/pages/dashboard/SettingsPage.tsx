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

const SettingsPage = () => {
  const [storedUser, setStoredUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ================= PROFILE =================
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  // ================= SECURITY =================
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFA, setTwoFA] = useState(false);
  const [apiKey, setApiKey] = useState("mk_1234567890abcdef");

  // ================= NOTIFICATIONS =================
  const [campaignUpdates, setCampaignUpdates] = useState(false);
  const [emailReplies, setEmailReplies] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [systemAlerts, setSystemAlerts] = useState(false);

  // ================= INTEGRATIONS =================
  const [hubspotApiKey, setHubspotApiKey] = useState("");
  const [salesforceConnected, setSalesforceConnected] = useState(false);
  const [zapierConnected, setZapierConnected] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);

  // ================= BILLING =================
  const [currentPlan, setCurrentPlan] = useState("Professional");
  const [monthlyLimit, setMonthlyLimit] = useState(10000);
  const [upgradePlanRequested, setUpgradePlanRequested] = useState(false);

  // ================= FEEDBACK =================
  const [feedbackType, setFeedbackType] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setStoredUser(user);

    if (user.name) {
      const [first, last] = user.name.split(" ");
      setFirstName(first || "");
      setLastName(last || "");
    }
    setEmail(user.email || "");
    setCompany(user.company || "");
    setCity(user.city || "");
    setCountry(user.country || "");
  }, []);

  // ================= HANDLE SAVE =================
  const handleSaveSection = async (section: string) => {
    if (!storedUser?.id) return alert("User not found.");

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
        payload.security = {
          password: newPassword,
          twoFAEnabled: twoFA ? 1 : 0,
          apiKey,
        };
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
          googleDrive: hubspotApiKey ? 1 : 0,
          slack: slackConnected ? 1 : 0,
          salesforce: salesforceConnected ? 1 : 0,
          zapier: zapierConnected ? 1 : 0,
        };
        break;

      case "billing":
        payload.billing = {
          plan: currentPlan,
          cardLast4: monthlyLimit.toString(),
        };
        break;

      case "feedback":
        payload.feedback = {
          rating: feedbackType,
          comments: feedbackMessage,
        };
        break;

      default:
        break;
    }

    try {
      const res = await fetch("http://localhost:3001/api/auth/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert(`${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully ✅`);

        if (section === "profile") {
          const updatedUser = { ...storedUser, name: `${firstName} ${lastName}`, email, company, city, country };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setStoredUser(updatedUser);
        }
      } else {
        alert(data.message || "Update failed");
      }
    } catch (err: any) {
      console.error(err);
      alert("Server error: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-[#012970]">Settings</h2>
        </div>
      </header>

      <main className="p-6">
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

            {/* ================= PROFILE ================= */}
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

            {/* ================= SECURITY ================= */}
            <TabsContent value="security" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-[#012970]">
                    <Shield className="mr-2" /> Password & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input type="password" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                  <Input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  <Input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  <div className="flex justify-between">
                    <Label>Two-Factor Authentication</Label>
                    <Switch checked={twoFA} onCheckedChange={setTwoFA} />
                  </div>
                  <div className="flex justify-between gap-2">
                    <Input readOnly value={apiKey} />
                    <Button variant="outline" onClick={() => setApiKey("mk_" + Math.random().toString(36).substring(2, 15))}>
                      Regenerate
                    </Button>
                  </div>
                  <Button onClick={() => handleSaveSection("security")} disabled={loading}>
                    {loading ? "Saving..." : "Save Security"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ================= NOTIFICATIONS ================= */}
            <TabsContent value="notifications" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-[#012970]">
                    <Bell className="mr-2" /> Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between"><Label>Campaign Updates</Label><Switch checked={campaignUpdates} onCheckedChange={setCampaignUpdates} /></div>
                  <div className="flex justify-between"><Label>Email Replies</Label><Switch checked={emailReplies} onCheckedChange={setEmailReplies} /></div>
                  <div className="flex justify-between"><Label>Weekly Reports</Label><Switch checked={weeklyReports} onCheckedChange={setWeeklyReports} /></div>
                  <div className="flex justify-between"><Label>System Alerts</Label><Switch checked={systemAlerts} onCheckedChange={setSystemAlerts} /></div>
                  <Button onClick={() => handleSaveSection("notifications")} disabled={loading}>
                    {loading ? "Saving..." : "Save Notifications"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ================= INTEGRATIONS ================= */}
            <TabsContent value="integrations" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-[#012970]">
                    <Database className="mr-2" /> Integrations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="HubSpot API Key" value={hubspotApiKey} onChange={e => setHubspotApiKey(e.target.value)} />
                  <div className="flex justify-between"><Label>Salesforce Connected</Label><Switch checked={salesforceConnected} onCheckedChange={setSalesforceConnected} /></div>
                  <div className="flex justify-between"><Label>Zapier Connected</Label><Switch checked={zapierConnected} onCheckedChange={setZapierConnected} /></div>
                  <div className="flex justify-between"><Label>Slack Connected</Label><Switch checked={slackConnected} onCheckedChange={setSlackConnected} /></div>
                  <Button onClick={() => handleSaveSection("integrations")} disabled={loading}>
                    {loading ? "Saving..." : "Save Integrations"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ================= BILLING ================= */}
            <TabsContent value="billing" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#012970]">Billing & Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Current Plan" value={currentPlan} onChange={e => setCurrentPlan(e.target.value)} />
                  <Input type="number" placeholder="Monthly Limit" value={monthlyLimit} onChange={e => setMonthlyLimit(Number(e.target.value))} />
                  <Button onClick={() => handleSaveSection("billing")} disabled={loading}>
                    {loading ? "Saving..." : "Save Billing"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ================= FEEDBACK ================= */}
            <TabsContent value="feedback" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-[#012970]">
                    <MessageSquare className="mr-2" /> Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={feedbackType} onValueChange={setFeedbackType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select feedback type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Write your feedback..." value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} />
                  <Button onClick={() => handleSaveSection("feedback")} disabled={loading}>
                    {loading ? "Saving..." : "Save Feedback"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </>
  );
};

export default SettingsPage;
