export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  type: 'CASH' | 'BANK' | 'E_WALLET';
  icon?: string;
  cardNumber?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  walletId: string;
  note?: string;
  createdAt: string; // ISO string
}

export interface BalanceSummary {
  totalBalance: number;
  totalIncomeMonth: number;
  totalExpenseMonth: number;
  percentageChange: number;
}
