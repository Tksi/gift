export type ServiceError = Error & {
  code: string;
  status: number;
};

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
