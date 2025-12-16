'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PlayJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/play/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode: code.trim().toUpperCase(), displayName: name.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kunde inte gå med');
      // token handled in session page rejoin, but store quick for transition
      localStorage.setItem(`lekbanken.participant.temp`, JSON.stringify(data));
      router.push(`/play/session/${code.trim().toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground mb-2">Gå med i session</h1>
        <p className="text-sm text-muted-foreground mb-6">Ange kod och namn för att ansluta.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Sessionskod</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-lg"
              placeholder="H3K9QF"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Namn</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              placeholder="Ditt namn"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6 || !name.trim()}
            className="w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground font-semibold disabled:opacity-50"
          >
            {loading ? 'Ansluter...' : 'Gå med'}
          </button>
        </form>
      </div>
    </div>
  );
}
