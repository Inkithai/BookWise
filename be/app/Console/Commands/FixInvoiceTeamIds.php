<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class FixInvoiceTeamIds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoice:fix-team-ids';
    protected $description = 'Assign team_id to existing invoices and clients based on host_id/company_id';

    public function handle()
    {
        $this->info('Starting aggressive team_id fix and team consolidation...');

        // 1. Team Fragmentation Cleanup
        // Find hosts that have multiple teams and consolidate them.
        $hostsWithMultipleTeams = \App\Models\Team::groupBy('host_id')
            ->havingRaw('count(*) > 1')
            ->pluck('host_id');

        if ($hostsWithMultipleTeams->count() > 0) {
            $this->info("Consolidating fragmented teams for {$hostsWithMultipleTeams->count()} hosts...");
            foreach ($hostsWithMultipleTeams as $hostId) {
                if (!$hostId) continue;
                $teams = \App\Models\Team::where('host_id', $hostId)->get();
                
                // Primary team strategy: Prefer team with sso_id (if any) or the old team (if specifically named)
                // Actually, let's prefer the oldest one (smallest ID) as it usually has the most historical data, 
                // but if one has 'default-' in sso_id and another doesn't, we'll keep the one with a better name.
                $primaryTeam = $teams->sortBy('id')->first();
                $otherTeams = $teams->where('id', '!=', $primaryTeam->id);

                // Ensure primary team has the correct sso_id for future SSO syncs
                $expectedSsoId = 'default-' . $hostId;
                if (!$primaryTeam->sso_id || $primaryTeam->sso_id === '') {
                    $primaryTeam->update(['sso_id' => $expectedSsoId]);
                }

                foreach ($otherTeams as $team) {
                    $this->line(" - Consolidating Team [{$team->id}] into [{$primaryTeam->id}] for Host {$hostId}");
                    
                    // Move users
                    \App\Models\User::where('team_id', $team->id)->update(['team_id' => $primaryTeam->id]);
                    // Move invoices
                    \Modules\Invoice\Models\Invoice::where('team_id', $team->id)->update(['team_id' => $primaryTeam->id]);
                    // Move clients
                    \Modules\Invoice\Models\InvoiceClient::where('team_id', $team->id)->update(['team_id' => $primaryTeam->id]);
                    
                    // Delete the duplicate team
                    $team->delete();
                }
            }
        }

        // 2. Resolve users who have a host_id but no team_id (force a default team for them)
        // This handles cases where no team existed at all for a host
        $usersWithoutTeams = \App\Models\User::whereNotNull('host_id')->whereNull('team_id')->get();
        if ($usersWithoutTeams->count() > 0) {
            $this->info("Fixing {$usersWithoutTeams->count()} users missing team_id...");
            foreach ($usersWithoutTeams as $user) {
                $ssoTeamId = 'default-' . $user->host_id;
                $team = \App\Models\Team::where('host_id', $user->host_id)->first() // Try to find consolidated team first
                     ?? \App\Models\Team::firstOrCreate(
                            ['sso_id' => (string) $ssoTeamId],
                            ['host_id' => $user->host_id, 'name' => 'Default Team']
                        );
                $user->update(['team_id' => $team->id]);
                $this->line(" - User [{$user->id}]: Assigned to Team {$team->id}");
            }
        }

        // 3. Get a fallback team (first user in DB who has a team assigned)
        $fallbackUser = \App\Models\User::whereNotNull('host_id')->whereNotNull('team_id')->first();
        if (!$fallbackUser) {
            $this->error('No users found with an assigned team. Please log in once to sync a team first.');
            return 1;
        }

        $this->info("Fallback Team: {$fallbackUser->team_id} (Host: {$fallbackUser->host_id})");

        // 4. Process ALL clients
        $clients = \Modules\Invoice\Models\InvoiceClient::all();
        $this->info("Checking {$clients->count()} clients...");
        foreach ($clients as $client) {
            // Match order for clients:
            // 1. Try to find a matching Team ID from an existing invoice for this client
            // 2. User with matching host_id
            // 3. User with matching id (legacy fallback)
            
            $matchingInvoice = \Modules\Invoice\Models\Invoice::where('client_id', $client->id)
                ->whereNotNull('team_id')
                ->first();

            $matchingUser = null;
            if ($matchingInvoice) {
                $targetTeamId = $matchingInvoice->team_id;
                $targetHostId = $matchingInvoice->company_id;
                $reason = "Invoice match (#{$matchingInvoice->id})";
            } else {
                $matchingUser = \App\Models\User::where('host_id', $client->host_id)->whereNotNull('team_id')->first()
                             ?? \App\Models\User::where('id', $client->host_id)->whereNotNull('team_id')->first();
                $targetTeamId = $matchingUser ? $matchingUser->team_id : $fallbackUser->team_id;
                $targetHostId = $matchingUser ? $matchingUser->host_id : $fallbackUser->host_id;
                $reason = $matchingUser ? "Matched user: {$matchingUser->email}" : "Fallback";
            }

            if ($client->team_id !== $targetTeamId || $client->host_id !== $targetHostId) {
                $client->update([
                     'team_id' => $targetTeamId,
                     'host_id' => $targetHostId 
                ]);
                $this->line(" - Client [{$client->id}]: Updated to Team {$targetTeamId} (Reason: {$reason})");
            }
        }

        // 5. Process ALL invoices
        $invoices = \Modules\Invoice\Models\Invoice::all();
        $this->info("Checking {$invoices->count()} invoices...");
        foreach ($invoices as $invoice) {
            // Match order:
            // 1. User who created it
            // 2. User with matching host_id (company_id)
            // 3. User with matching id (legacy fallback)
            $matchingUser = \App\Models\User::where('id', $invoice->created_by)->whereNotNull('team_id')->first()
                         ?? \App\Models\User::where('host_id', $invoice->company_id)->whereNotNull('team_id')->first()
                         ?? \App\Models\User::where('id', $invoice->company_id)->whereNotNull('team_id')->first();

            $targetTeamId = $matchingUser ? $matchingUser->team_id : $fallbackUser->team_id;
            $targetHostId = $matchingUser ? $matchingUser->host_id : $fallbackUser->host_id;

            if ($invoice->team_id !== $targetTeamId || $invoice->company_id !== $targetHostId) {
                $invoice->update([
                    'team_id' => $targetTeamId,
                    'company_id' => $targetHostId
                ]);
                $this->line(" - Invoice [{$invoice->id}]: Updated to Team {$targetTeamId} (matched user: ".($matchingUser ? $matchingUser->email : "none").")");
            }
        }

        $this->info('Done.');
    }
}
