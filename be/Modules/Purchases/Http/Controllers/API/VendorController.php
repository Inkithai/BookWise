<?php

namespace Modules\Purchases\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Purchases\Http\Requests\StoreVendorRequest;
use Modules\Purchases\Http\Resources\VendorResource;
use Modules\Purchases\Repositories\VendorInterface;
use Modules\Purchases\Services\PurchaseServiceInterface;

class VendorController extends Controller
{
    public function __construct(
        private VendorInterface $vendors,
        private PurchaseServiceInterface $purchases
    ) {}

    public function index(Request $request)
    {
        return response()->success(
            VendorResource::collection($this->vendors->all($request->all())),
            'Vendors'
        );
    }

    public function store(StoreVendorRequest $request)
    {
        $vendor = $this->purchases->createVendor($request->validated(), (int) request()->user()->id);

        return response()->success(new VendorResource($vendor), 'Vendor created', 201);
    }

    public function show($id)
    {
        $vendor = $this->vendors->find((int) $id);
        abort_if(empty($vendor), 404, 'Vendor not found');

        return response()->success(new VendorResource($vendor), 'Vendor');
    }

    public function update(StoreVendorRequest $request, $id)
    {
        $vendor = $this->vendors->update((int) $id, $request->validated());

        return response()->success(new VendorResource($vendor), 'Vendor updated');
    }

    public function destroy($id)
    {
        $this->vendors->delete((int) $id);

        return response()->success(null, 'Vendor deleted');
    }
}
