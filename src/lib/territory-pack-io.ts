import { TerritoryPack, TerritoryQuestion, TerritoryQuestionType } from '@/types/territory';

/**
 * Export a territory pack as a downloadable JSON file.
 */
export function exportTerritoryPackAsJson(pack: TerritoryPack) {
  const exportData = {
    _format: 'territory-pack-v1',
    name: pack.name,
    description: pack.description,
    questions: pack.questions.map(q => ({
      type: q.type,
      text: q.text,
      answer: q.answer,
      ...(q.options ? { options: q.options } : {}),
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pack.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'pack'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate and parse an imported JSON file into a TerritoryPack.
 * Returns the pack or throws an error with a user-friendly message.
 */
export function parseImportedTerritoryPack(json: unknown): TerritoryPack {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid file: not a valid JSON object.');
  }

  const data = json as Record<string, unknown>;

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('Invalid file: must contain a "questions" array.');
  }

  const questions: TerritoryQuestion[] = data.questions.map((q: unknown, i: number) => {
    if (!q || typeof q !== 'object') {
      throw new Error(`Invalid question at index ${i}.`);
    }
    const qObj = q as Record<string, unknown>;
    const type: TerritoryQuestionType = qObj.type === 'quiz' ? 'quiz' : 'choice';

    return {
      id: Date.now() + i,
      text: typeof qObj.text === 'string' ? qObj.text : '',
      answer: typeof qObj.answer === 'string' ? qObj.answer : '',
      type,
      ...(type === 'choice' && Array.isArray(qObj.options)
        ? { options: qObj.options.map((o: unknown) => (typeof o === 'string' ? o : '')) }
        : {}),
    } satisfies TerritoryQuestion;
  });

  return {
    id: crypto.randomUUID(),
    name: name || 'Imported Pack',
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions,
  };
}

/**
 * Read a File as JSON. Returns a promise.
 */
export function readTerritoryJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new Error('Failed to parse JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
