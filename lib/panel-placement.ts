import { z } from 'zod';

const coordinate = z.number().finite().min(-100_000).max(100_000);
export const panelRectSchema = z.object({
  x: coordinate, y: coordinate,
  width: z.number().finite().positive().max(100_000),
  height: z.number().finite().positive().max(100_000),
}).strict();
export const panelPlacementSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('docked'), rect: panelRectSchema.optional() }).strict(),
  z.object({ mode: z.literal('floating'), rect: panelRectSchema }).strict(),
]);
export type PanelRect = z.infer<typeof panelRectSchema>;
export type PanelPlacement = z.infer<typeof panelPlacementSchema>;
export type PanelViewport = { width: number; height: number };

/** Coordinates belong to the visual viewport, never to graph nodes or a page. */
export function clampPanelRect(rect: PanelRect, viewport: PanelViewport): PanelRect {
  const width = Math.min(Math.max(320, rect.width), Math.max(1, viewport.width - 32));
  const height = Math.min(Math.max(360, rect.height), Math.max(1, viewport.height - 96));
  return {
    width, height,
    x: Math.max(16, Math.min(rect.x, viewport.width - width - 16)),
    y: Math.max(16, Math.min(rect.y, viewport.height - height - 80)),
  };
}
