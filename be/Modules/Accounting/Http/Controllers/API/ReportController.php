<?php

namespace Modules\Accounting\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Accounting\Services\FinancialStatementService;

class ReportController extends Controller
{
    public function __construct(private FinancialStatementService $statements) {}

    public function trialBalance(Request $request)
    {
        $data = $this->statements->trialBalance($request->input('as_of'));

        return response()->success($data, 'Trial balance');
    }

    public function profitLoss(Request $request)
    {
        $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date'],
        ]);

        $data = $this->statements->profitAndLoss($request->input('from'), $request->input('to'));

        return response()->success($data, 'Profit & loss');
    }

    public function balanceSheet(Request $request)
    {
        $data = $this->statements->balanceSheet($request->input('as_of'));

        return response()->success($data, 'Balance sheet');
    }

    public function cashFlow(Request $request)
    {
        $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date'],
        ]);

        $data = $this->statements->cashFlow($request->input('from'), $request->input('to'));

        return response()->success($data, 'Cash flow');
    }
}
