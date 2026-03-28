import { QuestionPack } from '@/types/host';
import { Question } from '@/types/game';

/**
 * Export a question pack as a downloadable JSON file.
 */
export function exportPackAsJson(pack: QuestionPack) {
  const exportData = {
    _format: 'quiznight-pack-v1',
    name: pack.name,
    description: pack.description,
    questions: pack.questions.map(q => ({
      round: q.round,
      text: q.text,
      answer: q.answer,
      category: q.category,
      type: q.type,
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
 * Validate and parse an imported JSON file into a QuestionPack.
 * Returns the pack or throws an error with a user-friendly message.
 */
export function parseImportedPack(json: unknown): QuestionPack {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid file: not a valid JSON object.');
  }

  const data = json as Record<string, unknown>;

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('Invalid file: must contain a "questions" array.');
  }

  if (data.questions.length > 6) {
    throw new Error('Invalid file: maximum 6 questions (rounds) allowed.');
  }

  const questions: Question[] = data.questions.map((q: unknown, i: number) => {
    if (!q || typeof q !== 'object') {
      throw new Error(`Invalid question at index ${i}.`);
    }
    const qObj = q as Record<string, unknown>;
    const round = typeof qObj.round === 'number' ? qObj.round : i + 1;
    const type = qObj.type === 'mcq' ? 'mcq' : 'text';

    return {
      id: Date.now() + i,
      round,
      text: typeof qObj.text === 'string' ? qObj.text : '',
      answer: typeof qObj.answer === 'string' ? qObj.answer : '',
      category: typeof qObj.category === 'string' ? qObj.category : '',
      type,
      ...(type === 'mcq' && Array.isArray(qObj.options)
        ? { options: qObj.options.map((o: unknown) => (typeof o === 'string' ? o : '')) }
        : {}),
    } satisfies Question;
  });

  // Pad to 6 questions if less
  while (questions.length < 6) {
    const round = questions.length + 1;
    questions.push({
      id: Date.now() + questions.length,
      round,
      text: '',
      answer: '',
      category: '',
      type: round === 6 ? 'mcq' : 'text',
      ...(round === 6 ? { options: ['', '', '', ''] } : {}),
    });
  }

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
export function readJsonFile(file: File): Promise<unknown> {
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
