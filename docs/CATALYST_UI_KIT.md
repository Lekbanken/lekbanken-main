# Catalyst UI Kit (Tailwind Plus)

- Plats: `catalyst-ui-kit/` (innehaller `typescript/`, `javascript/`, `demo/` och original README/CHANGELOG).
- Format: Tailwind v4-komponenter med Headless UI och Motion. Anvands som referens; ingen kod ar importerad i appen an.
- Nuvarande stack i sandboxen: Radix/shadcn-lika primitives (Dialog, DropdownMenu, Sheet) ersatter tidigare Headless UI-anvandning.
- Tips vid anvandning: kopiera komponenter fran `typescript/` och konvertera Headless UI-delarna till Radix/shadcn innan de dras in i appen, sa slipper vi lagga tillbaka @headlessui/react.
- License/terms: se kitets README/CHANGELOG i samma katalog for Tailwind Plus villkor.
