
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLocation } from "react-router-dom";

interface LeadCaptureFormProps {
  service: string;
  description?: string;
  onSubmitSuccess?: () => void;
}

const parseUTM = (search: string) => {
  const params = new URLSearchParams(search);
  const utm_source = params.get("utm_source");
  const utm_medium = params.get("utm_medium");
  const utm_campaign = params.get("utm_campaign");
  return {
    utm_source: utm_source || (utm_source === null && utm_medium === null && utm_campaign === null ? "organic" : null),
    utm_medium: utm_medium ?? null,
    utm_campaign: utm_campaign ?? null
  };
};

const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({ service, description, onSubmitSuccess }) => {
  const location = useLocation();
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    city: "",
    country: "",
    company: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{[k:string]: string}>({});

  const utm = parseUTM(location.search);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({
      ...f,
      [e.target.name]: e.target.value
    }));
  };

  const validate = () => {
    const errs: {[k:string]: string} = {};
    if (!form.name) errs.name = "Name is required";
    if (!form.mobile) errs.mobile = "Mobile Number is required";
    if (!form.email) errs.email = "Email is required";
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);

    // Simulate network request
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      if (onSubmitSuccess) onSubmitSuccess();
    }, 1200);

    /* 
      To actually store leads:
      1. Connect Lovable to Supabase & create the leads table as described below
      2. Use the Supabase client to insert these values on submit
    */
  };

  if (submitted) {
    return (
      <Card className="border-green-400 bg-green-50/75 shadow-lg mt-6">
        <CardHeader>
          <CardTitle>Thank you!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>We have received your details. Our team will get in touch shortly.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <CardTitle>{service}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Input placeholder="Name" name="name" value={form.name} onChange={handleChange} />
            {errors.name && <div className="text-xs text-red-600">{errors.name}</div>}
          </div>
          <div>
            <Input placeholder="Mobile Number" name="mobile" value={form.mobile} onChange={handleChange} type="tel" />
            {errors.mobile && <div className="text-xs text-red-600">{errors.mobile}</div>}
          </div>
          <div>
            <Input placeholder="Email" name="email" value={form.email} onChange={handleChange} type="email" />
            {errors.email && <div className="text-xs text-red-600">{errors.email}</div>}
          </div>
          <div>
            <Input placeholder="City" name="city" value={form.city} onChange={handleChange} />
          </div>
          <div>
            <Input placeholder="Country" name="country" value={form.country} onChange={handleChange} />
          </div>
          <div>
            <Input placeholder="Company Name" name="company" value={form.company} onChange={handleChange} />
          </div>
          {/* Hidden context */}
          <input type="hidden" name="lead_source" value={utm.utm_source || ""} />
          <input type="hidden" name="service" value={service} />
          <input type="hidden" name="utm_source" value={utm.utm_source || ""} />
          <input type="hidden" name="utm_medium" value={utm.utm_medium || ""} />
          <input type="hidden" name="utm_campaign" value={utm.utm_campaign || ""} />
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-900 text-lg font-semibold"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
};

export default LeadCaptureForm;
