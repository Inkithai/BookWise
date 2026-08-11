<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            background-color: #f4f4f4;
            padding: 20px;
        }

        .container {
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
        }

        .btn {
            background-color: #3490dc;
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
        }

        .alert {
            padding: 10px;
            background-color: #28a745;
            color: white;
            margin-bottom: 20px;
        }
    </style>
</head>

<body>
    <div class="container">
        <h2>Password Reset Request</h2>

        <p>Hello {{ $mailData['name'] }},</p>

        <p>
            We received a request to reset the password for your BookWise Invoicing account.<br>
            To continue, please use the secure link below:
        </p>

        <a href="{{ $mailData['reset_url'] }}" class="btn">Reset Password</a>

        <p>
            If you did not request this, you may ignore this email — your account will remain unchanged.<br>
            For security purposes, this link will expire in <strong>60 minutes</strong>.
        </p>

        <p>Thank you,<br>
        The BookWise Team
        </p>
        <hr>
        <div class="footer">
            <p>
                This is an automated security email from BookWise. If you believe this was sent in error,
                no action is required.<br>
                Do not reply to this message.</p>
        </div>
    </div>
</body>

</html>
