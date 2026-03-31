'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useSupportsHoverTooltips } from '@/hooks/useSupportsHoverTooltips';
import styles from './HoverTooltip.module.css';

const HOVER_DELAY_MS = 300;

type HoverableChildProps = {
  ref?: React.Ref<HTMLElement>;
  onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLElement>) => void;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  onBlur?: (e: FocusEvent<HTMLElement>) => void;
};

export type HoverTooltipProps = {
  label: string;
  children: ReactNode;
  /**
   * When true, wraps the trigger in a full-width flex container (mobile-friendly primary actions).
   */
  block?: boolean;
};

export function HoverTooltip({ label, children, block = false }: HoverTooltipProps) {
  const supportsHover = useSupportsHoverTooltips();
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({
      top: r.top,
      left: r.left + r.width / 2,
    });
  }, []);

  const scheduleShow = useCallback(() => {
    if (!supportsHover) return;
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setVisible(true);
    }, HOVER_DELAY_MS);
  }, [supportsHover, clearTimer, updatePosition]);

  const hide = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    if (!visible) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [visible, updatePosition]);

  if (!supportsHover) {
    return <>{children}</>;
  }

  const only = Children.only(children);
  if (!isValidElement(only)) {
    return <>{children}</>;
  }

  const child = only as ReactElement<HoverableChildProps>;

  const mergedRef = (node: HTMLElement | null) => {
    triggerRef.current = node;
    const r = child.ref;
    if (typeof r === 'function') {
      r(node);
    } else if (r != null && typeof r === 'object' && 'current' in r) {
      (r as React.MutableRefObject<HTMLElement | null>).current = node;
    }
  };

  const trigger = cloneElement(child, {
    ref: mergedRef,
    onMouseEnter: (e: MouseEvent<HTMLElement>) => {
      child.props.onMouseEnter?.(e);
      scheduleShow();
    },
    onMouseLeave: (e: MouseEvent<HTMLElement>) => {
      child.props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      child.props.onFocus?.(e);
      scheduleShow();
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      child.props.onBlur?.(e);
      hide();
    },
  });

  const wrapped = block ? (
    <span className={styles.wrapBlock}>{trigger}</span>
  ) : (
    trigger
  );

  return (
    <>
      {wrapped}
      {visible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles.tooltip}
            style={{ top: coords.top, left: coords.left }}
            role="tooltip"
          >
            {label}
          </div>,
          document.body
        )}
    </>
  );
}
