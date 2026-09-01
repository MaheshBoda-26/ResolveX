export interface ChunkOptions {
  maxTokens?: number;
  overlapTokens?: number;
}

export interface TextChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
}

export function chunkText(
  text: string,
  options: ChunkOptions = {},
): TextChunk[] {
  const { maxTokens = 500, overlapTokens = 50 } = options;

  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let currentTokens = 0;
  let chunkIndex = 0;
  let charPosition = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
      const startChar = charPosition - currentChunk.length;
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex++,
        startChar,
        endChar: charPosition,
      });

      const overlapText = getOverlapText(currentChunk, overlapTokens);
      currentChunk = overlapText + " " + sentence;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
      currentTokens += sentenceTokens;
    }
    charPosition += sentence.length + 1;
  }

  if (currentChunk.trim()) {
    const startChar = charPosition - currentChunk.length;
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      startChar,
      endChar: charPosition,
    });
  }

  return chunks;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getOverlapText(text: string, overlapTokens: number): string {
  const words = text.split(/\s+/);
  const overlapWords = Math.min(overlapTokens, words.length);
  return words.slice(-overlapWords).join(" ");
}
