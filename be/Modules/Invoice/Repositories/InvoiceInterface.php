<?php

namespace Modules\Invoice\Repositories;

interface InvoiceInterface
{
    public function getAllData(array $filters);
    public function getAllInvoiceClients();
    public function getAllInvoiceTypes();
    public function generateInvoiceCode(int $hostId);
    public function store(array $data);
    public function findById(int $id);
    public function update(int $id, array $data);
    public function getInvoiceById(int $id, array $filters = []);
    public function updateInvoiceStatus(int $id, string $status);
    public function previewStore(array $data);
    public function storeDraft(array $data);
    public function updateDraft(int $id, array $data);
}
