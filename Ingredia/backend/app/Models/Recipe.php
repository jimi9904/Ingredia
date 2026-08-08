<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Recipe extends Model
{
    use HasFactory;
    protected $connection = 'mongodb';
    protected $collection = 'recipes';

    protected $fillable = [
        'title',
        'slug',
        'description',
        'ingredients',
        'instructions',
        'cuisine',
        'tags',
        'nutrition',
        'cook_time',
        'prep_time',
        'servings',
        'difficulty',
        'image_url',
        'has_real_image',
        'avg_rating',
        'rating_count',
        'source',
        'status',
        'created_by',
    ];

    /**
     * Domains that host actual per-dish photos. Anything else (Unsplash fallbacks,
     * null, empty) counts as not-a-real-photo so it ranks below in the feed.
     */
    private const REAL_IMAGE_DOMAINS = ['archanaskitchen.com', 'themealdb.com'];

    /**
     * Auto-derive has_real_image whenever image_url changes through Eloquent.
     * Bulk inserts that bypass mutators (e.g. seeders) must set the field manually
     * or rely on the artisan backfill.
     */
    public function setImageUrlAttribute($value): void
    {
        $this->attributes['image_url'] = $value;
        $this->attributes['has_real_image'] = self::isRealImageUrl($value);
    }

    public static function isRealImageUrl(?string $url): bool
    {
        if (!$url) return false;
        foreach (self::REAL_IMAGE_DOMAINS as $domain) {
            if (str_contains(strtolower($url), $domain)) return true;
        }
        return false;
    }

    protected $casts = [
        'avg_rating'     => 'float',
        'rating_count'   => 'integer',
        'cook_time'      => 'integer',
        'prep_time'      => 'integer',
        'servings'       => 'integer',
        'has_real_image' => 'boolean',
    ];

    protected $attributes = [
        'avg_rating'   => 0,
        'rating_count' => 0,
        'status'       => 'published',
        'source'       => 'admin',
    ];

    /**
     * Generate a unique slug.
     */
    public static function generateUniqueSlug(string $title): string
    {
        $slug = Str::slug($title);
        $count = static::where('slug', 'like', $slug . '%')->count();
        return $count ? $slug . '-' . ($count + 1) : $slug;
    }

    /**
     * Auto-parse tags/ingredients stored as JSON strings (data import artifact).
     */
    public function getTagsAttribute($value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($value) ? $value : [];
    }

    public function getIngredientsAttribute($value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($value) ? $value : [];
    }

    public function getInstructionsAttribute($value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return array_values(array_filter(array_map(
                    fn($s) => is_string($s) ? trim($s) : (string) ($s['text'] ?? $s['description'] ?? $s['step'] ?? ''),
                    $decoded
                )));
            }
            // Plain text — split on newlines
            return array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $value))));
        }
        if (is_array($value)) {
            return array_values(array_filter(array_map(function ($s) {
                if (is_string($s)) return trim($s);
                return (string) ($s['text'] ?? $s['description'] ?? $s['step'] ?? '');
            }, $value)));
        }
        return [];
    }

    public function getNutritionAttribute($value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($value) ? $value : [];
    }

    /**
     * Get reviews for this recipe.
     */
    public function reviews()
    {
        return $this->hasMany(Review::class, 'recipe_id');
    }

    /**
     * Scope for published recipes.
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    /**
     * Scope for popular recipes.
     */
    public function scopePopular($query)
    {
        return $query->where('rating_count', '>=', 5)
                     ->orderBy('avg_rating', 'desc');
    }
}
