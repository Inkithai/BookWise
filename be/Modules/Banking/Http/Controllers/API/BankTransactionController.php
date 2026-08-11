<?php

namespace Modules\Banking\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Banking\Http\Requests\StoreBankTransactionRequest;
use Modules\Banking\Http\Resources\BankTransactionResource;
use Modules\Banking\Repositories\BankTransactionInterface;
use Modules\Banking\Services\BankingServiceInterface;

class BankTransactionController extends Controller
{
    public function __construct(
        private BankTransactionInterface $transactions,
        private BankingServiceInterface $banking
    ) {}

    public function index(Request $request)
    {
        return response()->success(
            BankTransactionResource::collection($this->transactions->all($request->all())),
            'Bank transactions'
        );
    }

    public function show($id)
    {
        $txn = $this->transactions->find((int) $id);
        abort_if(empty($txn), 404, 'Bank transaction not found');

        return response()->success(new BankTransactionResource($txn), 'Bank transaction');
    }

    public function deposit(StoreBankTransactionRequest $request)
    {
        $txn = $this->banking->recordDeposit(
            (int) $request->input('bank_account_id'),
            $request->validated(),
            (int) request()->user()->id
        );

        return response()->success(new BankTransactionResource($txn), 'Deposit recorded', 201);
    }

    public function withdraw(StoreBankTransactionRequest $request)
    {
        $txn = $this->banking->recordWithdrawal(
            (int) $request->input('bank_account_id'),
            $request->validated(),
            (int) request()->user()->id
        );

        return response()->success(new BankTransactionResource($txn), 'Withdrawal recorded', 201);
    }

    public function reconcile($id)
    {
        $txn = $this->banking->reconcile((int) $id);

        return response()->success(new BankTransactionResource($txn), 'Transaction reconciled');
    }
}
