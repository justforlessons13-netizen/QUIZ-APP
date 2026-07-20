import { BeePack, BeeWord } from '@/types/bee';

/**
 * Export a Bee word pack as a downloadable JSON file.
 */
export function exportBeePackAsJson(pack: BeePack) {
  const exportData = {
    _format: 'bee-pack-v1',
    name: pack.name,
    description: pack.description,
    rules: pack.rules,
    words: pack.words.map(w => ({
      word: w.word,
      definition: w.definition,
      exampleSentence: w.exampleSentence,
      partOfSpeech: w.partOfSpeech,
      difficulty: w.difficulty,
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pack.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'bee_pack'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate and parse an imported JSON file into a BeePack.
 * Returns the pack or throws an error with a user-friendly message.
 */
export function parseImportedBeePack(json: unknown): BeePack {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid file: not a valid JSON object.');
  }

  const data = json as Record<string, unknown>;

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const rules = typeof data.rules === 'string' ? data.rules : undefined;

  if (!Array.isArray(data.words) || data.words.length === 0) {
    throw new Error('Invalid file: must contain a "words" array.');
  }

  const words: BeeWord[] = data.words.map((w: unknown, i: number) => {
    if (!w || typeof w !== 'object') {
      throw new Error(`Invalid word at index ${i}.`);
    }
    const wObj = w as Record<string, unknown>;
    const difficulty =
      wObj.difficulty === 'easy' || wObj.difficulty === 'medium' || wObj.difficulty === 'hard'
        ? wObj.difficulty
        : 'medium';

    return {
      id: crypto.randomUUID(),
      word: typeof wObj.word === 'string' ? wObj.word : '',
      definition: typeof wObj.definition === 'string' ? wObj.definition : '',
      exampleSentence: typeof wObj.exampleSentence === 'string' ? wObj.exampleSentence : '',
      partOfSpeech: typeof wObj.partOfSpeech === 'string' ? wObj.partOfSpeech : '',
      difficulty,
    } satisfies BeeWord;
  });

  return {
    id: crypto.randomUUID(),
    name: name || 'Imported Bee Pack',
    description,
    rules,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    words,
    deviceMode: 'host-only',
  };
}
