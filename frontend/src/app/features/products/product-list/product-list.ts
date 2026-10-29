import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { Category, Product } from '../../../core/models';
import { NotificationService } from '../../../core/notification.service';
import { ProductService } from '../../../core/product.service';

@Component({
  selector: 'app-product-list',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly notification = inject(NotificationService);

  protected readonly columns = ['image', 'name', 'category', 'price', 'stock', 'actions'];
  protected readonly products = signal<Product[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);

  protected readonly filters = inject(FormBuilder).group({
    name: [''],
    categoryId: [null as number | null],
    minPrice: [null as number | null],
    maxPrice: [null as number | null],
  });

  ngOnInit(): void {
    this.productService.getCategories().subscribe((categories) => this.categories.set(categories));
    this.load();
  }

  protected search(): void {
    this.page.set(1);
    this.load();
  }

  protected clear(): void {
    this.filters.reset();
    this.search();
  }

  protected changePage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  protected delete(product: Product): void {
    if (!confirm(`¿Eliminar el producto "${product.name}"?`)) return;

    this.productService.delete(product.id).subscribe(() => {
      this.notification.success('Producto eliminado');
      this.load();
    });
  }

  private load(): void {
    this.productService
      .getAll({ ...this.filters.getRawValue(), page: this.page(), pageSize: this.pageSize() })
      .subscribe((result) => {
        this.products.set(result.items);
        this.totalCount.set(result.totalCount);
      });
  }
}