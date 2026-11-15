# Deploy HS Logística

- Repositório: https://github.com/Hunter954/hs-logistica
- Fonte: branch `feat/hs-admin-redesign`, revisão atual do PR abaixo. Versão do painel: `ui-v4`.
- Revisão do código: https://github.com/Hunter954/hs-logistica/pull/1 (ainda não mesclada à main).
- VPS: `70.38.101.106`, código em `/opt/hs-logistica`.
- Site: https://hs-logistica.70.38.101.106.sslip.io
- Painel: https://hs-logistica-cms.70.38.101.106.sslip.io/admin
- Dokploy: https://nostracodes.com.br

Projeto Dokploy `HS Logistica`, ambiente `production`, Compose `Site e CMS`. Project ID: `NDCvE-hGP1QTpXMkWy5go`. Compose ID: `e-rX_nVD9W_-zvZ65h55E`. Projeto Docker Compose: `hs-logistica-vzgmxn`.

## Operação

Use o botão Deploy do serviço no Dokploy para reimplantar. O Compose usa as imagens locais `hs-logistica-cms:ui-v4` e `hs-logistica-site:workflows-v3`; não há atualização automática do GitHub. Após alterar o código, reconstrua as imagens com os Dockerfiles respectivos antes do Deploy. O build do CMS gera os tipos e o import map. As migrações rodam na inicialização, antes do healthcheck aprovar o CMS; o site aguarda essa aprovação.

Na VPS, em `/opt/hs-logistica`:

```sh
docker compose -f compose.dokploy.json ps
docker compose -f compose.dokploy.json logs --tail 100
```

O arquivo `.env` da VPS contém os segredos e as credenciais do primeiro administrador, com permissão 600. Não versionar nem expor o arquivo. A senha efetiva pode ser alterada pelo painel; `ADMIN_PASSWORD` só cria o primeiro usuário quando o banco está vazio.

Volumes preservados: `hs-logistica_db-data`, `hs-logistica_cms-media`, `hs-logistica_site-data`. As imagens são arquivos reais no volume `hs-logistica_cms-media`, montado em `/app/apps/cms/media`; o envio por URL está desativado. O banco não publica porta na internet. Não executar `down -v`. Não usar o antigo `compose.vps.json`, pois ele criaria outro projeto com o mesmo banco.

SMTP e webhook de notificações dependem de configuração do provedor; os pedidos ficam disponíveis na caixa de entrada. Não executar o antigo `verify-deploy.py` sobre conteúdo editado, pois ele restaura os textos iniciais.

Fluxos, permissões e critérios: `ADMIN-FLOWS.md`. Evidências de testes, backups e recuperação: `QA-WORKFLOWS.md`. O teste `qa-workflows.py` aponta somente para homologação e recebe credenciais em memória; nunca apontá-lo para produção.
