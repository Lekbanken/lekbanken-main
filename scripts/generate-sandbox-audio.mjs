// Generates a tiny repo-local WAV file for sandbox audio scenarios.
// Output: public/sandbox/audio-test.wav

import fs from 'node:fs';
import path from 'node:path';

function writeWavFile(filePath, { sampleRate, numChannels, bitsPerSample, samples }) {
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  const dataSize = samples.length * bytesPerSample;
  const riffSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset);
  offset += 4;
  buffer.writeUInt32LE(riffSize, offset);
  offset += 4;
  buffer.write('WAVE', offset);
  offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset);
  offset += 4;
  buffer.writeUInt32LE(16, offset);
  offset += 4; // PCM
  buffer.writeUInt16LE(1, offset);
  offset += 2; // AudioFormat = PCM
  buffer.writeUInt16LE(numChannels, offset);
  offset += 2;
  buffer.writeUInt32LE(sampleRate, offset);
  offset += 4;
  buffer.writeUInt32LE(byteRate, offset);
  offset += 4;
  buffer.writeUInt16LE(blockAlign, offset);
  offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset);
  offset += 2;

  // data chunk
  buffer.write('data', offset);
  offset += 4;
  buffer.writeUInt32LE(dataSize, offset);
  offset += 4;

  // PCM samples (16-bit signed little-endian)
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], offset);
    offset += 2;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

function generateSineWaveSamples({
  frequencyHz,
  durationSeconds,
  sampleRate,
  amplitude,
  fadeMs,
}) {
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const fadeSamples = Math.floor((fadeMs / 1000) * sampleRate);
  const samples = new Int16Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const raw = Math.sin(2 * Math.PI * frequencyHz * t);

    let env = 1;
    if (fadeSamples > 0) {
      if (i < fadeSamples) env *= i / fadeSamples;
      const tailIndex = totalSamples - 1 - i;
      if (tailIndex < fadeSamples) env *= tailIndex / fadeSamples;
    }

    const value = Math.round(raw * amplitude * env);
    samples[i] = Math.max(-32768, Math.min(32767, value));
  }

  return samples;
}

function main() {
  const outPath = path.join(process.cwd(), 'public', 'sandbox', 'audio-test.wav');

  const sampleRate = 44100;
  const samples = generateSineWaveSamples({
    frequencyHz: 880,
    durationSeconds: 1.2,
    sampleRate,
    amplitude: 16000,
    fadeMs: 25,
  });

  writeWavFile(outPath, {
    sampleRate,
    numChannels: 1,
    bitsPerSample: 16,
    samples,
  });

  console.log(`Wrote ${outPath}`);
}

main();
