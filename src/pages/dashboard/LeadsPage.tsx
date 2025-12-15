import { useEffect, useRef, useState } from "react";

interface Lead {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  status: string;
  engagement: string;
  score: number;
  tags: string;
  created_at: string;
}

const API_BASE = "http://localhost:3001/api/leads";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Add Lead modal state
  const [showAddModal, setShowAddModal] = useState(false);

  // ✅ Import CSV file picker ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ Form state
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    company: "",
    status: "Cold",
    engagement: "Low",
    score: 0,
    tags: "",
  });

  const fetchLeads = async () => {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch leads", err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "score" ? Number(value) : value,
    }));
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email.trim()) {
      alert("Email is required");
      return;
    }

    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.status === 409) {
        alert("This email already exists!");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData?.error || "Failed to add lead");
        return;
      }

      // close + reset
      setShowAddModal(false);
      setForm({
        email: "",
        first_name: "",
        last_name: "",
        company: "",
        status: "Cold",
        engagement: "Low",
        score: 0,
        tags: "",
      });

      await fetchLeads();
    } catch (err) {
      console.error(err);
      alert("Network error: could not add lead");
    }
  };

  // ✅ EXPORT CSV (downloads file)
  const handleExportCSV = () => {
    // Backend should have GET /api/leads/export
    window.location.href = `${API_BASE}/export`;
  };

  // ✅ IMPORT CSV (open file picker)
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // ✅ IMPORT CSV upload
  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file); // backend expects "file"

      const res = await fetch(`${API_BASE}/import`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData?.error || "CSV import failed");
        return;
      }

      alert("✅ Import successful!");
      await fetchLeads();
    } catch (err) {
      console.error(err);
      alert("Import failed due to network/server error.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return <div className="p-6">Loading leads...</div>;
  }

  return (
    <div className="p-6">
      {/* ✅ Header + Buttons */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Leads Management</h1>

        <div className="flex gap-3">
          {/* Export - WHITE */}
          <button
            onClick={handleExportCSV}
            className="border border-gray-300 bg-white text-gray-800 px-4 py-2 rounded hover:bg-gray-50"
          >
            Export CSV
          </button>

          {/* Import - DARK BLUE */}
          <button
            onClick={handleImportClick}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Import Leads
          </button>

          {/* Add Lead - WHITE (same as Export) */}
          <button
            onClick={() => setShowAddModal(true)}
            className="border border-gray-300 bg-white text-gray-800 px-4 py-2 rounded hover:bg-gray-50"
          >
            + Add Lead
          </button>

          {/* hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportFileChange}
            style={{ display: "none" }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mt-6">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Company</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Engagement</th>
              <th className="p-3 text-left">Score</th>
              <th className="p-3 text-left">Added</th>
            </tr>
          </thead>

          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-t">
                  <td className="p-3">
                    {lead.first_name} {lead.last_name}
                  </td>
                  <td className="p-3">{lead.email}</td>
                  <td className="p-3">{lead.company}</td>
                  <td className="p-3">{lead.status}</td>
                  <td className="p-3">{lead.engagement}</td>
                  <td className="p-3">{lead.score}</td>
                  <td className="p-3">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString()
                      : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[420px] p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Lead</h2>

            <form onSubmit={handleAddLead} className="space-y-3">
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                type="text"
                placeholder="First Name"
                className="w-full border p-2 rounded"
              />

              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                type="text"
                placeholder="Last Name"
                className="w-full border p-2 rounded"
              />

              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                placeholder="Email *"
                className="w-full border p-2 rounded"
                required
              />

              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                type="text"
                placeholder="Company"
                className="w-full border p-2 rounded"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                >
                  <option value="Cold">Cold</option>
                  <option value="Hot">Hot</option>
                  <option value="Replied">Replied</option>
                </select>

                <select
                  name="engagement"
                  value={form.engagement}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <input
                name="score"
                value={form.score}
                onChange={handleChange}
                type="number"
                placeholder="Score"
                className="w-full border p-2 rounded"
              />

              <input
                name="tags"
                value={form.tags}
                onChange={handleChange}
                type="text"
                placeholder="Tags (comma separated)"
                className="w-full border p-2 rounded"
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
