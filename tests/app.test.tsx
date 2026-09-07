import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import App from '../src/App';
import WorldMap from '../src/components/WorldMap';

describe('App', () => {
  it('renders the top bar and map stage', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '世界格局变化' })).toBeInTheDocument();
    expect(screen.getByTestId('world-map')).toBeInTheDocument();
  });

  it('renders a map svg even without attribution data', () => {
    render(
      <WorldMap
        frame={{ year: 1300, ownership: {} }}
        highlightIds={[]}
        onSelectPolity={() => undefined}
      />,
    );
    expect(screen.getByTestId('world-map')).toBeInTheDocument();
  });

  it('switches chapters and shows a new slice', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /1500 征服与全球连接/ }));
    expect(screen.getAllByText(/全球帝国初现/).length).toBeGreaterThan(0);
  });
});
