<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Testing Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            padding: 40px;
        }
        
        h1 {
            color: #1a1a1a;
            margin-bottom: 10px;
            font-size: 32px;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        
        .alert {
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        input, select {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }
        
        button {
            background: #1988e1;
            color: white;
            padding: 12px 32px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        button:hover {
            background: #1570b8;
        }
        
        .templates-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        
        .template-card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            background: #f9f9f9;
        }
        
        .template-card h3 {
            color: #1a1a1a;
            margin-bottom: 10px;
        }
        
        .template-card p {
            color: #666;
            font-size: 14px;
            margin-bottom: 15px;
        }
        
        .button-group {
            display: flex;
            gap: 10px;
        }
        
        .btn-small {
            padding: 8px 16px;
            font-size: 14px;
            text-decoration: none;
            display: inline-block;
            border-radius: 4px;
        }
        
        .btn-primary {
            background: #1988e1;
            color: white;
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .info-box {
            background: #e7f3ff;
            border-left: 4px solid #1988e1;
            padding: 16px;
            margin: 30px 0;
            border-radius: 4px;
        }
        
        .info-box h3 {
            margin-bottom: 8px;
            color: #1988e1;
        }
        
        .info-box ul {
            margin-left: 20px;
            color: #333;
        }
        
        .info-box li {
            margin-bottom: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📧 Email Testing Dashboard</h1>
        <p class="subtitle">Test email templates across different clients (Gmail, Outlook, Mobile, etc.)</p>

        @if(session('success'))
            <div class="alert alert-success">
                ✅ {{ session('success') }}
            </div>
        @endif

        @if(session('error'))
            <div class="alert alert-error">
                ❌ {{ session('error') }}
            </div>
        @endif

        <div class="info-box">
            <h3>🎯 How to Test Emails</h3>
            <ul>
                <li><strong>Send Test Email:</strong> Enter your email and send a test to see how it renders in your inbox</li>
                <li><strong>Preview:</strong> View the email in your browser to quickly check layout</li>
                <li><strong>Download:</strong> Download HTML file and open it directly in email clients for testing</li>
                <li><strong>Test in Multiple Clients:</strong> Send to Gmail, Outlook, Yahoo, and mobile apps to verify consistency</li>
            </ul>
        </div>

        <!-- Send Test Email Form -->
        <div style="background: #f5f5f5; padding: 30px; border-radius: 8px; margin-bottom: 40px;">
            <h2 style="margin-bottom: 20px; color: #1a1a1a;">Send Test Email</h2>
            
            <form method="POST" action="/email-test/send">
                @csrf
                
                <div class="form-group">
                    <label for="email">Your Email Address *</label>
                    <input type="email" id="email" name="email" placeholder="your.email@gmail.com" required>
                </div>

                <div class="form-group">
                    <label for="template">Email Template *</label>
                    <select id="template" name="template" required>
                        <option value="">Select a template...</option>
                        @foreach($templates as $key => $template)
                            <option value="{{ $key }}">{{ $template['name'] }}</option>
                        @endforeach
                    </select>
                </div>

                <div class="form-group">
                    <label for="subject">Email Subject *</label>
                    <input type="text" id="subject" name="subject" value="Test: Standard Email Template - Design Preview" required>
                </div>

                <button type="submit">📤 Send Test Email</button>
            </form>
        </div>

        <!-- Available Templates -->
        <h2 style="margin-bottom: 20px; color: #1a1a1a;">Available Templates</h2>
        
        <div class="templates-grid">
            @foreach($templates as $key => $template)
            <div class="template-card">
                <h3>{{ $template['name'] }}</h3>
                <p>{{ $template['description'] }}</p>
                <div class="button-group">
                    <a href="/email-test/preview/{{ $key }}" target="_blank" class="btn-small btn-primary">
                        👁️ Preview
                    </a>
                    <a href="/email-test/download/{{ $key }}" class="btn-small btn-secondary">
                        ⬇️ Download HTML
                    </a>
                </div>
            </div>
            @endforeach
        </div>

        <div class="info-box" style="margin-top: 40px;">
            <h3>📱 Testing Checklist</h3>
            <ul>
                <li>□ Gmail (Desktop & Mobile)</li>
                <li>□ Outlook (Desktop & Web)</li>
                <li>□ Apple Mail (Mac & iPhone)</li>
                <li>□ Yahoo Mail</li>
                <li>□ Samsung Email (Android)</li>
                <li>□ Dark mode rendering</li>
                <li>□ Images loading properly</li>
                <li>□ Responsive layout on mobile</li>
            </ul>
        </div>
    </div>
</body>
</html>
