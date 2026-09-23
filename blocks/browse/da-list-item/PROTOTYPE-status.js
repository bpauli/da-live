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

export const VARIANTS = {
  A: 'Labelled cell, detail underneath',
  B: 'Icon-led cell, parity with Previewed',
  C: 'Full-width strip under the cells',
};

export function getVariant() {
  const v = new URLSearchParams(window.location.search).get('variant');
  return VARIANTS[v] ? v : 'A';
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

    /* A: labelled cell, sixth column, detail underneath. */
    .proto-cell-a .proto-label-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
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

    /* C: full-width strip on its own line under the four native cells. */
    .proto-strip {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--s2-gray-100, #e6e6e6);
    }

    .proto-strip-head {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .proto-strip .proto-detail-row { gap: 6px; }

    /* Six-column drawer for A and B; C keeps the native five. */
    :host(.proto-variant-A) .da-item-list-item-details,
    :host(.proto-variant-B) .da-item-list-item-details {
      grid-template-columns: var(--da-list-action-width, 32px) 80px 1fr 182px 182px 220px;
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

export function protoDrawerCell(status, variant) {
  // undefined = loading (host has called the plugin, nothing back yet)
  if (status === undefined) {
    return html`
      <div class="proto-cell">
        <p class="proto-title">Workflow</p>
        <p>Checking</p>
      </div>`;
  }
  // null = no status for this page. The common case: render nothing at all.
  if (!status) return nothing;

  if (variant === 'A') {
    return html`
      <div class="proto-cell proto-cell-a proto-${status.state}">
        <p class="proto-title">Workflow</p>
        <div class="proto-label-row">
          ${icon(iconFor(status))}
          <span class="proto-label">${status.label}</span>
        </div>
        ${detailRows(status)}
        ${link(status)}
      </div>`;
  }

  if (variant === 'B') {
    return html`
      <div class="proto-cell proto-cell-b proto-${status.state}">
        ${icon(iconFor(status))}
        <div>
          <p class="proto-title">Workflow</p>
          <p class="proto-label">${status.label}</p>
          ${link(status)}
        </div>
      </div>`;
  }

  return html`
    <div class="proto-strip proto-${status.state}">
      <div class="proto-strip-head">
        ${icon(iconFor(status))}
        <span class="proto-title" style="margin:0">Workflow</span>
        <span class="proto-label">${status.label}</span>
      </div>
      ${detailRows(status)}
      ${link(status)}
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
