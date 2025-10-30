"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function Signup() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      // Sign up with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;

      if (data.user && data.session) {
        // Manually create user profile in database (since trigger might not work)
        try {
          console.log('Creating profile for user:', data.user.id);
          
          const { data: profileData, error: profileError } = await supabase
            .from('user')
            .insert({
              user_id: data.user.id,
              email: data.user.email,
              full_name: formData.name,  // Column is 'full_name' not 'name'
              role: null,
            })
            .select()
            .single();

          // Log any errors (but don't block signup if it's a duplicate)
          if (profileError) {
            if (profileError.message.includes('duplicate')) {
              console.log('Profile already exists, continuing...');
            } else {
              console.error('Profile creation error:', profileError);
              throw profileError;  // Throw non-duplicate errors
            }
          } else {
            console.log('✅ Profile created successfully!', profileData);
          }
        } catch (profileErr: any) {
          console.error('Error creating profile:', profileErr);
          // Show error to user
          setError(`Profile creation failed: ${profileErr.message}`);
          setLoading(false);
          return;
        }

        // Session was created, user is now logged in
        setSuccess(true);
        // Wait 1 second to show success message, then redirect to role selection
        setTimeout(() => {
          router.refresh();
          router.push("/role-selection");
        }, 1000);
      } else if (data.user && !data.session) {
        // User created but needs email confirmation
        setError("Please check your email to confirm your account before logging in.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error("Google OAuth error:", error);
        throw error;
      }
      
      // The redirect happens automatically, no need to manually redirect
      console.log("Google OAuth initiated:", data);
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "An error occurred with Google sign-in");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-600 mb-4">Let's set up your account...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:block"
        >
          <Link href="/" className="flex items-center gap-3 mb-8">
            <div className="relative w-12 h-12">
              <Image
                src="/logo.png"
                alt="GeoRepute.ai Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-3xl font-bold text-primary-600">
              GeoRepute.ai
            </span>
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Start Your Journey
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Join the next generation of AI-driven visibility optimization.
          </p>

          <div className="space-y-4">
            {[
              "Real-time visibility tracking",
              "AI-powered optimization",
              "Comprehensive analytics",
              "50+ automated reports",
            ].map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-primary-600" />
                </div>
                <span className="text-gray-700">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Side - Signup Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl p-8 md:p-10 shadow-xl"
        >
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2 justify-center">
              <div className="relative w-10 h-10">
                <Image
                  src="/logo.png"
                  alt="GeoRepute.ai Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-2xl font-bold text-primary-600">
                GeoRepute.ai
              </span>
            </Link>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-600 mb-8">
            Get started with your free account today
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  placeholder="john@company.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold text-lg hover:shadow-xl hover:shadow-primary-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google SSO */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
            </button>
          </form>

          {/* Sign In Link */}
          <p className="mt-8 text-center text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

