import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Briefcase, Eye, Users } from "lucide-react";

const UserRolesPage: React.FC = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    description: "",
    role: "Admin",
  });

  const [status, setStatus] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setStatus("Saving... ⏳");

    try {
      const res = await fetch("http://localhost:3001/api/roles/save", { // ✅ /save route
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("✅ Role saved successfully");
        setForm({
          name: "",
          email: "",
          description: "",
          role: "Admin",
        });
      } else {
        setStatus(`❌ ${data.message || "Failed to save role"}`);
      }
    } catch (error) {
      console.error(error);
      setStatus("❌ Server error");
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold" style={{ color: "#012970" }}>
            User Roles
          </h2>
        </div>
      </header>

      <main className="p-3 md:p-6 bg-gray-100 min-h-screen">
        <Card className="w-full shadow-lg border bg-white transition-all">
          <CardContent className="p-4 space-y-6">
            <div className="mb-6 relative border-2 p-4 rounded-lg bg-gray-50 shadow">
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <Users size={18} /> Assign User Role
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-sm">Name</Label>
                  <Input
                    placeholder="Enter name"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm">Email</Label>
                  <Input
                    type="email"
                    placeholder="Enter email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm">Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(val) => handleChange("role", val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Campaign Manager">Campaign Manager</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-4">
                  <Label className="text-sm">Description</Label>
                  <Textarea
                    rows={3}
                    placeholder="Enter description"
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <span className="text-sm font-medium text-blue-700">{status}</span>
                <div className="flex gap-3">
                  <Button variant="outline">Cancel</Button>
                  <Button
                    style={{ backgroundColor: "#1e3a8a" }}
                    className="text-white px-6"
                    onClick={handleSubmit}
                  >
                    💾 Save Role
                  </Button>
                </div>
              </div>
            </div>

            <div className="mb-2 relative border-2 p-4 rounded-lg bg-gray-50 shadow">
              <h3 className="text-base font-bold mb-4">Role Permissions</h3>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="text-blue-700" />
                    <h4 className="font-semibold">Admin</h4>
                  </div>
                  <p>✔ Full access to all modules.</p>
                  <p>✔ Manage users, inbox, templates & settings.</p>
                  <p>✔ Control campaigns and leads.</p>
                </div>

                <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="text-blue-700" />
                    <h4 className="font-semibold">Campaign Manager</h4>
                  </div>
                  <p>✔ Create & edit campaigns.</p>
                  <p>✔ Manage lists and email templates.</p>
                  <p>✔ View analytics.</p>
                </div>

                <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="text-blue-700" />
                    <h4 className="font-semibold">Viewer</h4>
                  </div>
                  <p>✔ View dashboards and reports.</p>
                  <p>❌ No editing permissions.</p>
                  <p>❌ No inbox or settings access.</p>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default UserRolesPage;
