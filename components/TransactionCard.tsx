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
    <div className="border-b border-white/10 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-semibold mb-1">{transaction.description}</div>
          <div className="text-sm text-gray-400">
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
          <div className={`text-xl font-bold ${isPositive ? 'text-yellow-500' : 'text-[#e30076]'}`}>
            {isPositive ? '+' : ''}{transaction.amount?.toLocaleString() || 0}
          </div>
          {transaction.balance_after !== undefined && transaction.balance_after !== null && (
            <div className="text-sm text-gray-500">
              Balance: {transaction.balance_after.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
