import { Response } from 'express';

export const successResponse = (res: Response, data: any, statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

export const errorResponse = (res: Response, message: string, statusCode: number = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const paginatedResponse = (
  res: Response,
  data: any[],
  pagination: PaginationMeta,
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination,
  });
};
