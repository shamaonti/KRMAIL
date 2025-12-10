import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { parseCSV, Lead } from "@/lib/email";

interface CSVUploaderProps {
  onLeadsUploaded: (leads: Lead[]) => void;
  existingLeads?: Lead[];
}

const CSVUploader: React.FC<CSVUploaderProps> = ({ onLeadsUploaded, existingLeads = [] }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedLeads, setUploadedLeads] = useState<Lead[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrors(['Please select a valid CSV file']);
      return;
    }

    setIsProcessing(true);
    setErrors([]);

    try {
      const text = await file.text();
      const leads = parseCSV(text);
      
      if (leads.length === 0) {
        setErrors(['No valid leads found in the CSV file']);
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

        if (!lead.email.includes('@')) {
          validationErrors.push(`Row ${index + 2}: Invalid email format`);
          return;
        }

        // Check for duplicates
        const isDuplicate = existingLeads.some(existing => existing.email === lead.email) ||
                          validLeads.some(valid => valid.email === lead.email);

        if (isDuplicate) {
          validationErrors.push(`Row ${index + 2}: Duplicate email address (${lead.email})`);
          return;
        }

        validLeads.push(lead);
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      }

      setUploadedLeads(validLeads);
      
      if (validLeads.length > 0) {
        onLeadsUploaded(validLeads);
      }
    } catch (error) {
      setErrors(['Failed to process CSV file. Please check the file format.']);
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
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeLead = (index: number) => {
    const newLeads = uploadedLeads.filter((_, i) => i !== index);
    setUploadedLeads(newLeads);
    onLeadsUploaded(newLeads);
  };

  const clearAll = () => {
    setUploadedLeads([]);
    setErrors([]);
    onLeadsUploaded([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className={`mx-auto h-12 w-12 mb-4 ${
              isDragging ? 'text-blue-500' : 'text-gray-400'
            }`} />
            
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
                {isProcessing ? 'Processing...' : 'Choose CSV File'}
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
                <div key={index} className="text-sm">{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Uploaded Leads Summary */}
      {uploadedLeads.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Uploaded Leads</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {uploadedLeads.length} leads
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedLeads.map((lead, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {lead.email}
                      </TableCell>
                      <TableCell>
                        {lead.firstName || lead.lastName ? 
                          `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : 
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        {lead.company || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLead(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {uploadedLeads.length > 0 && errors.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Successfully uploaded {uploadedLeads.length} leads. 
            {existingLeads.length > 0 && ` Combined with ${existingLeads.length} existing leads.`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default CSVUploader;
