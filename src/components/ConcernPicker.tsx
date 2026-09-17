import type { LetterIntent } from '../data/letters';

interface ConcernPickerProps {
  intents: LetterIntent[];
  onPick: (intentId: string) => void;
}

export default function ConcernPicker({ intents, onPick }: ConcernPickerProps) {
  return (
    <div className="letter-ask" role="dialog" aria-label="你在担心什么">
      <h2>2026 年的你，在担心什么？</h2>
      <div className="letter-ask-choices">
        {intents.map((intent) => (
          <button
            key={intent.id}
            type="button"
            className="letter-ask-word"
            onClick={() => onPick(intent.id)}
            title={intent.prompt}
          >
            {intent.label}
          </button>
        ))}
      </div>
      <p className="letter-ask-hint">选一个词，收一封来自经历过同样处境的人的信</p>
    </div>
  );
}
