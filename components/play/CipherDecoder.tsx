'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  CheckCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { CipherConfig, CipherState } from '@/types/puzzle-modules';
import {
  caesarDecode,
  atbashEncode,
  substitutionDecode,
  checkRiddleAnswer,
} from '@/types/puzzle-modules';

// ============================================================================
// CipherDecoder – Language/cipher puzzle with decoder helper
// ============================================================================

export interface CipherDecoderProps {
  config: CipherConfig;
  state: CipherState;
  onGuess: (guess: string) => void;
  onDecoded?: () => void;
  className?: string;
}

export function CipherDecoder({
  config,
  state,
  onGuess,
  onDecoded,
  className = '',
}: CipherDecoderProps) {
  const [inputValue, setInputValue] = useState(state.currentGuess);
  const [showHelper, setShowHelper] = useState(false);
  const [helperShift, setHelperShift] = useState(config.caesarShift ?? 3);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = checkRiddleAnswer(
      inputValue,
      [config.expectedPlaintext],
      config.normalizeMode ?? 'fuzzy'
    );

    if (result.isCorrect) {
      setFeedback('correct');
      onGuess(inputValue);
      onDecoded?.();
    } else {
      setFeedback('wrong');
      onGuess(inputValue);
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  // Decoder helper result
  const decodedPreview = useMemo(() => {
    if (!showHelper) return '';
    
    switch (config.cipherType) {
      case 'caesar':
        return caesarDecode(config.encodedMessage, helperShift);
      case 'atbash':
        return atbashEncode(config.encodedMessage); // Atbash is its own inverse
      case 'substitution':
        if (config.substitutionMap) {
          return substitutionDecode(config.encodedMessage, config.substitutionMap);
        }
        return config.encodedMessage;
      default:
        return config.encodedMessage;
    }
  }, [showHelper, config, helperShift]);

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Encoded message display */}
      <div className="p-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-600">
        <div className="flex items-center gap-2 mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          <LockClosedIcon className="h-4 w-4" />
          <span>Kodat meddelande ({config.cipherType})</span>
        </div>
        <p className="font-mono text-lg tracking-wider break-all">
          {config.encodedMessage}
        </p>
      </div>

      {/* Decoder helper UI */}
      {config.showDecoderUI && (
        <div className="space-y-3">
          <button
            onClick={() => setShowHelper(!showHelper)}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showHelper ? (
              <>
                <LockClosedIcon className="h-4 w-4" />
                Dölj avkodarhjälpen
              </>
            ) : (
              <>
                <LockOpenIcon className="h-4 w-4" />
                Visa avkodarhjälpen
              </>
            )}
          </button>

          {showHelper && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              {config.cipherType === 'caesar' && (
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm font-medium">Förskjutning:</label>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={helperShift}
                    onChange={e => setHelperShift(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-8 text-center font-mono">{helperShift}</span>
                </div>
              )}

              <div className="p-3 rounded bg-white dark:bg-zinc-800 font-mono text-sm">
                <div className="text-xs text-zinc-500 mb-1">Förhandsvisning:</div>
                <p className="tracking-wider break-all">{decodedPreview}</p>
              </div>

              {config.cipherType === 'caesar' && (
                <CaesarWheel shift={helperShift} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Answer input */}
      {!state.isDecoded ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Skriv det avkodade meddelandet:
            </label>
            <Input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Skriv din lösning..."
              className={`${
                feedback === 'wrong'
                  ? 'border-red-500 focus:ring-red-500'
                  : feedback === 'correct'
                  ? 'border-green-500 focus:ring-green-500'
                  : ''
              }`}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={!inputValue.trim()}>
              Kontrollera
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInputValue('')}
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Rensa
            </Button>
          </div>

          {feedback === 'wrong' && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Inte rätt, försök igen! (Försök {state.attemptsUsed + 1})
            </p>
          )}
        </form>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
          <CheckCircleIcon className="h-6 w-6 flex-shrink-0" />
          <div>
            <p className="font-medium">Korrekt avkodat!</p>
            <p className="text-sm opacity-80">
              Lösning: {config.expectedPlaintext}
            </p>
          </div>
        </div>
      )}

      {/* Attempt counter */}
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        Försök: {state.attemptsUsed}
      </div>
    </div>
  );
}

// ============================================================================
// CaesarWheel – Visual cipher wheel helper
// ============================================================================

interface CaesarWheelProps {
  shift: number;
}

function CaesarWheel({ shift }: CaesarWheelProps) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const shiftedAlphabet = alphabet
    .split('')
    .map((_, i) => alphabet[(i + shift) % 26])
    .join('');

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <th className="py-1 text-left text-zinc-500">Original</th>
            {alphabet.split('').map(char => (
              <th key={char} className="px-1 py-1 text-center">
                {char}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1 text-left text-zinc-500">Kodat</td>
            {shiftedAlphabet.split('').map((char, i) => (
              <td key={i} className="px-1 py-1 text-center text-blue-600 dark:text-blue-400">
                {char}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// useCipherDecoder – Hook for managing cipher state
// ============================================================================

export function useCipherDecoder(config: CipherConfig) {
  const [state, setState] = useState<CipherState>({
    currentGuess: '',
    isDecoded: false,
    attemptsUsed: 0,
  });

  const handleGuess = useCallback(
    (guess: string) => {
      const result = checkRiddleAnswer(
        guess,
        [config.expectedPlaintext],
        config.normalizeMode ?? 'fuzzy'
      );

      setState(prev => ({
        currentGuess: guess,
        isDecoded: result.isCorrect,
        attemptsUsed: prev.attemptsUsed + 1,
        decodedAt: result.isCorrect ? new Date().toISOString() : undefined,
      }));
    },
    [config.expectedPlaintext, config.normalizeMode]
  );

  const reset = useCallback(() => {
    setState({
      currentGuess: '',
      isDecoded: false,
      attemptsUsed: 0,
    });
  }, []);

  return { state, handleGuess, reset };
}
