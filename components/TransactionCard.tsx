interface TransactionCardProps {
  transaction: {
    id: string;
    amount: number;
    description: string;
    created_at: string;
    balance_after?: number;
  };
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  const isPositive = transaction.amount > 0;

  return (
    <div className="pt-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold mb-1">{transaction.description}</div>
          <div className="text-xs text-text-muted">
            {new Date(transaction.created_at).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        <div className="text-right ml-4">
          <div className={`text-lg font-bold ${isPositive ? 'text-accent-main' : 'text-text-muted'}`}>
            {isPositive ? '+' : ''}{transaction.amount?.toLocaleString() || 0}
          </div>
          {transaction.balance_after !== undefined && transaction.balance_after !== null && (
            <div className="text-sm text-text-muted">
              Bakiye: {transaction.balance_after.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
