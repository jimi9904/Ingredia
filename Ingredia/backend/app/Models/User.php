<?php

namespace App\Models;

use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use MongoDB\Laravel\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class User extends Authenticatable implements MustVerifyEmailContract
{
    use HasApiTokens, MustVerifyEmail, Notifiable, HasFactory;

    protected $connection = 'mongodb';
    protected $collection = 'users';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'email_verified_at',
        'preferences',
        'provider',
        'provider_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
    ];

    /**
     * Default values.
     */
    protected $attributes = [
        'role'        => 'user',
        'preferences' => '{"dietary":[],"allergies":[],"cuisine_preference":[]}',
    ];

    /**
     * Check if user is an admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Get the user's pantry.
     */
    public function pantry()
    {
        return $this->hasOne(Pantry::class, 'user_id');
    } 

    /**
     * Get the user's reviews.
     */
    public function reviews()
    {
        return $this->hasMany(Review::class, 'user_id');
    }

    /**
     * Get the user's saved collections.
     */
    public function savedCollections()
    {
        return $this->hasMany(SavedCollection::class, 'user_id');
    }
}
