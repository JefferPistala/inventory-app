import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { Category, ProductRequest } from '../../../core/models';
import { NotificationService } from '../../../core/notification.service';
import { ProductService } from '../../../core/product.service';

@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  // Llega desde la ruta products/:id/edit gracias a withComponentInputBinding().
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly categories = signal<Category[]>([]);
  protected readonly isSaving = signal(false);

  // Mismos límites que CreateProductRequest/UpdateProductRequest del backend.
  protected readonly productForm = inject(FormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(150), Validators.pattern(/\S/)]],
    description: ['', Validators.maxLength(500)],
    categoryId: [null as number | null, Validators.required],
    imageUrl: ['', [Validators.maxLength(500), Validators.pattern(/^https?:\/\/\S+$/)]],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.productService.getCategories().subscribe((categories) => this.categories.set(categories));

    if (this.isEditMode()) {
      this.productService
        .getById(Number(this.id()))
        .subscribe((product) => this.productForm.patchValue(product));
    }
  }

  protected save(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const formValue = this.productForm.getRawValue();
    const request: ProductRequest = {
      name: formValue.name!.trim(),
      description: formValue.description || null,
      categoryId: formValue.categoryId!,
      imageUrl: formValue.imageUrl || null,
      price: formValue.price!,
    };

    const saveRequest = this.isEditMode()
      ? this.productService.update(Number(this.id()), request)
      : this.productService.create(request);

    this.isSaving.set(true);
    saveRequest.subscribe({
      next: () => {
        this.notification.success(this.isEditMode() ? 'Producto actualizado' : 'Producto creado');
        this.router.navigate(['/products']);
      },
      // El interceptor ya mostró el error; solo se reactiva el botón.
      error: () => this.isSaving.set(false),
    });
  }
}