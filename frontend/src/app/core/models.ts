export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  imageUrl: string | null;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface ProductRequest {
  name: string;
  description: string | null;
  categoryId: number;
  imageUrl: string | null;
  price: number;
}

export interface ProductFilters {
  name?: string | null;
  categoryId?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  page: number;
  pageSize: number;
}

export type TransactionType = 'Purchase' | 'Sale';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  Purchase: 'Compra',
  Sale: 'Venta',
};

export interface Transaction {
  id: number;
  transactionDate: string;
  type: TransactionType;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  detail: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateTransactionRequest {
  productId: number;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  detail: string | null;
}

export type UpdateTransactionRequest = Omit<CreateTransactionRequest, 'productId'>;

export interface TransactionFilters {
  productId?: number | null;
  type?: TransactionType | null;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

