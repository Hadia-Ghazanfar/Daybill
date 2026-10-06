import { toPng } from 'html-to-image';

/**
 * WhatsApp invoice-share engine — implements the contract flow EXACTLY:
 *  1. Caller shows the "Preparing…" sheet BEFORE calling shareInvoiceImage.
 *  2. Everything is wrapped in a timeout race (~8s total); each awaited
 *     sub-step (fonts, images, render, blob) gets its own timeout.
 *  3. On success: trigger a REAL download (a[download] click + object URL)
 *     and return true ONLY if the download was actually initiated.
 *  4. On ANY failure/timeout: return an Error — never hang, never resolve
 *     true without a real download.
 */

const TOTAL_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const gate = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), gate]);
}

/** Wait for webfonts + all <img> inside the node, each with its own timeout. */
async function waitForAssets(node: HTMLElement): Promise<void> {
  const jobs: Promise<unknown>[] = [];

  try {
    if (document.fonts && document.fonts.ready) {
      jobs.push(
        withTimeout(
          document.fonts.ready.then(() => undefined),
          2500,
          'fonts-timeout',
        ).catch(() => undefined),
      );
    }
  } catch {
    /* fonts API unavailable — continue */
  }

  node.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth > 0) return;
    jobs.push(
      new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            resolve();
          }
        };
        const t = setTimeout(finish, 2500);
        img.addEventListener('load', () => { clearTimeout(t); finish(); }, { once: true });
        img.addEventListener('error', () => { clearTimeout(t); finish(); }, { once: true });
      }),
    );
  });

  await Promise.all(jobs);
}

/** Render the invoice node to a PNG Blob. Throws on any failure. */
export async function renderInvoicePng(node: HTMLElement): Promise<Blob> {
  const width = node.offsetWidth || 800;
  const height = node.offsetHeight || 1100;

  await waitForAssets(node);

  const dataUrl = await withTimeout(
    toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      width,
      height,
      style: { margin: '0' },
    }),
    6000,
    'render-timeout',
  );

  const res = await withTimeout(fetch(dataUrl), 3000, 'blob-timeout');
  const blob = await res.blob();
  if (!blob || blob.size < 100) throw new Error('empty-image');
  return blob;
}

function triggerDownload(blob: Blob, fileName: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    // `download` must be supported for the click to count as a real download.
    const supported = typeof a.download === 'string';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    return supported;
  } catch {
    return false;
  }
}

export interface ShareInvoiceArgs {
  invoiceNode: HTMLElement | null;
  phone: string;
  fileName: string;
}

/**
 * Full contract flow: render PNG → real download.
 * Resolves `true` only when the download was actually initiated, else an Error.
 */
export async function shareInvoiceImage({ invoiceNode, fileName }: ShareInvoiceArgs): Promise<true | Error> {
  const run = (async (): Promise<true> => {
    if (!invoiceNode) throw new Error('missing-node');
    const blob = await renderInvoicePng(invoiceNode);
    const started = triggerDownload(blob, fileName);
    if (!started) throw new Error('download-blocked');
    return true;
  })();

  try {
    return await withTimeout(run, TOTAL_TIMEOUT_MS, 'share-timeout');
  } catch (e) {
    return e instanceof Error ? e : new Error('share-failed');
  }
}

type NavigatorWithShare = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

/**
 * "Share image to another app": navigator.share({files}) when canShare,
 * otherwise fall back to a download. Resolves true only when sharing or the
 * fallback download actually started. User-cancel sets `cancelled` on the Error.
 */
export async function shareViaNative(files: File[], title = 'Invoice'): Promise<true | Error> {
  try {
    const nav = navigator as NavigatorWithShare;
    if (nav.canShare && nav.share && nav.canShare({ files })) {
      await nav.share({ files, title });
      return true;
    }
    const started = triggerDownload(files[0], files[0].name);
    if (!started) throw new Error('download-blocked');
    return true;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('share-failed');
    if ((e as { name?: string })?.name === 'AbortError') {
      (err as { cancelled?: boolean }).cancelled = true;
    }
    return err;
  }
}

/** True when the error came from the user dismissing the native share sheet. */
export function isShareCancelled(err: Error): boolean {
  return (err as { cancelled?: boolean }).cancelled === true;
}
