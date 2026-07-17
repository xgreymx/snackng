import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideSnackng } from './snackng.config';
import { SnackngService } from './snackng.service';
import { SnackngStore } from './snackng.store';

/** Exit animations never fire `animationend` under jsdom; the component's
 *  fallback timer is what actually removes the node, so tests drive it. */
const EXIT_FALLBACK = 350;

/** Tests opt into staggering explicitly; everywhere else it just adds noise. */
function setup(config: Parameters<typeof provideSnackng>[0] = {}) {
  TestBed.configureTestingModule({ providers: [provideSnackng({ stagger: 0, ...config })] });
  const service = TestBed.inject(SnackngService);
  const store = TestBed.inject(SnackngStore);
  const appRef = TestBed.inject(ApplicationRef);
  const tick = () => appRef.tick();
  return { service, store, tick };
}

function toasts(): HTMLElement[] {
  return Array.from(document.querySelectorAll('sng-toast'));
}

function messages(): string[] {
  return Array.from(document.querySelectorAll('.sng-message')).map((n) => n.textContent ?? '');
}

describe('SnackngService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
    document.querySelectorAll('sng-host, .sng-live-region').forEach((node) => node.remove());
  });

  it('renders a toast into the document without any global stylesheet', () => {
    const { service, tick } = setup();

    service.success('Sincronización correcta', { title: 'Listo' });
    tick();

    expect(toasts()).toHaveLength(1);
    expect(document.querySelector('.sng-title')?.textContent).toBe('Listo');
    expect(document.querySelector('.sng-message')?.textContent).toBe('Sincronización correcta');
  });

  it('creates a single host no matter how many toasts open', () => {
    const { service, tick } = setup();

    service.success('uno');
    service.danger('dos');
    tick();

    expect(document.querySelectorAll('sng-host')).toHaveLength(1);
    expect(toasts()).toHaveLength(2);
  });

  it('applies the type as a class so consumers can target it in CSS', () => {
    const { service, tick } = setup();

    service.warning('ojo');
    tick();

    expect(toasts()[0].classList.contains('sng--warning')).toBe(true);
  });

  it('auto-dismisses once the duration elapses', async () => {
    const { service, tick } = setup({ duration: 1000 });

    const ref = service.success('temporal');
    tick();
    expect(toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    tick();
    vi.advanceTimersByTime(EXIT_FALLBACK);
    tick();

    await expect(ref.afterDismissed).resolves.toBe('timeout');
    expect(toasts()).toHaveLength(0);
  });

  it('keeps a toast with duration 0 on screen', () => {
    const { service, tick } = setup({ duration: 0 });

    service.warning('persistente');
    tick();

    vi.advanceTimersByTime(60_000);
    tick();

    expect(toasts()).toHaveLength(1);
  });

  it('pauses the timer while hovered and resumes on leave', () => {
    const { service, tick } = setup({ duration: 1000, pauseOnHover: true });

    service.success('hover');
    tick();
    const el = toasts()[0];

    vi.advanceTimersByTime(600);
    el.dispatchEvent(new MouseEvent('mouseenter'));

    // Well past the original duration, but the clock is paused.
    vi.advanceTimersByTime(5000);
    tick();
    expect(toasts()).toHaveLength(1);

    el.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(399);
    tick();
    expect(toasts()).toHaveLength(1);

    vi.advanceTimersByTime(2);
    tick();
    vi.advanceTimersByTime(EXIT_FALLBACK);
    tick();
    expect(toasts()).toHaveLength(0);
  });

  it('queues past max instead of rendering the whole burst at once', () => {
    const { service, store, tick } = setup({ max: 4, duration: 0, stagger: 0 });

    for (let i = 1; i <= 10; i++) {
      service.info(`msg ${i}`);
    }
    tick();

    expect(toasts()).toHaveLength(4);
    expect(store.pending()).toBe(6);
  });

  it('releases the next queued toast when a slot frees', async () => {
    const { service, store, tick } = setup({ max: 2, stagger: 0 });

    // Only the first expires; the others must outlive the assertion.
    const first = service.info('uno', { duration: 1000 });
    service.info('dos', { duration: 30_000 });
    service.info('tres', { duration: 30_000 });
    tick();

    expect(toasts()).toHaveLength(2);
    expect(store.pending()).toBe(1);

    vi.advanceTimersByTime(1000);
    tick();
    vi.advanceTimersByTime(EXIT_FALLBACK);
    tick();

    await expect(first.afterDismissed).resolves.toBe('timeout');
    expect(store.pending()).toBe(0);
    expect(messages()).toEqual(['dos', 'tres']);
  });

  it('counts toasts still playing their exit against max', () => {
    // A leaving toast is faded but still occupies its slot. If capacity ignored
    // them, one finishing while another is still exiting would look like a free
    // slot, and the queue would pile new toasts on top of the dying ones — the
    // stack visibly ballooning past max and then snapping back.
    const { service, tick } = setup({ max: 2, stagger: 0 });

    service.info('a', { duration: 1000 });
    service.info('b', { duration: 1100 }); // still exiting when 'a' is removed
    service.info('c', { duration: 30_000 });
    service.info('d', { duration: 30_000 });
    tick();
    expect(toasts()).toHaveLength(2);

    // Tick between the two expiries: the exit timer is armed by a change-detection
    // effect, so without a tick in between both would schedule from the same
    // instant and finish together, closing the window this test needs.
    vi.advanceTimersByTime(1000); // 'a' expires and starts exiting
    tick();
    vi.advanceTimersByTime(100); // 'b' expires and starts exiting
    tick();
    vi.advanceTimersByTime(260); // 'a' is removed; 'b' is still on screen exiting
    tick();

    expect(toasts().length).toBeLessThanOrEqual(2);
  });

  it('staggers releases so a burst does not animate in unison', () => {
    const { service, tick } = setup({ max: 4, duration: 0, stagger: 100 });

    for (let i = 1; i <= 4; i++) {
      service.info(`msg ${i}`);
    }
    tick();
    expect(toasts()).toHaveLength(1);

    vi.advanceTimersByTime(100);
    tick();
    expect(toasts()).toHaveLength(2);

    vi.advanceTimersByTime(200);
    tick();
    expect(toasts()).toHaveLength(4);
  });

  it('stagger 0 releases everything that fits in one go', () => {
    const { service, tick } = setup({ max: 3, duration: 0, stagger: 0 });

    service.info('a');
    service.info('b');
    service.info('c');
    tick();

    expect(toasts()).toHaveLength(3);
  });

  it('evicts the oldest under overflow: dismiss-oldest', async () => {
    const { service, tick } = setup({
      max: 2,
      duration: 0,
      stagger: 0,
      overflow: 'dismiss-oldest',
    });

    const first = service.info('uno');
    service.info('dos');
    service.info('tres');
    tick();
    vi.advanceTimersByTime(EXIT_FALLBACK);
    tick();

    await expect(first.afterDismissed).resolves.toBe('replaced');
    expect(messages()).toEqual(['dos', 'tres']);
  });

  it('drops queued toasts on dismissAll instead of parading them after', async () => {
    const { service, store, tick } = setup({ max: 1, duration: 0, stagger: 0 });

    service.info('visible');
    const queued = service.info('en cola');
    tick();
    expect(store.pending()).toBe(1);

    service.dismissAll();
    tick();
    vi.advanceTimersByTime(EXIT_FALLBACK + 1000);
    tick();

    await expect(queued.afterDismissed).resolves.toBe('manual');
    expect(store.pending()).toBe(0);
    expect(toasts()).toHaveLength(0);
  });

  it('dismissing a queued toast removes it without ever showing it', async () => {
    const { service, store, tick } = setup({ max: 1, duration: 0, stagger: 0 });

    service.info('visible');
    const queued = service.info('en cola');
    tick();

    queued.dismiss();
    tick();
    vi.advanceTimersByTime(EXIT_FALLBACK);
    tick();

    await expect(queued.afterDismissed).resolves.toBe('manual');
    expect(store.pending()).toBe(0);
    expect(messages()).toEqual(['visible']);
  });

  it('runs the action handler and dismisses with reason "action"', async () => {
    const { service, tick } = setup({ duration: 0 });
    const handler = vi.fn();

    const ref = service.success('borrado', { action: { label: 'Deshacer', handler } });
    tick();

    document.querySelector<HTMLButtonElement>('.sng-action')!.click();
    tick();
    vi.advanceTimersByTime(EXIT_FALLBACK);
    tick();

    expect(handler).toHaveBeenCalledOnce();
    await expect(ref.afterDismissed).resolves.toBe('action');
    expect(toasts()).toHaveLength(0);
  });

  it('keeps the toast open when the action opts out of dismissing', () => {
    const { service, tick } = setup({ duration: 0 });
    const handler = vi.fn();

    service.info('sigue', { action: { label: 'Ver', handler, dismissOnClick: false } });
    tick();

    document.querySelector<HTMLButtonElement>('.sng-action')!.click();
    tick();

    expect(handler).toHaveBeenCalledOnce();
    expect(toasts()).toHaveLength(1);
  });

  it('renders a close button only when dismissible', () => {
    const { service, tick } = setup({ duration: 0 });

    service.info('sin cerrar');
    tick();
    expect(document.querySelector('.sng-close')).toBeNull();

    service.info('con cerrar', { dismissible: true });
    tick();
    expect(document.querySelectorAll('.sng-close')).toHaveLength(1);
  });

  it('announces danger assertively and everything else politely', () => {
    const { service, tick } = setup();

    service.success('ok');
    tick();
    vi.advanceTimersByTime(100);
    let region = document.querySelector('.sng-live-region')!;
    expect(region.getAttribute('aria-live')).toBe('polite');

    service.danger('boom');
    tick();
    vi.advanceTimersByTime(100);
    region = document.querySelector('.sng-live-region')!;
    expect(region.getAttribute('aria-live')).toBe('assertive');
    expect(region.textContent).toBe('boom');
  });

  it('does not put aria-live on the toast itself', () => {
    const { service, tick } = setup();

    service.danger('boom');
    tick();

    expect(toasts()[0].querySelector('[aria-live]')).toBeNull();
    expect(toasts()[0].hasAttribute('aria-live')).toBe(false);
  });

  it('supports custom types registered through provideSnackng', () => {
    const { service, tick } = setup({
      duration: 0,
      types: { deploy: { icon: '<svg id="deploy-icon"></svg>' } },
    });

    service.show('deploy', 'desplegado');
    tick();

    expect(toasts()[0].classList.contains('sng--deploy')).toBe(true);
    expect(document.querySelector('#deploy-icon')).not.toBeNull();
  });

  it('falls back to the info glyph for a custom type with no icon', () => {
    const { service, tick } = setup({ duration: 0, types: { audit: {} } });

    service.show('audit', 'auditado');
    tick();

    expect(document.querySelector('.sng-icon svg path')).not.toBeNull();
  });

  it('dismissAll clears every stack', async () => {
    const { service, tick } = setup({ duration: 0 });

    service.success('a', { position: 'top-end' });
    service.danger('b', { position: 'bottom-start' });
    tick();
    expect(toasts()).toHaveLength(2);

    service.dismissAll();
    tick();
    vi.advanceTimersByTime(EXIT_FALLBACK);
    tick();

    expect(toasts()).toHaveLength(0);
  });

  it('groups toasts into one stack per position', () => {
    const { service, tick } = setup({ duration: 0 });

    service.success('a', { position: 'top-end' });
    service.success('b', { position: 'top-end' });
    service.danger('c', { position: 'bottom-start' });
    tick();

    expect(document.querySelectorAll('.sng-stack')).toHaveLength(2);
    expect(document.querySelectorAll('.sng-stack--top-end sng-toast')).toHaveLength(2);
    expect(document.querySelectorAll('.sng-stack--bottom-start sng-toast')).toHaveLength(1);
  });

  it('passes panelClass through to the toast element', () => {
    const { service, tick } = setup({ duration: 0 });

    service.info('marcado', { panelClass: ['tema-morado', 'compacto'] });
    tick();

    expect(toasts()[0].classList.contains('tema-morado')).toBe(true);
    expect(toasts()[0].classList.contains('compacto')).toBe(true);
  });

  it('applies the default glass preset and drift effect', () => {
    const { service, tick } = setup({ duration: 0 });

    service.info('por defecto');
    tick();

    const el = toasts()[0];
    expect(el.classList.contains('sng-style--glass')).toBe(true);
    expect(el.classList.contains('sng-fx--drift')).toBe(true);
    expect(el.classList.contains('sng-fx--glare')).toBe(false);
  });

  it('applies a per-call style preset as a class', () => {
    const { service, tick } = setup({ duration: 0 });

    service.info('solido', { style: 'solid' });
    tick();

    expect(toasts()[0].classList.contains('sng-style--solid')).toBe(true);
    expect(toasts()[0].classList.contains('sng-style--glass')).toBe(false);
  });

  it('supports the chained preset sugar (success.solid)', () => {
    const { service, tick } = setup({ duration: 0 });

    service.success.solid('guardado');
    tick();

    const el = toasts()[0];
    expect(el.classList.contains('sng--success')).toBe(true);
    expect(el.classList.contains('sng-style--solid')).toBe(true);
  });

  it('takes the global style and effect defaults from provideSnackng', () => {
    const { service, tick } = setup({ duration: 0, style: 'flat', effect: 'none' });

    service.info('global');
    tick();

    const el = toasts()[0];
    expect(el.classList.contains('sng-style--flat')).toBe(true);
    expect(el.classList.contains('sng-fx--drift')).toBe(false);
    expect(el.classList.contains('sng-fx--glare')).toBe(false);
  });

  it('renders the glare layer and both fx classes for effect: both', () => {
    const { service, tick } = setup({ duration: 0 });

    service.info('reactivo', { effect: 'both' });
    tick();

    const el = toasts()[0];
    expect(el.classList.contains('sng-fx--drift')).toBe(true);
    expect(el.classList.contains('sng-fx--glare')).toBe(true);
    expect(el.querySelector('.sng-glare')).not.toBeNull();
  });

  it('omits the glare layer when the effect does not use it', () => {
    const { service, tick } = setup({ duration: 0, effect: 'drift' });

    service.info('sin glare');
    tick();

    expect(toasts()[0].querySelector('.sng-glare')).toBeNull();
  });
});

describe('SnackngService on the server', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('no-ops instead of touching the DOM', async () => {
    TestBed.configureTestingModule({
      providers: [provideSnackng(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(SnackngService);

    const ref = service.success('nunca se ve');
    TestBed.inject(ApplicationRef).tick();

    expect(document.querySelector('sng-host')).toBeNull();
    expect(TestBed.inject(SnackngStore).items()).toHaveLength(0);
    await expect(ref.afterDismissed).resolves.toBe('manual');
    expect(() => ref.dismiss()).not.toThrow();
  });
});
