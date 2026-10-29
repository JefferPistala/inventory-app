using Transactions.Api.Dtos;
using Transactions.Api.Entities;

namespace Transactions.Api.Mappings;

public static class TransactionMappings
{
    public static TransactionResponse ToResponse(this Transaction transaction, string productName) => new(
        transaction.Id,
        transaction.TransactionDate,
        transaction.Type,
        transaction.ProductId,
        productName,
        transaction.Quantity,
        transaction.UnitPrice,
        transaction.TotalPrice,
        transaction.Detail,
        transaction.CreatedAt,
        transaction.UpdatedAt);
}