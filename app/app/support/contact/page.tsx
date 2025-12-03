'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Input, Textarea, Select } from '@/components/ui';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

const CONTACT_REASONS = [
  { value: 'general', label: 'Allmän fråga' },
  { value: 'technical', label: 'Tekniskt problem' },
  { value: 'billing', label: 'Fakturering' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Övrigt' },
];

export default function ContactSupportPage() {
  const [reason, setReason] = useState('general');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate submit
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-6 pb-32">
        <header className="flex items-center gap-4">
          <Link
            href="/app/support"
            className="rounded-full p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-foreground" />
          </Link>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Support
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Kontakta oss
            </h1>
          </div>
        </header>

        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Tack för ditt meddelande!
            </h2>
            <p className="text-muted-foreground mb-6">
              Vi har mottagit ditt ärende och återkommer så snart vi kan,
              vanligtvis inom 24 timmar.
            </p>
            <Link href="/app/support">
              <Button>Tillbaka till support</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Link
          href="/app/support"
          className="rounded-full p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-foreground" />
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Support
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Kontakta oss
          </h1>
        </div>
      </header>

      {/* Contact Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Vi hjälper dig gärna!</p>
              <p className="text-sm text-muted-foreground">
                Vanlig svarstid: inom 24 timmar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Ärende
              </label>
              <Select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                options={CONTACT_REASONS}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Din e-postadress
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.se"
                required
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Ämne
              </label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Kort beskrivning av ditt ärende"
                required
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Meddelande
              </label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Beskriv ditt ärende så detaljerat som möjligt..."
                rows={5}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={isSubmitting || !email || !subject || !message}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
              Skickar...
            </>
          ) : (
            <>
              <EnvelopeIcon className="h-5 w-5 mr-2" />
              Skicka meddelande
            </>
          )}
        </Button>
      </form>

      {/* Alternative Contact */}
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Du kan också nå oss via e-post:
          </p>
          <a
            href="mailto:support@lekbanken.se"
            className="text-primary hover:underline font-medium"
          >
            support@lekbanken.se
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
