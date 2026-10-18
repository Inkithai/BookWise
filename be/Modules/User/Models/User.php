<?php

namespace Modules\User\Models;

use App\Models\Host;
use App\Models\HostUser;
use App\Models\HostUserDetail;
use App\Models\HostUserStripe;
use App\Models\Team;
use App\Models\Invoice;
use App\Enums\InvoiceStatus;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;
use Laravel\Passport\HasApiTokens;

/**
 * @OA\Schema(
 *     schema="User",
 *     type="object",
 *     title="User Model",
 *     required={"name", "email"},
 *
 *     @OA\Property(property="id", type="integer", readOnly=true),
 *     @OA\Property(property="name", type="string", example="Sam Doe"),
 *     @OA\Property(property="email", type="string", format="email", example="john@gmail.com"),
 *     @OA\Property(property="phone", type="string", example="+94112233456"),
 * )
 *
 * @method bool save(array $options = [])
 * @method $this load(array|string $relations)
 * @method $this unsetRelation(string $relation)
 */
class User extends Authenticatable
{
    use HasApiTokens, HasRoles, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'name',
        'user_name',
        'password',
        'last_login',
        'first_name',
        'last_name',
        'is_temp_password',
        'phone_number',
        'is_active',
        'is_otp_verified',
        'real_state_designation',
        'company_designation',
        'host_id',
        'host_role',
        'team_id',
        'profile_img',
        'account_type',
        'theme_color',
        'invoice_theme_color',
        'stripe_account_id',
        'stripe_access_token',
        'stripe_refresh_token',
        'stripe_connection_status',
        'stripe_connected_at',
        'sso_id',
        // ✅ NEW: Google OAuth fields
        'google_id',
        'avatar',
        // ✅ NEW: Onboarding
        'has_seen_pricing',
        'active_context_type',
        'active_company_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at'  => 'datetime',
        'stripe_connected_at' => 'datetime',
        // PostgreSQL returns booleans as 't'/'f' strings through PDO; casting
        // keeps these flags real PHP booleans on every driver and lets us
        // write `1`/`true` interchangeably.
        'is_otp_verified'    => 'boolean',
        'has_seen_pricing'   => 'boolean',
    ];

    public function setPasswordAttribute($value)
    {
        $this->attributes['password'] = Hash::make($value);
    }

    public function isSuperAdmin(): bool { return $this->role === 'super-admin'; }
    public function isAdmin(): bool      { return $this->role === 'admin'; }

    public function hasAccess($permissions): bool
    {
        if ($this->hasRole('super-admin')) return true;
        foreach ((array) $permissions as $permission) {
            if (!$this->hasPermissionTo($permission)) return false;
        }
        return true;
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'model_has_roles', 'model_id', 'role_id')
            ->where('model_type', self::class);
    }

    public function setRoles($roles, $userId)
    {
        $user = User::find($userId);
        if ($user) $user->syncRoles($roles);
    }

    public function rolePermissions()
    {
        return $this->roles->load('permissions')
            ->pluck('permissions')
            ->flatten()
            ->unique('id')
            ->values();
    }

    public function getPermissionsAttribute() { return $this->rolePermissions(); }
    public function full_name()              { return $this->first_name . ' ' . $this->last_name; }
    public function host()                   { return $this->belongsTo(Host::class); }
    public function team()                   { return $this->belongsTo(Team::class); }
    public function HostUser()               { return $this->hasOne(HostUser::class, 'user_id'); }
    public function HostUserDetails()        { return $this->hasMany(HostUserDetail::class, 'user_id'); }
    public function HostUserStripe()         { return $this->hasOne(HostUserStripe::class, 'host_user_id'); }
    public function stripeForHost(int $hostId) { return HostUserStripe::where('host_user_id', $this->id)->where('host_id', $hostId)->first(); }
    public function bank()                   { return $this->hasOne(UserBank::class, 'user_id', 'id'); }

    public function companyDetails()
    {
        return $this->hasMany(HostUserDetail::class, 'host_id')
            ->where('type', 'company_details')
            ->select(['id', 'name', 'values', 'files', 'host_id']);
    }

    protected function getPermissionsTeamId(): ?int { return $this->team_id; }

    public function getFormattedCreatedAtAttribute(): string
    {
        return Carbon::parse($this->created_at)->format('d M Y');
    }

    public function monthlyReceiptSentInvoiceCount(): int
    {
        $now = Carbon::now();
        return Invoice::where('host_id', $this->host_id)
            ->where('status', InvoiceStatus::ReceiptSent)
            ->whereYear('updated_at', $now->year)
            ->whereMonth('updated_at', $now->month)
            ->count();
    }

    public function countUsersUnderSameHost(): int
    {
        $hostId = $this->host_id ?? $this->id;
        return self::where('host_id', $hostId)->where('id', '!=', $this->id)->count();
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(UserSubscription::class)->withDefault(null);
    }

    /**
     * Primary account on this host — the original account owner.
     * The owner is always the FIRST user registered under this host (lowest id).
     * account_type is used only as a tiebreaker in rare same-id edge cases.
     *
     * NOTE: Do NOT sort by account_type first — sub-users can be created with
     * account_type='Company' or 'admin', which would incorrectly rank them above
     * the real owner whose account_type may be 'super-admin' (ranked last).
     *
     * Multi-company fix: for companies created via the multi-company flow, the
     * owner has their OWN personal host_id (different from the company's host_id).
     * Sub-users are assigned host_id = company's host_id. The host_id ORDER BY id
     * approach would therefore return the first sub-user, not the real owner.
     * Check companies.owner_user_id first to get the definitive owner.
     */
    public static function primaryBillingUserForHost(int $hostId): ?self
    {
        if ($hostId <= 0) {
            return null;
        }

        // For multi-company accounts the owner_user_id column is authoritative.
        $company = \App\Models\Company::where('host_id', $hostId)->first();
        if ($company && !empty($company->owner_user_id)) {
            $owner = static::find((int) $company->owner_user_id);
            if ($owner) {
                return $owner;
            }
        }

        return static::query()
            ->where('host_id', $hostId)
            ->orderBy('id')  // The original owner always has the lowest id under this host
            ->first();
    }
}