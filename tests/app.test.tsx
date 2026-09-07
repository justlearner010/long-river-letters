import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../src/App';

describe('App', () => {
  it('renders the top bar and map stage', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '世界格局变化' })).toBeInTheDocument();
    expect(screen.getByText('地图待接入')).toBeInTheDocument();
  });
});
