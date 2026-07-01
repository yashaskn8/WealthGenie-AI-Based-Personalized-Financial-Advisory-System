import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackendFallbackBanner } from './RecommendationDashboard.jsx';

describe('BackendFallbackBanner', () => {
  it('renders a visible dismissible fallback notice', () => {
    const onDismiss = vi.fn();

    render(
      <BackendFallbackBanner
        notice={{ message: 'Live recommendations unavailable - showing offline estimates', detail: 'Network unavailable' }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByTestId('backend-fallback-banner')).toHaveTextContent('Live recommendations unavailable');
    expect(screen.getByText('Network unavailable')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /dismiss fallback notice/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
