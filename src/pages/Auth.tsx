import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, Building, MapPin, Globe } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import OTPVerification from "@/components/OTPVerification";
import { GoogleLogin } from '@react-oauth/google';

// ✅ New API helpers that talk to your Node + MySQL backend
import { registerUser, loginUser } from "@/api/auth";

// ✅ Keep these only for OTP + social flows (frontend-only for now)
import { verifyOTP, handleGoogleLogin, handleMicrosoftLogin } from "@/lib/auth";

const Auth = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signUpProgress, setSignUpProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [signUpData, setSignUpData] = useState({
    email: '',
    name: '',
    company: '',
    city: '',
    country: '',
    password: '',
    confirmPassword: ''
  });

  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const updateSignUpProgress = () => {
    const fields = ['email', 'name', 'company', 'city', 'country', 'password'];
    const filledFields = fields.filter(
      field => signUpData[field as keyof typeof signUpData].trim() !== ''
    );
    const progress = (filledFields.length / fields.length) * 100;
    setSignUpProgress(progress);
  };

  React.useEffect(() => {
    updateSignUpProgress();
  }, [signUpData]);

  // ✅ SIGN UP → calls backend /api/auth/register and stores in MySQL
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (calculatePasswordStrength(signUpData.password) < 75) {
      toast({
        title: "Weak Password",
        description: "Please choose a stronger password",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      // 🔗 Call Node + MySQL backend (registers user in `users` table)
      await registerUser(
        signUpData.name,
        signUpData.email,
        signUpData.password
      );

      // If later you add OTP via backend, you can re-enable this:
      // setUserEmail(signUpData.email);
      // setShowOTPVerification(true);

      toast({
        title: "Account Created!",
        description: "You can now sign in with your email and password."
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "Sign Up Failed",
        description: error?.response?.data?.error || error.message || "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ SIGN IN → calls backend /api/auth/login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 🔗 Call Node + MySQL backend (checks email + password)
      const result = await loginUser(signInData.email, signInData.password);
      // Expected shape from backend:
      // { message: "Login successful", user: { id, name, email }, token?: string }

      toast({
        title: "Welcome Back!",
        description: "Successfully signed in to MailSkrap"
      });

      if (result?.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      if (result?.token) {
        localStorage.setItem('authToken', result.token);
      }

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Sign In Failed",
        description: error?.response?.data?.error || error.message || "Invalid email or password",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // (OTP is still wired to frontend helper; not required for DB login)
  const handleOTPVerification = async (otp: string) => {
    try {
      const result = await verifyOTP(userEmail, otp);

      toast({
        title: "Email Verified Successfully!",
        description: "You can now sign in to your account"
      });

      setShowOTPVerification(false);
      return true;
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleSocialLogin = async (provider: string, data?: any) => {
    try {
      let result;

      if (provider === 'Google' && data) {
        result = await handleGoogleLogin(data);
      } else if (provider === 'Microsoft' && data) {
        result = await handleMicrosoftLogin(data);
      } else {
        toast({
          title: `${provider} Login`,
          description: `${provider} authentication will be implemented soon`
        });
        return;
      }

      if (result) {
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        if (result.token) {
          localStorage.setItem('authToken', result.token);
        }

        toast({
          title: "Welcome!",
          description: `Successfully signed in with ${provider}`
        });

        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error(`${provider} login error:`, error);
      toast({
        title: `${provider} Login Failed`,
        description: error.message || `Failed to sign in with ${provider}`,
        variant: "destructive"
      });
    }
  };

  const handleOTPVerified = () => {
    setShowOTPVerification(false);
    toast({
      title: "Email Verified!",
      description: "You can now sign in to your account"
    });
  };

  const handleBackFromOTP = () => {
    setShowOTPVerification(false);
  };

  const passwordStrength = calculatePasswordStrength(signUpData.password);
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return 'bg-red-500';
    if (passwordStrength < 50) return 'bg-orange-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Weak';
    if (passwordStrength < 50) return 'Fair';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  if (showOTPVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#012970] to-blue-800 bg-clip-text text-transparent font-nunito">
              MailSkrap
            </h1>
            <p className="text-gray-700 mt-2 font-medium">Advanced Email Marketing Platform</p>
          </div>
          <OTPVerification
            email={userEmail}
            onVerified={handleOTPVerified}
            onBack={handleBackFromOTP}
            onVerifyOTP={handleOTPVerification}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-blue-700 hover:text-blue-900 mb-4 font-semibold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to MailSkrap
          </Link>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#012970] to-blue-800 bg-clip-text text-transparent font-nunito">
            MailSkrap
          </h1>
          <p className="text-gray-700 mt-2 font-medium">Advanced Email Marketing Platform</p>
        </div>

        <Card className="border-gray-100 rounded-xl shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-[#012970]">Welcome</CardTitle>
            <CardDescription className="text-gray-600">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-blue-50">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Sign In Tab */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pl-10 pr-10"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={signInData.rememberMe}
                        onChange={(e) =>
                          setSignInData({ ...signInData, rememberMe: e.target.checked })
                        }
                        className="rounded border-gray-300"
                      />
                      <span>Remember me</span>
                    </label>
                    <Button variant="link" className="text-blue-700 hover:text-blue-800 p-0 h-auto">
                      Forgot password?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#1e3a8a] hover:bg-[#1e40af]"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="w-full">
                      <GoogleLogin
                        onSuccess={(credentialResponse) => {
                          handleSocialLogin('Google', credentialResponse);
                        }}
                        onError={() => {
                          toast({
                            title: "Google Login Failed",
                            description: "Failed to sign in with Google",
                            variant: "destructive"
                          });
                        }}
                        theme="outline"
                        size="large"
                        width="100%"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleSocialLogin('Microsoft')}
                      className="border-gray-300"
                    >
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#F25022" d="M0 0h11.377v11.372H0z" />
                        <path fill="#00A4EF" d="M12.623 0H24v11.372H12.623z" />
                        <path fill="#7FBA00" d="M0 12.628h11.377V24H0z" />
                        <path fill="#FFB900" d="M12.623 12.628H24V24H12.623z" />
                      </svg>
                      Microsoft
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup">
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-700 mb-1 font-medium">
                    <span>Profile Completion</span>
                    <span>{Math.round(signUpProgress)}%</span>
                  </div>
                  <Progress value={signUpProgress} className="h-2 bg-blue-100" />
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-name"
                          placeholder="John Doe"
                          className="pl-10"
                          value={signUpData.name}
                          onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="john@company.com"
                          className="pl-10"
                          value={signUpData.email}
                          onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-company">Company Name</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-company"
                        placeholder="Your Company"
                        className="pl-10"
                        value={signUpData.company}
                        onChange={(e) =>
                          setSignUpData({ ...signUpData, company: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-city">City</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-city"
                          placeholder="New York"
                          className="pl-10"
                          value={signUpData.city}
                          onChange={(e) => setSignUpData({ ...signUpData, city: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-country">Country</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-country"
                          placeholder="United States"
                          className="pl-10"
                          value={signUpData.country}
                          onChange={(e) =>
                            setSignUpData({ ...signUpData, country: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        className="pl-10 pr-10"
                        value={signUpData.password}
                        onChange={(e) =>
                          setSignUpData({ ...signUpData, password: e.target.value })
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signUpData.password && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Password strength</span>
                          <span
                            className={`font-medium ${
                              passwordStrength < 50
                                ? 'text-red-600'
                                : passwordStrength < 75
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            {getPasswordStrengthText()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all ${getPasswordStrengthColor()}`}
                            style={{ width: `${passwordStrength}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="pl-10 pr-10"
                        value={signUpData.confirmPassword}
                        onChange={(e) =>
                          setSignUpData({ ...signUpData, confirmPassword: e.target.value })
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#1e3a8a] hover:bg-[#1e40af]"
                    disabled={isLoading || signUpProgress < 100}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    By creating an account, you agree to our{" "}
                    <Link to="/terms" className="underline text-blue-800">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="underline text-blue-800">
                      Privacy Policy
                    </Link>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
