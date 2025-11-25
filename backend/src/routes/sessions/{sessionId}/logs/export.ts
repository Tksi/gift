import { respondNotFound } from 'routes/sessions/shared.js';
import type { Context } from 'hono';
import type { SessionRouteDependencies } from 'routes/sessions/types.js';

const CSV_HEADERS = [
  'id',
  'turn',
  'actor',
  'action',
  'timestamp',
  'chipsDelta',
  'details',
];

const toCsvRow = (values: readonly unknown[]): string =>
  values
    .map((value) => {
      if (value === undefined || value === null) {
        return '';
      }

      const text = typeof value === 'string' ? value : JSON.stringify(value);

      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }

      return text;
    })
    .join(',');

const createCsvBody = (
  entries: ReturnType<SessionRouteDependencies['store']['listEventLogAfter']>,
) => {
  const rows = [CSV_HEADERS.join(',')];

  for (const entry of entries) {
    rows.push(
      toCsvRow([
        entry.id,
        entry.turn,
        entry.actor,
        entry.action,
        entry.timestamp,
        entry.chipsDelta ?? '',
        entry.details ?? '',
      ]),
    );
  }

  return rows.join('\n');
};

const respondMissingSession = (c: Context) =>
  respondNotFound(c, 'SESSION_NOT_FOUND', 'Session does not exist.');

/**
 * イベントログを CSV へ整形しレスポンスへ書き込む。
 * @param c Hono コンテキスト。
 * @param dependencies セッションストアなどの依存性。
 */
export const handleLogsCsvExport = (
  c: Context,
  dependencies: SessionRouteDependencies,
) => {
  const sessionId = c.req.param('sessionId');
  const envelope = dependencies.store.getEnvelope(sessionId);

  if (!envelope) {
    return respondMissingSession(c);
  }

  const entryCount = envelope.eventLog.length;
  const csv = createCsvBody(envelope.eventLog);

  dependencies.monitoring?.logExport({
    sessionId,
    format: 'csv',
    entryCount,
  });

  c.header('content-type', 'text/csv; charset=utf-8');
  c.header(
    'content-disposition',
    `attachment; filename="session-${sessionId}-logs.csv"`,
  );

  return c.body(csv, 200);
};

/**
 * イベントログを JSON 形式で返す。
 * @param c Hono コンテキスト。
 * @param dependencies セッションストアなどの依存性。
 */
export const handleLogsJsonExport = (
  c: Context,
  dependencies: SessionRouteDependencies,
) => {
  const sessionId = c.req.param('sessionId');
  const envelope = dependencies.store.getEnvelope(sessionId);

  if (!envelope) {
    return respondMissingSession(c);
  }

  const entryCount = envelope.eventLog.length;
  dependencies.monitoring?.logExport({
    sessionId,
    format: 'json',
    entryCount,
  });

  c.header(
    'content-disposition',
    `attachment; filename="session-${sessionId}-logs.json"`,
  );

  return c.json(
    {
      session_id: sessionId,
      event_log: envelope.eventLog,
    },
    200,
  );
};
