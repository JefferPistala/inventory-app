import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  CreateTransactionRequest,
  PagedResult,
  Transaction,
  TransactionFilters,
  UpdateTransactionRequest,
} from './models';
import { toHttpParams } from './utils';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.transactionsApiUrl}/transactions`;

  getAll(filters: TransactionFilters) {
    return this.http.get<PagedResult<Transaction>>(this.url, { params: toHttpParams(filters) });
  }

  getById(id: number) {
    return this.http.get<Transaction>(`${this.url}/${id}`);
  }

  create(request: CreateTransactionRequest) {
    return this.http.post<Transaction>(this.url, request);
  }

  update(id: number, request: UpdateTransactionRequest) {
    return this.http.put<Transaction>(`${this.url}/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}