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
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const testConnection = async () => {
    setIsTestingConnection(true);
    // Simulate API call
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
                    <Input id="from-email" type="email" placeholder="john@company.com" />
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
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select security type" />
                    </SelectTrigger>
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
                  <Label htmlFor="use-different-imap">Use different account for receiving</Label>
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
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select security type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Connection Status */}
                {connectionStatus && (
                  <div className={`p-3 rounded-lg flex items-center space-x-2 ${
                    connectionStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {connectionStatus === 'success' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {connectionStatus === 'success' ? 'Connection Successful!' : 'Connection Failed'}
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
                  <Slider
                    value={messagesPerDay}
                    onValueChange={setMessagesPerDay}
                    max={480}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1</span>
                    <span>480</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Time Between Emails: {timeBetweenEmails[0]} minutes</Label>
                  <Slider
                    value={timeBetweenEmails}
                    onValueChange={setTimeBetweenEmails}
                    max={60}
                    min={3}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>3 min</span>
                    <span>60 min</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-signature">Email Signature</Label>
                <Textarea 
                  id="email-signature" 
                  placeholder="Best regards,&#10;John Doe&#10;Sales Manager&#10;Company Inc."
                  rows={5}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Enable Warmup Schedule</Label>
                  <Switch />
                </div>
                <p className="text-sm text-gray-500">
                  Gradually increase email volume to improve deliverability
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" className="border-gray-300">Cancel</Button>
            <Button className="text-white font-medium" style={{ backgroundColor: '#1e3a8a' }}>
              Save Email Account
            </Button>
          </div>
        </div>
      </main>
    </>
  );
};

export default InboxAdditionPage;
