"use client";

import React, { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Lock, Mail, User, UserCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { registrationAction } from "./registrationAction.action";
import { toast } from "sonner";

interface RegistrationFormData {
  name: string;
  userName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  role: "applicant" | "employer";
}

const Registration: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<RegistrationFormData>({
    name: "",
    userName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    role: "applicant",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    userName?: string;
    email?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === "userName" || name === "email") {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (formData.password !== formData.confirmPassword) {
      const message = "Passwords do not match.";
      setError(message);
      toast.error("Passwords do not match", {
        description: "Please make sure both password fields are identical.",
      });
      return;
    }

    const registrationData = {
      name: formData.name.trim(),
      userName: formData.userName.trim(),
      email: formData.email.toLowerCase().trim(),
      phoneNumber: formData.phoneNumber.trim(),
      password: formData.password,
      role: formData.role,
    };

    setIsSubmitting(true);
    try {
      const result = await registrationAction(registrationData);

      if (result.success) {
        toast.success("Account created successfully!", {
          description: "Please sign in with your new account.",
        });
        router.push("/login");
        router.refresh();
        return;
      }

      if (result.field) {
        setFieldErrors({ [result.field]: result.message });
        toast.error(
          result.field === "email" ? "Email already in use" : "Username taken",
          { description: result.message },
        );
        return;
      }

      const message = result.message ?? "Registration failed.";
      setError(message);
      toast.error("Registration failed", { description: message });
    } catch {
      const message = "Registration failed. Please try again.";
      setError(message);
      toast.error("Registration failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <UserCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Join Our Job Portal</CardTitle>
          <CardDescription>Create your account to get started</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  required
                  value={formData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("name", e.target.value)
                  }
                  className={`pl-10 `}
                />
              </div>
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="userName">Username *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="userName"
                  type="text"
                  name="userName"
                  placeholder="Choose a username"
                  required
                  value={formData.userName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("userName", e.target.value)
                  }
                  aria-invalid={!!fieldErrors.userName}
                  className={`pl-10 ${
                    fieldErrors.userName ? "border-destructive" : ""
                  }`}
                />
              </div>
              {fieldErrors.userName && (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.userName}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  required
                  value={formData.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("email", e.target.value)
                  }
                  aria-invalid={!!fieldErrors.email}
                  className={`pl-10 ${
                    fieldErrors.email ? "border-destructive" : ""
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Phone Number Field */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                name="phoneNumber"
                placeholder="Enter your phone number"
                maxLength={18}
                required
                value={formData.phoneNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("phoneNumber", e.target.value)
                }
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-2 w-full">
              <Label htmlFor="role">I am a *</Label>
              <Select
                value={formData.role}
                name="role"
                onValueChange={(value) => {
                  if (value) handleInputChange("role", value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="applicant">Job Applicant</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  required
                  value={formData.password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("password", e.target.value)
                  }
                  className={`pl-10 pr-10 `}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  className={`pl-10 pr-10 `}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>

            {error && (
              <p className="text-sm text-destructive text-center" role="alert">
                {error}
              </p>
            )}

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Registration;
