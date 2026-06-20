import type { Readable } from "node:stream";
import { openai } from "../client";

export { openai };

export type AudioFormat = "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";

const SUPPORTED_FORMATS: AudioFormat[] = ["mp3", "opus", "aac", "flac", "wav", "pcm"];

export function detectAudioFormat(filename: string): AudioFormat {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if ((SUPPORTED_FORMATS as string[]).includes(ext)) return ext as AudioFormat;
  return "mp3";
}

export function convertToWav(buffer: Buffer): Buffer {
  return buffer;
}

export function ensureCompatibleFormat(
  buffer: Buffer,
  format: AudioFormat
): Buffer {
  void format;
  return buffer;
}

export async function textToSpeech(
  text: string,
  options?: { voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"; format?: AudioFormat }
): Promise<Buffer> {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    input: text,
    voice: options?.voice ?? "alloy",
    response_format: (options?.format ?? "mp3") as "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm",
  });
  return Buffer.from(await response.arrayBuffer());
}

export async function* textToSpeechStream(
  text: string,
  options?: { voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"; format?: AudioFormat }
): AsyncGenerator<Buffer> {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    input: text,
    voice: options?.voice ?? "alloy",
    response_format: (options?.format ?? "mp3") as "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm",
  });
  const stream = response.body as unknown as Readable;
  for await (const chunk of stream) {
    yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer);
  }
}

export async function speechToText(
  audio: Buffer,
  options?: { language?: string; filename?: string }
): Promise<string> {
  const { toFile } = await import("openai");
  const file = await toFile(audio, options?.filename ?? "audio.mp3", { type: "audio/mpeg" });
  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: options?.language,
  });
  return response.text;
}

export async function* speechToTextStream(
  audio: Buffer,
  options?: { language?: string; filename?: string }
): AsyncGenerator<string> {
  const text = await speechToText(audio, options);
  yield text;
}

export async function voiceChat(
  audio: Buffer,
  systemPrompt?: string,
  options?: { language?: string }
): Promise<Buffer> {
  const transcript = await speechToText(audio, options);
  const chatResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      { role: "user" as const, content: transcript },
    ],
  });
  const replyText = chatResponse.choices[0]?.message?.content ?? "";
  return textToSpeech(replyText);
}

export async function* voiceChatStream(
  audio: Buffer,
  systemPrompt?: string,
  options?: { language?: string }
): AsyncGenerator<Buffer> {
  const result = await voiceChat(audio, systemPrompt, options);
  yield result;
}
