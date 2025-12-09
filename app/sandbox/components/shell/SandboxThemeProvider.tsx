'use client';

import { useEffect } from 'react';
import { useColors } from '../../store/sandbox-store';

/**
 * SandboxThemeProvider applies the color scheme from the sandbox store
 * to the document, enabling live theme switching in the sandbox.
 */
export function SandboxThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useColors();

  useEffect(() => {
    // Apply theme to document for CSS variables to work
    document.documentElement.dataset.theme = colorScheme;
    document.documentElement.style.colorScheme = colorScheme;
  }, [colorScheme]);

  return <>{children}</>;
}
