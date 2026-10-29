import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { Product, TransactionType } from '../../../core/models';
import { NotificationService } from '../../../core/notification.service';
import { ProductService } from '../../../core/product.service';
import { TransactionService } from '../../../core/transaction.service';

@Component({
  selector: 'app-transaction-form',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './transaction-form.html',
  styleUrl: './transaction-form.scss',
})
export class TransactionForm implements OnInit {
  private readonly transactionService = inject(TransactionService);
  private readonly productService = inject(ProductService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  // :id llega en la ruta de edición; ?productId= al crear desde el historial de un producto.
  readonly id = input<string>();
  readonly productId = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly products = signal<Product[]>([]);
  protected readonly selectedProduct = signal<Product | null>(null);
  protected readonly isSaving = signal(false);
  private readonly originalStockEffect = signal(0);

  // Al editar, el stock actual ya incluye esta transacción, así que se descuenta su efecto original.
  protected readonly availableStock = computed(() => {
    const product = this.selectedProduct();
    return product ? product.stock - this.originalStockEffect() : null;
  });

  // Mismos límites que CreateTransactionRequest/UpdateTransactionRequest del backend.
  protected readonly transactionForm = inject(FormBuilder).group(
    {
      productId: [null as number | null, Validators.required],
      type: ['Purchase' as TransactionType, Validators.required],
      quantity: [
        null as number | null,
        [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)],
      ],
      unitPrice: [null as number | null, [Validators.required, Validators.min(0)]],
      detail: ['', Validators.maxLength(500)],
    },
    { validators: (form) => this.validateStock(form) },
  );

  ngOnInit(): void {
    // El backend limita pageSize a 100; alcanza para el selector de esta prueba.
    this.productService
      .getAll({ page: 1, pageSize: 100 })
      .subscribe((pagedProducts) => this.products.set(pagedProducts.items));

    this.transactionForm.controls.productId.valueChanges.subscribe((productId) =>
      this.loadSelectedProduct(productId),
    );

    if (this.isEditMode()) {
      this.loadTransaction(Number(this.id()));
    } else if (this.productId()) {
      this.transactionForm.controls.productId.setValue(Number(this.productId()));
    }
  }

  protected save(): void {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    const { productId, type, quantity, unitPrice, detail } = this.transactionForm.getRawValue();
    const transactionData = {
      type: type!,
      quantity: quantity!,
      unitPrice: unitPrice!,
      detail: detail?.trim() || null,
    };

    const saveRequest = this.isEditMode()
      ? this.transactionService.update(Number(this.id()), transactionData)
      : this.transactionService.create({ ...transactionData, productId: productId! });

    this.isSaving.set(true);
    saveRequest.subscribe({
      next: () => {
        this.notification.success(
          this.isEditMode() ? 'Transacción actualizada' : 'Transacción registrada',
        );
        this.router.navigate(['/transactions'], { queryParams: { productId } });
      },
      // El interceptor ya mostró el error; solo se reactiva el botón.
      error: () => this.isSaving.set(false),
    });
  }

  private loadTransaction(id: number): void {
    this.transactionService.getById(id).subscribe((transaction) => {
      this.originalStockEffect.set(
        transaction.type === 'Sale' ? -transaction.quantity : transaction.quantity,
      );
      this.transactionForm.patchValue(transaction);
      // El producto no se cambia al editar: el backend no lo permite (UpdateTransactionRequest no lo incluye).
      this.transactionForm.controls.productId.disable({ emitEvent: false });
    });
  }

  private loadSelectedProduct(productId: number | null): void {
    if (!productId) {
      this.selectedProduct.set(null);
      return;
    }

    this.productService.getById(productId).subscribe((product) => {
      this.selectedProduct.set(product);
      if (!this.isEditMode()) {
        this.transactionForm.controls.unitPrice.setValue(product.price);
      }
      this.transactionForm.updateValueAndValidity();
    });
  }

  // Una venta no puede dejar el stock negativo. El backend lo vuelve a validar al ajustar el stock.
  private validateStock(form: AbstractControl): ValidationErrors | null {
    const type = form.get('type')?.value;
    const quantity = form.get('quantity')?.value;
    const availableStock = this.availableStock();

    if (type !== 'Sale' || !quantity || availableStock === null) return null;
    return quantity > availableStock ? { insufficientStock: true } : null;
  }
}