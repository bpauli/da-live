/*
 * PROTOTYPE v2 - THROWAWAY CODE. DO NOT MERGE.
 *
 * Question: what should the plugin-contributed workflow status CELL look like
 * inside the item details drawer? Three structurally different treatments,
 * switchable with ?variant=A|B|C on the browse URL.
 *
 * v1 (row badges: pill / edge rail / status column) was rejected in
 * https://github.com/bpauli/da-live/issues/21 because a badge on every row
 * forces eager loading. v2 therefore:
 *   - never touches the collapsed row,
 *   - loads LAZILY on expand, refetching on every expand (like updateAEMStatus),
 *   - uses SHORT labels ("In Review", "Approved"),
 *   - takes a per-status ICON name from the plugin,
 *   - tints by state: neutral | pending | positive | negative.
 *
 * Contract: https://github.com/bpauli/da-live/issues/20 (see superseding comment)
 *   async getStatus(item, ctx) -> { state, label, icon?, detail?, href? } | null
 *
 * NOTE ON ICONS: the host default `workflow` does not exist yet in DA's curated
 * set (https://github.com/bpauli/da-live/issues/25), so this prototype uses
 * `history` as the stand-in default. Per-status icons below are all real,
 * verified to resolve at /img/icons/s2-icon-<name>-20-n.svg.
 *
 * Fake data only. No network, no plugin, no worker.
 */

import { html, nothing } from 'da-lit';
import { getNx2 } from '../../../scripts/utils.js';

// v3: B won. Detail moved into a CLICK-triggered popover on the icon.
await import(`${getNx2()}/blocks/shared/popover/popover.js`);

export const VARIANTS = { B: 'Icon-led cell, detail in a click popover' };

export function getVariant() {
  return 'B';
}

/* ---------------------------------------------------------------- fake data */

const LATENCY_MS = 900; // simulates one request per expand

const STATUSES = [
  null,
  null,
  {
    state: 'pending',
    label: 'In Review',
    icon: 'clock',
    detail: [
      { label: 'Requested by', value: 'pauli' },
      { label: 'Approver', value: 'ana' },
      { label: 'Requested', value: 'Sep 22, 2026 3:07 PM' },
    ],
    href: '#/apps/publish-requests-inbox',
  },
  null,
  {
    state: 'negative',
    label: 'Changes requested',
    icon: 'cancel',
    detail: [
      { label: 'Reviewer', value: 'ana' },
      { label: 'Comment', value: 'Legal copy in the second section is out of date.' },
    ],
    href: '#/apps/publish-requests-inbox',
  },
  null,
  {
    state: 'positive',
    label: 'Approved',
    icon: 'checkmarkcircle',
    detail: [
      { label: 'Approved by', value: 'ana' },
      { label: 'Approved', value: 'Sep 23, 2026 9:12 AM' },
    ],
  },
  null,
  {
    state: 'neutral',
    label: 'Draft',
    // No icon: exercises the fallback chain (status icon -> config icon -> host default).
    detail: [{ label: 'Owner', value: 'pauli' }],
  },
  null,
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 9973;
  return h;
}

// Stands in for: await getStatus(item, ctx), called by the host on expand.
export function protoFetchStatus({ path, ext }) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!ext || ext === 'link') resolve(null); // item-kind prefilter
      else resolve(STATUSES[hash(path) % STATUSES.length]);
    }, LATENCY_MS);
  });
}

const CONFIG_ICON = 'comment'; // the config row's default icon
const HOST_ICON = 'history'; // stands in for the missing `workflow` icon

function iconFor(status) {
  return status.icon || CONFIG_ICON || HOST_ICON;
}

/* ------------------------------------------------------------------ styles */

export const protoStyles = html`
  <style>
    .proto-neutral { --proto-color: light-dark(#6e6e6e, #a5a5a5); }
    .proto-pending { --proto-color: #d38300; }
    .proto-positive { --proto-color: #007a4d; }
    .proto-negative { --proto-color: #c9252d; }

    .proto-icon {
      width: 20px;
      height: 20px;
      flex: 0 0 auto;
      color: var(--proto-color);
    }

    .proto-title {
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 3px;
    }

    .proto-label { font-weight: 700; }

    .proto-detail-row {
      display: flex;
      gap: 6px;
      line-height: 1.5;
      color: var(--s2-gray-700, #464646);
    }

    .proto-detail-key { font-weight: 700; }

    .proto-link {
      display: inline-block;
      margin-top: 4px;
      color: var(--s2-blue-800, #0265dc);
    }

    /* B: icon-led, mirrors the Previewed / Published anatomy. */
    .proto-cell-b {
      display: flex;
      gap: var(--s2-spacing-100, 8px);
      align-items: flex-start;
    }

    .proto-cell-b .proto-icon {
      width: 32px;
      height: 32px;
    }

    /* The icon is the trigger. Only interactive when there IS detail. */
    .proto-icon-btn {
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      border-radius: 4px;
      line-height: 0;
    }

    .proto-icon-btn:focus-visible {
      outline: 2px solid var(--s2-blue-800, #0265dc);
      outline-offset: 2px;
    }

    .proto-icon-btn .proto-icon {
      width: 32px;
      height: 32px;
    }

    .proto-pop-inner {
      padding: 12px 14px;
      min-width: 220px;
      max-width: 320px;
      font-size: 14px;
    }

    .proto-pop-title {
      margin: 0 0 8px;
      font-weight: 700;
    }

    /* Sixth column, narrower than A needed because detail moved out. */
    :host(.proto-variant-B) .da-item-list-item-details {
      grid-template-columns: var(--da-list-action-width, 32px) 80px 1fr 182px 182px 160px;
    }
  </style>
`;

/* ------------------------------------------------------------------- cells */

const icon = (name) => html`<svg class="proto-icon" viewBox="0 0 20 20" aria-hidden="true"><use href="/img/icons/s2-icon-${name}-20-n.svg#icon"></use></svg>`;

const detailRows = (status) => (status.detail ?? []).map((d) => html`
  <div class="proto-detail-row">
    <span class="proto-detail-key">${d.label}</span>
    <span>${d.value}</span>
  </div>`);

const link = (status) => (status.href
  ? html`<a class="proto-link" href=${status.href}>Open in inbox</a>`
  : nothing);

function openDetail(e) {
  const btn = e.currentTarget;
  const pop = btn.parentElement.querySelector('nx-popover');
  if (pop.open) {
    pop.close();
    return;
  }
  pop.show({ anchor: btn, placement: 'below' });
  btn.setAttribute('aria-expanded', 'true');
  pop.addEventListener('close', () => {
    btn.setAttribute('aria-expanded', 'false');
    btn.focus();
  }, { once: true });
}

export function protoDrawerCell(status) {
  // undefined = loading. Same cell, same place, so nothing jumps when data lands.
  if (status === undefined) {
    return html`
      <div class="proto-cell-b proto-neutral">
        <svg class="proto-icon" viewBox="0 0 20 20" aria-hidden="true"></svg>
        <div>
          <p class="proto-title">Workflow</p>
          <p>Checking</p>
        </div>
      </div>`;
  }
  // null = no status. The common case: render nothing at all.
  if (!status) return nothing;

  const hasDetail = !!status.detail?.length;

  return html`
    <div class="proto-cell-b proto-${status.state}">
      ${hasDetail ? html`
        <button
          class="proto-icon-btn"
          type="button"
          aria-haspopup="dialog"
          aria-expanded="false"
          aria-label="${status.label} details"
          @click=${openDetail}>
          ${icon(iconFor(status))}
        </button>
        <nx-popover class="proto-pop">
          <div class="proto-pop-inner">
            <p class="proto-pop-title">${status.label}</p>
            ${detailRows(status)}
            ${link(status)}
          </div>
        </nx-popover>
      ` : icon(iconFor(status))}
      <div>
        <p class="proto-title">Workflow</p>
        <p class="proto-label">${status.label}</p>
      </div>
    </div>`;
}

/* ------------------------------------------------------------- the switcher */

export function mountProtoSwitcher() {
  if (document.querySelector('.proto-switcher')) return;

  const keys = Object.keys(VARIANTS);
  const go = (dir) => {
    const current = getVariant();
    const next = keys[(keys.indexOf(current) + dir + keys.length) % keys.length];
    const url = new URL(window.location.href);
    url.searchParams.set('variant', next);
    window.location.href = url.toString();
  };

  const bar = document.createElement('div');
  bar.className = 'proto-switcher';
  bar.innerHTML = `
    <button data-dir="-1" aria-label="Previous variant">&#8592;</button>
    <span>${getVariant()} (${VARIANTS[getVariant()]})</span>
    <button data-dir="1" aria-label="Next variant">&#8594;</button>`;
  Object.assign(bar.style, {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 14px',
    borderRadius: '999px',
    background: '#111',
    color: '#fff',
    font: '13px/1 system-ui, sans-serif',
    boxShadow: '0 4px 16px rgb(0 0 0 / 35%)',
  });
  bar.querySelectorAll('button').forEach((b) => {
    Object.assign(b.style, {
      background: 'transparent',
      border: '0',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '15px',
    });
    b.addEventListener('click', () => go(Number(b.dataset.dir)));
  });
  document.body.append(bar);

  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  });
}
