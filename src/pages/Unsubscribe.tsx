
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Radio, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const unsubscribeReasons = [
  "Spam",
  "Not required",
  "Not interested",
  "Something I hate"
];

const Unsubscribe = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
      toast({
        title: "Unsubscribed",
        description: "You have unsubscribed successfully.",
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <main className="flex-1 flex items-center justify-center">
        <form
          className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg space-y-8"
          onSubmit={handleSubmit}
        >
          <div>
            <h1 className="text-3xl font-bold text-[#012970] mb-2 font-nunito">
              Unsubscribe from SpeedTech
            </h1>
            <p className="text-gray-600 mb-4">
              If you wish to stop receiving emails, enter your email below and optionally select a reason.
            </p>
            <div className="bg-blue-50 rounded p-3 mb-4 text-gray-700 text-sm">
              <span className="font-semibold">Privacy Notice:</span> When you unsubscribe, we mark your email as 
              "Unsubscribed" in our database and retain it for up to 5 years to ensure we do not contact you again. For more details, see our{" "}
              <Link className="underline text-blue-700" to="/privacy">
                Privacy Policy
              </Link>.
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="email" className="mb-1 block">Email:</Label>
              <Input
                id="email"
                type="email"
                className="font-medium"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Label className="block mb-2">Reason for Unsubscribing <span className="text-gray-400">(Optional):</span></Label>
              <div className="grid grid-cols-1 gap-3">
                {unsubscribeReasons.map(r => (
                  <label
                    key={r}
                    className="flex items-center gap-2 rounded px-2 py-2 hover:bg-blue-50 cursor-pointer border border-transparent focus-within:border-blue-500"
                  >
                    <input
                      type="radio"
                      name="reason"
                      className="hidden"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                    />
                    <span>
                      {reason === r ? (
                        <CheckCircle className="text-blue-600" size={20} />
                      ) : (
                        <Radio className="text-gray-400" size={20} />
                      )}
                    </span>
                    <span className="select-none">{r}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#1e3a8a] hover:bg-[#1e40af]"
            disabled={submitting || !email}
          >
            {submitting ? "Unsubscribing..." : "Unsubscribe"}
          </Button>

          {success && (
            <div className="bg-green-50 text-green-700 rounded p-3 flex items-center gap-2 mt-3 border border-green-200">
              <CheckCircle className="text-green-500" size={20} />
              You have successfully unsubscribed.
            </div>
          )}
        </form>
      </main>
      <footer className="text-center text-xs text-gray-500 pb-6 px-2 mt-10">
        MarketSkrap, a division of SpeedTech, powers our marketing efforts with a focus on data compliance, security, and privacy, operating independently from SpeedTech’s core business.
      </footer>
    </div>
  );
};

export default Unsubscribe;
