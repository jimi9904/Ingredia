<?php

namespace App\Console\Commands;

use App\Models\Recipe;
use Illuminate\Console\Command;

class DedupeRecipes extends Command
{
    protected $signature = 'recipes:dedupe';
    protected $description = 'Delete duplicate recipes that share the same title, keeping the first by _id.';

    public function handle(): int
    {
        $dupeGroups = Recipe::raw(function ($c) {
            return $c->aggregate([
                ['$group' => ['_id' => '$title', 'ids' => ['$push' => '$_id'], 'n' => ['$sum' => 1]]],
                ['$match' => ['n' => ['$gt' => 1]]],
            ], ['allowDiskUse' => true]);
        });

        $deletedTotal = 0;
        foreach ($dupeGroups as $group) {
            $ids = $group->ids;
            sort($ids); // stable order; keep first
            $toDelete = array_slice($ids, 1);
            $n = Recipe::whereIn('_id', $toDelete)->delete();
            $deletedTotal += $n;
        }

        $this->info("Deleted {$deletedTotal} duplicate recipes.");
        $this->info('Total now: ' . Recipe::count());
        return self::SUCCESS;
    }
}
