"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRight,
  Play,
  X,
  AlertCircle,
  Info,
  Shield,
  Key,
  Smartphone,
  ChevronLeft,
} from "lucide-react";

const GettingStartedGuide = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const steps = [
    {
      title: "Account Creation",
      description: "Learn how to create your account and get started with BookWise",
      content: (
        <div className="space-y-4 sm:space-y-6">
          <p className="text-gray-700 text-sm sm:text-base">
            Create your account to access all features of our invoicing and CRM platform. 
            You can register with email or use Google for faster registration.
          </p>
          
          <div className="bg-teal-50 p-3 sm:p-4 rounded-lg border border-teal-200">
            <h3 className="font-semibold text-teal-800 mb-2 text-sm sm:text-base">Registration Options</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-teal-700 text-xs sm:text-sm">
              <li className="flex items-center"><Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Email registration</li>
              <li className="flex items-center"><Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Google registration</li>
              <li className="flex items-center"><User className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Full profile setup</li>
              <li className="flex items-center"><CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Email verification</li>
            </ul>
          </div>
          
          <div className="space-y-4 sm:space-y-8">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Registration Process</h3>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                Follow these simple steps to create your account and start managing your invoices and clients.
              </p>
              
              <div className="relative bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 mt-3 sm:mt-4">
                <div className="relative">
                  <div className="w-full h-48 bg-gradient-to-br from-teal-100 to-teal-100 rounded-lg border border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <User className="h-12 w-12 text-teal-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Registration Form</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3 text-center">Fig. 1: Account creation form with email and Google options</p>
              </div>

              <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Required Information:</h4>
                  <ul className="text-green-700 text-xs sm:text-sm space-y-1 sm:space-y-2">
                    <li><strong>Full Name:</strong> Your complete name</li>
                    <li><strong>Email Address:</strong> For verification and login</li>
                    <li><strong>Phone Number:</strong> For account recovery</li>
                    <li><strong>Password:</strong> Secure password requirements</li>
                  </ul>
                </div>

                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Google Registration:</h4>
                  <ul className="text-teal-700 text-xs sm:text-sm space-y-1 sm:space-y-2">
                    <li>Click &quot;Continue with Google&quot;</li>
                    <li>Select your Google account</li>
                    <li>Grant necessary permissions</li>
                    <li>Automatic profile creation</li>
                    <li>Skip email verification step</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <Info className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 text-sm sm:text-base">Password Requirements</p>
                    <p className="text-xs sm:text-sm text-yellow-700">
                      Your password must be at least 8 characters long and include uppercase letters, 
                      lowercase letters, numbers, and special characters for maximum security.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Email Verification",
      description: "Verify your email address with OTP to secure your account",
      content: (
        <div className="space-y-4 sm:space-y-6">
          <p className="text-gray-700 text-sm sm:text-base">
            After registering, you&apos;ll receive a 6-digit OTP code via email to verify your account and ensure security.
          </p>
          
          <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2 text-sm sm:text-base">Verification Process</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-green-700 text-xs sm:text-sm">
              <li className="flex items-center"><Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> OTP sent to email</li>
              <li className="flex items-center"><Smartphone className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> 6-digit code entry</li>
              <li className="flex items-center"><CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Instant verification</li>
              <li className="flex items-center"><Key className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Secure access</li>
            </ul>
          </div>
          
          <div className="space-y-4 sm:space-y-8">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">OTP Verification Steps</h3>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                Complete the email verification process to activate your account and access the dashboard.
              </p>
              
              <div className="relative bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 mt-3 sm:mt-4">
                <div className="relative">
                  <div className="w-full h-48 bg-gradient-to-br from-green-100 to-teal-100 rounded-lg border border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <Mail className="h-12 w-12 text-green-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">OTP Verification</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3 text-center">Fig. 2: OTP verification screen with code input fields</p>
              </div>

              <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Verification Steps:</h4>
                  <ul className="text-teal-700 text-xs sm:text-sm space-y-1 sm:space-y-2">
                    <li>Check your email for OTP code</li>
                    <li>Enter the 6-digit code in the fields</li>
                    <li>Code auto-advances between fields</li>
                    <li>Click &quot;Verify &amp; Continue&quot;</li>
                    <li>Automatic redirect to dashboard</li>
                  </ul>
                </div>

                <div className="p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2 text-sm sm:text-base">Troubleshooting:</h4>
                  <ul className="text-red-700 text-xs sm:text-sm space-y-1 sm:space-y-2">
                    <li>Check spam/junk folder</li>
                    <li>Resend OTP if not received</li>
                    <li>Code expires in 10 minutes</li>
                    <li>Contact support if issues persist</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Login Process",
      description: "Learn how to login to your account and access the dashboard",
      content: (
        <div className="space-y-4 sm:space-y-6">
          <p className="text-gray-700 text-sm sm:text-base">
            Login to your account using your email and password, or continue with Google for quick access.
          </p>
          
          <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-2 text-sm sm:text-base">Login Options</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-yellow-700 text-xs sm:text-sm">
              <li className="flex items-center"><Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Email & password</li>
              <li className="flex items-center"><Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Google sign-in</li>
              <li className="flex items-center"><Key className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Remember me option</li>
              <li className="flex items-center"><Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Forgot password</li>
            </ul>
          </div>
          
          <div className="space-y-4 sm:space-y-8">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Login Interface</h3>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                Access your account through the secure login page with multiple authentication options.
              </p>
              
              <div className="relative bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 mt-3 sm:mt-4">
                <div className="relative">
                  <div className="w-full h-48 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg border border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Login Page</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3 text-center">Fig. 3: Login page with email/password and Google options</p>
              </div>

              <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Login Steps:</h4>
                  <ul className="text-green-700 text-xs sm:text-sm space-y-1 sm:space-y-2">
                    <li>Enter registered email address</li>
                    <li>Input your secure password</li>
                    <li>Toggle password visibility if needed</li>
                    <li>Click &quot;Login&quot; or press Enter</li>
                    <li>Redirect to main dashboard</li>
                  </ul>
                </div>

                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Convenience Features:</h4>
                  <ul className="text-teal-700 text-xs sm:text-sm space-y-1 sm:space-y-2">
                    <li>&quot;Remember me&quot; for faster login</li>
                    <li>Google one-click login</li>
                    <li>Password visibility toggle</li>
                    <li>Auto-fill support</li>
                    <li>Session management</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 text-sm sm:text-base">Security Features</p>
                    <p className="text-xs sm:text-sm text-red-700">
                      Multiple failed login attempts will temporarily lock your account for security. 
                      You&apos;ll receive email notifications for new logins from unrecognized devices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Password Recovery",
      description: "Reset your password if you forget it or need to change it for security",
      content: (
        <div className="space-y-4 sm:space-y-6">
          <p className="text-gray-700 text-sm sm:text-base">
            Forgot your password? Use the password recovery system to reset it securely via email.
          </p>
          
          <div className="bg-teal-50 p-3 sm:p-4 rounded-lg border border-teal-200">
            <h3 className="font-semibold text-teal-800 mb-2 text-sm sm:text-base">Recovery Process</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-teal-700 text-xs sm:text-sm">
              <li className="flex items-center"><Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Reset link via email</li>
              <li className="flex items-center"><Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Secure password change</li>
              <li className="flex items-center"><Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> One-time use links</li>
              <li className="flex items-center"><CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Immediate access</li>
            </ul>
          </div>
          
          <div className="space-y-4 sm:space-y-8">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Password Reset Flow</h3>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                Follow these steps to securely reset your password and regain access to your account.
              </p>
              
              <div className="relative bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 mt-3 sm:mt-4">
                <div className="relative">
                  <div className="w-full h-48 bg-gradient-to-br from-teal-100 to-pink-100 rounded-lg border border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <Key className="h-12 w-12 text-teal-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Password Reset</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3 text-center">Fig. 4: Password reset interface with email input and confirmation</p>
              </div>

              <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Reset Steps:</h4>
                  <ul className="text-green-700 text-xs sm:text-sm space-y-1 sm:space-y-2">
                    <li>Click &quot;Forgot Password&quot; on login page</li>
                    <li>Enter your registered email address</li>
                    <li>Check email for reset link</li>
                    <li>Click link (expires in 1 hour)</li>
                    <li>Create new secure password</li>
                    <li>Login with new credentials</li>
                  </ul>
                </div>

                <div className="p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-medium text-orange-800 mb-2 text-sm sm:text-base">Security Measures:</h4>
                  <ul className="text-orange-700 text-xs sm:text-sm space-y-1 sm:space-y-2">
                    <li>One-time use reset links</li>
                    <li>1-hour expiration time</li>
                    <li>Password strength validation</li>
                    <li>Email confirmation sent</li>
                    <li>Previous password cannot be reused</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                <div className="flex items-start">
                  <Info className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-teal-800 text-sm sm:text-base">Immediate Access</p>
                    <p className="text-xs sm:text-sm text-teal-700">
                      Once you reset your password, you can immediately sign in to your account. 
                      Your existing data and settings remain intact throughout the process.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 text-sm sm:text-base">Troubleshooting Tips</p>
                    <p className="text-xs sm:text-sm text-yellow-700">
                      If you don&apos;t receive the reset email within 5 minutes, check your spam folder. 
                      Ensure you&apos;re entering the exact email address used during registration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="w-full">
      {/* Main Container with Reduced Side Margins for Mobile */}
      <div className="bg-white shadow rounded-lg mx-2 sm:mx-4 lg:mx-6 mb-4 sm:mb-6 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-teal-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center">
              <div className="bg-teal-100 p-2 sm:p-3 rounded-lg">
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Getting Started Guide</h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-600">
                  Learn how to create your account, login, and manage your profile
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-end space-x-2 sm:space-x-3">
              <button 
                onClick={() => setShowVideo(true)}
                className="flex items-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Watch Tutorial
              </button>
            </div>
          </div>
        </div>

        {/* Progress Steps - Mobile Optimized */}
        <div className="border-b border-gray-200">
          <nav className="px-3 sm:px-6 py-2 sm:py-3 -mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Progress steps">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`py-3 sm:py-4 px-1 whitespace-nowrap border-b-2 font-medium text-xs sm:text-sm ${
                  index === activeStep
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center">
                  <span className={`flex-shrink-0 h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center mr-2 ${
                    index === activeStep 
                      ? 'bg-teal-100 border-2 border-teal-600' 
                      : index < activeStep 
                        ? 'bg-teal-100 border-2 border-teal-600' 
                        : 'bg-gray-100 border-2 border-gray-300'
                  }`}>
                    {index < activeStep ? (
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-teal-600" />
                    ) : (
                      <span className="text-xs sm:text-sm">{index + 1}</span>
                    )}
                  </span>
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden text-xs">{step.title.split(' ')[0]}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Step Content */}
        <div className="px-3 sm:px-6 py-4 sm:py-6 h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)] overflow-y-auto">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-medium text-gray-900">{steps[activeStep].title}</h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-600">{steps[activeStep].description}</p>
          </div>

          {steps[activeStep].content}

          {/* Navigation */}
          <div className="mt-6 sm:mt-8 flex justify-between items-center">
            <button
              onClick={() => setActiveStep(activeStep - 1)}
              disabled={activeStep === 0}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center ${
                activeStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Previous
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm text-gray-500">
                Step {activeStep + 1} of {steps.length}
              </span>
            </div>

            <button
              onClick={() => setActiveStep(activeStep + 1)}
              disabled={activeStep === steps.length - 1}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center ${
                activeStep === steps.length - 1
                  ? 'bg-teal-400 text-white cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {activeStep === steps.length - 1 ? 'Complete' : 'Next'}
              {activeStep < steps.length - 1 && <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-2xl sm:max-w-4xl w-full">
            <div className="p-3 sm:p-4 flex justify-between items-center border-b">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Getting Started Tutorial</h3>
              <button 
                onClick={() => setShowVideo(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            <div className="p-2 sm:p-4 bg-black aspect-video flex items-center justify-center">
              <div className="text-white text-center">
                <Play className="h-12 w-12 sm:h-16 sm:w-16 mx-auto opacity-75" />
                <p className="mt-2 text-sm sm:text-base">Account creation and login tutorial</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Duration: 12 minutes</p>
              </div>
            </div>
            <div className="p-3 sm:p-4 bg-gray-50 border-t">
              <p className="text-xs sm:text-sm text-gray-600">
                This comprehensive video covers account creation, email verification, login process, and password recovery.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GettingStartedGuide;
