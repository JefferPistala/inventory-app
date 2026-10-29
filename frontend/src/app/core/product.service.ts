import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Category, PagedResult, Product, ProductFilters, ProductRequest } from './models';
import { toHttpParams } from './utils';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.productsApiUrl}/products`;

  getCategories() {
    return this.http.get<Category[]>(`${environment.productsApiUrl}/categories`);
  }

  getAll(filters: ProductFilters) {
    return this.http.get<PagedResult<Product>>(this.url, { params: toHttpParams(filters) });
  }

  getById(id: number) {
    return this.http.get<Product>(`${this.url}/${id}`);
  }

  create(request: ProductRequest) {
    return this.http.post<Product>(this.url, request);
  }

  update(id: number, request: ProductRequest) {
    return this.http.put<Product>(`${this.url}/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}