import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../src/App';
import WorldMap from '../src/components/WorldMap';

describe('App', () => {
  it('renders the top bar and map stage', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '世界格局变化' })).toBeInTheDocument();
    expect(screen.getByText('地图待接入')).toBeInTheDocument();
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
});
