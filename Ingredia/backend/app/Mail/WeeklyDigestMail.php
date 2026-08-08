<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class WeeklyDigestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User       $user,
        public readonly Collection $recipes
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "🍽 Your Weekly Recipe Digest from Ingredia");
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.weekly-digest');
    }
}
