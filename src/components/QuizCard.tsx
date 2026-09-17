import { useState } from 'react';
import type { QuizPrompt } from '../data/quizPrompts';

interface QuizCardProps {
  prompt: QuizPrompt;
  onAnswer: (correct: boolean) => void;
  onSkip: () => void;
}

export default function QuizCard({ prompt, onAnswer, onSkip }: QuizCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (index: number) => {
    if (revealed) return;
    setSelected(index);
    setRevealed(true);
    onAnswer(index === prompt.correctIndex);
  };

  return (
    <div className="quiz-card" role="dialog" aria-label="历史预测">
      <p className="quiz-question">{prompt.question}</p>
      <div className="quiz-options">
        {prompt.options.map((option, index) => {
          const state = revealed
            ? index === prompt.correctIndex
              ? 'correct'
              : index === selected
                ? 'wrong'
                : 'muted'
            : 'idle';
          return (
            <button
              key={index}
              type="button"
              className={`quiz-option ${state}`}
              onClick={() => handleSelect(index)}
              disabled={revealed}
            >
              {option}
            </button>
          );
        })}
      </div>
      {revealed && <p className="quiz-explanation">{prompt.explanation}</p>}
      <div className="quiz-actions">
        {revealed ? (
          <button type="button" className="quiz-next" onClick={onSkip}>
            继续
          </button>
        ) : (
          <button type="button" className="quiz-skip" onClick={onSkip}>
            跳过
          </button>
        )}
      </div>
    </div>
  );
}
