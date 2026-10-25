// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IyalviDiaries } from '../src/components/home/IyalviDiaries';
import { DIARY_OFFSETS, getVisibleDiaryPositions, wrapDiaryIndex } from '../src/data/diaries';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe('Iyalvi Diaries carousel positions', () => {
  it('shows offsets -2 through +2 and wraps all five images around the centre', () => {
    const positions = getVisibleDiaryPositions(0, 5);
    expect(positions.map(position => position.offset)).toEqual(DIARY_OFFSETS);
    expect(positions.map(position => position.index)).toEqual([3, 4, 0, 1, 2]);
  });

  it('repeats three images virtually to fill all five positions', () => {
    const positions = getVisibleDiaryPositions(0, 3);
    expect(positions.map(position => position.offset)).toEqual([-2, -1, 0, 1, 2]);
    expect(positions.map(position => position.index)).toEqual([1, 2, 0, 1, 2]);
  });

  it('wraps positive and negative movement without rewinding through the list', () => {
    expect(wrapDiaryIndex(5, 5)).toBe(0);
    expect(wrapDiaryIndex(-1, 5)).toBe(4);
    expect(wrapDiaryIndex(-1, 3)).toBe(2);
    expect(getVisibleDiaryPositions(0, 0)).toEqual([]);
  });
});

describe('Iyalvi Diaries interaction', () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') ? false : false, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() }));
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function mount() {
    await act(async () => { root.render(<MemoryRouter><IyalviDiaries /><LocationProbe /></MemoryRouter>); });
  }

  function centrePhoto() {
    return host.querySelector<HTMLImageElement>('.diary-position-wrap[data-offset="0"] .diary-card-photo')?.getAttribute('src');
  }

  it('pauses on hover and resumes after three quiet seconds', async () => {
    await mount();
    const section = host.querySelector('.diary-section')!;
    const initial = centrePhoto();
    act(() => vi.advanceTimersByTime(4000));
    expect(centrePhoto()).not.toBe(initial);

    const pausedAt = centrePhoto();
    act(() => section.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    act(() => vi.advanceTimersByTime(5000));
    expect(centrePhoto()).toBe(pausedAt);

    act(() => section.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })));
    act(() => vi.advanceTimersByTime(2999));
    expect(centrePhoto()).toBe(pausedAt);
    act(() => vi.advanceTimersByTime(1));
    expect(centrePhoto()).toBe(pausedAt);
    act(() => vi.advanceTimersByTime(3999));
    expect(centrePhoto()).toBe(pausedAt);
    act(() => vi.advanceTimersByTime(1));
    expect(centrePhoto()).not.toBe(pausedAt);
  });

  it('moves with arrows and keyboard, selects side cards, and activates the centred look', async () => {
    await mount();
    const initial = centrePhoto();
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Next diary story"]')!.click());
    const afterRightArrow = centrePhoto();
    expect(afterRightArrow).not.toBe(initial);
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Previous diary story"]')!.click());
    expect(centrePhoto()).toBe(initial);

    const clickableSide = host.querySelector<HTMLElement>('.diary-position-wrap[data-offset="1"] .diary-card-position')!;
    act(() => clickableSide.click());
    expect(centrePhoto()).toBe(afterRightArrow);

    const side = host.querySelector<HTMLElement>('.diary-position-wrap[data-offset="-1"] .diary-card-position')!;
    act(() => side.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(centrePhoto()).toBe(initial);
    act(() => host.querySelector<HTMLElement>('.diary-section')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(centrePhoto()).toBe(afterRightArrow);
    act(() => host.querySelector<HTMLElement>('.diary-position-wrap[data-offset="0"] .diary-card-position')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(host.querySelector('[data-testid="location"]')?.textContent).toMatch(/^\/(sarees|kurtis)$/);
  });
});
