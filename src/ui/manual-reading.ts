import { chromium, type BrowserContext, type Page } from 'playwright';
import { EngineStorage } from '../engine/storage.js';
import { CollectionStore } from '../engine/collection.js';
import { copyVisibleSportsText } from '../visual/readiness.js';
import { captureVisibleDom } from '../dom/browser.js';
import { extractRenderedDom, type DomCandidate } from '../dom/extractor.js';
import { cancellable, closeAcquisitionContext } from '../engine/cancellation.js';
import { RenzoChromePage } from '../engine/renzo-browser.js';
import type { Source, AcquisitionContext } from '../engine/types.js';
import type { ProviderRecord } from '../normalization/types.js';
import { installManualControl, pollManualControl, updateManualControl, removeManualControl, selectedManualView, scopedBestFightOddsTree, type ManualRegion } from './manual-controls.js';
import { recordIdentity } from './ai-evidence.js';
import { isBestFightOdds } from '../validation/records.js';
import { extractBestFightOddsDom, bestFightOddsPending } from '../profiles/bestfightodds.js';

/** The minimal page surface used by the manual mode. Chrome Renzo (Apple Events) and Playwright both provide it. */
export type ManualPage = Pick<Page, 'url' | 'isClosed' | 'evaluate' | 'goto'> & { close(): Promise<void> };
export type ManualOpener = (signal: AbortSignal) => Promise<BrowserContext | ManualPage>;
export type ManualReadingStatus = { ready: boolean; savedViews: number; records: number; pendingViews: number; archivedViews: number; url: string | null; browser: 'renzo' | 'test'; opened: boolean; captureActive?: boolean; newRecords?: number; selection?: ManualRegion | null; lastSavedAt?: string | null; lastCommand?: number; error?: string | null; lastCapture?: { id: string; at: string; textChars: number; records: number; textPreview: string; reason?: string } };
export type ManualReadResult = { saved: boolean; savedViews: number; records: number; totalRecords: number; pendingViews: number; url: string; captureId?: string; reason?: string; textChars: number };

const host = (value: string) => { try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
export function allowedDestination(url: string, allowedHosts: string[]): boolean {
  const current = host(url);
  return Boolean(current) && allowedHosts.some(allowed => current === allowed || current.endsWith(`.${allowed}`));
}
const REASONS: Record<string, string> = {
  'No hay un único encabezado local de enfrentamiento': 'tarjetas sin un único encabezado de enfrentamiento visible',
  'Precios visibles sin límites demostrables de enfrentamiento y mercado': 'precios visibles sin tarjeta de enfrentamiento y mercado demostrable',
  'fixture and odds found, but no market label': 'enfrentamientos con precios pero sin etiqueta de mercado',
  'odds is inside fixture and market, selection text is ambiguous': 'precios cuya opción no se puede demostrar'
};
export function pendingReasonFor(candidates: DomCandidate[], visibleOdds: number, eventCards: number): string {
  const counts = new Map<string, number>();
  for (const candidate of candidates) if (candidate.status !== 'VALID') for (const reason of candidate.reasons) counts.set(REASONS[reason] ?? reason, (counts.get(REASONS[reason] ?? reason) ?? 0) + 1);
  const detail = [...counts].map(([reason, count]) => `${count}× ${reason}`).join('; ');
  return `Sin cuotas extraídas de esta vista: ${visibleOdds} precios visibles y ${eventCards} tarjetas con enfrentamiento${detail ? ` · ${detail}` : ''}. El texto se conserva pendiente de interpretación.`;
}

/** A user-controlled page in the existing Chrome Renzo profile: no automatic scroll, navigation, OCR, network extraction or AI.
 * Reading extracts only odds whose event, market and option share one rendered card inside the current viewport. */
export class ManualReading {
  private readonly context: AcquisitionContext;
  private reading = false;
  private readingFinished?: Promise<void>;
  private lastText?: string;
  private page?: ManualPage;
  private readonly captureIds: string[] = [];
  private finishing = false;
  private wake?: () => void;
  private readonly seenRecords = new Set<string>();
  private capturedRevision = 0;
  private lastCommand = 0;
  private lastSavedAt: string | null = null;
  private error: string | null = null;
  private lastCapture?: ManualReadingStatus['lastCapture'];
  captureActive = true;
  selection: ManualRegion | null = null;
  newRecords = 0;
  ready = false;
  opened = false;
  savedViews = 0;
  records = 0;
  pendingViews = 0;
  archivedViews = 0;
  currentUrl: string | null = null;
  readonly browser: 'renzo' | 'test';
  readonly allowedHosts: string[];
  constructor(readonly source: Source, readonly signal: AbortSignal, private readonly storage: EngineStorage,
    private readonly changed: () => void,
    private readonly open?: ManualOpener, options: { allowedHosts?: string[] } = {}) {
    this.browser = open ? 'test' : 'renzo';
    this.allowedHosts = [...new Set([host(source.url), ...(options.allowedHosts ?? []).map(value => value.includes('/') ? host(value) : value.toLowerCase().replace(/^www\./, ''))].filter(Boolean))];
    this.context = { source, signal, memory: null, configuration: null, timeoutMs: 20000, observeMs: 0 };
  }
  /** "Terminar sesión manual": ends the session cleanly, closes only the collector tab and keeps everything saved. */
  get finished(): boolean { return this.finishing; }
  finish(): void { this.finishing = true; this.ready = false; this.changed(); this.wake?.(); }
  get status(): ManualReadingStatus { return { ready: this.ready, savedViews: this.savedViews, records: this.records, pendingViews: this.pendingViews, archivedViews: this.archivedViews, url: this.currentUrl, browser: this.browser, opened: this.opened, captureActive: this.captureActive && this.ready && !this.finishing, newRecords: this.newRecords, selection: this.selection, lastSavedAt: this.lastSavedAt, lastCommand: this.lastCommand, error: this.error, ...(this.lastCapture ? { lastCapture: this.lastCapture } : {}) }; }

  async save(): Promise<{ savedViews: number; records: number }> {
    if (this.reading) await this.readingFinished;
    this.signal.throwIfAborted();
    if (this.captureActive) await this.read();
    if (!this.savedViews) throw new Error('Todavía no hay vistas capturadas para guardar.');
    await this.storage.flush();
    this.lastSavedAt = new Date().toISOString(); this.error = null; this.changed();
    return { savedViews: this.savedViews, records: this.records };
  }

  private async openPage(): Promise<ManualPage> {
    if (!this.open) {
      // The collector-owned tab in the user's Chrome Renzo window. Only that tab is ever closed.
      const renzo = await RenzoChromePage.open({ signal: this.signal });
      this.context.renzoPage = renzo; this.context.closePage = () => renzo.close();
      return renzo.asPage() as unknown as ManualPage;
    }
    const opened = await this.open(this.signal);
    if (typeof (opened as BrowserContext).newPage === 'function') {
      const browserContext = opened as BrowserContext;
      this.context.browserContext = browserContext; this.context.browser = browserContext.browser() ?? undefined;
      if (this.signal.aborted) { await closeAcquisitionContext(this.context); this.signal.throwIfAborted(); }
      return await cancellable(browserContext.newPage(), this.signal) as ManualPage;
    }
    const page = opened as ManualPage; this.context.closePage = () => page.close();
    return page;
  }
  async run() {
    const close = () => { this.ready = false; this.changed(); void closeAcquisitionContext(this.context); };
    this.signal.addEventListener('abort', close, { once: true });
    try {
      this.signal.throwIfAborted();
      const page = await cancellable(this.openPage(), this.signal); this.page = page; this.context.page = page as unknown as Page;
      if (this.signal.aborted) { await closeAcquisitionContext(this.context); this.signal.throwIfAborted(); }
      this.opened = true; this.changed();
      await cancellable(page.goto(this.source.url, { waitUntil: 'domcontentloaded', timeout: 20000 }), this.signal);
      this.signal.throwIfAborted();
      this.currentUrl = await cancellable(this.readUrl(page), this.signal);
      this.ready = true; this.changed();
      await cancellable(installManualControl(page as unknown as Page, this.status), this.signal);
      let lastArchiveCheck = Date.now();
      // Observe only: the user scrolls and navigates. The session ends when the tab closes or Stop arrives.
      while (!this.signal.aborted && !this.finishing) {
        await cancellable(new Promise<void>(resolve => { this.wake = resolve; setTimeout(resolve, 500); }), this.signal).catch(() => undefined);
        if (this.signal.aborted || this.finishing || page.isClosed()) break;
        if (this.reading) continue;
        let control = await cancellable(pollManualControl(page as unknown as Page), this.signal);
        if (!control) {
          this.capturedRevision = 0;
          await cancellable(installManualControl(page as unknown as Page, this.status), this.signal);
          control = await cancellable(pollManualControl(page as unknown as Page), this.signal);
        }
        if (!control) throw new Error('No se pudo instalar el control de Scroll Manual.');
        if (control.url !== this.currentUrl) { this.currentUrl = control.url; this.changed(); }
        for (const command of control.commands) {
          if (this.finishing || this.signal.aborted) break;
          try {
            this.error = null;
            switch (command.type) {
              case 'activate': this.captureActive = true; this.capturedRevision = -1; break;
              case 'pause': this.captureActive = false; break;
              case 'selection':
                if (command.region && (![command.region.x, command.region.y, command.region.width, command.region.height].every(Number.isFinite) || command.region.x < 0 || command.region.y < 0 || command.region.width < 4 || command.region.height < 4)) throw new Error('La zona seleccionada no es válida.');
                this.selection = command.region ?? null; this.capturedRevision = -1; break;
              case 'save': await this.save(); this.capturedRevision = control.revision; break;
              case 'finish': this.finish(); break;
              default: throw new Error('Control de Scroll Manual desconocido.');
            }
          } catch (error) {
            if (this.signal.aborted) throw error;
            this.error = error instanceof Error ? error.message : String(error);
          }
          this.lastCommand = command.id; this.changed();
        }
        if (this.finishing || this.signal.aborted) break;
        if (this.captureActive && !control.selecting && control.revision !== this.capturedRevision && Date.now() - control.movedAt >= 350) {
          this.capturedRevision = control.revision;
          try { await this.read(); this.error = null; }
          catch (error) { if (this.signal.aborted) throw error; this.error = error instanceof Error ? error.message : String(error); }
          this.changed();
        }
        await cancellable(updateManualControl(page as unknown as Page, this.status), this.signal);
        if (Date.now() - lastArchiveCheck >= 2000) { await this.refreshArchived(); lastArchiveCheck = Date.now(); }
      }
      this.signal.throwIfAborted();
    } finally {
      this.ready = false; this.signal.removeEventListener('abort', close); this.changed();
      try {
        if (this.page && !this.page.isClosed() && !this.signal.aborted) await removeManualControl(this.page as unknown as Page);
      } finally {
        await closeAcquisitionContext(this.context); await this.readingFinished;
      }
    }
  }
  private async readUrl(page: ManualPage): Promise<string> { return String(await page.evaluate('location.href')); }
  /** Receipts record the automatic archive into PostgreSQL; the counter only reflects confirmed writes. */
  async refreshArchived(): Promise<number> {
    const store = new CollectionStore(this.storage.root);
    let archived = 0;
    for (const id of this.captureIds) { const receipt = await store.receipt(id).catch(() => null); if (receipt && ['LOADED', 'EMPTY'].includes(receipt.ingestion)) archived++; }
    if (archived !== this.archivedViews) { this.archivedViews = archived; this.changed(); }
    return archived;
  }
  async read(): Promise<ManualReadResult> {
    this.signal.throwIfAborted();
    const page = this.page;
    if (!this.ready || !page || page.isClosed()) throw new Error('La página manual todavía no está lista.');
    if (this.reading) throw new Error('Ya se está leyendo la vista actual.');
    this.reading = true;
    let finishReading!: () => void;
    this.readingFinished = new Promise(resolve => { finishReading = resolve; });
    try {
      const url = await cancellable(this.readUrl(page), this.signal); this.currentUrl = url;
      if (!allowedDestination(url, this.allowedHosts)) throw new Error(`La pestaña está en ${host(url) || url}, que no pertenece a ${this.source.type}. Destinos admitidos: ${this.allowedHosts.join(', ')}. Vuelve a la fuente para leer su vista.`);
      const copy = await cancellable(copyVisibleSportsText(page as unknown as Page, true), this.signal);
      this.signal.throwIfAborted();
      const bfo = isBestFightOdds(this.source);
      let tree = await cancellable(captureVisibleDom(page as unknown as Page, bfo
        ? { rootSelector: 'div.table-div:not(.event-collapsed)', maxDepth: 30, maxNodes: 30000 }
        : { viewportOnly: true, maxDepth: 30, maxNodes: 20000 }), this.signal);
      if (this.selection || bfo) {
        const region = this.selection ?? await page.evaluate<ManualRegion>('({x:0,y:0,width:innerWidth,height:innerHeight})');
        const selected = await cancellable(selectedManualView(page as unknown as Page, tree, region), this.signal);
        tree = bfo ? scopedBestFightOddsTree(tree, selected.tree) : selected.tree;
        if (this.selection) copy.text = selected.text;
      }
      this.signal.throwIfAborted();
      if (await this.readUrl(page) !== url) throw new Error('La página cambió durante la lectura. Vuelve a leer la vista actual.');
      if (!copy.text.trim()) throw new Error('No hay texto visible para guardar. Desplaza la página o espera a que cargue.');
      const identity = JSON.stringify([url, this.selection, copy.text]);
      if (this.lastText === identity) return { saved: false, savedViews: this.savedViews, records: 0, totalRecords: this.records, pendingViews: this.pendingViews, url, textChars: copy.text.length, reason: 'Esta vista ya está guardada. Haz scroll para leer otra parte.' };
      const extraction = extractRenderedDom(tree, { sportsbook: this.source.type, sourceUrl: url });
      const records: ProviderRecord[] = bfo ? extractBestFightOddsDom(tree, { sportsbook: this.source.type, sourceUrl: url }) : extraction.records;
      const pendingGroups = bfo ? bestFightOddsPending(tree, records) : [];
      const pendingReason = records.length ? undefined : bfo
        ? 'Texto guardado; no se pudo demostrar la pareja de luchadores, la columna de casa o la celda de cuota de la tabla BestFightOdds.'
        : pendingReasonFor(extraction.candidates, extraction.visibleOdds, extraction.detectedEventCards);
      const candidates = extraction.candidates.slice(0, 200).map(c => ({ status: c.status, confidence: c.confidence, reasons: c.reasons, evidence: c.evidence.slice(0, 4).map(e => ({ path: e.path, text: e.text.slice(0, 300) })) }));
      const task = this.storage.saveRaw(this.source, 'dom', { url, transport: 'manual-visible-text', capturedAt: new Date().toISOString(),
        payload: { records, copiedText: copy.text, dom: tree, scrollMode: 'manual', browser: this.browser === 'renzo' ? 'chrome-renzo' : 'test-context', viewportOnly: true, ...(this.selection ? { selectionRegion: this.selection } : {}), visibleOdds: extraction.visibleOdds, eventCards: bfo ? new Set(records.map(record=>record.sourceEventId)).size : extraction.detectedEventCards, candidates, ...(pendingGroups.length ? { pendingGroups } : {}), ...(pendingReason ? { pendingReason } : {}) } }, records.length);
      // A write already requested is flushed even if Stop arrives; no further reading starts.
      const path = await task;
      const captureId = path.split('/').at(-1)!.replace(/\.json$/, '');
      this.captureIds.push(captureId);
      this.lastCapture = { id: captureId, at: new Date().toISOString(), textChars: copy.text.length, records: records.length, textPreview: copy.text.slice(0,1600), ...(pendingReason ? { reason: pendingReason } : {}) };
      for (const record of records) {
        const identity = recordIdentity(record);
        if (identity) {
          const key = JSON.stringify([identity, record.eventStartTime ?? null]);
          if (!this.seenRecords.has(key)) { this.seenRecords.add(key); this.newRecords++; }
        }
      }
      this.lastText = identity; this.savedViews++; this.records += records.length; if (!records.length) this.pendingViews++; this.changed();
      return { saved: true, savedViews: this.savedViews, records: records.length, totalRecords: this.records, pendingViews: this.pendingViews, url, captureId, textChars: copy.text.length, reason: pendingReason };
    } finally { this.reading = false; finishReading(); }
  }
}

/** Test-only opener: an isolated Playwright context. The real app never substitutes Chrome Renzo with it. */
export const isolatedTestOpener: ManualOpener = async () => {
  const browser = await chromium.launch({ headless: false });
  try { return await browser.newContext(); } catch (error) { await browser.close(); throw error; }
};
