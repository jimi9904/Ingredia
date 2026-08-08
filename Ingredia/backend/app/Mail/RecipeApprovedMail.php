<?php

namespace App\Mail;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RecipeApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User   $user,
        public readonly Recipe $recipe
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Your recipe \"{$this->recipe->title}\" has been approved! 🎉");
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.recipe-approved');
    }
}
