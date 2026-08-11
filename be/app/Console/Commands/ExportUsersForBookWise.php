<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ExportUsersForBookWise extends Command
{
    protected $signature = 'invoice:export-users 
        {--output= : Output JSON path relative to storage/app}
        {--include-inactive : Include inactive users in export}';

    protected $description = 'Export users, teams and roles for BookWise platform sync.';

    public function handle(): int
    {
        $includeInactive = (bool) $this->option('include-inactive');
        $outputPath = $this->option('output')
            ?: 'exports/invoice-users-' . now()->format('Ymd_His') . '.json';

        $query = User::query()
            ->select([
                'users.id',
                'users.team_id',
                'users.email',
                'users.user_name',
                'users.first_name',
                'users.last_name',
                'users.phone_number',
                'users.password',
                'users.is_active',
                'users.is_temp_password',
                'users.account_type',
                'users.created_at',
                'users.updated_at',
                'teams.name as team_name',
            ])
            ->leftJoin('teams', 'teams.id', '=', 'users.team_id')
            ->orderBy('users.id');

        if (! $includeInactive) {
            $query->where('users.is_active', 1);
        }

        $users = $query->get();

        $payload = [
            'source' => 'invoice',
            'generated_at' => now()->toDateTimeString(),
            'include_inactive' => $includeInactive,
            'total_users' => $users->count(),
            'users' => $users->map(function ($user) {
                return [
                    'source_user_id' => (int) $user->id,
                    'source_team_id' => $user->team_id !== null ? (int) $user->team_id : null,
                    'team_name' => $user->team_name,
                    'email' => $user->email,
                    'username' => $user->user_name,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'phone_number' => $user->phone_number,
                    'password' => $user->password,
                    'is_active' => (bool) $user->is_active,
                    'is_temp_password' => (bool) $user->is_temp_password,
                    'account_type' => $user->account_type,
                    'created_at' => optional($user->created_at)->toDateTimeString(),
                    'updated_at' => optional($user->updated_at)->toDateTimeString(),
                    'roles' => $this->resolveRoleNames((int) $user->id, $user->team_id),
                ];
            })->values()->all(),
        ];

        Storage::disk('local')->put(
            $outputPath,
            json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        $this->info('Export complete.');
        $this->line('Users exported: ' . $payload['total_users']);
        $this->line('File: ' . storage_path('app/' . $outputPath));

        return self::SUCCESS;
    }

    private function resolveRoleNames(int $userId, ?int $teamId): array
    {
        $roles = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $userId)
            ->where(function ($query) use ($teamId) {
                if ($teamId === null) {
                    $query->whereNull('model_has_roles.team_id');
                } else {
                    $query->where('model_has_roles.team_id', $teamId)
                        ->orWhereNull('model_has_roles.team_id');
                }
            })
            ->whereIn('model_has_roles.model_type', [
                'App\\Models\\User',
                'Modules\\User\\Models\\User',
            ])
            ->pluck('roles.name')
            ->map(fn($name) => (string) $name)
            ->unique()
            ->values();

        if ($roles->isEmpty() && DB::getSchemaBuilder()->hasTable('role_users')) {
            $roles = DB::table('role_users')
                ->join('roles', 'roles.id', '=', 'role_users.role_id')
                ->where('role_users.user_id', $userId)
                ->whereNull('role_users.deleted_at')
                ->pluck('roles.name')
                ->map(fn($name) => (string) $name)
                ->unique()
                ->values();
        }

        return $roles->all();
    }
}
