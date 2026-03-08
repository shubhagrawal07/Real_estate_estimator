export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiErrorBody {
  success: false;
  error: string;
}
