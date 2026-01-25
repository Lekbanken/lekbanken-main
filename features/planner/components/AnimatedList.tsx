'use client';

/**
 * AnimatedList Component
 * 
 * Wraps a list of children with staggered entrance animations.
 * Uses CSS animations for performance.
 */

import { Children, type ReactNode } from 'react';
import styles from '../styles/animations.module.css';
import { cn } from '@/lib/utils';

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  /**
   * Whether to animate on mount
   * @default true
   */
  animateOnMount?: boolean;
  /**
   * Animation type
   * @default 'slideUp'
   */
  animation?: 'slideUp' | 'fadeIn' | 'scaleIn';
  /**
   * HTML element to render as wrapper
   * @default 'ul'
   */
  as?: 'ul' | 'ol' | 'div';
}

export function AnimatedList({
  children,
  className,
  itemClassName,
  animateOnMount = true,
  animation: _animation = 'slideUp',
  as: Component = 'ul',
}: AnimatedListProps) {
  const childArray = Children.toArray(children);

  return (
    <Component className={className}>
      {childArray.map((child, index) => (
        <div
          key={index}
          className={cn(
            animateOnMount && styles.listItem,
            itemClassName
          )}
          style={{
            animationDelay: animateOnMount ? `${index * 50}ms` : undefined,
          }}
        >
          {child}
        </div>
      ))}
    </Component>
  );
}

/**
 * AnimatedItem Component
 * 
 * Individual item with animation for use outside AnimatedList.
 */
interface AnimatedItemProps {
  children: ReactNode;
  className?: string;
  animation?: 'fadeIn' | 'slideUp' | 'slideInRight' | 'slideInLeft' | 'scaleIn' | 'cardEnter';
  delay?: number;
}

export function AnimatedItem({
  children,
  className,
  animation = 'fadeIn',
  delay = 0,
}: AnimatedItemProps) {
  const animationClass = {
    fadeIn: styles.fadeIn,
    slideUp: styles.slideUp,
    slideInRight: styles.slideInRight,
    slideInLeft: styles.slideInLeft,
    scaleIn: styles.scaleIn,
    cardEnter: styles.cardEnter,
  }[animation];

  return (
    <div
      className={cn(animationClass, className)}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}

/**
 * AnimatedCard Component
 * 
 * Card with hover lift animation.
 */
interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  enterAnimation?: boolean;
}

export function AnimatedCard({
  children,
  className,
  onClick,
  enterAnimation = true,
}: AnimatedCardProps) {
  return (
    <div
      className={cn(
        styles.cardHover,
        enterAnimation && styles.cardEnter,
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * AnimatedButton Component
 * 
 * Button with press animation.
 */
interface AnimatedButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function AnimatedButton({
  children,
  className,
  onClick,
  type = 'button',
  disabled = false,
}: AnimatedButtonProps) {
  return (
    <button
      type={type}
      className={cn(styles.buttonPress, className)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
