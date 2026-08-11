<?php

namespace Modules\Accounting\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Accounting\Http\Requests\StoreJournalEntryRequest;
use Modules\Accounting\Http\Resources\JournalEntryResource;
use Modules\Accounting\Models\JournalEntry;
use Modules\Accounting\Repositories\JournalEntryInterface;
use Modules\Accounting\Services\JournalServiceInterface;

class JournalEntryController extends Controller
{
    public function __construct(
        private JournalEntryInterface $entries,
        private JournalServiceInterface $journal
    ) {}

    public function index(Request $request)
    {
        return response()->success(
            JournalEntryResource::collection($this->entries->all($request->all())),
            'Journal entries'
        );
    }

    public function store(StoreJournalEntryRequest $request)
    {
        $entry = $this->journal->createDraft($request->validated(), (int) request()->user()->id);

        return response()->success(new JournalEntryResource($entry), 'Journal entry drafted', 201);
    }

    public function show($id)
    {
        $entry = $this->entries->find((int) $id);
        abort_if(empty($entry), 404, 'Journal entry not found');

        return response()->success(new JournalEntryResource($entry), 'Journal entry');
    }

    public function update(StoreJournalEntryRequest $request, $id)
    {
        $entry = $this->entries->find((int) $id);
        abort_if(empty($entry), 404, 'Journal entry not found');

        $entry = $this->journal->updateDraft($entry, $request->validated());

        return response()->success(new JournalEntryResource($entry), 'Journal entry updated');
    }

    public function post($id)
    {
        $entry = $this->entries->find((int) $id);
        abort_if(empty($entry), 404, 'Journal entry not found');

        $entry = $this->journal->post($entry);

        return response()->success(new JournalEntryResource($entry), 'Journal entry posted');
    }

    public function reverse($id)
    {
        $entry = $this->entries->find((int) $id);
        abort_if(empty($entry), 404, 'Journal entry not found');

        $entry = $this->journal->reverse($entry);

        return response()->success(new JournalEntryResource($entry), 'Journal entry reversed');
    }

    public function destroy($id)
    {
        $entry = $this->entries->find((int) $id);
        abort_if(empty($entry), 404, 'Journal entry not found');

        $this->journal->deleteDraft($entry);

        return response()->success(null, 'Draft journal entry deleted');
    }
}
