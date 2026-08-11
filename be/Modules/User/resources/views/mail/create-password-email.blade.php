<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activate Your Account</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }

        .container {
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            max-width: 600px;
            margin: 0 auto;
        }

        h2 {
            color: #3490dc;
        }

        p {
            line-height: 1.6;
        }

        .btn {
            display: inline-block;
            background-color: #3490dc;
            color: #ffffff !important;
            padding: 12px 25px;
            border-radius: 5px;
            text-decoration: none;
            margin-top: 15px;
        }

        .footer {
            font-size: 12px;
            color: #777777;
            margin-top: 30px;
        }

        hr {
            border: 0;
            border-top: 1px solid #eeeeee;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Welcome to BookWise</h2>

        <p>Hello {{ $mailData['name'] }},</p>

        <p>
            You have been added to <strong>BookWise</strong> by
            <strong>{{ $mailData['company_name'] }}</strong>.
        </p>

        <p>
            This invitation gives you access to the platform based on your assigned role.
            We’re happy to have you onboard and look forward to working together more efficiently.
        </p>

        <p>
            Click the button below to set your password and sign in for the first time. For security purposes, this link will expire in <strong>60 minutes</strong>.
        </p>

        <a href="{{ $mailData['activation_url'] }}" class="btn">
            Activate Your Account
        </a>
        
        <p>Thank you,<br>
        <strong>The BookWise Team</strong>
        </p>
        <hr>

        <div class="footer">
            <p>
                This is an automated email from BookWise.<br>
                Please do not reply to this message.
            </p>
        </div>
    </div>
</body>
</html>
