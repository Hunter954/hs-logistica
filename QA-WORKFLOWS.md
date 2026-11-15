# Validação dos fluxos administrativos HS

Versão funcional publicada no Dokploy em 14/11/2026, sobre o banco e volumes existentes.

## Regras verificadas em banco isolado

- Visitante não lê cotações nem acessa a equipe.
- Administrador e atendimento não criam cotações manualmente; o servidor do site cria pedidos novos.
- Dados de cliente, origem, recebimento e histórico resistem a alterações pela API.
- Atribuição, prioridade, próximo retorno e notas atualizam o histórico.
- Busca, filtros combinados, retorno atrasado e paginação com mais de 20 pedidos.
- Exportação somente com permissão; entradas que poderiam virar fórmulas são protegidas no CSV.
- Editor e atendimento têm áreas distintas. Perfil personalizado não consegue se promover nem conceder permissões a si mesmo.
- Publicação exige permissão específica e conteúdo do artigo. Rascunhos continuam separados.
- Própria conta e último administrador ativo protegidos; o PostgreSQL também bloqueia a remoção do último administrador.
- Conta desativada e sessões revogadas perdem acesso. Troca de senha encerra sessões e invalida a senha anterior.
- Bloqueio após tentativas incorretas, desbloqueio pelo administrador e exclusão de conta sem vínculos.
- Arquivos em uso na home, identidade ou artigos não podem ser excluídos.
- Alterações em logomarca, menu, home, visibilidade, rodapé e formulário refletidas na web.
- Conflitos de versão recusados, e atualizações do site executadas em ordem após a confirmação da versão salva.

## Navegador

Chromium, desktop de 1440 px e celular de 390 px. Atendimento salvo pelo formulário; pessoa criada com perfil personalizado; nome e logomarca alterados pelo editor; seleção na biblioteca; navegação móvel pública e administrativa. Nenhum erro de JavaScript nas verificações finais. Rotas antigas de cotações, usuários e artigos também usam os novos fluxos.

As contas, pedidos e imagens criados para teste ficaram exclusivamente no banco e armazenamento de homologação. Não foram copiados para produção.

## Publicação e recuperação

- Projeto Dokploy: `HS Logistica`, ambiente `production`, serviço `Site e CMS`.
- Imagens: `hs-logistica-cms:workflows-v3` e `hs-logistica-site:workflows-v3`.
- CMS com healthcheck; site aguarda o CMS saudável antes de iniciar.
- Backup atualizado do banco: `/opt/hs-logistica/backups/pre-workflows-live-20261114.dump`.
- Backup das imagens: `/opt/hs-logistica/backups/pre-workflows-media-20261114.tgz`.
- Configuração anterior: `/opt/hs-logistica/backups/compose-before-workflows.json`.
- Código e migrações para revisão: https://github.com/Hunter954/hs-logistica/pull/1.

As migrações acrescentam campos e tabelas sem substituir conteúdos. A reversão de código deve ser avaliada conforme os novos perfis e registros já utilizados; não restaurar o banco por cima de novos atendimentos sem planejar sua preservação.

SMTP continua dependendo de configuração do provedor. O fluxo de equipe funciona com senha inicial/redefinição pelo administrador; não presume envio de convites ou recuperação por e-mail.
