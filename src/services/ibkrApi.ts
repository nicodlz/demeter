/**
 * IBKR Flex Web Service client.
 *
 * The Flex Web Service works in two steps:
 *   1. SendRequest – triggers report generation, returns a ReferenceCode
 *   2. GetStatement – retrieves the generated report (XML)
 *
 * In dev, requests go through the Vite proxy (/api/ibkr → IBKR).
 * In production, deploy a backend proxy (Cloudflare Worker, Vercel, etc.)
 * and set VITE_IBKR_PROXY_URL accordingly.
 */

import type { IbkrPosition, IbkrCashBalance, IbkrAccount } from '@/schemas/ibkr';

// ============================================================
// Constants
// ============================================================

const FLEX_BASE_URL = import.meta.env.VITE_IBKR_PROXY_URL ?? '/api/ibkr';

const POLL_DELAY_MS = 5_000;
const MAX_POLL_ATTEMPTS = 6;

// ============================================================
// XML helpers (DOMParser, no external deps)
// ============================================================

function getAttr(el: Element, name: string): string {
  return el.getAttribute(name) ?? '';
}

function getNumAttr(el: Element, name: string): number {
  const v = el.getAttribute(name);
  if (v === null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ============================================================
// XML → domain model parsing
// ============================================================

function parsePositions(doc: Document): IbkrPosition[] {
  const positions: IbkrPosition[] = [];
  const elements = doc.querySelectorAll('OpenPosition');

  elements.forEach((el) => {
    const fxRate = getNumAttr(el, 'fxRateToBase') || 1;
    const marketValue = getNumAttr(el, 'positionValue');
    const unrealizedPnl = getNumAttr(el, 'fifoPnlUnrealized');
    const costBasisMoney = getNumAttr(el, 'costBasisMoney');

    positions.push({
      accountId: getAttr(el, 'accountId'),
      symbol: getAttr(el, 'symbol'),
      description: getAttr(el, 'description'),
      conid: getAttr(el, 'conid'),
      isin: getAttr(el, 'securityID'),
      assetCategory: getAttr(el, 'assetCategory') || 'OTHER',
      currency: getAttr(el, 'currency'),
      quantity: getNumAttr(el, 'position'),
      markPrice: getNumAttr(el, 'markPrice'),
      marketValue,
      costBasisPrice: getNumAttr(el, 'costBasisPrice'),
      costBasisMoney,
      unrealizedPnl,
      percentOfNav: getNumAttr(el, 'percentOfNAV'),
      fxRateToBase: fxRate,
      marketValueBase: marketValue * fxRate,
      unrealizedPnlBase: unrealizedPnl * fxRate,
      costBasisMoneyBase: costBasisMoney * fxRate,
    });
  });

  return positions;
}

function parseCashBalances(doc: Document): IbkrCashBalance[] {
  const balances: IbkrCashBalance[] = [];
  const elements = doc.querySelectorAll('CashReportCurrency');

  elements.forEach((el) => {
    const currency = getAttr(el, 'currency');
    // Skip the aggregate "BASE_SUMMARY" row
    if (!currency || currency === 'BASE_SUMMARY') return;
    const fxRate = getNumAttr(el, 'fxRateToBase') || 1;
    const endingCash = getNumAttr(el, 'endingCash');
    balances.push({
      currency,
      endingCash,
      endingSettledCash: getNumAttr(el, 'endingSettledCash'),
      fxRateToBase: fxRate,
      endingCashBase: endingCash * fxRate,
    });
  });

  return balances;
}

function parseNav(doc: Document): number {
  // NAV is usually an attribute on the EquitySummaryInBase or on FlexStatement
  const eqEl = doc.querySelector('EquitySummaryByReportDateInBase');
  if (eqEl) {
    const total = getNumAttr(eqEl, 'total');
    if (total !== 0) return total;
  }
  // Fallback: look for netAssetValue on the statement-level element
  const stmtEl = doc.querySelector('FlexStatement');
  if (stmtEl) {
    return getNumAttr(stmtEl, 'netAssetValue');
  }
  return 0;
}

function parseAccountId(doc: Document): string {
  const stmtEl = doc.querySelector('FlexStatement');
  if (stmtEl) {
    return getAttr(stmtEl, 'accountId');
  }
  // Fallback to first position's accountId
  const pos = doc.querySelector('OpenPosition');
  if (pos) return getAttr(pos, 'accountId');
  return '';
}

function parseFlexReport(xml: string): IbkrAccount {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  return {
    accountId: parseAccountId(doc),
    nav: parseNav(doc),
    positions: parsePositions(doc),
    cashBalances: parseCashBalances(doc),
    fetchedAt: new Date().toISOString(),
  };
}

// ============================================================
// Error handling
// ============================================================

export class IbkrApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'IbkrApiError';
    this.code = code;
  }
}

function extractErrorFromXml(xml: string): { code: string; message: string } | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const codeEl = doc.querySelector('ErrorCode');
  const msgEl = doc.querySelector('ErrorMessage');
  if (codeEl?.textContent) {
    return {
      code: codeEl.textContent,
      message: msgEl?.textContent ?? 'Unknown IBKR error',
    };
  }
  return null;
}

// ============================================================
// Flex Web Service workflow
// ============================================================

async function sendRequest(token: string, queryId: string): Promise<string> {
  // TODO: Route through backend proxy to hide token from browser
  const url = `${FLEX_BASE_URL}/SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=3`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Demeter/1.0' },
  });

  if (!resp.ok) {
    throw new IbkrApiError(
      `SendRequest HTTP error: ${resp.status} ${resp.statusText}`,
      'HTTP_ERROR',
    );
  }

  const xml = await resp.text();

  // Check for error
  const err = extractErrorFromXml(xml);
  if (err) {
    throw new IbkrApiError(`SendRequest failed: ${err.message}`, err.code);
  }

  // Extract reference code
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const refEl = doc.querySelector('ReferenceCode');
  const refCode = refEl?.textContent;

  if (!refCode) {
    throw new IbkrApiError(
      'SendRequest: no ReferenceCode in response',
      'NO_REF_CODE',
    );
  }

  return refCode;
}

async function getStatement(token: string, referenceCode: string): Promise<string> {
  // TODO: Route through backend proxy to hide token from browser
  const url = `${FLEX_BASE_URL}/GetStatement?t=${encodeURIComponent(token)}&q=${encodeURIComponent(referenceCode)}&v=3`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Demeter/1.0' },
  });

  if (!resp.ok) {
    throw new IbkrApiError(
      `GetStatement HTTP error: ${resp.status} ${resp.statusText}`,
      'HTTP_ERROR',
    );
  }

  return resp.text();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Public API
// ============================================================

/**
 * Fetch a complete portfolio snapshot from IBKR via the Flex Web Service.
 *
 * 1. Sends a request to generate the report.
 * 2. Polls until the report is ready (up to MAX_POLL_ATTEMPTS).
 * 3. Parses the XML into a typed IbkrAccount.
 */
export async function fetchIbkrPortfolio(
  flexToken: string,
  flexQueryId: string,
): Promise<IbkrAccount> {
  if (!flexToken || !flexQueryId) {
    throw new IbkrApiError(
      'IBKR Flex token and Query ID are required. Configure them in Settings.',
      'CONFIG_MISSING',
    );
  }

  // Step 1: Request report generation
  const referenceCode = await sendRequest(flexToken, flexQueryId);

  // Step 2: Wait then poll for the report
  await delay(POLL_DELAY_MS);

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const xml = await getStatement(flexToken, referenceCode);

    // Error code 1019 = still generating
    const err = extractErrorFromXml(xml);
    if (err) {
      if (err.code === '1019') {
        await delay(POLL_DELAY_MS);
        continue;
      }
      throw new IbkrApiError(`GetStatement failed: ${err.message}`, err.code);
    }

    // Successfully received report
    return parseFlexReport(xml);
  }

  throw new IbkrApiError(
    `Report generation timed out after ${MAX_POLL_ATTEMPTS} attempts`,
    'TIMEOUT',
  );
}
