# Revisão do painel — 14/11/2026

O painel mantém as rotas públicas existentes do CMS e os controles de acesso do servidor. Imagens, categorias, redirecionamentos e atividades possuem listas próprias com busca, paginação e estados de carregamento, erro e vazio. A biblioteca permite enviar, substituir, descrever e excluir arquivos; imagens em uso são protegidas. Categorias em uso também não podem ser excluídas.

Minha conta possui formulários separados para dados pessoais e senha. Atualizar dados preserva a sessão completa do Payload. A troca de senha exige confirmação e encerra as sessões, conforme o hook existente de usuários.

No computador, a lateral fica fixa e os controles de recolher ficam ocultos; no celular, o botão de menu continua disponível. Todos os grupos exibem o item ativo, inclusive durante a edição de um artigo. O bloco “Gestão do seu site” foi removido e os botões principais usam texto branco com fundo verde escuro.

## Correção de artigos

O autosave tentava inserir um artigo vazio ao abrir `/admin/collections/posts/create`. O hook de endereço gerava uma string vazia única, causando conflito na próxima abertura e deixando o documento sem formulário. A criação passa a aguardar o salvamento explícito e o hook retorna `null` quando não há texto. Rascunhos, versões e agendamento continuam disponíveis. Não são removidos artigos existentes.

## Verificação

`qa-ui-v4.py` executa no navegador, exclusivamente na homologação isolada:

- As cinco listas, a conta e a marcação de navegação.
- Criação de categoria e proteção contra exclusão quando utilizada.
- Envio de arquivo real e carregamento da imagem armazenada.
- Abertura do editor pelo botão Novo artigo, salvamento de rascunho e publicação com conteúdo verificado no site.
- Criação de redirecionamento e resposta HTTP 301 no site.
- Ausência da opção de envio por URL também no formulário padrão de imagem.
- Ausência de rolagem horizontal nas telas novas com largura de 390 px.
- Atualização do nome e troca de senha usando um usuário temporário, sem alterar a conta administrativa.

Também foi verificado que a imagem mantém o mesmo SHA-256 após reiniciar o CMS de homologação. Em produção, o volume externo `hs-logistica_cms-media` está montado no diretório de uploads. Capturas ficam em `output/playwright/ui-v4`.

Backup anterior à revisão: `/opt/hs-logistica/backups/pre-ui-v4.dump`. Para recuperação do código, a imagem anterior do CMS é `hs-logistica-cms:workflows-v3`. A revisão não exige alteração do esquema do banco. Credenciais não são incluídas nos testes nem neste relatório.
