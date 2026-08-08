<?php

namespace App\Listeners;

use App\Events\RecipeApproved;
use App\Mail\RecipeApprovedMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class NotifyRecipeSubmitter
{
    public function handle(RecipeApproved $event): void
    {
        $recipe = $event->recipe;
        if (!$recipe->created_by) return;

        $submitter = User::find($recipe->created_by);
        if ($submitter) {
            Mail::to($submitter->email)->queue(new RecipeApprovedMail($submitter, $recipe));
        }
    }
}
