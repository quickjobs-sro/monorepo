# 🚀 QuickJobs Monorepo

QuickJobs monorepo obsahuje: 

### Apps

- `web-app`: NextJS aplikace pro zaměstnavatele

### Packages

- `ui`: Sdílená React komponenty knihovna (Shadcn/UI + Tailwind)
- `eslint-config`: Sdílená ESLint konfigurace
- `typescript-config`: Sdílené TypeScript konfigurace
- `api-wrapper`: API wrapper pro komunikaci s backendem
- `tanstack-query`: Sdílená Tanstack Query konfigurace
- `zod`: Sdílená Zod konfigurace

## 🛠️ Technologie

- [Next.js](https://nextjs.org/)
- [Shadcn/UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Turborepo](https://turborepo.org/)
- [PNPM](https://pnpm.io/)

## 📝 Instalace

1. Naklonování repozitáře:

```bash
git clone git@bitbucket.org:quickjobs/monorepo.git
```

2. Instalace závislostí:

```bash
pnpm install
```

3. Spuštění vývojového serveru:

```bash
pnpm dev
```

## 📦 Struktura repozitáře

```bash
monorepo
├── apps
│ └── web-app
│
├── packages
│ └── ui
│ └── eslint-config
│ └── typescript-config
```

## 📝 Použití

### Spuštění vývojového serveru

```bash
pnpm dev
```

### Spuštění vývojového serveru pro všechny aplikace

```bash
pnpm dev:all
```

### Spuštění vývojového serveru pro konkrétní aplikaci

```bash
pnpm dev:web-app
```
