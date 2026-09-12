import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { sendToBackground, type PanelPreferences } from '../lib/messages';
import { clampPanelRect, type PanelPlacement, type PanelRect } from '../lib/panel-placement';

const visibleViewport = () => ({ width: window.visualViewport?.width ?? innerWidth, height: window.visualViewport?.height ?? innerHeight });
const rectStyle = (rect: PanelRect): CSSProperties => ({ left: rect.x, top: rect.y, width: rect.width, height: rect.height, right: 'auto', bottom: 'auto' });
type Gesture = { action: 'move' | 'resize'; pointerId: number; target: HTMLButtonElement; x: number; y: number; start: PanelRect; latest: PanelRect; originalStyle: string };

/** Save only completed gestures; moving the shell never changes the map. */
export function usePanelPlacement(kind: 'drive' | 'docs', preferences: PanelPreferences) {
  const panel = useRef<HTMLElement>(null);
  const [placement, setPlacement] = useState<PanelPlacement>({ mode: 'docked' });
  const [viewport, setViewport] = useState(visibleViewport);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const changed = useRef(false), mounted = useRef(true);
  const queue = useRef(Promise.resolve());
  const gesture = useRef<Gesture | null>(null);
  const floating = placement.mode === 'floating';
  const rect = floating ? clampPanelRect(placement.rect, viewport) : undefined;
  const currentRect = useRef(rect);
  currentRect.current = rect;

  function paint(value: PanelRect) {
    if (panel.current) Object.assign(panel.current.style, {
      left: `${value.x}px`, top: `${value.y}px`, width: `${value.width}px`, height: `${value.height}px`, right: 'auto', bottom: 'auto',
    });
  }
  function save(next: PanelPlacement) {
    changed.current = true;
    setPlacement(next); setError('');
    queue.current = queue.current.then(async () => {
      try {
        const result = await sendToBackground({ type: 'PANEL_PLACEMENT', kind, placement: next });
        if (!result.ok) throw new Error(result.error);
        if (mounted.current) setError('');
      } catch { if (mounted.current) setError('Panel position could not be saved. Move it again to retry.'); }
    });
  }
  function cancelGesture() {
    const active = gesture.current;
    if (!active) return false;
    gesture.current = null;
    if (active.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId);
    if (panel.current) panel.current.style.cssText = active.originalStyle;
    return true;
  }
  useEffect(() => {
    mounted.current = true;
    void sendToBackground<PanelPlacement>({ type: 'PANEL_PLACEMENT', kind }).then((result) => {
      if (mounted.current && !changed.current && result.ok) setPlacement(result.data);
    }).catch(() => undefined);
    function resize() { cancelGesture(); setViewport(visibleViewport()); }
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    return () => {
      mounted.current = false; cancelGesture();
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
    };
  }, [kind]);

  function toggle() {
    cancelGesture();
    if (floating) { save({ mode: 'docked', rect: placement.rect }); return; }
    const view = visibleViewport();
    const width = preferences.width, height = Math.min(640, view.height - 128);
    save({ mode: 'floating', rect: clampPanelRect(placement.rect ?? {
      x: preferences.dock === 'left' ? 32 : view.width - width - 32,
      y: 32, width, height,
    }, view) });
  }
  function dock() { cancelGesture(); save({ mode: 'docked', rect: placement.rect }); }
  function reset() { cancelGesture(); save({ mode: 'docked' }); setAnnouncement('Panel position reset.'); }

  function adjust(start: PanelRect, action: Gesture['action'], dx: number, dy: number) {
    const view = visibleViewport();
    if (action === 'move') return clampPanelRect({ ...start, x: start.x + dx, y: start.y + dy }, view);
    // Keep the top-left corner anchored while resizing from the bottom-right.
    return clampPanelRect({ ...start,
      width: Math.min(start.width + dx, view.width - start.x - 16),
      height: Math.min(start.height + dy, view.height - start.y - 80),
    }, view);
  }
  function describe(value: PanelRect) {
    setAnnouncement(`Panel at ${Math.round(value.x)}, ${Math.round(value.y)}; ${Math.round(value.width)} by ${Math.round(value.height)} pixels.`);
  }
  function measurePanel() {
    const box = panel.current!.getBoundingClientRect();
    return { x: box.x - (window.visualViewport?.offsetLeft ?? 0), y: box.y - (window.visualViewport?.offsetTop ?? 0), width: box.width, height: box.height };
  }
  function handleKey(event: KeyboardEvent<HTMLButtonElement>, action: Gesture['action']) {
    if ( !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const step = event.shiftKey ? 40 : 10;
    const next = adjust(rect ?? measurePanel(), action, event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0, event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0);
    save({ mode: 'floating', rect: next }); describe(next);
  }
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, action: Gesture['action']) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = rect ?? measurePanel();
    gesture.current = { action, pointerId: event.pointerId, target: event.currentTarget, x: event.clientX, y: event.clientY, start, latest: start, originalStyle: panel.current?.style.cssText ?? '' };
  }
  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    active.latest = adjust(active.start, active.action, event.clientX - active.x, event.clientY - active.y);
    // Avoid rendering the entire graph on each pointer event.
    paint(active.latest);
  }
  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (active.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId);
    save({ mode: 'floating', rect: active.latest }); describe(active.latest);
  }
  function controls(action: Gesture['action']) {
    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => handlePointerDown(event, action),
      onPointerMove: handlePointerMove, onPointerUp: handlePointerUp,
      onPointerCancel: () => { cancelGesture(); }, onLostPointerCapture: () => { cancelGesture(); },
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => handleKey(event, action),
    };
  }
  return { panel, floating, rect, error, announcement, toggle, dock, reset, cancelGesture, controls,
    style: rect ? rectStyle(rect) : { width: `min(${preferences.width}px, calc(100% - 32px))`, left: preferences.dock === 'left' ? 16 : 'auto', right: preferences.dock === 'right' ? 16 : 'auto' },
    layoutKey: rect ? `floating:${rect.width}:${rect.height}` : `docked:${preferences.width}:${preferences.dock}`,
  };
}
