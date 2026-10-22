"use client";

import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Eye, EyeOff, Lock, Mail, Phone, User, UserCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { registerUserAction } from "@/features/auth/server/auth.actions";
import {
  registerUserWithConfirmSchema,
  type RegisterUserWithConfirmData,
  type RegisterUserWithConfirmInput,
} from "@/features/auth/auth.schema";

/** The names of the inputs on this form — used to route server errors back. */
type RegisterFieldName =
  | "name"
  | "userName"
  | "email"
  | "phoneNumber"
  | "password"
  | "confirmPassword"
  | "role";

const REGISTER_FIELD_NAMES: RegisterFieldName[] = [
  "name",
  "userName",
  "email",
  "phoneNumber",
  "password",
  "confirmPassword",
  "role",
];

const Registration: React.FC = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 👉 `useForm` is the brain of the form. `zodResolver` plugs the Zod schema
  // in as the validator, so `handleSubmit` runs it before the Server Action is
  // ever called — the browser catches bad input before it reaches the server.
  const form = useForm<
    RegisterUserWithConfirmInput,
    unknown,
    RegisterUserWithConfirmData
  >({
    resolver: zodResolver(registerUserWithConfirmSchema),
    defaultValues: {
      name: "",
      userName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      role: "applicant",
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (data: RegisterUserWithConfirmData) => {
    // The confirmation field is only for the browser. The Server Action has no
    // idea it exists, so it never gets sent.
    const { confirmPassword: _confirmPassword, ...payload } = data;

    try {
      const result = await registerUserAction(payload);

      if (result.status === "SUCCESS") {
        toast.success(result.message);
        // A session was created, so send the new user to the home page.
        router.push("/");
        router.refresh();
        return;
      }

      toast.error(result.message);

      // The server can still reject a value that looked fine in the browser
      // (a username that is already taken, for example). Push those messages
      // back onto the exact inputs that caused them.
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          // Ignore anything that is not actually an input on this form.
          if (!REGISTER_FIELD_NAMES.includes(field as RegisterFieldName)) continue;

          setError(field as RegisterFieldName, {
            type: "server",
            message,
          });
        }
      }
    } catch {
      toast.error("Registration failed. Please try again.");
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  aria-invalid={!!errors.name}
                  className={`pl-10 ${errors.name ? "border-destructive" : ""}`}
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="userName">Username *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="userName"
                  type="text"
                  autoComplete="username"
                  placeholder="Choose a username"
                  aria-invalid={!!errors.userName}
                  className={`pl-10 ${errors.userName ? "border-destructive" : ""}`}
                  {...register("userName")}
                />
              </div>
              {errors.userName && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.userName.message}
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
                  autoComplete="email"
                  placeholder="Enter your email"
                  aria-invalid={!!errors.email}
                  className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone Number Field */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Enter your phone number"
                  maxLength={18}
                  aria-invalid={!!errors.phoneNumber}
                  className={`pl-10 ${errors.phoneNumber ? "border-destructive" : ""}`}
                  {...register("phoneNumber")}
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-2 w-full">
              <Label htmlFor="role">I am a *</Label>
              {/*
                👉 A `<Select>` is a controlled component, so `register` cannot
                attach to it. `Controller` is the bridge: it keeps the value in
                the form state and pushes it back down on every change.
              */}
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "applicant"}
                    onValueChange={(value) =>
                      field.onChange(value ?? "applicant")
                    }
                  >
                    <SelectTrigger
                      id="role"
                      className="w-full"
                      aria-invalid={!!errors.role}
                    >
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="applicant">Job Applicant</SelectItem>
                      <SelectItem value="employer">Employer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  aria-invalid={!!errors.password}
                  className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                  {...register("password")}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  aria-invalid={!!errors.confirmPassword}
                  className={`pl-10 pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                  {...register("confirmPassword")}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>

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
