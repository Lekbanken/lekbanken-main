# Husky Git Hooks

Detta projekt använder [Husky](https://typicode.github.io/husky/) för att köra git hooks.

## Installerade Hooks

### Pre-commit
Körs innan varje commit och kontrollerar:
- ✅ TypeScript type check (`npm run type-check`)
- ⚠️ Varnar för `as any` casts i staged filer

## Setup

Husky installeras automatiskt när du kör `npm install`.

Om du behöver installera manuellt:
```bash
npm install --save-dev husky
npx husky install
```

## Hoppa Över Hooks (Använd Sparsamt!)

Om du verkligen behöver skippa pre-commit hook:
```bash
git commit --no-verify -m "message"
```

**OBS:** Detta rekommenderas INTE då det kan introducera type errors i codebasen.
