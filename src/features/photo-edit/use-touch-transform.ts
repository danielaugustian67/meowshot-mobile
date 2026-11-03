import { useLayoutEffect, useRef, useState } from 'react';
import { PanResponder, type GestureResponderEvent } from 'react-native';

/** What changed since the last move: one finger drags, two also pinch and twist. */
export type TouchDelta = { dx: number; dy: number; scale: number; rotation: number };

type Handlers = {
  /** Where the first finger came down, relative to the view. */
  onStart?: (x: number, y: number) => void;
  onChange: (delta: TouchDelta) => void;
  /** `moved` is false for a tap. */
  onEnd?: (moved: boolean) => void;
};

const TAP_SLOP = 4;

function read(event: GestureResponderEvent) {
  const { touches, pageX, pageY } = event.nativeEvent;
  const [a, b] = touches;
  if (!a) return { count: 1, x: pageX, y: pageY, distance: 0, angle: 0 };
  if (!b) return { count: 1, x: a.pageX, y: a.pageY, distance: 0, angle: 0 };
  return {
    count: 2,
    x: (a.pageX + b.pageX) / 2,
    y: (a.pageY + b.pageY) / 2,
    distance: Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY),
    angle: (Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX) * 180) / Math.PI,
  };
}

/** Drag, pinch and twist with no native gesture library, so it needs no new build of the app's native code. */
export function useTouchTransform(handlers: Handlers) {
  // The responder lives as long as the view, but always calls the handlers from the latest render.
  const latest = useRef(handlers);
  useLayoutEffect(() => {
    latest.current = handlers;
  });

  // eslint-disable-next-line react-hooks/refs -- the ref is only read inside the responder's event callbacks.
  const [responder] = useState(() => {
    let last: ReturnType<typeof read> | null = null;
    let travelled = 0;
    let pinched = false;
    const finish = () => {
      latest.current.onEnd?.(pinched || travelled > TAP_SLOP);
      last = null;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        last = read(event);
        travelled = 0;
        pinched = false;
        latest.current.onStart?.(event.nativeEvent.locationX, event.nativeEvent.locationY);
      },
      onPanResponderMove: (event) => {
        const now = read(event);
        // A finger landing or lifting jumps the centre, so that move only sets a new starting point.
        if (last && last.count === now.count) {
          const dx = now.x - last.x;
          const dy = now.y - last.y;
          const twist = now.angle - last.angle;
          travelled += Math.hypot(dx, dy);
          if (now.count > 1) pinched = true;
          latest.current.onChange({
            dx,
            dy,
            scale: now.count > 1 && last.distance > 0 ? now.distance / last.distance : 1,
            // atan2 jumps by a full turn when the fingers cross its seam.
            rotation: now.count > 1 ? ((((twist + 180) % 360) + 360) % 360) - 180 : 0,
          });
        }
        last = now;
      },
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    });
  });
  return responder.panHandlers;
}
