export type Field = {
  key: string
  label: string
  type?:
    | 'text'
    | 'textarea'
    | 'image'
    | 'checkbox'
    | 'number'
    | 'color'
    | 'email'
    | 'select'
    | 'list'
  hint?: string
  required?: boolean
  min?: number
  max?: number
  fields?: Field[]
  options?: { value: string; label: string }[]
  maxRows?: number
}
export type Task = {
  id: string
  label: string
  text: string
  target: 'home' | 'site-settings'
  permission: 'site' | 'brand'
  icon: string
  fields: Field[]
}
const f = (
  key: string,
  label: string,
  type: Field['type'] = 'text',
  hint?: string,
): Field => ({ key, label, type, hint })
const itemFields: Field[] = [
  { key: 't', label: 'Título', required: true },
  { key: 'd', label: 'Descrição', type: 'textarea', required: true },
]
export const siteTasks: Task[] = [
  {
    id: 'header',
    label: 'Cabeçalho e logomarca',
    text: 'Configure como sua marca aparece no topo de todas as páginas.',
    target: 'site-settings',
    permission: 'brand',
    icon: 'house-door',
    fields: [
      f(
        'brand.logo',
        'Logomarca do cabeçalho',
        'image',
        'PNG com fundo transparente é uma boa escolha. Sem imagem, a logo padrão da HS é utilizada.',
      ),
      {
        key: 'brand.logoWidth',
        label: 'Largura da logomarca em pixels',
        type: 'number',
        min: 40,
        max: 180,
      },
      f('brand.showName', 'Mostrar nome ao lado da logomarca', 'checkbox'),
      { key: 'brand.name', label: 'Nome da empresa', required: true },
      f('brand.tag', 'Complemento do nome'),
    ],
  },
  {
    id: 'menu',
    label: 'Menus e navegação',
    text: 'Escolha os links e a ordem do menu do site. Seções ocultas não geram links quebrados.',
    target: 'site-settings',
    permission: 'brand',
    icon: 'grid-1x2',
    fields: [
      f('navigation.cta', 'Texto do botão principal'),
      {
        key: 'navigation.items',
        label: 'Links do menu',
        type: 'list',
        maxRows: 7,
        hint: 'Use as setas para reorganizar. Blog abre a página de artigos; os demais links levam à seção da home.',
        fields: [
          { key: 'label', label: 'Texto do link', required: true },
          {
            key: 'target',
            label: 'Destino',
            type: 'select',
            required: true,
            options: [
              { value: 'servicos', label: 'Serviços' },
              { value: 'localizacao', label: 'Localização' },
              { value: 'etapas', label: 'Etapas' },
              { value: 'empresa', label: 'Empresa' },
              { value: 'blog', label: 'Blog' },
              { value: 'duvidas', label: 'Dúvidas' },
              { value: 'contato', label: 'Cotação' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'hero',
    label: 'Abertura da página',
    text: 'A primeira impressão de quem visita a HS: mensagem principal, botões e foto.',
    target: 'home',
    permission: 'site',
    icon: 'house-door',
    fields: [
      { key: 'hero.title', label: 'Título principal', required: true },
      f('hero.title2', 'Título em destaque'),
      f('hero.sub', 'Texto de apresentação', 'textarea'),
      f('hero.cta1', 'Botão principal (cotação)'),
      f('hero.cta2', 'Botão secundário (serviços)'),
      {
        key: 'hero.facts',
        label: 'Destaques rápidos',
        type: 'list',
        maxRows: 4,
        fields: [{ key: 'text', label: 'Destaque', required: true }],
      },
      f(
        'hero.photo',
        'Foto de abertura',
        'image',
        'Opcional. Sem foto, permanece a cena de logística do site.',
      ),
    ],
  },
  ...[
    [
      'services',
      'Serviços oferecidos',
      'Apresente os serviços e descrições. Esses nomes também aparecem no formulário.',
      'box-seam',
    ],
    [
      'where',
      'Localização e destinos',
      'Explique a posição da HS e as conexões da sua operação.',
      'globe2',
    ],
    [
      'steps',
      'Etapas da operação',
      'Organize o passo a passo do recebimento à expedição.',
      'grid-1x2',
    ],
  ].map(
    ([id, label, text, icon]): Task => ({
      id,
      label,
      text,
      icon,
      target: 'home',
      permission: 'site',
      fields: [
        { key: id + '.title', label: 'Título da seção', required: true },
        ...(id !== 'steps'
          ? [f(id + '.lead', 'Texto de apoio', 'textarea')]
          : []),
        {
          key: id + '.items',
          label:
            id === 'services'
              ? 'Serviços'
              : id === 'steps'
                ? 'Etapas'
                : 'Destinos',
          type: 'list',
          fields: itemFields,
        },
      ],
    }),
  ),
  {
    id: 'photos',
    label: 'Fotos da operação',
    text: 'Mostre o armazém, a frota e a equipe com imagens reais e descrições acessíveis.',
    target: 'home',
    permission: 'site',
    icon: 'images',
    fields: [
      {
        key: 'photos',
        label: 'Galeria de imagens',
        type: 'list',
        maxRows: 3,
        fields: [f('image', 'Foto da operação', 'image')],
      },
    ],
  },
  {
    id: 'about',
    label: 'Sobre a empresa',
    text: 'Atualize a apresentação e os dados institucionais da HS.',
    target: 'home',
    permission: 'site',
    icon: 'box-seam',
    fields: [
      { key: 'about.title', label: 'Título da seção', required: true },
      f('about.text', 'História e apresentação', 'textarea'),
      {
        key: 'about.facts',
        label: 'Dados da empresa',
        type: 'list',
        fields: [
          { key: 'k', label: 'Nome do dado', required: true },
          { key: 'v', label: 'Informação', required: true },
        ],
      },
    ],
  },
  {
    id: 'faq',
    label: 'Perguntas frequentes',
    text: 'Responda às dúvidas dos clientes antes do primeiro contato.',
    target: 'home',
    permission: 'site',
    icon: 'chat-left-text',
    fields: [
      { key: 'faq.title', label: 'Título da seção', required: true },
      {
        key: 'faq.items',
        label: 'Perguntas e respostas',
        type: 'list',
        fields: [
          { key: 'q', label: 'Pergunta', required: true },
          { key: 'a', label: 'Resposta', required: true, type: 'textarea' },
        ],
      },
    ],
  },
  {
    id: 'form',
    label: 'Formulário de cotação',
    text: 'Oriente o visitante e personalize a confirmação. Os campos essenciais de identificação são mantidos.',
    target: 'home',
    permission: 'site',
    icon: 'chat-left-text',
    fields: [
      f('quoteForm.title', 'Título da seção'),
      f('quoteForm.sub', 'Texto de apoio', 'textarea'),
      f('quoteForm.button', 'Texto do botão de envio'),
      f('quoteForm.messagePlaceholder', 'Orientação sobre a carga'),
      f(
        'quoteForm.successMessage',
        'Mensagem após envio bem-sucedido',
        'text',
        'Exibida somente quando o pedido foi recebido pelo sistema.',
      ),
    ],
  },
  {
    id: 'sections',
    label: 'Seções visíveis e blog',
    text: 'Ative as áreas que deseja mostrar na home. O conteúdo permanece salvo quando uma seção é ocultada.',
    target: 'home',
    permission: 'site',
    icon: 'grid-1x2',
    fields: [
      ...['services', 'photos', 'where', 'steps', 'about', 'blog', 'faq'].map(
        (key, i) =>
          f(
            'sections.' + key,
            [
              'Exibir serviços',
              'Exibir fotos',
              'Exibir localização',
              'Exibir etapas',
              'Exibir empresa',
              'Exibir artigos na home',
              'Exibir dúvidas',
            ][i],
            'checkbox',
          ),
      ),
      f('sections.blogTitle', 'Título dos artigos na home'),
      f('sections.blogLink', 'Link para todos os artigos'),
    ],
  },
  {
    id: 'colors',
    label: 'Cores do site',
    text: 'As cores são aplicadas à página e à cena de logística. Confira a legibilidade após alterar.',
    target: 'site-settings',
    permission: 'brand',
    icon: 'gear',
    fields: [
      f('theme.accent', 'Cor de destaque', 'color'),
      f('theme.ink', 'Cor principal da marca', 'color'),
      f('theme.paper', 'Cor clara de apoio', 'color'),
    ],
  },
  {
    id: 'contact',
    label: 'Contato e atendimento',
    text: 'Mantenha telefone, WhatsApp, endereço e horário de atendimento atualizados.',
    target: 'site-settings',
    permission: 'brand',
    icon: 'telephone',
    fields: [
      f('contact.address', 'Endereço'),
      f('contact.phone', 'Telefone'),
      f(
        'contact.whatsapp',
        'WhatsApp com DDD',
        'text',
        'Use somente o número oficial de atendimento, com DDD.',
      ),
      f('contact.email', 'E-mail', 'email'),
      f('contact.hours', 'Horário de atendimento'),
    ],
  },
  {
    id: 'footer',
    label: 'Rodapé',
    text: 'Informações institucionais e acesso ao painel no final do site.',
    target: 'site-settings',
    permission: 'brand',
    icon: 'file-earmark-text',
    fields: [
      f('footer', 'Texto institucional'),
      f(
        'footerOptions.showAdminLink',
        'Exibir link de acesso ao painel',
        'checkbox',
      ),
      f('footerOptions.adminLabel', 'Texto do link do painel'),
    ],
  },
  {
    id: 'seo',
    label: 'Google e redes sociais',
    text: 'Defina como o site é apresentado nos resultados e nos links compartilhados.',
    target: 'site-settings',
    permission: 'brand',
    icon: 'globe2',
    fields: [
      f('seo.title', 'Título padrão do site'),
      f('seo.description', 'Descrição do site', 'textarea'),
      f(
        'seo.image',
        'Imagem de compartilhamento',
        'image',
        'Prefira uma imagem horizontal com 1200 × 630 pixels.',
      ),
    ],
  },
  {
    id: 'home-seo',
    label: 'SEO da página inicial',
    text: 'Valores específicos da home. Campos vazios usam o padrão de Google e redes sociais.',
    target: 'home',
    permission: 'site',
    icon: 'globe2',
    fields: [
      f('meta.title', 'Título da página inicial'),
      f('meta.description', 'Descrição da página inicial', 'textarea'),
      f('meta.image', 'Imagem de compartilhamento da home', 'image'),
    ],
  },
]
