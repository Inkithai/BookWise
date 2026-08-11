<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
</head>
<body>
    <script>
        // Break out of Stripe iframe and redirect the top-level window
        window.top.location.href = "{{ $targetUrl }}";
    </script>
    <noscript>
        <meta http-equiv="refresh" content="0;url={{ $targetUrl }}">
        <p>Redirecting... <a href="{{ $targetUrl }}">Click here</a> if not redirected.</p>
    </noscript>
</body>
</html>
