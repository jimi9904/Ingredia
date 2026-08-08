<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Services\RecommendationService;
use Illuminate\Support\Facades\Cache;

class GenerateRecommendations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'recommendations:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Pre-calculate and cache collaborative filtering recommendations for all active users';

    /**
     * Execute the console command.
     */
    public function handle(RecommendationService $service)
    {
        $this->info('Starting background recommendation generation...');
        
        $users = User::all();
        $count = 0;

        foreach ($users as $user) {
            $cacheKey = 'recommendations:user:' . (string) $user->_id;
            
            // Generate for this user using the existing service
            $recommendations = $service->forUser($user)->map(fn($r) => [
                'id'           => (string) $r->_id,
                'title'        => $r->title,
                'slug'         => $r->slug,
                'cuisine'      => $r->cuisine,
                'tags'         => $r->tags,
                'cook_time'    => $r->cook_time,
                'difficulty'   => $r->difficulty,
                'avg_rating'   => $r->avg_rating,
                'rating_count' => $r->rating_count,
                'image_url'    => $r->image_url,
            ])->values();

            // Cache for a longer period since we pre-calculate (e.g., 24 hours)
            Cache::put($cacheKey, $recommendations, 86400);
            
            $count++;
            if ($count % 100 == 0) {
                $this->info("Processed $count users...");
            }
        }

        $this->info("Successfully generated recommendations for $count users.");
    }
}
