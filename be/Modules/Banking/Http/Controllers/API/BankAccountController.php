<?php

namespace Modules\Banking\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Banking\Http\Requests\StoreBankAccountRequest;
use Modules\Banking\Http\Resources\BankAccountResource;
use Modules\Banking\Repositories\BankAccountInterface;
use Modules\Banking\Services\BankingServiceInterface;

class BankAccountController extends Controller
{
    public function __construct(
        private BankAccountInterface $accounts,
        private BankingServiceInterface $banking
    ) {}

    public function index(Request $request)
    {
        return response()->success(
            BankAccountResource::collection($this->accounts->all($request->all())),
            'Bank accounts'
        );
    }

    public function store(StoreBankAccountRequest $request)
    {
        $account = $this->banking->createBankAccount($request->validated(), (int) request()->user()->id);

        return response()->success(new BankAccountResource($account), 'Bank account created', 201);
    }

    public function show($id)
    {
        $account = $this->accounts->find((int) $id);
        abort_if(empty($account), 404, 'Bank account not found');

        return response()->success(new BankAccountResource($account), 'Bank account');
    }

    public function update(StoreBankAccountRequest $request, $id)
    {
        $account = $this->accounts->update((int) $id, $request->validated());

        return response()->success(new BankAccountResource($account), 'Bank account updated');
    }

    public function destroy($id)
    {
        $this->accounts->delete((int) $id);

        return response()->success(null, 'Bank account deleted');
    }
}
