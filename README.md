# Tabletop Tool

Aplicação desktop local para preparar e conduzir sessões de RPG, com Tauri 2, React, TypeScript e Vite. A tela inicial organiza Campaigns; dentro de cada Campaign, a interface separa o modo de preparação da mesa em andamento, permite preparar Sessions, criar Scenes e SceneLevels e reutilizar Scenes entre Sessions.

A arquitetura documentada define requisitos obrigatórios para a implementação. O Core Domain e o Audio Mixer estão integrados ao backend Tauri e à interface React, com persistência SQLite, raiz geral de assets configurável, referências relativas, IPC tipado e runtime Web Audio. [Implementation Readiness](docs/ARCHITECTURE/IMPLEMENTATION_READINESS.md) reúne as decisões fechadas; o progresso fica em `.agents/`.

Para orientar as próximas tarefas, leia:

- [Documentação do projeto](docs/README.md).
- [Instalação, comandos e configuração de desenvolvimento](docs/DEVELOPMENT.md).
- [Decisões e ordem inicial de implementação](docs/ARCHITECTURE/IMPLEMENTATION_READINESS.md).

As instruções locais para agentes ficam em `AGENTS.md` e `.agents/`, quando presentes no checkout.

## Executar localmente

Pré-requisitos: Node.js 24.21.x, npm 11.19.x, Rust 1.95.0 e as dependências de sistema do Tauri. As versões estão registradas em `.node-version`, `package.json` e `rust-toolchain.toml`; consulte o [guia de desenvolvimento](docs/DEVELOPMENT.md).

Na raiz do repositório:

```bash
npm ci
npm run check
npm run tauri dev
```

O último comando inicia o frontend Vite e a aplicação desktop Tauri.

## Comandos disponíveis

Os scripts atuais estão definidos em [package.json](package.json):

| Comando                     | Função                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| `npm run dev`               | Iniciar somente o frontend Vite.                                    |
| `npm run check`             | Verificar frontend, Rust, testes e sincronização dos contratos IPC. |
| `npm run format`            | Aplicar Prettier e rustfmt.                                         |
| `npm test`                  | Executar os testes do frontend.                                     |
| `npm run test:rs`           | Executar os testes do workspace Rust.                               |
| `npm run bindings:generate` | Gerar TypeScript a partir dos contratos Rust.                       |
| `npm run build`             | Verificar TypeScript e gerar o build do frontend.                   |
| `npm run preview`           | Servir localmente o build do frontend.                              |
| `npm run tauri dev`         | Executar a aplicação desktop em desenvolvimento.                    |
| `npm run tauri build`       | Compilar e empacotar a aplicação desktop.                           |

`tauri` encaminha os argumentos à CLI do Tauri. ESLint, Stylelint, Prettier, Vitest/Testing Library, SCSS Modules, rustfmt e Clippy estão configurados. SeaORM/SQLite persiste o Core no diretório local da aplicação; Specta/tauri-specta gera o contrato consumido pela interface. Veja a [lista completa de comandos](docs/DEVELOPMENT.md#commands).

## Automação

O [CI](.github/workflows/ci.yml) verifica qualidade, testes, contratos gerados e compilação desktop em Windows, Linux e macOS. A execução manual pode gerar instaladores de teste como artifacts, sem publicar releases. Consulte os [detalhes dos workflows](.github/workflows/README.md).
