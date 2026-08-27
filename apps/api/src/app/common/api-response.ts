export interface ApiControllerPayload<T, TMeta = unknown> {
  data: T;
  meta?: TMeta;
}

export interface ApiSuccessResponse<T, TMeta = unknown> {
  success: true;
  data: T;
  meta?: TMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T, TMeta = unknown> = ApiSuccessResponse<T, TMeta> | ApiErrorResponse;

export function isApiControllerPayload(value: unknown): value is ApiControllerPayload<unknown> {
  return typeof value === 'object' && value !== null && Object.prototype.hasOwnProperty.call(value, 'data');
}
