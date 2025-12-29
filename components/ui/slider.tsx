'use client';

import { forwardRef, useState, useCallback, useRef, useEffect, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SliderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Current value */
  value?: number[];
  /** Default value */
  defaultValue?: number[];
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Callback when value changes */
  onValueChange?: (value: number[]) => void;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value: controlledValue,
      defaultValue = [50],
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      onValueChange,
      orientation = 'horizontal',
      className,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const trackRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const percentage = ((value[0] - min) / (max - min)) * 100;

    const updateValue = useCallback(
      (clientX: number, clientY: number) => {
        if (!trackRef.current || disabled) return;

        const rect = trackRef.current.getBoundingClientRect();
        let newPercentage: number;

        if (orientation === 'horizontal') {
          newPercentage = ((clientX - rect.left) / rect.width) * 100;
        } else {
          newPercentage = ((rect.bottom - clientY) / rect.height) * 100;
        }

        // Clamp percentage
        newPercentage = Math.min(Math.max(newPercentage, 0), 100);

        // Convert to value
        let newValue = min + (newPercentage / 100) * (max - min);

        // Apply step
        newValue = Math.round(newValue / step) * step;

        // Clamp to min/max
        newValue = Math.min(Math.max(newValue, min), max);

        const newValueArray = [newValue];

        if (!isControlled) {
          setUncontrolledValue(newValueArray);
        }
        onValueChange?.(newValueArray);
      },
      [disabled, isControlled, max, min, onValueChange, orientation, step]
    );

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (disabled) return;
        isDragging.current = true;
        updateValue(e.clientX, e.clientY);
      },
      [disabled, updateValue]
    );

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging.current) {
          updateValue(e.clientX, e.clientY);
        }
      };

      const handleMouseUp = () => {
        isDragging.current = false;
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [updateValue]);

    return (
      <div
        ref={ref}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value[0]}
        aria-disabled={disabled}
        className={cn(
          'relative flex touch-none select-none items-center',
          orientation === 'vertical' && 'h-full flex-col',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        <div
          ref={trackRef}
          className={cn(
            'relative bg-muted rounded-full cursor-pointer',
            orientation === 'horizontal' ? 'h-1.5 w-full' : 'w-1.5 h-full'
          )}
          onMouseDown={handleMouseDown}
        >
          {/* Filled track */}
          <div
            className={cn(
              'absolute bg-primary rounded-full',
              orientation === 'horizontal'
                ? 'h-full left-0'
                : 'w-full bottom-0'
            )}
            style={
              orientation === 'horizontal'
                ? { width: `${percentage}%` }
                : { height: `${percentage}%` }
            }
          />
          {/* Thumb */}
          <div
            className={cn(
              'absolute h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm',
              'ring-offset-background transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              !disabled && 'cursor-grab active:cursor-grabbing'
            )}
            style={
              orientation === 'horizontal'
                ? { left: `${percentage}%`, top: '50%', transform: 'translate(-50%, -50%)' }
                : { bottom: `${percentage}%`, left: '50%', transform: 'translate(-50%, 50%)' }
            }
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';
