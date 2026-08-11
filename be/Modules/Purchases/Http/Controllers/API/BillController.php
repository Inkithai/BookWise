<?php

namespace Modules\Purchases\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Purchases\Http\Requests\StoreBillPaymentRequest;
use Modules\Purchases\Http\Requests\StoreBillRequest;
use Modules\Purchases\Http\Resources\BillPaymentResource;
use Modules\Purchases\Http\Resources\BillResource;
use Modules\Purchases\Repositories\BillInterface;
use Modules\Purchases\Services\PurchaseServiceInterface;

class BillController extends Controller
{
    public function __construct(
        private BillInterface $bills,
        private PurchaseServiceInterface $purchases
    ) {}

    public function index(Request $request)
    {
        return response()->success(
            BillResource::collection($this->bills->all($request->all())),
            'Bills'
        );
    }

    public function store(StoreBillRequest $request)
    {
        $bill = $this->purchases->createBill($request->validated(), (int) request()->user()->id);

        return response()->success(new BillResource($bill), 'Bill recorded', 201);
    }

    public function show($id)
    {
        $bill = $this->bills->find((int) $id);
        abort_if(empty($bill), 404, 'Bill not found');

        return response()->success(new BillResource($bill), 'Bill');
    }

    public function pay(StoreBillPaymentRequest $request)
    {
        $payment = $this->purchases->recordPayment(
            (int) $request->input('bill_id'),
            $request->validated(),
            (int) request()->user()->id
        );

        return response()->success(new BillPaymentResource($payment), 'Bill payment recorded', 201);
    }

    public function void($id)
    {
        $bill = $this->purchases->voidBill((int) $id);

        return response()->success(new BillResource($bill), 'Bill voided');
    }

    public function destroy($id)
    {
        $this->bills->delete((int) $id);

        return response()->success(null, 'Bill deleted');
    }
}
