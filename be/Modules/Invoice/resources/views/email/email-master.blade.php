<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
    <style>
        .paynow {
            background: #e8f4fc;
            padding: 12px 10px;
            color: black;
            font-size: 15px;
            border: 0;
            text-decoration: none;
            border-radius: 4px;
            position: relative;
            top: -40px;
            /* position: absolute;
            right: 26%;
            top: 65px; */

        }

        .paynow:hover {
            opacity: 0.8;
        }
    </style>
</head>

<body
    style="font-family: 'Roboto', sans-serif; width: 1000px; margin-left: auto; margin-right: auto; padding: 0px 10px;">
    <header>
        <!-- <div style="background: black; text-align: center; margin-bottom: 20px;">
            <img style="height: 120px; width: auto; display: block; margin: auto; padding: 10px 10px;" src="http://localhost:8080/admin/img/comp_logo_14.png" alt="">
            {{-- <img style="height: 120px; width: auto; display: block; margin: auto; padding: 10px 10px;" src="{{ asset('admin/img/logo-pdf.png') }}" alt=""> --}}
        </div> -->
    </header>
    @yield('content')
    <!-- <footer style="position: fixed; bottom: 0cm; left: 0cm; right: 0cm; text-align: center; height: 2cm; font-weight: bold;">
        <div style="padding: 2px 0px; font-weight: normal; color: dimgrey">Powered by BookWise</div>
        <div style="padding: 2px 0px; font-weight: normal; color: dimgrey">This is an automated email send from BookWise </div>
        <div style="padding: 2px 0px; font-weight: normal; color: dimgrey">+44 158 275 3283</div>
    </footer> -->
</body>

</html>
