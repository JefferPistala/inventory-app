import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from './notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      notification.error(getErrorMessage(error));
      return throwError(() => error);
    }),
  );
};

function getErrorMessage(error: HttpErrorResponse): string {
  // Status 0: no hubo respuesta HTTP (API apagada o petición bloqueada por CORS).
  if (error.status === 0) return 'No se pudo conectar con el servidor.';

  const problem = error.error;
  if (problem?.errors) {
    const firstErrors = Object.values(problem.errors as Record<string, string[]>)[0];
    if (firstErrors?.length) return firstErrors[0];
  }
  return problem?.detail ?? problem?.title ?? 'Ocurrió un error inesperado.';
}