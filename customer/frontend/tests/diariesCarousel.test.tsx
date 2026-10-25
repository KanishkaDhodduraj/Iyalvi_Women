// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IyalviDiaries } from '../src/components/home/IyalviDiaries';
import { DIARY_OFFSETS, getVisibleDiaryPositions, wrapDiaryIndex } from '../src/data/diaries';

vi.mock('../src/data/site', () => ({ instagramProfileUrl: 'https://instagram.com/iyalvi-profile' }));
vi.mock('../src/data/diaries', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/data/diaries')>();
  return { ...actual, diaries: actual.diaries.map((diary, index) => index === 0 ? { ...diary, likes: 1574, comments: 8, postedLabel: '2 DAYS AGO', instagramUrl: 'https://instagram.com/p/iyalvi-look' } : diary) };
});

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
  let clipboardDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') ? false : false, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() }));
    clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    else Reflect.deleteProperty(navigator, 'clipboard');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function mount() {
    await act(async () => { root.render(<MemoryRouter><IyalviDiaries /><LocationProbe /></MemoryRouter>); });
  }

  function centrePhoto() {
    return host.querySelector<HTMLImageElement>('.diary-position-wrap[data-offset="0"] .diary-card-photo')?.getAttribute('src');
  }

  function centreElement<T extends Element>(selector: string) {
    return host.querySelector<T>('.diary-desktop-stage .diary-position-wrap[data-offset="0"] ' + selector)!;
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

  it('toggles the heart and increments only an existing likes number', async () => {
    await mount();
    const like = centreElement<HTMLButtonElement>('.diary-like-button');
    expect(centreElement('.diary-likes')?.textContent).toBe('1,574 likes');
    act(() => like.click());
    expect(like.getAttribute('aria-pressed')).toBe('true');
    expect(centreElement('.diary-likes')?.textContent).toBe('1,575 likes');
    act(() => like.click());
    expect(like.getAttribute('aria-pressed')).toBe('false');
    expect(centreElement('.diary-likes')?.textContent).toBe('1,574 likes');
  });

  it('hides empty engagement lines and keeps likes hidden when an unnumbered post is liked', async () => {
    await mount();
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Next diary story"]')!.click());
    expect(centreElement('.diary-likes')).toBeNull();
    expect(centreElement('.diary-view-comments')).toBeNull();
    expect(centreElement('.diary-posted-label')).toBeNull();
    const like = centreElement<HTMLButtonElement>('.diary-like-button');
    act(() => like.click());
    expect(like.getAttribute('aria-pressed')).toBe('true');
    expect(centreElement('.diary-likes')).toBeNull();
  });

  it('opens the profile from Follow and briefly displays Following', async () => {
    await mount();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const follow = centreElement<HTMLAnchorElement>('.diary-follow');
    act(() => follow.click());
    expect(open).toHaveBeenCalledWith('https://instagram.com/iyalvi-profile', '_blank', 'noopener,noreferrer');
    expect(follow.getAttribute('rel')).toBe('noopener noreferrer');
    expect(follow.textContent).toBe('Following');
    act(() => vi.advanceTimersByTime(1600));
    expect(centreElement('.diary-follow')?.textContent).toBe('Follow');
  });

  it('closes the centre card menu with Escape', async () => {
    await mount();
    act(() => centreElement<HTMLButtonElement>('[aria-label="More post options"]').click());
    const menu = centreElement('[role="menu"]');
    expect(menu).not.toBeNull();
    act(() => menu!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(centreElement('[role="menu"]')).toBeNull();
  });

  it('opens post comments when available and falls back to the brand profile', async () => {
    await mount();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const allComments = centreElement<HTMLAnchorElement>('.diary-view-comments');
    expect(allComments.getAttribute('href')).toBe('https://instagram.com/p/iyalvi-look');
    expect(allComments.getAttribute('rel')).toBe('noopener noreferrer');
    act(() => centreElement<HTMLButtonElement>('[aria-label="Open comments"]').click());
    expect(open).toHaveBeenCalledWith('https://instagram.com/p/iyalvi-look', '_blank', 'noopener,noreferrer');

    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Next diary story"]')!.click());
    act(() => centreElement<HTMLButtonElement>('[aria-label="Open comments"]').click());
    expect(open).toHaveBeenLastCalledWith('https://instagram.com/iyalvi-profile', '_blank', 'noopener,noreferrer');
  });

  it('copies the page URL and announces success when native sharing is unavailable', async () => {
    await mount();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await act(async () => { centreElement<HTMLButtonElement>('[aria-label="Share post"]').click(); await Promise.resolve(); await Promise.resolve(); });
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(host.querySelector('[role="status"]')?.textContent).toBe('Link copied');
  });
});
