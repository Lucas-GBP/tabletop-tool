# GitHub Actions CI/CD

Este diretório contém os workflows do GitHub Actions para o projeto.

## Workflows

### `ci.yml` - Continuous Integration

**Trigger:** Push e Pull Request para `main` ou `develop`

**Jobs:**

- `lint-frontend`: ESLint no código TypeScript/SolidJS
- `format-check`: Verifica formatação (Prettier + rustfmt)
- `lint-rust`: Clippy no código Rust
- `build`: Compila para Windows, Linux e macOS

**Cache:** Dependencies do npm e cargo são cacheadas para builds mais rápidos.

### `release.yml` - Release Build

**Trigger:** Push de tag `v*.*.*` (ex: `v1.0.0`)

**Jobs:**

- `create-release`: Cria release no GitHub
- `build-release`: Compila para múltiplas plataformas e faz upload dos binários

**Plataformas suportadas:**

- Windows (x64) - `.msi`
- Linux (x64) - `.deb`
- macOS (Intel) - `.dmg`
- macOS (Apple Silicon) - `.dmg`

## Testando localmente

Para testar os workflows localmente, use [act](https://github.com/nektos/act):

```bash
# Instalar act
winget install nektos.act

# Testar workflow de CI
act pull_request

# Testar job específico
act -j lint-frontend
```

## Criar uma release

1. Atualize a versão em `src-tauri/Cargo.toml` e `package.json`
2. Commit as mudanças
3. Crie e push a tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. O workflow de release será executado automaticamente
5. Os binários estarão disponíveis na página de releases do GitHub

## Badge de status

Adicione ao README.md:

```markdown
![CI](https://github.com/seu-usuario/tabletop-tool/workflows/CI/badge.svg)
```
