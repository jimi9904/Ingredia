<?php

namespace App\Policies;

use App\Models\Review;
use App\Models\User;

class ReviewPolicy
{
    /** Admins bypass all checks. */
    public function before(User $user): ?bool
    {
        return $user->isAdmin() ? true : null;
    }

    /** Only the review author can delete their own review. */
    public function delete(User $user, Review $review): bool
    {
        return (string) $user->_id === (string) $review->user_id;
    }
}
