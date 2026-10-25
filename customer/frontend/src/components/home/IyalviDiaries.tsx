import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { SectionHeading } from '../ui/SectionHeading';
import { DIARY_MOBILE_OFFSETS, DIARY_OFFSETS, diaries, getVisibleDiaryPositions, wrapDiaryIndex, type Diary } from '../../data/diaries';
import '../../styles/diaryCarousel.css';

type DiaryImage = { url: string };
const diaryImages = Object.entries(import.meta.glob('../../assets/diaries/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, url]) => ({ url }));

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReduced(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  return reduced;
}

function useCarouselState(count: number) {
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
  useEffect(() => { if (count < 2 || hovered || focused || temporarilyPaused || hidden || reducedMotion) return; const timer = window.setTimeout(() => setActiveIndex(index => wrapDiaryIndex(index + 1, count)), 4000); return () => window.clearTimeout(timer); }, [activeIndex, count, focused, hidden, hovered, reducedMotion, temporarilyPaused]);
  return { activeIndex, setActiveIndex, move, hovered, setHovered, focused, setFocused, pauseForInteraction, reducedMotion };
}

function DiaryFrame({ image, diary, offset, onSelect, onKeyDown }: { image: DiaryImage; diary: Diary; offset: number; onSelect: () => void; onKeyDown: (event: KeyboardEvent<HTMLElement>) => void }) {
  const monogram = diary.displayName.split(/\s+/).map(part => part[0]).join('').slice(0, 2);
  return <article className="diary-card-position" data-offset={offset} tabIndex={0} aria-label={diary.displayName + ': ' + diary.caption} onClick={onSelect} onKeyDown={onKeyDown}>
    <div className="diary-card-frame">
      <img className="diary-card-photo" src={image.url} alt={diary.displayName + ' wearing Iyalvi'} style={{ objectPosition: diary.focus || '50% 0%' }} />
      <div className="diary-name-chip"><span className="diary-monogram">{monogram}</span><span>{diary.displayName}</span></div>
      <svg className="diary-kolam" viewBox="0 0 36 36" aria-hidden="true"><path d="M18 3c-2 5-5 7-10 7 5 2 7 5 7 10-5-2-8-5-10-10m13 23c2-5 5-7 10-7-5-2-7-5-7-10 5 2 8 5 10 10M18 3v7m0 13v10M3 18h7m13 0h10" /><circle cx="18" cy="18" r="2.4" /></svg>
      <Link className="diary-shop-link" to={diary.shopTo} onClick={event => event.stopPropagation()}><ShoppingBag size={13} strokeWidth={1.7} />Shop the look</Link>
    </div>
  </article>;
}

function Position({ image, diary, offset, scale, opacity, activeIndex, setActiveIndex, navigate, left }: { image: DiaryImage; diary: Diary; offset: number; scale: number; opacity: number; activeIndex: number; setActiveIndex: (index: number) => void; navigate: (to: string) => void; left: string }) {
  const handleKey = (event: KeyboardEvent<HTMLElement>) => { if (event.key !== 'Enter' || (event.target as HTMLElement).closest('a')) return; event.preventDefault(); const selected = wrapDiaryIndex(activeIndex + offset, diaryImages.length); if (offset === 0) navigate(diary.shopTo); else setActiveIndex(selected); };
  return <div className="diary-position-wrap" data-offset={offset} style={{ left, opacity, zIndex: 10 - Math.abs(offset), transform: 'translate(-50%, -50%) scale(' + scale + ')' }}>
    <DiaryFrame image={image} diary={diary} offset={offset} onKeyDown={handleKey} onSelect={() => { if (offset !== 0) setActiveIndex(wrapDiaryIndex(activeIndex + offset, diaryImages.length)); }} />
    {offset === 0 && <p className="diary-caption">{diary.caption}</p>}
  </div>;
}

function DesktopCarousel({ images, activeIndex, setActiveIndex, navigate }: { images: DiaryImage[]; activeIndex: number; setActiveIndex: (index: number) => void; navigate: (to: string) => void }) {
  const positions = getVisibleDiaryPositions(activeIndex, images.length, DIARY_OFFSETS);
  const scales = [0.62, 0.8, 1, 0.8, 0.62]; const opacities = [0.76, 0.87, 1, 0.87, 0.76];
  const left: Record<number, string> = { [-2]: '14%', [-1]: '32%', 0: '50%', 1: '68%', 2: '86%' };
  return <div className="diary-desktop-stage" aria-label="Customer style carousel">{positions.map((position, i) => <Position key={position.offset} image={images[position.index]} diary={diaries[position.index % diaries.length]} offset={position.offset} scale={scales[i]} opacity={opacities[i]} activeIndex={activeIndex} setActiveIndex={setActiveIndex} navigate={navigate} left={left[position.offset]} />)}</div>;
}

function MobileCarousel({ images, activeIndex, setActiveIndex, navigate, pauseForInteraction }: { images: DiaryImage[]; activeIndex: number; setActiveIndex: (index: number) => void; navigate: (to: string) => void; pauseForInteraction: () => void }) {
  const pointerStart = useRef<number | null>(null); const swiped = useRef(false);
  const positions = getVisibleDiaryPositions(activeIndex, images.length, DIARY_MOBILE_OFFSETS);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => { pointerStart.current = event.clientX; swiped.current = false; pauseForInteraction(); };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => { if (pointerStart.current === null) return; const delta = event.clientX - pointerStart.current; pointerStart.current = null; if (Math.abs(delta) < 36) return; swiped.current = true; setActiveIndex(wrapDiaryIndex(activeIndex + (delta < 0 ? 1 : -1), images.length)); pauseForInteraction(); };
  return <div className="diary-mobile-carousel"><div className="diary-mobile-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { pointerStart.current = null; }} onClickCapture={event => { if (swiped.current) { event.preventDefault(); event.stopPropagation(); swiped.current = false; } }}>
    {positions.map(position => { const scale = position.offset === 0 ? 1 : 0.76; const left = position.offset < 0 ? '19%' : position.offset === 0 ? '50%' : '81%'; return <Position key={position.offset} image={images[position.index]} diary={diaries[position.index % diaries.length]} offset={position.offset} scale={scale} opacity={position.offset === 0 ? 1 : 0.8} activeIndex={activeIndex} setActiveIndex={setActiveIndex} navigate={navigate} left={left} />; })}
  </div><div className="diary-dots" role="group" aria-label="Choose a customer story">{images.map((_, index) => <button key={index} type="button" aria-label={'Show story ' + (index + 1)} aria-current={activeIndex === index ? 'true' : undefined} className={activeIndex === index ? 'selected' : ''} onClick={() => { setActiveIndex(index); pauseForInteraction(); }} />)}</div></div>;
}

export function IyalviDiaries() {
  const navigate = useNavigate(); const images = diaryImages; const count = images.length; const carousel = useCarouselState(count);
  const setActiveIndex = (index: number) => carousel.setActiveIndex(wrapDiaryIndex(index, count));
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => { if (event.key === 'ArrowLeft') { event.preventDefault(); carousel.move(-1); } else if (event.key === 'ArrowRight') { event.preventDefault(); carousel.move(1); } };
  if (!count) return <section className="section diary-section" id="diaries"><div className="container"><SectionHeading eyebrow="From our community" title="Iyalvi Diaries" copy="Real looks. Real women. Shop them." /></div></section>;
  return <section className="section diary-section" id="diaries" aria-label="Iyalvi Diaries" onMouseEnter={() => carousel.setHovered(true)} onMouseLeave={() => { carousel.setHovered(false); carousel.pauseForInteraction(); }} onTouchStart={carousel.pauseForInteraction} onFocusCapture={() => carousel.setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { carousel.setFocused(false); carousel.pauseForInteraction(); } }} onKeyDown={handleKeyDown}>
    <div className="container"><SectionHeading eyebrow="From our community" title="Iyalvi Diaries" copy="Real looks. Real women. Shop them." />
      <div className="diary-carousel"><button type="button" className="diary-arrow diary-arrow-left" aria-label="Previous diary story" onClick={() => carousel.move(-1)}><ChevronLeft size={22} strokeWidth={1.5} /></button>
        <DesktopCarousel images={images} activeIndex={carousel.activeIndex} setActiveIndex={setActiveIndex} navigate={navigate} />
        <MobileCarousel images={images} activeIndex={carousel.activeIndex} setActiveIndex={setActiveIndex} navigate={navigate} pauseForInteraction={carousel.pauseForInteraction} />
        <button type="button" className="diary-arrow diary-arrow-right" aria-label="Next diary story" onClick={() => carousel.move(1)}><ChevronRight size={22} strokeWidth={1.5} /></button></div>
    </div></section>;
}
