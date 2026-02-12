
# Plano: Novo Instalador FoodHub PDV Desktop v2.0.0

## Problema Identificado

1. O app instalado (v1.0.0) tem o codigo antigo do updater -- nunca vai conseguir se atualizar
2. A pagina de Releases do GitHub so tem codigo-fonte (zip/tar.gz), **sem o arquivo .exe e sem latest.yml**
3. O `electron-builder --publish always` nao esta conseguindo fazer upload dos assets para o GitHub Release

## Solucao

Criar uma versao limpa (v2.0.0) com todas as correcoes, garantir que o workflow gere e publique o .exe corretamente, e voce baixa e instala o novo instalador.

## Etapas

### 1. Bump para v2.0.0
Atualizar `desktop-pdv/package.json` para versao `2.0.0` (quebra limpa, sem conflito com tags antigas).

### 2. Limpar tags/releases antigas no workflow
Adicionar um passo no workflow para deletar a release e tag v1.0.0 antiga antes de buildar, evitando conflitos.

### 3. Garantir que electron-builder publique os assets
O problema pode ser que o `electron-builder` esta criando um **draft release** ou que a tag pre-existente causa conflito. Vamos:
- Remover todas as tags antigas (v1.0.0, v1.0.1) no workflow antes do build
- Garantir que o `GH_TOKEN` tem permissao de escrita (ja confirmado)
- Adicionar log para confirmar que os arquivos .exe e latest.yml foram gerados

### 4. Apos publicar
- O workflow roda automaticamente (~3-4 min)
- Voce vai na pagina de Releases do GitHub e baixa o `.exe`
- Desinstala o FoodHub PDV antigo do Windows
- Instala o novo .exe (v2.0.0)
- A partir dai, todas as atualizacoes futuras serao automaticas

---

## Detalhes Tecnicos

### Alteracoes em `desktop-pdv/package.json`
- `"version": "1.0.0"` muda para `"version": "2.0.0"`

### Alteracoes em `.github/workflows/build-desktop-pdv-release.yml`
- Adicionar step para deletar releases/tags antigas antes do build
- Adicionar step para verificar se os arquivos .exe e latest.yml foram gerados antes do upload
- Melhorar logs de debug

### Nenhuma alteracao no codigo do app
O codigo do updater, printer, preload ja esta correto. Apenas precisamos gerar o instalador com esse codigo atualizado.
