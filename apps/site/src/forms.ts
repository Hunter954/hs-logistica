// Formulário de cotação e seta de serviço que já deixa o serviço escolhido.
type Hook = () => void;
const sent: Hook[] = [];
/** Avisado quando um pedido de cotação é aceito (a cena solta um pallet da doca). */
export const onQuoteSent = (fn: Hook): void => { sent.push(fn); };

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

async function submitQuote(f: HTMLFormElement): Promise<void> {
  if (f.dataset.sending === 'true') return;
  const d = Object.fromEntries(new FormData(f)) as Record<string, string>;
  const out = byId('q-out'), en = byId('e-name'), ec = byId('e-contact');
  en.textContent = d.name.trim() ? '' : 'Escreva seu nome ou o da empresa.';
  ec.textContent = d.contact.trim() ? '' : 'Escreva um telefone ou e-mail para retorno.';
  out.textContent = '';
  if (en.textContent || ec.textContent) { byId(en.textContent ? 'q-name' : 'q-contact').focus(); return; }
  try {
    f.dataset.sending = 'true'; f.setAttribute('aria-busy', 'true');
    const button = f.querySelector<HTMLButtonElement>('button[type="submit"]'); if (button) button.disabled = true;
    // o pedido passa pelo servidor do site, que limita envios por IP e repassa ao CMS
    const r = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    if (r.status === 429) { out.className = 'msg bad'; out.textContent = 'Muitos pedidos em pouco tempo. Aguarde alguns minutos ou ligue para nós.'; return; }
    if (!r.ok) throw new Error(String(r.status));
    f.reset(); out.className = 'msg ok'; out.textContent = f.dataset.success || 'Pedido de cotação recebido. Entraremos em contato.';
    sent.forEach((fn) => fn());
  } catch {
    out.className = 'msg bad'; out.textContent = 'O pedido não foi enviado. Tente de novo ou ligue para nós.';
  } finally {
    f.dataset.sending = 'false'; f.removeAttribute('aria-busy');
    const button = f.querySelector<HTMLButtonElement>('button[type="submit"]'); if (button) button.disabled = false;
  }
}

export function initForms(): void {
  document.addEventListener('submit', (e) => {
    const f = e.target as HTMLFormElement;
    if (f.id !== 'quote') return;
    e.preventDefault(); void submitQuote(f);
  });
  document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.site-mobile-menu a')) document.querySelector('.site-mobile-menu')?.removeAttribute('open');
    const svc = (e.target as HTMLElement).closest<HTMLElement>('[data-svc]');
    if (svc) { const s = document.getElementById('q-service') as HTMLSelectElement | null; if (s) s.selectedIndex = Number(svc.dataset.svc); }
  });
}
