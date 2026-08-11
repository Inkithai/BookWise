<?php

namespace Modules\CustomCRM\Repositories;

interface CustomTableInterface
{
    public function getTablesByHost($hostId);
    public function createTableWithAttributes(string $tableNames, array $attributesSets, $hostId);
    public function uploadCsvAndCreate($data, $hostId);
    public function getTableRecords($tableId, $search, $hostId);
    public function updateTableWithAttributes($customTable, array $attributes, string $tableName, $hostId);
    public function deleteTable($customTable, $hostId);
    public function insertTableRecord($tableId, array $data);
    public function getTableAttributes($tableId);
}
