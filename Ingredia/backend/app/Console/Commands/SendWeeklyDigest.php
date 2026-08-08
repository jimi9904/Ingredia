<?php

namespace App\Console\Commands;

use App\Mail\WeeklyDigestMail;
use App\Models\Recipe;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendWeeklyDigest extends Command
{
    protected $signature   = 'digest:send {--limit=5 : Number of recipes per digest}';
    protected $description = 'Send the weekly recipe digest email to all users.';

    public function handle(): int
    {
        $limit = (int) $this->option('limit');

        // Pick top-rated published recipes for this week's digest
        $recipes = Recipe::published()
            ->orderBy('avg_rating', 'desc')
            ->orderBy('rating_count', 'desc')
            ->limit($limit)
            ->get();

        if ($recipes->isEmpty()) {
            $this->warn('No published recipes found. Digest not sent.');
            return self::SUCCESS;
        }

        $users = User::whereNotNull('email_verified_at')->cursor();
        $sent  = 0;

        foreach ($users as $user) {
            // Personalise: filter by cuisine preference if set
            $prefs = is_array($user->preferences) ? $user->preferences : [];
            $cuisines = $prefs['cuisine_preference'] ?? [];

            $personalised = $cuisines
                ? $recipes->filter(fn($r) => in_array(strtolower($r->cuisine ?? ''), array_map('strtolower', $cuisines)))
                : $recipes;

            $toSend = $personalised->isEmpty() ? $recipes : $personalised;

            Mail::to($user->email)->queue(new WeeklyDigestMail($user, $toSend->take($limit)));
            $sent++;

            if ($sent % 100 === 0) {
                $this->line("  Queued {$sent} digests…");
            }
        }

        $this->info("Weekly digest queued for {$sent} users.");
        return self::SUCCESS;
    }
}
