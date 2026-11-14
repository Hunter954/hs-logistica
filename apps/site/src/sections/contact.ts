import { esc, wa, ARROW, type Ctx } from './html'

export const contact = ({ c }: Ctx): string => {
  const row = (label: string, v: string, inner = esc(v)): string => (v ? `<div class="rowi"><span class="k">${label}</span><span>${inner}</span></div>` : '')
  const t = c.contact
  return `
<section class="close veil-full" id="contato"><div class="wrap cgrid">
  <div>
    <div class="head"><h2>${esc(t.title)}</h2><p class="lead">${esc(t.sub)}</p></div>
    <div class="info">
      ${row('Endereço', t.address)}${row('Telefone', t.phone)}
      ${row('WhatsApp', t.whatsapp, `<a href="${esc(wa(t.whatsapp))}" target="_blank" rel="noopener">${esc(t.whatsapp)}</a>`)}
      ${row('E-mail', t.email)}${row('Horário', t.hours)}
    </div>
  </div>
  <form class="quote surface" id="quote" novalidate data-success="${esc(c.quoteForm.successMessage)}">
    <label for="q-name">Nome ou empresa<input id="q-name" name="name" maxlength="120" autocomplete="organization"><span class="err" id="e-name"></span></label>
    <label for="q-contact">Telefone ou e-mail<input id="q-contact" name="contact" maxlength="120"><span class="err" id="e-contact"></span></label>
    <label for="q-service">Serviço<select id="q-service" name="service">${c.services.items.map((s) => `<option>${esc(s.t)}</option>`).join('')}<option>Outro</option></select></label>
    <label for="q-msg">Sobre a carga<textarea id="q-msg" name="message" maxlength="2000" placeholder="${esc(c.quoteForm.messagePlaceholder)}"></textarea></label>
    <div class="hp" aria-hidden="true"><label for="q-site">Não preencha este campo<input id="q-site" name="website" tabindex="-1" autocomplete="off"></label></div>
    <button class="btn btn-primary" type="submit">${esc(c.quoteForm.button)}${ARROW}</button>
    <p class="msg" id="q-out" role="status"></p>
  </form>
</div></section>`
}
