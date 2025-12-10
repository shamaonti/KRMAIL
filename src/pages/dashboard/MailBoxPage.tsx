
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Filter, 
  Mail, 
  MailOpen, 
  Star, 
  Archive, 
  Trash2, 
  Reply, 
  Forward,
  Paperclip,
  RefreshCw
} from "lucide-react";

const MailBoxPage = () => {
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [replyMode, setReplyMode] = useState(false);

  const mockEmails = [
    {
      id: 1,
      from: 'john.doe@prospect.com',
      subject: 'Re: Your Marketing Proposal',
      preview: 'Thank you for reaching out. I\'m interested in learning more...',
      time: '10:30 AM',
      isRead: false,
      isStarred: true,
      hasAttachment: false,
      category: 'lead'
    },
    {
      id: 2,
      from: 'sarah.wilson@company.com',
      subject: 'Quick question about pricing',
      preview: 'Hi there, I saw your email about the new service offerings...',
      time: '9:15 AM',
      isRead: true,
      isStarred: false,
      hasAttachment: true,
      category: 'inquiry'
    },
    {
      id: 3,
      from: 'mike.brown@startup.io',
      subject: 'Collaboration opportunity',
      preview: 'We\'re looking for a marketing partner and your company...',
      time: 'Yesterday',
      isRead: false,
      isStarred: false,
      hasAttachment: false,
      category: 'opportunity'
    }
  ];

  const replyTemplates = [
    { id: 1, name: 'Thank you for your interest', content: 'Thank you for your interest in our services...' },
    { id: 2, name: 'Schedule a call', content: 'I\'d love to schedule a call to discuss...' },
    { id: 3, name: 'Send pricing information', content: 'I\'ve attached our pricing information...' }
  ];

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nunito font-semibold" style={{ color: '#012970' }}>Mail Box</h2>
            <div className="flex gap-3">
              <Button variant="outline" className="border-gray-300">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button className="text-white font-medium" style={{ backgroundColor: '#1e3a8a' }}>
                <Mail className="mr-2 h-4 w-4" />
                Compose
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Search emails..." 
                      className="pl-10"
                    />
                  </div>
                  <Button size="sm" variant="outline" className="border-gray-300">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Select>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="starred">Starred</SelectItem>
                      <SelectItem value="leads">Leads</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {selectedEmails.length > 0 && (
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline" className="border-gray-300">
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-300">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {mockEmails.map((email) => (
                    <div 
                      key={email.id}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedEmail?.id === email.id ? 'bg-blue-50 border-blue-200' : ''
                      } ${!email.isRead ? 'bg-blue-25' : ''}`}
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox 
                          checked={selectedEmails.includes(email.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEmails([...selectedEmails, email.id]);
                            } else {
                              setSelectedEmails(selectedEmails.filter(id => id !== email.id));
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate ${!email.isRead ? 'font-semibold' : 'font-medium'}`}>
                              {email.from}
                            </p>
                            <div className="flex items-center space-x-1">
                              {email.hasAttachment && <Paperclip className="h-3 w-3 text-gray-400" />}
                              {email.isStarred && <Star className="h-3 w-3 text-yellow-400 fill-current" />}
                              <span className="text-xs text-gray-500">{email.time}</span>
                            </div>
                          </div>
                          <p className={`text-sm truncate ${!email.isRead ? 'font-medium' : ''}`}>
                            {email.subject}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {email.preview}
                          </p>
                          <div className="mt-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              email.category === 'lead' ? 'bg-green-100 text-green-800' :
                              email.category === 'inquiry' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {email.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Content */}
          <div className="lg:col-span-2">
            {selectedEmail ? (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-nunito font-semibold" style={{ color: '#012970' }}>
                        {selectedEmail.subject}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        From: {selectedEmail.from} • {selectedEmail.time}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="border-gray-300">
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-300">
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-300">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p>Hi there,</p>
                    <p>
                      Thank you for reaching out about your marketing services. I'm very interested in learning more about what you can offer our company.
                    </p>
                    <p>
                      We're currently looking to expand our digital marketing efforts and could use help with email campaigns, lead generation, and social media management.
                    </p>
                    <p>
                      Would you be available for a call next week to discuss our needs in more detail?
                    </p>
                    <p>
                      Best regards,<br/>
                      John Doe<br/>
                      Marketing Director<br/>
                      Prospect Company Inc.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <Button 
                        className="text-white font-medium" 
                        style={{ backgroundColor: '#1e3a8a' }}
                        onClick={() => setReplyMode(true)}
                      >
                        <Reply className="mr-2 h-4 w-4" />
                        Reply
                      </Button>
                      <Button variant="outline" className="border-gray-300">
                        <Forward className="mr-2 h-4 w-4" />
                        Forward
                      </Button>
                    </div>
                  </div>

                  {replyMode && (
                    <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Reply to {selectedEmail.from}</h4>
                        <Select>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Quick reply templates" />
                          </SelectTrigger>
                          <SelectContent>
                            {replyTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reply-subject">Subject</Label>
                        <Input 
                          id="reply-subject" 
                          defaultValue={`Re: ${selectedEmail.subject}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reply-content">Message</Label>
                        <Textarea 
                          id="reply-content" 
                          rows={8}
                          placeholder="Type your reply here..."
                        />
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" className="border-gray-300">
                          <Paperclip className="mr-2 h-4 w-4" />
                          Attach File
                        </Button>
                        <div className="space-x-2">
                          <Button 
                            variant="outline" 
                            className="border-gray-300"
                            onClick={() => setReplyMode(false)}
                          >
                            Cancel
                          </Button>
                          <Button className="text-white font-medium" style={{ backgroundColor: '#1e3a8a' }}>
                            Send Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Mail className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No email selected</h3>
                  <p className="mt-2 text-gray-500">Select an email from the list to view its content</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default MailBoxPage;
