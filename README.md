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

## Stack tecnológica

- **Frontend**: SolidJS + TypeScript + Vite
- **Backend**: Rust + Tauri v2
- **Build**: Vite 6.4+ com HMR (Hot Module Replacement)