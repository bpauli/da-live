/*
 * PROTOTYPE - THROWAWAY CODE. DO NOT MERGE.
 *
 * Question: what should a plugin-contributed workflow status look like in the
 * browse list? Three variants of the row badge and the drawer cell, switchable
 * with ?variant=A|B|C on the browse URL, rendered on the real browse page with
 * real rows and real density.
 *
 * Ticket: https://github.com/bpauli/da-live/issues/21
 * Contract being rendered: https://github.com/bpauli/da-live/issues/20
 *   getStatus(item, ctx) -> { state, label, detail?, href? } | null
 *   state: neutral | pending | positive | negative
 *   null is the COMMON case: most rows have no status.
 *
 * Fake data only. No network, no plugin, no worker.
 */

import { html, nothing } from 'da-lit';

export const VARIANTS = {
  A: 'Pill in the row',
  B: 'Edge rail, words in the drawer only',
  C: 'Status column',
};

export function getVariant() {
  const v = new URLSearchParams(window.location.search).get('variant');
  return VARIANTS[v] ? v : 'A';
}

/* ---------------------------------------------------------------- fake data */

// Simulates the host-owned warm store: nothing is known for ~1.5s after load,
// so the empty -> filled transition is visible. The real host does not call
// getStatus at all during this window.
const WARM_MS = 1500;
let warm = false;
const listeners = new Set();
setTimeout(() => {
  warm = true;
  listeners.forEach((cb) => cb());
}, WARM_MS);

export function onWarm(cb) {
  if (warm) return () => {};
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const STATUSES = [
  null,
  null,
  null,
  {
    state: 'pending',
    label: 'Pending approval',
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
    // Deliberately long: tests truncation at row density.
    label: 'Changes requested by the reviewer, please revise and resubmit',
    detail: [
      { label: 'Requested by', value: 'pauli' },
      { label: 'Reviewer', value: 'ana' },
      { label: 'Comment', value: 'Legal copy in the second section is out of date.' },
    ],
    href: '#/apps/publish-requests-inbox',
  },
  null,
  {
    state: 'positive',
    label: 'Approved',
    detail: [
      { label: 'Approved by', value: 'ana' },
      { label: 'Approved', value: 'Sep 23, 2026 9:12 AM' },
    ],
  },
  null,
  null,
  {
    state: 'neutral',
    label: 'In review',
    detail: [{ label: 'Reviewer', value: 'ana' }],
  },
  null,
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 9973;
  return h;
}

// Stands in for: getStatus(item, ctx) over host-owned warm data.
export function protoStatusFor({ path, ext }) {
  if (!warm) return undefined; // not warmed: host would not call the plugin at all
  if (!ext || ext === 'link') return null; // item-kind prefilter (issue #19)
  return STATUSES[hash(path) % STATUSES.length];
}

/* ------------------------------------------------------------------ styles */

export const protoRowStyles = html`
  <style>
    .proto-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      font-size: 12px;
    }

    .proto-dot {
      flex: 0 0 auto;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--proto-color);
    }

    .proto-badge-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .proto-neutral { --proto-color: var(--s2-gray-500, #8f8f8f); }
    .proto-pending { --proto-color: #d38300; }
    .proto-positive { --proto-color: #007a4d; }
    .proto-negative { --proto-color: #c9252d; }

    /* Variant A: pill sitting before the Modified date. */
    :host(.proto-variant-A) .da-item-list-item-title {
      grid-template-columns: 1fr auto auto;
    }

    .proto-a {
      padding: 3px 10px 3px 8px;
      border-radius: 10px;
      background: light-dark(#f3f3f3, #2a2a2a);
      max-width: 200px;
      margin-right: 16px;
    }

    /* Variant B: rail at the row edge, dot after the name, no words. */
    :host(.proto-railed) .da-item-list-item-inner::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: var(--proto-rail-color);
    }

    .proto-name-dot {
      flex: 0 0 auto;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--proto-color);
    }

    /* Variant C: its own column between Name and Modified. */
    :host(.proto-columned) .da-item-list-item-title {
      grid-template-columns: 1fr 140px auto;
    }

    .proto-c {
      max-width: 140px;
      color: var(--s2-gray-700, #464646);
    }

    /* Drawer cells */
    .proto-drawer-title {
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 3px;
    }

    .proto-drawer-b {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .proto-drawer-c p { margin: 0 0 4px; }

    .proto-drawer-c .proto-detail-row {
      display: flex;
      gap: 6px;
      color: var(--s2-gray-700, #464646);
      line-height: 1.5;
    }

    .proto-detail-key { font-weight: 700; }

    .proto-link {
      display: inline-block;
      margin-top: 4px;
      color: var(--s2-blue-800, #0265dc);
    }

    :host(.proto-columned) .da-item-list-item-details,
    :host(.proto-drawer-wide) .da-item-list-item-details {
      grid-template-columns: var(--da-list-action-width, 32px) 80px 1fr 182px 182px 200px;
    }
  </style>
`;

/* ----------------------------------------------------------------- the row */

export function protoRowBadge(status, variant) {
  if (variant === 'B' || !status) return nothing;
  const cls = variant === 'A' ? 'proto-a' : 'proto-c';
  return html`
    <div class="proto-badge ${cls} proto-${status.state}" title=${status.label}>
      <span class="proto-dot"></span>
      <span class="proto-badge-text">${status.label}</span>
    </div>`;
}

export function protoNameDot(status, variant) {
  if (variant !== 'B' || !status) return nothing;
  return html`<span class="proto-name-dot proto-${status.state}" aria-label=${status.label}></span>`;
}

/* -------------------------------------------------------------- the drawer */

export function protoDrawerCell(status, variant) {
  if (status === undefined) {
    return html`<div class="proto-drawer">
      <p class="proto-drawer-title">Workflow</p>
      <p>Checking</p>
    </div>`;
  }
  if (!status) return nothing;

  if (variant === 'A') {
    return html`
      <div class="proto-drawer">
        <p class="proto-drawer-title">Workflow</p>
        <p>${status.label}</p>
      </div>`;
  }

  if (variant === 'B') {
    const bits = (status.detail ?? []).map((d) => d.value).join(' - ');
    return html`
      <div class="proto-drawer proto-drawer-b proto-${status.state}">
        <span class="proto-dot"></span>
        <p>${status.label}${bits ? html` - ${bits}` : nothing}</p>
      </div>`;
  }

  return html`
    <div class="proto-drawer proto-drawer-c proto-${status.state}">
      <p class="proto-drawer-title">Workflow</p>
      <p>${status.label}</p>
      ${(status.detail ?? []).map((d) => html`
        <div class="proto-detail-row">
          <span class="proto-detail-key">${d.label}</span>
          <span>${d.value}</span>
        </div>`)}
      ${status.href ? html`<a class="proto-link" href=${status.href}>Open in inbox</a>` : nothing}
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
