import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import App from '../src/App';
import WorldMap from '../src/components/WorldMap';

describe('App', () => {
  it('opens on the ask rather than on the map', () => {
    render(<App />);
    expect(screen.getByText(/在担心什么/)).toBeInTheDocument();
    // The four concerns are the only choice presented.
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(
      expect.arrayContaining(['战争', '瘟疫', '贸易封锁', '技术冲击']),
    );
  });

  it('renders a map svg even without attribution data', () => {
    render(
      <WorldMap
        frame={{ year: 1300, ownership: {} }}
        highlightIds={[]}
        links={[]}
        flows={[]}
        resetKey="c1"
        onSelectPolity={() => undefined}
      />,
    );
    expect(screen.getByTestId('world-map')).toBeInTheDocument();
  });

  it('moves from the ask to a letter', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: '战争' }));
    // The ask is gone and the reader is now in the letter flow.
    expect(screen.queryByText(/在担心什么/)).not.toBeInTheDocument();
    expect(await screen.findByText(/本信基于以下已记录史实/)).toBeInTheDocument();
  });
});
