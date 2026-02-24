import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Mail, Reply, RefreshCw } from "lucide-react";

interface InboxEmail {
  id: number;
  from_email: string;
  subject: string;
  body: string;
  preview: string;
  account_email?: string;
}

type GroupedEmails = {
  [key: string]: InboxEmail[];
};

// ✅ Production + Dev Safe API
const API_BASE =
  (import.meta.env.VITE_API_URL || "http://localhost:3001") +
  "/api/mailbox";

const MailBoxPage = () => {
  const [emails, setEmails] = useState<GroupedEmails>({});
  const [selectedEmail, setSelectedEmail] = useState<InboxEmail | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<number[]>([]);
  const [replyMode, setReplyMode] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  const getCurrentUserId = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.id;
  };

  const userId = getCurrentUserId();

  // ==========================
  // FETCH INBOX
  // ==========================
  const fetchInboxEmails = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setVisibleCount(5);

      const res = await fetch(`${API_BASE}/inbox/${userId}`);
      const data = await res.json();

      if (data.success) {
        setEmails(data.data || {});
      } else {
        console.error("Failed to load inbox");
      }
    } catch (err) {
      console.error("Inbox fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxEmails();
  }, []);

  // ==========================
  // SEND REPLY
  // ==========================
  const sendReply = async () => {
    if (!replyMessage || !selectedEmail || !userId) return;

    try {
      const res = await fetch(`${API_BASE}/reply/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inboxEmailId: selectedEmail.id,
          to: selectedEmail.from_email,
          subject: replySubject || `Re: ${selectedEmail.subject}`,
          message: replyMessage,
        }),
      });

      const result = await res.json();

      if (result.success) {
        alert("Reply sent successfully");
        setReplyMode(false);
        setReplyMessage("");
        fetchInboxEmails(); // optional refresh
      } else {
        alert("Failed to send reply");
      }
    } catch (err) {
      console.error("Reply error:", err);
      alert("Error sending reply");
    }
  };

  return (
    <>
      {/* ✅ FIX: HEADER height fixed & centered (single line) */}
      <header className="bg-white border-b h-16 flex items-center">
        <div className="px-6 w-full flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#012970]">Mail Box</h2>
          <Button variant="outline" onClick={fetchInboxEmails}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="p-6 grid grid-cols-3 gap-6">
        {/* EMAIL LIST */}
        <Card className="col-span-1 overflow-hidden">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input className="pl-10" placeholder="Search inbox..." />
            </div>
          </CardHeader>

          <CardContent className="p-0 h-[75vh] overflow-y-auto">
            {loading && <p className="p-4 text-gray-500">Loading...</p>}

            {Object.entries(emails).map(([account, mails]) => (
              <div key={account || "unknown"}>
                <div className="bg-gray-100 px-4 py-2 font-semibold text-sm sticky top-0 z-10">
                  {account || "Unknown Account"}
                </div>

                {mails.slice(0, visibleCount).map((email) => (
                  <div
                    key={email.id}
                    className={`p-4 border-b cursor-pointer ${
                      selectedEmail?.id === email.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      setSelectedEmail(email);
                      setReplySubject(`Re: ${email.subject}`);
                      setReplyMode(false);
                    }}
                  >
                    <div className="flex gap-2">
                      <Checkbox
                        checked={selectedEmails.includes(email.id)}
                        onCheckedChange={(checked) =>
                          checked
                            ? setSelectedEmails([...selectedEmails, email.id])
                            : setSelectedEmails(
                                selectedEmails.filter((id) => id !== email.id)
                              )
                        }
                      />
                      <div>
                        <p className="font-medium">{email.from_email}</p>
                        <p className="text-sm">{email.subject}</p>
                        <p className="text-xs text-gray-500">{email.preview}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {mails.length > visibleCount && (
                  <div className="p-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleCount((v) => v + 5)}
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* EMAIL VIEW */}
        <Card className="col-span-2">
          {!selectedEmail ? (
            <CardContent className="p-10 text-center">
              <Mail className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-4 text-gray-500">Select an email to read</p>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <h3 className="font-semibold text-[#012970]">
                  {selectedEmail.subject}
                </h3>
                <p className="text-sm text-gray-600">
                  From: {selectedEmail.from_email}
                </p>
              </CardHeader>

              <CardContent>
                <p className="mb-6 whitespace-pre-wrap">{selectedEmail.body}</p>

                <Button onClick={() => setReplyMode(true)}>
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </Button>

                {replyMode && (
                  <div className="mt-6 space-y-3 border-t pt-4">
                    <Label>Subject</Label>
                    <Input
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                    />

                    <Label>Message</Label>
                    <Textarea
                      rows={6}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setReplyMode(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={sendReply}>Send Reply</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </>
  );
};

export default MailBoxPage;