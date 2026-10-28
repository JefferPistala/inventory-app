using Products.Api.Dtos;
using Products.Api.Mappings;
using Products.Api.Repositories;

namespace Products.Api.Services;

public class CategoryService(ICategoryRepository categoryRepository) : ICategoryService
{
    public async Task<IReadOnlyList<CategoryResponse>> GetAllAsync() =>
        (await categoryRepository.GetAllAsync())
            .Select(c => c.ToResponse())
            .ToList();
}