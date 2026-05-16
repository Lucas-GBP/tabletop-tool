# Tauri + Solid + Typescript

This template should help get you started developing with Tauri, Solid and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Project generation

Este projeto foi gerado usando o template oficial do Tauri com os seguintes passos:

### 1. Scaffold do projeto

```bash
npm create tauri-app@latest .
```

Durante a execução interativa, foram selecionadas as seguintes opções:

- **Package name**: `tabletop-tool`
- **Identifier**: `com.lucas.tabletop-tool`
- **Language**: TypeScript / JavaScript
- **Package manager**: npm
- **UI template**: Solid
- **UI flavor**: TypeScript

### 2. Instalação das dependências do frontend

```bash
npm install
```

Este comando instalou 78 pacotes (Vite, SolidJS, TypeScript e suas dependências).

### 3. Pré-requisitos do sistema

Antes de executar o projeto, é necessário ter o **Rust** instalado:

- **Windows**: Baixe e instale de [https://www.rust-lang.org/learn/get-started](https://www.rust-lang.org/learn/get-started)
- Após a instalação, reinicie o terminal ou adicione o Cargo ao PATH:
  ```powershell
  $env:Path += ";$env:USERPROFILE\.cargo\bin"
  ```

### 4. Executando o projeto

```bash
npm run tauri dev
```

Este comando:

- Inicia o **Vite dev server** em `http://localhost:1420/`
- Compila o backend Rust (primeira execução pode levar alguns minutos)
- Abre a aplicação desktop com hot reload ativado

## Scripts disponíveis

### Desenvolvimento

```bash
npm run dev           # Vite dev server
npm run tauri dev     # Tauri + Vite (full app)
```

### Lint & Format

```bash
npm run lint          # ESLint (frontend)
npm run lint:fix      # ESLint com auto-fix
npm run lint:rs       # Clippy (backend)

npm run format        # Prettier + rustfmt (ambos)
npm run check:format     # Verifica formatação (ambos)
npm run check:format:ts  # Verifica formatação do frontend
npm run check:format:rs  # Verifica formatação do backend

npm run check         # Verifica lint + formatação (ambos)
npm run check:ts      # Verifica frontend
npm run check:rs      # Verifica backend
```

### Build

```bash
npm run build         # Build frontend
npm run tauri build   # Build aplicação completa
```

## CI/CD

O projeto está configurado com GitHub Actions para CI/CD automático:

### Workflow CI (`.github/workflows/ci.yml`)

Executa em **push** e **pull requests** para `main` e `develop`:

1. **Lint Frontend** - ESLint
2. **Format Check** - Prettier + rustfmt
3. **Lint Rust** - Clippy
4. **Build** - Compila para Windows, Linux e macOS

### Workflow Release (`.github/workflows/release.yml`)

Executa quando uma **tag** é criada (ex: `v1.0.0`):

1. Cria release no GitHub
2. Compila para múltiplas plataformas:
   - Windows (x64)
   - Linux (x64)
   - macOS (Intel e Apple Silicon)
3. Faz upload dos instaladores para a release

**Para criar uma release:**

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Stack tecnológica

- **Frontend**: SolidJS + TypeScript + Vite
- **Backend**: Rust + Tauri v2
- **Build**: Vite 6.4+ com HMR (Hot Module Replacement)
