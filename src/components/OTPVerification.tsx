
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OTPVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
  onVerifyOTP: (otp: string) => Promise<boolean>;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({ email, onVerified, onBack, onVerifyOTP }) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit OTP",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const success = await onVerifyOTP(otp);
      if (success) {
        onVerified();
      }
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      // For now, we'll simulate resend - you can implement actual resend logic later
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent to your email"
      });
    } catch (error) {
      toast({
        title: "Failed to Resend",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="border-gray-100 rounded-xl shadow-lg">
      <CardHeader className="text-center pb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="absolute left-4 top-4 p-2 h-auto"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <CardTitle className="text-2xl font-bold text-[#012970]">Verify Your Email</CardTitle>
        <CardDescription className="text-gray-600">
          We've sent a 6-digit code to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Demo Mode:</strong> The OTP has been displayed in the browser console and as an alert popup. 
            In production, this would be sent to your email address.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerifyOTP}
            className="w-full bg-[#1e3a8a] hover:bg-[#1e40af]"
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading ? "Verifying..." : "Verify Email"}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Didn't receive the code?
            </p>
            <Button
              variant="link"
              onClick={handleResendOTP}
              className="text-blue-700 hover:text-blue-800 p-0 h-auto"
              disabled={isResending}
            >
              {isResending ? "Resending..." : "Resend Code"}
            </Button>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          The verification code will expire in 10 minutes
        </div>
      </CardContent>
    </Card>
  );
};

export default OTPVerification;
