<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Reset Password</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/front-end/img/favicon.ico" />

    <style>
        body {
            background: #f8f9fa;
        }
        .card {
            border-radius: 12px;
        }
        .form-control:focus {
            box-shadow: 0 0 0 0.2rem rgba(13,110,253,.25);
        }
        .login-error {
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container d-flex justify-content-center align-items-center min-vh-100">
        <div class="col-md-6">
            <div class="card shadow-sm p-4">
                <h3 class="text-center mb-4">Reset Password</h3>

                <form method="POST" action="{{ route('api.admin.auth.password.reset') }}">
                    @csrf

                    <!-- Token -->
                    <input type="hidden" name="token" value="{{ $token }}">

                    <!-- Success Message -->
                    @if (session('status'))
                        <div class="alert alert-success login-error">
                            {{ session('status') }}
                        </div>
                    @endif

                    <!-- Error Message -->
                    {{-- @if ($errors->any())
                        <div class="alert alert-danger login-error">
                            {{ $errors->first() }}
                        </div>
                    @endif --}}

                    <!-- Email -->
                    <div class="mb-3">
                        <label for="email" class="form-label">Email</label>
                        <input type="email" readonly class="form-control" id="email" name="email" value="{{ old('email', $email ?? '') }}" required>
                    </div>

                    <!-- Password -->
                    <div class="mb-3">
                        <label for="password" class="form-label">New Password</label>
                        <input type="password" class="form-control" id="password" name="password" placeholder="New password" required>
                    </div>

                    <!-- Confirm Password -->
                    <div class="mb-4">
                        <label for="password_confirmation" class="form-label">Confirm Password</label>
                        <input type="password" class="form-control" id="password_confirmation" name="password_confirmation" placeholder="Confirm password" required>
                    </div>

                    <!-- Submit -->
                    <div class="d-grid mb-3">
                        <button type="submit" class="btn btn-primary">Reset Password</button>
                    </div>

                    <!-- Footer -->
                    <!-- <div class="text-center">
                        <small class="text-muted">
                            &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
                        </small>
                    </div> -->
                </form>
            </div>
        </div>
    </div>

    <!-- Bootstrap 5 JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
