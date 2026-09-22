# Workflows do GitHub Actions

O arquivo [ci.yml](ci.yml) executa em `push` e `pull_request` para `main` e `develop`, além de permitir execução manual.

| Job                                                    | Verificações                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `frontend` — Ubuntu 24.04                              | Instalação via `npm ci`, TypeScript, ESLint, Stylelint, Prettier, Vitest e build Vite.              |
| `desktop` — Ubuntu 24.04, Windows 2022, macOS 15 ARM64 | rustfmt, Clippy sem warnings, testes do workspace Rust, sincronização dos bindings e build desktop. |

O job desktop só começa após o frontend passar. As versões vêm de `.node-version`, `package.json` e `rust-toolchain.toml`; npm e Cargo usam lockfiles. Há cache de dependências, limite de tempo, cancelamento de execuções obsoletas e permissão mínima de leitura do repositório. As Actions estão fixadas por commit e o Dependabot propõe atualizações.

Na execução manual, habilite `package` para compilar instaladores de teste: DEB no Linux, NSIS EXE no Windows e DMG no macOS. Os artifacts ficam disponíveis por 14 dias. Sem essa opção, o CI compila em debug sem empacotar.

Não há publicação automática de releases nem assinatura/notarização de produção. A execução remota requer enviar os arquivos ao GitHub; configurar checks obrigatórios na proteção de branches é uma configuração do repositório no GitHub.

Os comandos locais equivalentes e os pré-requisitos estão no [guia de desenvolvimento](../../docs/DEVELOPMENT.md). A automação segue os [requisitos documentados](../../docs/README.md) e as [decisões de implementação](../../docs/ARCHITECTURE/IMPLEMENTATION_READINESS.md).

As marcações `[x]` no documento de readiness representam decisões arquiteturais fechadas, não código ou automação já implementados.
