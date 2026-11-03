import { Response } from 'express';

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  last_page: number;
  has_more: boolean;
}

export const successResponse = (
  res: Response,
  data: any = null,
  message: string = '',
  statusCode: number = 200
) => {
  const payload: Record<string, any> = { success: true };
  if (message) payload.message = message;
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

export const paginatedResponse = (
  res: Response,
  items: any[],
  meta: PaginationMeta,
  message: string = ''
) => {
  const payload: Record<string, any> = {
    success: true,
    data: items,
    meta,
  };
  if (message) payload.message = message;
  return res.status(200).json(payload);
};

export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 400,
  errors: Record<string, string[]> = {}
) => {
  const payload: Record<string, any> = {
    success: false,
    message,
  };
  if (Object.keys(errors).length > 0) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};

