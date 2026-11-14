// Barra de progresso, indicador lateral de seções, estado ativo do menu e barra do topo que some ao descer.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollToEl } from './lenis';

export const SECTIONS = [
  { id: 'inicio', label: 'Início' }, { id: 'servicos', label: 'Serviços' }, { id: 'localizacao', label: 'Localização' },
  { id: 'etapas', label: 'Etapas' }, { id: 'empresa', label: 'Empresa' }, { id: 'blog', label: 'Blog' }, { id: 'duvidas', label: 'Dúvidas' }, { id: 'contato', label: 'Cotação' },
];

let bar: HTMLElement, dots: HTMLElement;
const listeners: Array<(id: string) => void> = [];
/** Avisado quando muda a seção em que o visitante está. */
export const onSection = (fn: (id: string) => void): void => { listeners.push(fn); };

function ensureChrome(): void {
  if (bar) return;
  document.body.insertAdjacentHTML('beforeend',
    `<div class="progress" aria-hidden="true"><i></i></div><nav class="dots" aria-label="Seções da página">${SECTIONS.map((s) => `<button type="button" data-goto="${s.id}"><span>${s.label}</span></button>`).join('')}</nav>`);
  bar = document.querySelector('.progress i') as HTMLElement;
  dots = document.querySelector('.dots') as HTMLElement;
  dots.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-goto]');
    const el = b && document.getElementById(b.dataset.goto as string);
    if (el) scrollToEl(el);
  });
}

function setActive(id: string): void {
  dots.querySelectorAll('button').forEach((b) => b.toggleAttribute('aria-current', b.dataset.goto === id));
  document.querySelectorAll<HTMLAnchorElement>('.nav nav a').forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + id));
  listeners.forEach((f) => f(id));
}

export function buildProgress(): void {
  ensureChrome();
  dots.querySelectorAll<HTMLButtonElement>('button[data-goto]').forEach(b => { b.hidden = !document.getElementById(b.dataset.goto || ''); });
  const header = document.querySelector('.nav-bar') as HTMLElement;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate(self) {
      bar.style.transform = `scaleX(${self.progress})`;
      header.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 240);
    },
  });
  SECTIONS.forEach((s) => {
    const el = document.getElementById(s.id);
    if (!el) return;
    // seção presa: quem ocupa o espaço na página é o invólucro criado pelo pin
    const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
    ScrollTrigger.create({ trigger: box, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => { if (self.isActive) setActive(s.id); } });
  });
  setActive('inicio');
}
