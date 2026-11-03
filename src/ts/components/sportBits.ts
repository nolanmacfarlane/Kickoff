// Sport icons (Phosphor, MIT) and the standard "icon + name + ?" label. The ? is the ONE way to get info about a sport.
import { SPORT_ICONS, UI_ICONS } from '../icons';
import { h, iconButton } from '../dom';
import { getSport } from '../state';

function phosphor(markup: string, cls: string): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 256 256');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', cls);
  svg.innerHTML = markup;
  return svg;
}
export const sportIcon = (sportId: string, cls = 'sport-icon'): SVGElement => phosphor(SPORT_ICONS[sportId] ?? SPORT_ICONS.soccer, cls);
export const uiIcon = (name: 'chat' | 'send' | 'search' | 'share' | 'list', cls = 'icon'): SVGElement => phosphor(UI_ICONS[name], cls);

/** <span class="sport-label"> [icon] Soccer [?] </span>. Pass onAbout to show the ? button right next to the name. */
export function sportLabel(sportId: string, o: { onAbout?: () => void; as?: 'h2' | 'h3' | 'strong' | 'span'; icon?: boolean; className?: string } = {}): HTMLElement {
  const sport = getSport(sportId)!;
  return h(o.as ?? 'span', { class: `sport-label ${o.className ?? ''}`.trim() },
    o.icon === false ? null : sportIcon(sportId),
    h('span', { class: 'sport-label__name' }, sport.name),
    o.onAbout ? iconButton('help', `About ${sport.name}`, o.onAbout, 'icon-btn--sm icon-btn--tight') : null);
}
