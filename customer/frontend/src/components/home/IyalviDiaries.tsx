import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionHeading } from '../ui/SectionHeading';
import { DIARY_MOBILE_OFFSETS, DIARY_OFFSETS, diaries, getVisibleDiaryPositions, wrapDiaryIndex, type Diary } from '../../data/diaries';
import { instagramProfileUrl } from '../../data/site';
import '../../styles/diaryCarousel.css';

export type FlyingHeart = { id: number; x: number; y: number; drift: number; rise: number; rotation: number; size: number; delay: number; duration: number; color: string; big?: boolean };
export function createFlyingHeartBurst(x: number, y: number, firstId: number, random = Math.random): FlyingHeart[] {
  const colors = ['#7b1835', '#b28a42', '#c86f82'];
  const between = (min: number, max: number) => min + random() * (max - min);
  return Array.from({ length: Math.round(between(8, 12)) }, (_, index) => ({ id: firstId + index, x, y, drift: between(-40, 40), rise: between(120, 220), rotation: between(-25, 25), size: between(12, 24), delay: between(0, 250), duration: between(1200, 1600), color: colors[Math.floor(random() * colors.length)] }));
}
export function limitLiveHearts(current: FlyingHeart[], additions: FlyingHeart[]) { return [...current, ...additions].slice(-40); }
function HeartOverlay({ hearts, onEnd }: { hearts: FlyingHeart[]; onEnd: (id: number) => void }) {
  return createPortal(<div className="diary-hearts-layer" aria-hidden="true">{hearts.map(heart => <svg key={heart.id} className={'diary-flying-heart' + (heart.big ? ' diary-big-heart' : '')} viewBox="0 0 24 24" onAnimationEnd={() => onEnd(heart.id)} style={{ left: heart.x, top: heart.y, '--drift': heart.drift + 'px', '--rise': heart.rise + 'px', '--turn': heart.rotation + 'deg', '--heart-size': heart.size + 'px', '--heart-delay': heart.delay + 'ms', '--heart-duration': heart.duration + 'ms', '--heart-color': heart.color } as CSSProperties}>{heart.big && <defs><linearGradient id="diary-heart-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="#8b1838"/></linearGradient></defs>}<path d="M20.8 8.7c0 4.3-8.8 10-8.8 10s-8.8-5.7-8.8-10A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z" fill={heart.big ? 'url(#diary-heart-gradient)' : 'currentColor'} stroke="white" strokeWidth=".8" /></svg>)}</div>, document.body);
}

type DiaryImage = { url: string };
const diaryImages = Object.entries(import.meta.glob('../../assets/diaries/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, url]) => ({ url }));

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReduced(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  return reduced;
}

function useCarouselState(count: number, blocked: boolean) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [temporarilyPaused, setTemporarilyPaused] = useState(false);
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden');
  const reducedMotion = useReducedMotion();
  const resumeTimer = useRef<number | undefined>(undefined);
  const pauseForInteraction = useCallback(() => { setTemporarilyPaused(true); window.clearTimeout(resumeTimer.current); resumeTimer.current = window.setTimeout(() => setTemporarilyPaused(false), 3000); }, []);
  const move = useCallback((amount: number) => { if (count < 1) return; setActiveIndex(index => wrapDiaryIndex(index + amount, count)); pauseForInteraction(); }, [count, pauseForInteraction]);
  useEffect(() => { const onVisibilityChange = () => setHidden(document.visibilityState === 'hidden'); document.addEventListener('visibilitychange', onVisibilityChange); return () => document.removeEventListener('visibilitychange', onVisibilityChange); }, []);
  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);
  useEffect(() => { if (count < 2 || hovered || focused || temporarilyPaused || hidden || reducedMotion || blocked) return; const timer = window.setTimeout(() => setActiveIndex(index => wrapDiaryIndex(index + 1, count)), 4000); return () => window.clearTimeout(timer); }, [activeIndex, blocked, count, focused, hidden, hovered, reducedMotion, temporarilyPaused]);
  return { activeIndex, setActiveIndex, move, setHovered, setFocused, pauseForInteraction };
}

function Icon({ kind, filled = false }: { kind: 'heart' | 'comment' | 'share' | 'bookmark' | 'more'; filled?: boolean }) {
  if (kind === 'heart') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 4.3-8.8 10-8.8 10s-8.8-5.7-8.8-10A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  if (kind === 'comment') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.7 7.4L3.5 20l1.1-4.1a8.5 8.5 0 1 1 15.9-4.4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  if (kind === 'share') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7.2 18-3.9-7.9L2 9.2 21 3Zm0 0L9.9 13.1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" /></svg>;
  if (kind === 'bookmark') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h12v16L12 17l-6 3.5v-16Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>;
}

async function copyLink(value: string) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return; }
  const input = document.createElement('textarea'); input.value = value; input.setAttribute('readonly', ''); input.style.position = 'fixed'; input.style.opacity = '0'; document.body.appendChild(input); input.select();
  try { document.execCommand('copy'); } finally { input.remove(); }
}

export function DiaryPostCard({ diary, image, offset, isActive, liked, bookmarked, following, menuOpen, profileUrl, onSelect, onKeyDown, onLike, onPhotoLike, onBookmark, onFollow, onComment, onShare, onToggleMenu, onCopy, onCloseMenu }: {
  diary: Diary; image: DiaryImage; offset: number; isActive: boolean; liked: boolean; bookmarked: boolean; following: boolean; menuOpen: boolean; profileUrl: string;
  onSelect: () => void; onKeyDown: (event: KeyboardEvent<HTMLElement>) => void; onLike: (element: HTMLElement) => void; onPhotoLike: (x: number, y: number) => void; onBookmark: () => void; onFollow: () => void;
  onComment: () => void; onShare: () => void; onToggleMenu: () => void; onCopy: () => void; onCloseMenu: () => void;
}) {
  const tapRef = useRef<{ at: number; x: number; y: number; timer?: number }>({ at: 0, x: 0, y: 0 });
  const monogram = diary.displayName.split(/\s+/).map(part => part[0]).join('').slice(0, 2);
  const commentUrl = diary.instagramUrl || profileUrl;
  const likesLabel = diary.likes == null ? '' : (diary.likes + (liked ? 1 : 0)).toLocaleString('en-US') + ' likes';
  const keyActivate = (event: KeyboardEvent<HTMLElement>) => { if ((event.key === 'Enter' || event.key === ' ') && !(event.target as HTMLElement).closest('button,a,[role="button"]')) onKeyDown(event); };
  return <article className="diary-card-position" data-offset={offset} tabIndex={0} aria-label={diary.displayName + ': ' + diary.caption} onClick={onSelect} onKeyDown={keyActivate}>
    <div className="diary-card-frame">
      <header className="diary-post-header">
        <span className="diary-post-avatar" aria-hidden="true"><span>{monogram}</span></span>
        <span className="diary-post-identity"><b>{diary.displayName}</b>{(diary.location || diary.handle) && <small>{diary.location || diary.handle}</small>}</span>
        <button type="button" className={'diary-follow' + (following ? ' is-following' : '')} aria-pressed={following} onClick={event => { event.stopPropagation(); onFollow(); }}>{following && <span aria-hidden="true">✓ </span>}{following ? 'Following' : 'Follow'}</button>
        <button type="button" className="diary-more-button" aria-label="More post options" aria-haspopup="menu" aria-expanded={menuOpen} disabled={!isActive} tabIndex={isActive ? 0 : -1} onClick={onToggleMenu}><Icon kind="more" /></button>
        {isActive && menuOpen && <div className="diary-post-menu" role="menu" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onCloseMenu(); } }}>
          <Link role="menuitem" to={diary.shopTo} onClick={onCloseMenu}>Shop this look</Link>
          <button role="menuitem" type="button" onClick={onCopy}>Copy link</button>
        </div>}
      </header>
      <div className="diary-photo-frame" role="button" tabIndex={0} aria-label={'Photo of ' + diary.displayName + '; double tap to like'} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); onPhotoLike(rect.left + rect.width / 2, rect.top + rect.height / 2); } }} onPointerUp={event => { if (event.pointerType !== 'touch') return; const now = Date.now(), last = tapRef.current, x = event.clientX, y = event.clientY; if (now - last.at < 350 && Math.hypot(x - last.x, y - last.y) < 40) { window.clearTimeout(last.timer); tapRef.current = { at: 0, x, y }; onPhotoLike(x, y); } else { const timer = window.setTimeout(() => { if (!isActive) onSelect(); }, 300); tapRef.current = { at: now, x, y, timer }; } }} onDoubleClick={event => { event.stopPropagation(); window.clearTimeout(tapRef.current.timer); const rect = event.currentTarget.getBoundingClientRect(); onPhotoLike(event.clientX || rect.left + rect.width / 2, event.clientY || rect.top + rect.height / 2); }} onClick={event => { event.stopPropagation(); if (!isActive && event.detail !== 0) { const rect = event.currentTarget.getBoundingClientRect(); const now = Date.now(); window.clearTimeout(tapRef.current.timer); const timer = window.setTimeout(() => onSelect(), 320); tapRef.current = { at: now, x: event.clientX || rect.left + rect.width / 2, y: event.clientY || rect.top + rect.height / 2, timer }; } }}><img className="diary-card-photo" src={image.url} alt={diary.displayName + ' wearing Iyalvi'} style={{ objectPosition: diary.focus || '50% 0%' }} /></div>
      <div className="diary-post-controls">
        <div className="diary-action-row">
          <div className="diary-action-group">
            <button type="button" className={'diary-action-button diary-like-button' + (liked ? ' is-liked' : '')} aria-label={'Like post by ' + diary.displayName} aria-pressed={liked} onClick={event => onLike(event.currentTarget)}><Icon kind="heart" filled={liked} /></button>
            <button type="button" className="diary-action-button" aria-label="Open comments" disabled={!isActive || !commentUrl} tabIndex={isActive && commentUrl ? 0 : -1} onClick={onComment}><Icon kind="comment" /></button>
            <button type="button" className="diary-action-button" aria-label="Share post" disabled={!isActive} tabIndex={isActive ? 0 : -1} onClick={onShare}><Icon kind="share" /></button>
          </div>
          <button type="button" className="diary-action-button diary-save-button" aria-label={bookmarked ? 'Remove bookmark' : 'Save post'} aria-pressed={bookmarked} disabled={!isActive} tabIndex={isActive ? 0 : -1} onClick={onBookmark}><Icon kind="bookmark" filled={bookmarked} /></button>
        </div>
        {likesLabel && <p className="diary-likes">{likesLabel}</p>}
        <p className="diary-post-caption"><b>{diary.displayName}</b> {diary.caption}<span className="diary-more-text"> more</span></p>
        {diary.comments != null && diary.instagramUrl && <a className="diary-view-comments" href={diary.instagramUrl} target="_blank" rel="noopener noreferrer" aria-disabled={!isActive} tabIndex={isActive ? 0 : -1} onClick={event => { if (!isActive) event.preventDefault(); }}>View all {diary.comments} comments</a>}
        {diary.postedLabel && <p className="diary-posted-label">{diary.postedLabel}</p>}
      </div>
      <svg className="diary-kolam" viewBox="0 0 36 36" aria-hidden="true"><path d="M18 3c-2 5-5 7-10 7 5 2 7 5 7 10-5-2-8-5-10-10m13 23c2-5 5-7 10-7-5-2-7-5-7-10 5 2 8 5 10 10M18 3v7m0 13v10M3 18h7m13 0h10"/><circle cx="18" cy="18" r="2.4"/></svg>
    </div>
  </article>;
}

function Position({ image, diary, offset, scale, opacity, activeIndex, setActiveIndex, navigate, left, liked, bookmarked, following, menuOpen, profileUrl, onLike, onPhotoLike, onBookmark, onFollow, onComment, onShare, onToggleMenu, onCopy, onCloseMenu }: {
  image: DiaryImage; diary: Diary; offset: number; scale: number; opacity: number; activeIndex: number; setActiveIndex: (index: number) => void; navigate: (to: string) => void; left: string;
  liked: boolean; bookmarked: boolean; following: boolean; menuOpen: boolean; profileUrl: string; onLike: (element: HTMLElement) => void; onPhotoLike: (x: number, y: number) => void; onBookmark: () => void; onFollow: () => void; onComment: () => void; onShare: () => void; onToggleMenu: () => void; onCopy: () => void; onCloseMenu: () => void;
}) {
  const handleKey = (event: KeyboardEvent<HTMLElement>) => { if ((event.key !== 'Enter' && event.key !== ' ') || (event.target as HTMLElement).closest('button,a,[role="button"]')) return; event.preventDefault(); const selected = wrapDiaryIndex(activeIndex + offset, diaryImages.length); if (offset === 0) navigate(diary.shopTo); else setActiveIndex(selected); };
  return <div className="diary-position-wrap" data-offset={offset} style={{ left, opacity, zIndex: 10 - Math.abs(offset), transform: 'translate(-50%, -50%) scale(' + scale + ')' }}>
    <DiaryPostCard image={image} diary={diary} offset={offset} isActive={offset === 0} liked={liked} bookmarked={bookmarked} following={following} menuOpen={menuOpen} profileUrl={profileUrl}
      onKeyDown={handleKey} onSelect={() => { if (offset !== 0) setActiveIndex(wrapDiaryIndex(activeIndex + offset, diaryImages.length)); }} onLike={onLike} onPhotoLike={onPhotoLike} onBookmark={onBookmark} onFollow={onFollow} onComment={onComment} onShare={onShare} onToggleMenu={onToggleMenu} onCopy={onCopy} onCloseMenu={onCloseMenu} />
    {offset === 0 && <p className="diary-caption">{diary.caption}</p>}
  </div>;
}

function DesktopCarousel(props: CarouselProps) {
  const positions = getVisibleDiaryPositions(props.activeIndex, props.images.length, DIARY_OFFSETS);
  const scales = [0.62, 0.8, 1, 0.8, 0.62]; const opacities = [0.76, 0.87, 1, 0.87, 0.76];
  const left: Record<number, string> = { [-2]: '14%', [-1]: '32%', 0: '50%', 1: '68%', 2: '86%' };
  return <div className="diary-desktop-stage" aria-label="Customer style carousel">{positions.map((position, i) => <CarouselPosition key={position.offset} {...props} position={position} scale={scales[i]} opacity={opacities[i]} left={left[position.offset]} />)}</div>;
}

type CarouselProps = { images: DiaryImage[]; activeIndex: number; setActiveIndex: (index: number) => void; navigate: (to: string) => void; liked: Record<number, boolean>; bookmarked: Record<number, boolean>; following: Record<number, boolean>; menuIndex: number | null; profileUrl: string; onLike: (index: number, element: HTMLElement) => void; onPhotoLike: (index: number, x: number, y: number) => void; onBookmark: (index: number) => void; onFollow: (index: number) => void; onComment: (diary: Diary) => void; onShare: (diary: Diary) => void; onToggleMenu: (index: number) => void; onCopy: (diary: Diary) => void; onCloseMenu: () => void };
type PositionData = { offset: number; index: number };
function CarouselPosition({ images, activeIndex, setActiveIndex, navigate, liked, bookmarked, following, menuIndex, profileUrl, onLike, onPhotoLike, onBookmark, onFollow, onComment, onShare, onToggleMenu, onCopy, onCloseMenu, position, scale, opacity, left }: CarouselProps & { position: PositionData; scale: number; opacity: number; left: string }) {
  const diary = diaries[position.index % diaries.length];
  return <Position image={images[position.index]} diary={diary} offset={position.offset} scale={scale} opacity={opacity} activeIndex={activeIndex} setActiveIndex={setActiveIndex} navigate={navigate} left={left}
    liked={Boolean(liked[position.index])} bookmarked={Boolean(bookmarked[position.index])} following={Boolean(following[position.index])} menuOpen={menuIndex === position.index} profileUrl={profileUrl}
    onLike={element => onLike(position.index, element)} onPhotoLike={(x, y) => onPhotoLike(position.index, x, y)} onBookmark={() => onBookmark(position.index)} onFollow={() => onFollow(position.index)} onComment={() => onComment(diary)} onShare={() => onShare(diary)} onToggleMenu={() => onToggleMenu(position.index)} onCopy={() => onCopy(diary)} onCloseMenu={onCloseMenu} />;
}

function MobileCarousel({ ...props }: CarouselProps & { pauseForInteraction: () => void }) {
  const pointerStart = useRef<number | null>(null); const swiped = useRef(false);
  const positions = getVisibleDiaryPositions(props.activeIndex, props.images.length, DIARY_MOBILE_OFFSETS);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => { pointerStart.current = event.clientX; swiped.current = false; props.pauseForInteraction(); };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => { if (pointerStart.current === null) return; const delta = event.clientX - pointerStart.current; pointerStart.current = null; if (Math.abs(delta) < 36) return; swiped.current = true; props.setActiveIndex(wrapDiaryIndex(props.activeIndex + (delta < 0 ? 1 : -1), props.images.length)); props.pauseForInteraction(); };
  return <div className="diary-mobile-carousel"><div className="diary-mobile-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { pointerStart.current = null; }} onClickCapture={event => { if (swiped.current) { event.preventDefault(); event.stopPropagation(); swiped.current = false; } }}>
    {positions.map(position => { const scale = position.offset === 0 ? 1 : 0.76; const left = position.offset < 0 ? '19%' : position.offset === 0 ? '50%' : '81%'; return <CarouselPosition key={position.offset} {...props} position={position} scale={scale} opacity={position.offset === 0 ? 1 : 0.8} left={left} />; })}
  </div><div className="diary-dots" role="group" aria-label="Choose a customer story">{props.images.map((_, index) => <button key={index} type="button" aria-label={'Show story ' + (index + 1)} aria-current={props.activeIndex === index ? 'true' : undefined} className={props.activeIndex === index ? 'selected' : ''} onClick={() => { props.setActiveIndex(index); props.pauseForInteraction(); }} />)}</div></div>;
}

export function IyalviDiaries() {
  const navigate = useNavigate(); const images = diaryImages; const count = images.length;
  const [liked, setLiked] = useState<Record<number, boolean>>({}); const [bookmarked, setBookmarked] = useState<Record<number, boolean>>({}); const [following, setFollowing] = useState<Record<number, boolean>>({});
  const [hearts, setHearts] = useState<FlyingHeart[]>([]); const heartId = useRef(0); const heartTimers = useRef(new Map<number, number>());
  const [menuIndex, setMenuIndex] = useState<number | null>(null); const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const reducedMotion = useReducedMotion();
  const carousel = useCarouselState(count, menuIndex !== null || Boolean(toast) || hearts.length > 0);
  const setActiveIndex = (index: number) => { setMenuIndex(null); carousel.setActiveIndex(wrapDiaryIndex(index, count)); };
  const showToast = (message: string) => { setToast(message); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), 2400); carousel.pauseForInteraction(); };
  const closeMenu = () => setMenuIndex(null);
  const openExternal = (url: string) => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };
  const onFollow = (index: number) => { const next = !following[index]; if (next && instagramProfileUrl) openExternal(instagramProfileUrl); setFollowing(current => ({ ...current, [index]: !current[index] })); carousel.pauseForInteraction(); };
  const appendHearts = (items: FlyingHeart[]) => { setHearts(current => { const next = limitLiveHearts(current, items); const keep = new Set(next.map(item => item.id)); for (const [id, timer] of heartTimers.current) if (!keep.has(id)) { window.clearTimeout(timer); heartTimers.current.delete(id); } return next; }); for (const heart of items) heartTimers.current.set(heart.id, window.setTimeout(() => setHearts(current => current.filter(item => item.id !== heart.id)), heart.duration + heart.delay + 100)); };
  const onLike = (index: number, element: HTMLElement) => { const turningOn = !liked[index]; setLiked(current => ({ ...current, [index]: !current[index] })); carousel.pauseForInteraction(); if (turningOn && !reducedMotion) { const rect = element.getBoundingClientRect(); const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; const burst = createFlyingHeartBurst(origin.x, origin.y, heartId.current); heartId.current += burst.length; appendHearts(burst); } };
  const onPhotoLike = (index: number, x: number, y: number) => { setActiveIndex(index); setLiked(current => ({ ...current, [index]: true })); carousel.pauseForInteraction(); if (!reducedMotion) { const id = heartId.current++; appendHearts([{ id, x, y, drift: 0, rise: 0, rotation: 0, size: 82, delay: 0, duration: 800, color: '#8b1838', big: true }]); } };
  const onComment = (diary: Diary) => openExternal(diary.instagramUrl || instagramProfileUrl);
  const onCopy = async (diary: Diary) => { try { await copyLink(diary.instagramUrl || window.location.href); showToast('Link copied'); } catch { showToast('Link copied'); } closeMenu(); };
  const onShare = async (diary: Diary) => { const url = diary.instagramUrl || window.location.href; if (typeof navigator.share === 'function') { try { await navigator.share({ title: diary.displayName, text: diary.caption, url }); } catch { /* A dismissed share sheet is not an error. */ } } else { try { await copyLink(window.location.href); } catch { /* Keep the local confirmation available when clipboard access is restricted. */ } showToast('Link copied'); } };
  useEffect(() => () => { window.clearTimeout(toastTimer.current); for (const timer of heartTimers.current.values()) window.clearTimeout(timer); }, []);
  const removeHeart = (id: number) => { window.clearTimeout(heartTimers.current.get(id)); heartTimers.current.delete(id); setHearts(current => current.filter(heart => heart.id !== id)); };
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => { if (event.key === 'Escape' && menuIndex !== null) { event.preventDefault(); closeMenu(); } else if (event.key === 'ArrowLeft') { event.preventDefault(); carousel.move(-1); } else if (event.key === 'ArrowRight') { event.preventDefault(); carousel.move(1); } };
  const props: CarouselProps = { images, activeIndex: carousel.activeIndex, setActiveIndex, navigate, liked, bookmarked, following, menuIndex, profileUrl: instagramProfileUrl, onLike, onPhotoLike, onBookmark: index => setBookmarked(current => ({ ...current, [index]: !current[index] })), onFollow, onComment, onShare, onToggleMenu: index => setMenuIndex(current => current === index ? null : index), onCopy, onCloseMenu: closeMenu };
  if (!count) return <section className="section diary-section" id="diaries"><div className="container"><SectionHeading eyebrow="From our community" title="Iyalvi Diaries" copy="Real looks. Real women. Shop them." /></div></section>;
  return <section className="section diary-section" id="diaries" aria-label="Iyalvi Diaries" onPointerEnter={() => carousel.setHovered(true)} onPointerLeave={() => { carousel.setHovered(false); carousel.pauseForInteraction(); }} onMouseEnter={() => carousel.setHovered(true)} onMouseLeave={() => { carousel.setHovered(false); carousel.pauseForInteraction(); }} onTouchStart={carousel.pauseForInteraction} onFocusCapture={() => carousel.setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { carousel.setFocused(false); carousel.pauseForInteraction(); } }} onKeyDown={handleKeyDown}>
    <div className="container"><SectionHeading eyebrow="From our community" title="Iyalvi Diaries" copy="Real looks. Real women. Shop them." />
      <div className="diary-carousel"><button type="button" className="diary-arrow diary-arrow-left" aria-label="Previous diary story" onClick={() => carousel.move(-1)}><ChevronLeft size={22} strokeWidth={1.5} /></button>
        <DesktopCarousel {...props} />
        <MobileCarousel {...props} pauseForInteraction={carousel.pauseForInteraction} />
        <button type="button" className="diary-arrow diary-arrow-right" aria-label="Next diary story" onClick={() => carousel.move(1)}><ChevronRight size={22} strokeWidth={1.5} /></button></div>
      {toast && <div className="diary-toast" role="status" aria-live="polite">{toast}</div>}
      {hearts.length > 0 && <HeartOverlay hearts={hearts} onEnd={removeHeart} />}
    </div></section>;
}
