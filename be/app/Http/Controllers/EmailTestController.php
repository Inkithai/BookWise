<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\View;
use Modules\User\Mail\UserOtpMail;
use Modules\User\Mail\UserResetPasswordMail;
use Modules\User\Mail\UserCreatePasswordMail;
use Modules\User\Mail\TrialStatusMail;
use Modules\User\Mail\SubscriptionChargeSuccessMail;
use Modules\User\Mail\SubscriptionChargeFailedMail;
use Modules\User\Mail\CustomerSupportMail;

class EmailTestController extends Controller
{
    /**
     * Email template configurations
     */
    protected $emailTemplates = [
        'otp' => [
            'name' => 'OTP Verification',
            'description' => 'Email verification OTP with code display',
            'view' => 'mail.otp',
            'mailable' => UserOtpMail::class,
        ],
        'reset-password' => [
            'name' => 'Reset Password',
            'description' => 'Password reset request with secure link',
            'view' => 'mail.reset-password-email',
            'mailable' => UserResetPasswordMail::class,
        ],
        'create-password' => [
            'name' => 'Create Password',
            'description' => 'Account activation and password creation',
            'view' => 'mail.create-password-email',
            'mailable' => UserCreatePasswordMail::class,
        ],
        'trial-status' => [
            'name' => 'Trial Status',
            'description' => 'Trial period and grace period notifications',
            'view' => 'mail.trial-status',
            'mailable' => TrialStatusMail::class,
        ],
        'subscription-success' => [
            'name' => 'Subscription Payment Success',
            'description' => 'Successful subscription charge confirmation',
            'view' => 'mail.subscription-charge-success',
            'mailable' => SubscriptionChargeSuccessMail::class,
        ],
        'subscription-failed' => [
            'name' => 'Subscription Payment Failed',
            'description' => 'Failed payment and account deactivation notice',
            'view' => 'mail.subscription-charge-fail',
            'mailable' => SubscriptionChargeFailedMail::class,
        ],
        'customer-support' => [
            'name' => 'Customer Support',
            'description' => 'New support ticket notification',
            'view' => 'mail.customer-support',
            'mailable' => CustomerSupportMail::class,
        ],
        'master-preview' => [
            'name' => 'Master Template Preview',
            'description' => 'Standard email layout with header, body, and footer',
            'view' => 'emails.preview.master-preview',
            'mailable' => null,
        ],
    ];

    /**
     * Show email testing dashboard
     */
    public function index()
    {
        return view('emails.test.dashboard', [
            'templates' => $this->emailTemplates,
        ]);
    }

    /**
     * Send test email
     */
    public function sendTest(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'template' => 'required|string',
            'subject' => 'required|string',
        ]);

        try {
            $email = $request->input('email');
            $template = $request->input('template');
            $subject = $request->input('subject');

            if (!isset($this->emailTemplates[$template])) {
                return back()->with('error', "Template not found: {$template}");
            }

            $templateConfig = $this->emailTemplates[$template];

            // Send using mailable class if available
            if ($templateConfig['mailable']) {
                if ($template === 'otp') {
                    $mailData = [
                        'name' => 'John Doe',
                        'otp' => '847293',
                    ];
                    Mail::to($email)->send(new UserOtpMail($mailData, null, null));
                } elseif ($template === 'reset-password') {
                    $mailData = [
                        'name' => 'John Doe',
                        'reset_url' => url('/reset-password?token=sample-token-12345'),
                    ];
                    Mail::to($email)->send(new UserResetPasswordMail($mailData, null, null));
                } elseif ($template === 'create-password') {
                    $mailData = [
                        'name' => 'John Doe',
                        'company_name' => 'Acme Corporation',
                        'activation_url' => url('/activate-account?token=sample-token-67890'),
                    ];
                    Mail::to($email)->send(new UserCreatePasswordMail($mailData, null, null));
                } elseif ($template === 'trial-status') {
                    $user = (object) ['first_name' => 'John'];
                    $subscription = (object) ['grace_ends_at' => now()->addDays(5)];
                    $type = 'grace_started';
                    Mail::to($email)->send(new TrialStatusMail($user, $subscription, $type, null, null));
                } elseif ($template === 'subscription-success') {
                    $user = (object) ['first_name' => 'John'];
                    $subscription = (object) [
                        'plan_name' => 'Professional Plan',
                        'amount' => 29.99,
                        'next_payment_at' => now()->addMonth()->format('d M Y'),
                    ];
                    Mail::to($email)->send(new SubscriptionChargeSuccessMail($user, $subscription, null, null));
                } elseif ($template === 'subscription-failed') {
                    $user = (object) ['first_name' => 'John'];
                    $subscription = (object) [
                        'plan_name' => 'Professional Plan',
                        'amount' => 29.99,
                    ];
                    Mail::to($email)->send(new SubscriptionChargeFailedMail($user, $subscription, null, null));
                } elseif ($template === 'customer-support') {
                    $ticket = (object) [
                        'id' => 1001,
                        'first_name' => 'John',
                        'last_name' => 'Doe',
                        'email' => 'john.doe@example.com',
                        'phone_number' => '+1 234 567 8900',
                        'problem_category' => 'Billing Issue',
                        'specify_others' => null,
                        'description' => 'I was charged twice for my subscription this month. Please review my account and refund the duplicate charge.',
                        'file_path' => null,
                        'created_at' => now(),
                    ];
                    Mail::to($email)->send(new CustomerSupportMail($ticket, null, null));
                }
            } else {
                // Send raw HTML email for preview templates
                Mail::send([], [], function ($message) use ($email, $subject, $template) {
                    $message->to($email)
                        ->subject($subject)
                        ->html(View::make($this->emailTemplates[$template]['view'])->render());
                });
            }

            return back()->with('success', "Test email sent to {$email}!");
        } catch (\Exception $e) {
            return back()->with('error', "Failed to send: {$e->getMessage()}");
        }
    }

    /**
     * Preview email HTML source
     */
    public function previewHtml($template)
    {
        try {
            if (!isset($this->emailTemplates[$template])) {
                return response("Template not found: {$template}", 404);
            }

            $viewName = $this->emailTemplates[$template]['view'];
            
            // Pass sample data for templates that need it
            $data = $this->getSampleData($template);
            
            $html = View::make($viewName, $data)->render();
            return response($html)->header('Content-Type', 'text/html');
        } catch (\Exception $e) {
            return response("Template not found: {$template}. Error: {$e->getMessage()}", 404);
        }
    }

    /**
     * Download email HTML file
     */
    public function downloadHtml($template)
    {
        try {
            if (!isset($this->emailTemplates[$template])) {
                return response("Template not found: {$template}", 404);
            }

            $viewName = $this->emailTemplates[$template]['view'];
            $data = $this->getSampleData($template);
            
            $html = View::make($viewName, $data)->render();
            $filename = "email-{$template}-" . date('Y-m-d') . ".html";
            
            return response($html, 200)
                ->header('Content-Type', 'text/html')
                ->header('Content-Disposition', "attachment; filename={$filename}");
        } catch (\Exception $e) {
            return response("Template not found: {$template}", 404);
        }
    }

    /**
     * Get sample data for email templates
     */
    protected function getSampleData($template)
    {
        switch ($template) {
            case 'otp':
                return [
                    'mailData' => [
                        'name' => 'John Doe',
                        'otp' => '847293',
                    ],
                ];
            
            case 'reset-password':
                return [
                    'mailData' => [
                        'name' => 'John Doe',
                        'reset_url' => url('/reset-password?token=sample-token-12345'),
                    ],
                ];
            
            case 'create-password':
                return [
                    'mailData' => [
                        'name' => 'John Doe',
                        'company_name' => 'Acme Corporation',
                        'activation_url' => url('/activate-account?token=sample-token-67890'),
                    ],
                ];
            
            case 'trial-status':
                return [
                    'user' => (object) ['first_name' => 'John'],
                    'subscription' => (object) ['grace_ends_at' => now()->addDays(5)],
                    'type' => 'grace_started',
                ];
            
            case 'subscription-success':
                return [
                    'user' => (object) ['first_name' => 'John'],
                    'subscription' => (object) [
                        'plan_name' => 'Professional Plan',
                        'amount' => 29.99,
                        'next_payment_at' => now()->addMonth()->format('d M Y'),
                    ],
                ];
            
            case 'subscription-failed':
                return [
                    'user' => (object) ['first_name' => 'John'],
                    'subscription' => (object) [
                        'plan_name' => 'Professional Plan',
                        'amount' => 29.99,
                    ],
                ];
            
            case 'customer-support':
                return [
                    'ticket' => (object) [
                        'id' => 1001,
                        'first_name' => 'John',
                        'last_name' => 'Doe',
                        'email' => 'john.doe@example.com',
                        'phone_number' => '+1 234 567 8900',
                        'problem_category' => 'Billing Issue',
                        'specify_others' => null,
                        'description' => 'I was charged twice for my subscription this month. Please review my account and refund the duplicate charge.',
                        'file_path' => null,
                        'created_at' => now(),
                    ],
                ];
            
            case 'master-preview':
                return [
                    'emailTitle' => 'Test Email',
                    'customerName' => 'John Doe',
                    'message' => 'This is a test email to verify the master template rendering across different email clients.',
                    'infoCode' => '847293',
                    'ctaUrl' => 'https://bookwise.com',
                    'ctaText' => 'Visit Dashboard',
                ];
            
            default:
                return [];
        }
    }
}
