<?php

namespace Modules\User\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Traits\LogsActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Modules\User\Http\Requests\CustomerSupportRequest;
use Modules\User\Mail\CustomerSupportMail;
use Modules\User\Models\CustomerSupport;
use OpenApi\Annotations as OA;
use Throwable;

/**
 * @OA\Tag(
 *     name="Customer Support",
 *     description="API Endpoints for Customer Support Requests"
 * )
 */
class CustomerSupportController extends Controller
{
    use LogsActivity;

    /**
     * @OA\Post(
     *     path="/api/v1/admin/customer-support",
     *     tags={"Customer Support"},
     *     summary="Submit a customer support request",
     *     description="Allows authenticated users to submit a support request with optional file attachment. An email notification will be sent to the support team.",
     *     operationId="storeCustomerSupport",
     *     security={{"bearerAuth": {}}},
     *     @OA\RequestBody(
     *         required=false,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 @OA\Property(property="first_name", type="string", maxLength=100, example="John", description="User's first name"),
     *                 @OA\Property(property="last_name", type="string", maxLength=100, example="Doe", description="User's last name"),
     *                 @OA\Property(property="phone_number", type="string", maxLength=20, example="+1234567890", description="User's phone number"),
     *                 @OA\Property(property="email", type="string", format="email", maxLength=255, example="john.doe@example.com", description="User's email address"),
     *                 @OA\Property(property="problem_category", type="string", maxLength=255, example="Billing Issue", description="Category of the problem"),
     *                 @OA\Property(property="specify_others", type="string", maxLength=255, example="Other specific issue", description="Specify other problem if category is 'Others'"),
     *                 @OA\Property(property="description", type="string", example="I am facing an issue with...", description="Detailed description of the problem"),
     *                 @OA\Property(property="file", type="string", format="binary", description="Optional file attachment (max 10MB, formats: pdf, jpg, jpeg, png, doc, docx)")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Support request created successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Support request submitted successfully. We will get back to you soon."),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="id", type="integer", example=1),
     *                 @OA\Property(property="user_id", type="integer", example=1),
     *                 @OA\Property(property="first_name", type="string", example="John"),
     *                 @OA\Property(property="last_name", type="string", example="Doe"),
     *                 @OA\Property(property="phone_number", type="string", example="+1234567890"),
     *                 @OA\Property(property="email", type="string", example="john.doe@example.com"),
     *                 @OA\Property(property="problem_category", type="string", example="Billing Issue"),
     *                 @OA\Property(property="specify_others", type="string", nullable=true, example=null),
     *                 @OA\Property(property="description", type="string", example="I am facing an issue with..."),
     *                 @OA\Property(property="file_path", type="string", nullable=true, example="customer-support/1234567890_document.pdf"),
     *                 @OA\Property(property="created_at", type="string", format="date-time", example="2026-02-16T10:30:00.000000Z"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time", example="2026-02-16T10:30:00.000000Z")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="The given data was invalid."),
     *             @OA\Property(
     *                 property="errors",
     *                 type="object",
     *                 @OA\Property(property="email", type="array", @OA\Items(type="string", example="Please provide a valid email address.")),
     *                 @OA\Property(property="file", type="array", @OA\Items(type="string", example="File size should not exceed 10MB."))
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="Unauthenticated.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Server error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Failed to submit support request. Please try again.")
     *         )
     *     )
     * )
     */
    public function store(CustomerSupportRequest $request): JsonResponse
    {
        DB::beginTransaction();

        try {
            $userId = Auth::id();
            
            // Prepare data for customer support
            $data = [
                'user_id' => $userId,
                'first_name' => $request->input('first_name'),
                'last_name' => $request->input('last_name'),
                'phone_number' => $request->input('phone_number'),
                'email' => $request->input('email'),
                'problem_category' => $request->input('problem_category'),
                'specify_others' => $request->input('specify_others'),
                'description' => $request->input('description'),
            ];

            // Handle file upload if present
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $fileName = time() . '_' . $file->getClientOriginalName();
                $filePath = $file->storeAs('customer-support', $fileName, 'public');
                $data['file_path'] = $filePath;
            }

            // Create customer support ticket
            $ticket = CustomerSupport::create($data);

            // Send email notification to support team
            $supportEmails = array_values(array_filter(array_map(
                'trim',
                explode(',', (string) config('mail-config.support_recipients', 'support@bookwise.com'))
            )));
            
            try {
                $branding = \App\Helpers\EmailTemplateHelper::resolveCompanyBranding(auth()->user()?->host_id);
                Mail::to($supportEmails)->send(new CustomerSupportMail($ticket, $branding['logoUrl'], $branding['companyName']));
            } catch (Throwable $emailException) {
                // Log email error but don't fail the request
                Log::error('Failed to send support email: ' . $emailException->getMessage(), [
                    'ticket_id' => $ticket->id,
                    'exception' => $emailException
                ]);
            }

            DB::commit();

            // Log activity
            $this->logActivity(
                'Customer Support',
                'Created customer support ticket #' . $ticket->id,
                $ticket->id,
                [
                    'user_id' => $userId,
                    'email' => $ticket->email,
                    'problem_category' => $ticket->problem_category,
                    'status' => 'success'
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Support request submitted successfully. We will get back to you soon.',
                'data' => $ticket
            ], 201);

        } catch (Throwable $e) {
            DB::rollBack();

            Log::error('Error creating customer support request: ' . $e->getMessage(), [
                'user_id' => $userId ?? null,
                'exception' => $e
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit support request. Please try again.',
            ], 500);
        }
    }
}
