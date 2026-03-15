export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class ApiResponse<T> {
  data!: T;
  meta?: PaginationMeta;

  static ok<T>(data: T): ApiResponse<T> {
    const response = new ApiResponse<T>();
    response.data = data;
    return response;
  }

  static created<T>(data: T): ApiResponse<T> {
    return this.ok(data);
  }

  static paginated<T>(data: T[], meta: PaginationMeta): ApiResponse<T[]> {
    const response = new ApiResponse<T[]>();
    response.data = data;
    response.meta = meta;
    return response;
  }
}
