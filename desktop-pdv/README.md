# FoodHub PDV Desktop

Aplicativo Electron para impressão térmica ESC/POS via USB com auto-update.

## Desenvolvimento

```bash
cd desktop-pdv
npm install
npm run dev
```

## Build local (sem publicar)

```bash
npm run dist
# Gera instalador em desktop-pdv/release/
```

## Como publicar uma nova versão

1. Atualize a versão no `package.json`:
   ```json
   "version": "1.1.0"
   ```

2. Commit e crie a tag:
   ```bash
   git add .
   git commit -m "release: v1.1.0"
   git tag v1.1.0
   git push origin main --tags
   ```

3. O workflow **Release FoodHub PDV Desktop** será disparado automaticamente e:
   - Compila o TypeScript
   - Gera o instalador NSIS (.exe)
   - Publica como GitHub Release com `latest.yml`

4. Os clientes com o app instalado receberão a atualização automaticamente na próxima verificação (a cada 6h ou ao abrir o app).

## Configuração do auto-update

O `electron-updater` busca releases do repositório configurado em `package.json` → `build.publish`:

```json
"publish": [{
  "provider": "github",
  "owner": "SEU_USUARIO",
  "repo": "foodhub-pdv-releases"
}]
```

### Requisitos:
- O repositório de releases deve ser **público** (para que o app baixe sem token)
- O secret `GH_TOKEN` deve estar configurado no repositório do código (Settings → Secrets → Actions) com permissão de escrita no repo de releases

## Menu do app

- **Arquivo → Recarregar**: Recarrega a página
- **Ajuda → Verificar atualizações**: Força verificação manual
- **Ajuda → Sobre**: Exibe versão atual
