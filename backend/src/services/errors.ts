export type ServiceError = Error & {
  code: string;
  status: number;
};

export type ErrorDetail = {
  code: string;
  message: string;
  reason_code: string;
  instruction: string;
};

type ErrorReasonContext = Pick<ErrorDetail, 'instruction' | 'reason_code'>;

const defaultReasonContext: ErrorReasonContext = {
  reason_code: 'UNEXPECTED_ERROR',
  instruction: 'Retry the request or contact support.',
};

const reasonContextByStatus: Record<number, ErrorReasonContext> = {
  404: {
    reason_code: 'RESOURCE_NOT_FOUND',
    instruction: 'Verify the identifier or create a new session.',
  },
  409: {
    reason_code: 'STATE_CONFLICT',
    instruction: 'Fetch the latest state and resend the command.',
  },
  422: {
    reason_code: 'REQUEST_INVALID',
    instruction: 'Review the request payload and try again.',
  },
  503: {
    reason_code: 'SERVICE_UNAVAILABLE',
    instruction: 'Wait for the service to recover and retry.',
  },
};

const resolveReasonContext = (status: number): ErrorReasonContext =>
  reasonContextByStatus[status] ?? defaultReasonContext;

/**
 * API サービスで共通利用するエラーオブジェクトを生成する。
 * @param code API で返すエラーコード
 * @param status HTTP ステータスコード
 * @param message ユーザー向けメッセージ
 */
export const createServiceError = (
  code: string,
  status: number,
  message: string,
): ServiceError =>
  Object.assign(new Error(message), { code, status }) as ServiceError;

/**
 * HTTP レスポンスや SSE で共通利用するエラーペイロードを構築する。
 * @param input エラーコードや HTTP ステータスなどの情報。
 * @param input.code 返却するアプリケーションエラーコード。
 * @param input.message ユーザーへ表示する詳細メッセージ。
 * @param input.status HTTP ステータスコード。
 */
export const createErrorDetail = (input: {
  code: string;
  message: string;
  status: number;
}): ErrorDetail => {
  const context = resolveReasonContext(input.status);

  return {
    code: input.code,
    message: input.message,
    reason_code: context.reason_code,
    instruction: context.instruction,
  };
};

/**
 * エラーレスポンスボディを組み立てる。
 * @param input エラーの基本情報。
 * @param input.code 返却するアプリケーションエラーコード。
 * @param input.message ユーザーへ表示する詳細メッセージ。
 * @param input.status HTTP ステータスコード。
 */
export const createErrorResponseBody = (input: {
  code: string;
  message: string;
  status: number;
}) => ({
  error: createErrorDetail(input),
});

/**
 * ServiceError から HTTP レスポンスボディを生成する。
 * @param error ServiceError オブジェクト。
 */
export const mapServiceErrorToResponse = (error: ServiceError) =>
  createErrorResponseBody({
    code: error.code,
    message: error.message,
    status: error.status,
  });
