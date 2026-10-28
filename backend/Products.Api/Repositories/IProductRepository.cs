using Products.Api.Dtos;
using Products.Api.Entities;

namespace Products.Api.Repositories;

public interface IProductRepository
{
    Task<(IReadOnlyList<Product> Items, int TotalCount)> GetPagedAsync(ProductQueryParameters query);

    Task<Product?> GetByIdAsync(int id);

    Task AddAsync(Product product);

    Task SaveChangesAsync();

    Task<bool> TryAdjustStockAsync(int productId, int delta);
}