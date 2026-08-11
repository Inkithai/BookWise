<?php

namespace Modules\Accounting\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Modules\Accounting\Http\Requests\StoreAccountRequest;
use Modules\Accounting\Http\Requests\UpdateAccountRequest;
use Modules\Accounting\Http\Resources\AccountResource;
use Modules\Accounting\Models\Account;
use Modules\Accounting\Repositories\AccountInterface;
use Modules\Accounting\Support\SystemAccounts;

class ChartOfAccountsController extends Controller
{
    public function __construct(private AccountInterface $accounts) {}

    public function index(Request $request)
    {
        if ($request->boolean('tree')) {
            return response()->success($this->accounts->tree(), 'Chart of accounts (tree)');
        }

        return response()->success(
            AccountResource::collection($this->accounts->all($request->all())),
            'Chart of accounts'
        );
    }

    public function store(StoreAccountRequest $request)
    {
        $account = $this->accounts->create($request->validated());

        return response()->success(new AccountResource($account), 'Account created', 201);
    }

    public function show($id)
    {
        $account = $this->accounts->find((int) $id);
        abort_if(empty($account), 404, 'Account not found');

        return response()->success(new AccountResource($account), 'Account');
    }

    public function update(UpdateAccountRequest $request, $id)
    {
        $account = $this->accounts->update((int) $id, $request->validated());

        return response()->success(new AccountResource($account), 'Account updated');
    }

    public function destroy($id)
    {
        $account = Account::findOrFail((int) $id);

        if ($account->is_system) {
            return response()->error('System accounts cannot be deleted.', 422);
        }

        $this->accounts->delete((int) $id);

        return response()->success(null, 'Account deleted');
    }

    /**
     * Idempotently provision the reserved system accounts (AR/AP/Sales/etc.)
     * for the current tenant. Safe to call multiple times.
     */
    public function seedSystem()
    {
        $map = SystemAccounts::ensureForHost((int) TenantManager::id());

        return response()->success($map, 'System accounts ensured');
    }
}
