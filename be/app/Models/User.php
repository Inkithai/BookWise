<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;  // Extend the correct class
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;  // Import the correct HasRoles trait
use Laravel\Passport\HasApiTokens;
use App\Enums\InvoiceStatus;
use Illuminate\Database\Eloquent\Relations\HasOne;

class User extends Authenticatable
{
    use HasApiTokens, HasRoles, Notifiable, SoftDeletes;  // Include the HasRoles trait and SoftDeletes

    protected $guard_name = 'api';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'email',
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
        'active_context_type',
        'active_company_id',
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * PostgreSQL returns boolean columns as 't'/'f' strings through PDO;
     * casting keeps these flags real PHP booleans on every driver and lets
     * us write `1`/`true` interchangeably.
     *
     * @var array
     */
    protected $casts = [
        'email_verified_at'   => 'datetime',
        'stripe_connected_at' => 'datetime',
        'is_otp_verified'     => 'boolean',
        'has_seen_pricing'    => 'boolean',
    ];

    public function hasAccess($permissions): bool
    {
        // Grant all permissions if user is super-admin
        if ($this->hasRole('super-admin')) {
            return true;
        }

        // Check if user has *all* the requested permissions
        foreach ((array) $permissions as $permission) {
            if (!$this->hasPermissionTo($permission)) {
                return false;
            }
        }

        return true;
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'model_has_roles', 'model_id', 'role_id')
            ->where('model_type', 'Modules\User\Models\User');
    }


    public function setRoles($roles, $userId)
    {
        $user = User::find($userId);
        if ($user) {
            $user->syncRoles($roles); // this will update model_has_roles with correct model_type
        }
    }

    public function rolePermissions()
    {
        return $this->roles->load('permissions') // eager-load
            ->pluck('permissions')      // get permissions from each role
            ->flatten()                 // flatten nested collections
            ->unique('id')              // remove duplicates
            ->values();                 // re-index
    }

    // ADD this dynamic attribute instead
    public function getPermissionsAttribute()
    {
        return $this->rolePermissions();
    }

    public function full_name()
    {
        return $this->first_name . ' ' . $this->last_name;
    }

    public function host()
    {
        return $this->belongsTo(Host::class, 'host_id', 'id');
    }

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function HostUser()
    {
        return $this->hasOne(HostUser::class, 'user_id');
    }

    public function HostUserDetails()
    {
        return $this->hasMany(HostUserDetail::class, 'user_id');
    }

    public function HostUserStripe()
    {
        return $this->hasOne(HostUserStripe::class, 'host_user_id');
    }

    public function companyDetails()
    {
        return $this->hasMany(HostUserDetail::class, 'host_id')
            ->where('type', 'company_details')
            ->select(['name', 'values', 'files', 'host_id']) // include 'host_id' to avoid Laravel error with select
            ->get()
            ->keyBy('name');
    }

    protected function getPermissionsTeamId(): int|null
    {
        return $this->team_id; // Required for Spatie's team scoping
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'created_by', 'id')->withTrashed();
    }

    // Helper to get invoices for the current month using collections
    public function currentMonthInvoices()
    {
        $now = \Carbon\Carbon::now();

        return $this->invoices->filter(function ($invoice) use ($now) {
            return $invoice->created_at->year === $now->year
                && $invoice->created_at->month === $now->month;
        });
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class, 'user_id', 'id');
    }


    public function subscription(): HasOne
    {
        return $this->hasOne(UserSubscription::class)->withDefault(null);
    }
}
