# Workflows do GitHub Actions

O arquivo [ci.yml](ci.yml) executa em `push` e `pull_request` para `main` e `develop`, além de permitir execução manual.

| Job                                                    | Verificações                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `frontend` — Ubuntu 24.04                              | Formatação e linters em paralelo, TypeScript, Vitest e build Vite sem repetir o quality gate.        |
| `backend` — Ubuntu 24.04                               | Features padrão, rustfmt, Clippy, testes unitários/públicos/docs e sincronização dos bindings.       |
| `desktop` — Ubuntu 24.04, Windows 2022, macOS 15 ARM64 | Build Tauri nativo e geração opcional de instaladores; Windows também verifica o tratamento de path. |

Frontend e backend continuam rodando em pull requests draft para fornecer feedback rápido. O job desktop é ignorado enquanto o pull request estiver em draft e começa após ambos passarem quando ele for marcado como pronto para revisão. Marcar ou desmarcar o draft dispara uma nova avaliação do workflow. Checks frontend independentes usam grupos `parallel`; no backend, somente rustfmt acompanha Clippy, enquanto checks e testes que compilam permanecem sequenciais e reutilizam o mesmo target. Os checks completos de Rust não são repetidos na matriz: cada plataforma compila a aplicação nativa, enquanto somente o teste condicionado ao Windows roda adicionalmente naquele sistema. As versões vêm de `.node-version`, `package.json` e `rust-toolchain.toml`; npm e Cargo usam lockfiles. Há cache de dependências, limite de tempo, cancelamento de execuções obsoletas e permissão mínima de leitura do repositório. As Actions estão fixadas por commit e o Dependabot propõe atualizações.

Na execução manual, habilite `package` para compilar instaladores de teste: DEB no Linux, NSIS EXE no Windows e DMG no macOS. Os artifacts ficam disponíveis por 14 dias. Sem essa opção, o CI compila em debug sem empacotar.

Não há publicação automática de releases nem assinatura/notarização de produção. A execução remota requer enviar os arquivos ao GitHub; configurar checks obrigatórios na proteção de branches é uma configuração do repositório no GitHub.

Os comandos locais equivalentes e os pré-requisitos estão no [guia de desenvolvimento](../../docs/DEVELOPMENT.md). A automação segue os [requisitos documentados](../../docs/README.md) e as [decisões de implementação](../../docs/ARCHITECTURE/IMPLEMENTATION_READINESS.md).

As marcações `[x]` no documento de readiness representam decisões arquiteturais fechadas, não código ou automação já implementados.
