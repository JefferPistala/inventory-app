import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import {
  Product,
  TRANSACTION_TYPE_LABELS,
  Transaction,
  TransactionType,
} from '../../../core/models';
import { NotificationService } from '../../../core/notification.service';
import { ProductService } from '../../../core/product.service';
import { TransactionService } from '../../../core/transaction.service';
import { toDateParam } from '../../../core/utils';

@Component({
  selector: 'app-transaction-list',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './transaction-list.html',
  styleUrl: './transaction-list.scss',
})
export class TransactionList implements OnInit {
  private readonly transactionService = inject(TransactionService);
  private readonly productService = inject(ProductService);
  private readonly notification = inject(NotificationService);

  // Llega desde /transactions?productId=2 (botón "Historial" del listado de productos).
  readonly productId = input<string>();

  protected readonly displayedColumns = [
    'date',
    'type',
    'product',
    'quantity',
    'unitPrice',
    'totalPrice',
    'detail',
    'actions',
  ];
  protected readonly transactions = signal<Transaction[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly selectedProduct = signal<Product | null>(null);
  protected readonly totalCount = signal(0);
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);

  protected readonly filtersForm = inject(FormBuilder).group({
    productId: [null as number | null],
    type: [null as TransactionType | null],
    from: [null as Date | null],
    to: [null as Date | null],
  });

  ngOnInit(): void {
    // El backend limita pageSize a 100; alcanza para el selector de esta prueba.
    this.productService
      .getAll({ page: 1, pageSize: 100 })
      .subscribe((pagedProducts) => this.products.set(pagedProducts.items));

    if (this.productId()) {
      this.filtersForm.patchValue({ productId: Number(this.productId()) });
    }
    this.loadTransactions();
  }

  protected search(): void {
    this.currentPage.set(1);
    this.loadTransactions();
  }

  protected clearFilters(): void {
    this.filtersForm.reset();
    this.search();
  }

  protected changePage(event: PageEvent): void {
    this.currentPage.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.loadTransactions();
  }

  protected deleteTransaction(transaction: Transaction): void {
    if (!confirm('¿Eliminar la transacción? Se revertirá su efecto en el stock.')) return;

    this.transactionService.delete(transaction.id).subscribe(() => {
      this.notification.success('Transacción eliminada');
      this.loadTransactions();
    });
  }

  protected typeLabel(type: TransactionType): string {
    return TRANSACTION_TYPE_LABELS[type];
  }

  private loadTransactions(): void {
    const { productId, type, from, to } = this.filtersForm.getRawValue();

    this.transactionService
      .getAll({
        productId,
        type,
        from: toDateParam(from),
        to: toDateParam(to),
        page: this.currentPage(),
        pageSize: this.pageSize(),
      })
      .subscribe((pagedTransactions) => {
        this.transactions.set(pagedTransactions.items);
        this.totalCount.set(pagedTransactions.totalCount);
      });

    this.loadSelectedProduct(productId);
  }

  // Se vuelve a consultar en cada carga para mostrar el stock actualizado tras eliminar.
  private loadSelectedProduct(productId: number | null): void {
    if (!productId) {
      this.selectedProduct.set(null);
      return;
    }
    this.productService.getById(productId).subscribe((product) => this.selectedProduct.set(product));
  }
}