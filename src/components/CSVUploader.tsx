import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { parseCSV, Lead } from "@/lib/email";

interface CSVUploaderProps {
  onLeadsUploaded: (leads: Lead[]) => void;
  existingLeads?: Lead[];
}

const CSVUploader: React.FC<CSVUploaderProps> = ({
  onLeadsUploaded,
  existingLeads = [],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ NEW: for showing success line
  const [lastUploadedCount, setLastUploadedCount] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrors(["Please select a valid CSV file"]);
      setLastUploadedCount(0);
      return;
    }

    setIsProcessing(true);
    setErrors([]);
    setLastUploadedCount(0);

    try {
      const text = await file.text();
      const leads = parseCSV(text);

      if (!Array.isArray(leads) || leads.length === 0) {
        setErrors(["No valid leads found in the CSV file"]);
        return;
      }

      // Validate leads
      const validationErrors: string[] = [];
      const validLeads: Lead[] = [];

      leads.forEach((lead, index) => {
        if (!lead.email) {
          validationErrors.push(`Row ${index + 2}: Missing email address`);
          return;
        }

        if (!lead.email.includes("@")) {
          validationErrors.push(`Row ${index + 2}: Invalid email format`);
          return;
        }

        // Check duplicates against existing leads + current CSV batch
        const isDuplicate =
          existingLeads.some((existing) => existing.email === lead.email) ||
          validLeads.some((valid) => valid.email === lead.email);

        if (isDuplicate) {
          validationErrors.push(
            `Row ${index + 2}: Duplicate email address (${lead.email})`
          );
          return;
        }

        validLeads.push(lead);
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      }

      // ✅ push only new valid leads to parent
      if (validLeads.length > 0) {
        onLeadsUploaded(validLeads);
        setLastUploadedCount(validLeads.length);
      }

      // reset input so user can re-upload same file again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setErrors(["Failed to process CSV file. Please check the file format."]);
      setLastUploadedCount(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files[0]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFileSelect(files[0]);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <Upload
              className={`mx-auto h-12 w-12 mb-4 ${
                isDragging ? "text-blue-500" : "text-gray-400"
              }`}
            />

            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload Leads CSV
              </h3>
              <p className="text-sm text-gray-500">
                Drag and drop your CSV file here, or click to browse
              </p>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="border-gray-300"
              >
                <FileText className="mr-2 h-4 w-4" />
                {isProcessing ? "Processing..." : "Choose CSV File"}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>CSV should contain columns: Email, First Name, Last Name, Company</p>
              <p>First row should be headers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div key={index} className="text-sm">
                  {error}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ✅ Success line (like your screenshot) */}
      {lastUploadedCount > 0 && errors.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Successfully uploaded {lastUploadedCount} leads.
            {existingLeads.length > 0 &&
              ` Combined with ${existingLeads.length} existing leads.`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default CSVUploader;