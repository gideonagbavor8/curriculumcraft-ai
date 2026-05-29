export interface ApiResponse<T> {
  data: T;
  success: true;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;