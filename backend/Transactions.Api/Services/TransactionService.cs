using Transactions.Api.Clients;
using Transactions.Api.Dtos;
using Transactions.Api.Entities;
using Transactions.Api.Exceptions;
using Transactions.Api.Mappings;
using Transactions.Api.Repositories;

namespace Transactions.Api.Services;

// Saga con compensación: no hay una transacción SQL que abarque las dos bases.
// Primero ajusto el stock en Products.Api (el paso que más falla) y después guardo;
// si el guardado falla, aplico el delta inverso.
public class TransactionService(
    ITransactionRepository transactionRepository,
    IProductsApiClient productsClient,
    ILogger<TransactionService> logger) : ITransactionService
{
    private const string UnavailableProductName = "Producto no disponible";

    public async Task<PagedResult<TransactionResponse>> GetPagedAsync(TransactionQueryParameters query)
    {
        ValidateDateRange(query);

        var (items, totalCount) = await transactionRepository.GetPagedAsync(query);
        Dictionary<int, string> productNames = await GetProductNamesAsync(items.Select(t => t.ProductId));

        return new PagedResult<TransactionResponse>(
            items.Select(t => t.ToResponse(productNames.GetValueOrDefault(t.ProductId, UnavailableProductName))).ToList(),
            query.Page,
            query.PageSize,
            totalCount);
    }

    public async Task<ProductHistoryResponse> GetProductHistoryAsync(int productId, TransactionQueryParameters query)
    {
        ValidateDateRange(query);

        ProductInfo product = await productsClient.GetProductAsync(productId)
            ?? throw new NotFoundException($"El producto {productId} no existe.");

        query.ProductId = productId;
        var (items, totalCount) = await transactionRepository.GetPagedAsync(query);

        var page = new PagedResult<TransactionResponse>(
            items.Select(t => t.ToResponse(product.Name)).ToList(),
            query.Page,
            query.PageSize,
            totalCount);

        return new ProductHistoryResponse(product.Id, product.Name, product.Stock, page);
    }

    public async Task<TransactionResponse> GetByIdAsync(int id)
    {
        Transaction transaction = await GetExistingTransactionAsync(id);
        Dictionary<int, string> productNames = await GetProductNamesAsync([transaction.ProductId]);
        return transaction.ToResponse(productNames.GetValueOrDefault(transaction.ProductId, UnavailableProductName));
    }

    public async Task<TransactionResponse> CreateAsync(CreateTransactionRequest request)
    {
        int delta = GetStockEffect(request.Type, request.Quantity);

        await productsClient.AdjustStockAsync(request.ProductId, delta);

        var transaction = new Transaction
        {
            TransactionDate = DateTime.UtcNow,
            Type = request.Type,
            ProductId = request.ProductId,
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            Detail = request.Detail?.Trim()
        };

        try
        {
            await transactionRepository.AddAsync(transaction);
        }
        catch
        {
            await CompensateStockAsync(request.ProductId, delta);
            throw;
        }

        return await GetByIdAsync(transaction.Id);
    }

    public async Task<TransactionResponse> UpdateAsync(int id, UpdateTransactionRequest request)
    {
        Transaction transaction = await GetExistingTransactionAsync(id);

        // delta = efecto(nueva) - efecto(antigua)
        int delta = GetStockEffect(request.Type, request.Quantity)
                  - GetStockEffect(transaction.Type, transaction.Quantity);

        // Si el stock no cambia no llamo a Products.Api, que rechaza ajustes de 0.
        if (delta != 0)
            await productsClient.AdjustStockAsync(transaction.ProductId, delta);

        transaction.Type = request.Type;
        transaction.Quantity = request.Quantity;
        transaction.UnitPrice = request.UnitPrice;
        transaction.Detail = request.Detail?.Trim();
        transaction.UpdatedAt = DateTime.UtcNow;

        try
        {
            await transactionRepository.SaveChangesAsync();
        }
        catch
        {
            if (delta != 0)
                await CompensateStockAsync(transaction.ProductId, delta);
            throw;
        }

        return await GetByIdAsync(id);
    }

    public async Task DeleteAsync(int id)
    {
        Transaction transaction = await GetExistingTransactionAsync(id);

        // Eliminar revierte el efecto: si la compra ya se vendió, Products.Api responde 409.
        int delta = -GetStockEffect(transaction.Type, transaction.Quantity);

        await productsClient.AdjustStockAsync(transaction.ProductId, delta);

        try
        {
            await transactionRepository.DeleteAsync(transaction);
        }
        catch
        {
            await CompensateStockAsync(transaction.ProductId, delta);
            throw;
        }
    }

    private static int GetStockEffect(TransactionType type, int quantity) =>
        type == TransactionType.Purchase ? quantity : -quantity;

    // Si la compensación también falla, solo queda registrarlo para revisión manual.
    private async Task CompensateStockAsync(int productId, int delta)
    {
        try
        {
            await productsClient.AdjustStockAsync(productId, -delta);
        }
        catch (Exception ex)
        {
            logger.LogCritical(ex,
                "No se pudo compensar el stock del producto {ProductId} (delta {Delta}). Requiere revisión manual.",
                productId, -delta);
        }
    }

    private async Task<Transaction> GetExistingTransactionAsync(int id) =>
        await transactionRepository.GetByIdAsync(id)
        ?? throw new NotFoundException($"La transacción {id} no existe.");

    // Una llamada por producto distinto y en paralelo; si Products.Api no responde, el listado se muestra igual.
    private async Task<Dictionary<int, string>> GetProductNamesAsync(IEnumerable<int> productIds)
    {
        try
        {
            ProductInfo?[] products = await Task.WhenAll(productIds.Distinct().Select(productsClient.GetProductAsync));
            return products.Where(p => p is not null).ToDictionary(p => p!.Id, p => p!.Name);
        }
        catch (ExternalServiceException ex)
        {
            logger.LogWarning(ex, "No se pudieron obtener los nombres de los productos.");
            return [];
        }
    }

    private static void ValidateDateRange(TransactionQueryParameters query)
    {
        if (query.From > query.To)
            throw new BusinessRuleException("La fecha inicial no puede ser mayor que la fecha final.");
    }
}