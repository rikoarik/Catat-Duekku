/**
 * Centralized finance store for Catat Duekku.
 * Holds accounts, transactions, debts, savings goals, and last-action context.
 * All mutations go through this module so saldos stay consistent.
 *
 * Per PRD §3, §4.5, §6, §10: ID stays internal, last-action correction is supported,
 * and balance adjustment (UC-03) creates a delta entry rather than overwriting.
 */
import type { TransactionType } from '@/types/transaction';

export type AccountKind = 'CASH' | 'BANK' | 'E_WALLET';

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  balance: number;
  isDefault?: boolean;
}

export interface TransactionRecord {
  id: string;
  type: TransactionType | 'ADJUSTMENT' | 'DEBT_PAYMENT' | 'GOAL_DEPOSIT' | 'GOAL_WITHDRAW';
  amount: number; // signed: expense negative, income positive, adjustment signed delta
  accountId?: string;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  occurredAt: string; // ISO
  note?: string;
  // Linking (optional):
  debtId?: string;
  goalId?: string;
  // For ADJUSTMENT: the resulting balance after adjustment (for audit/UI).
  resultingBalance?: number;
}

export interface Debt {
  id: string;
  name: string;
  creditor?: string;
  totalAmount: number;
  paidAmount: number;
  dueDate?: string;
  status: 'active' | 'paid';
  notes?: string;
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
  savedAmount: number;
}

export type LastAction =
  | { kind: 'none' }
  | { kind: 'transaction'; transactionId: string }
  | { kind: 'debt_payment'; debtId: string; transactionId: string }
  | { kind: 'goal_deposit'; goalId: string; transactionId: string }
  | { kind: 'goal_withdraw'; goalId: string; transactionId: string };

type Listener = () => void;

const nowIso = () => new Date().toISOString();

const defaultAccounts: Account[] = [
  { id: 'acc-cash', name: 'Cash', kind: 'CASH', balance: 0, isDefault: true },
  { id: 'acc-bank', name: 'Bank', kind: 'BANK', balance: 0 },
  { id: 'acc-ewallet', name: 'E-Wallet', kind: 'E_WALLET', balance: 0 },
];

class FinanceStore {
  private accounts: Account[] = [...defaultAccounts];
  private transactions: TransactionRecord[] = [];
  private debts: Debt[] = [];
  private goals: SavingGoal[] = [];
  private lastAction: LastAction = { kind: 'none' };
  private listeners: Set<Listener> = new Set();

  // ─── Subscription ────────────────────────────────────────────
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  // ─── Read ────────────────────────────────────────────────────
  getAccounts(): Account[] {
    return this.accounts;
  }
  getAccount(id: string): Account | undefined {
    return this.accounts.find((a) => a.id === id);
  }
  getAccountByName(name: string): Account | undefined {
    const needle = name.toLowerCase();
    return this.accounts.find((a) => a.name.toLowerCase() === needle);
  }
  getDefaultAccount(): Account {
    return this.accounts.find((a) => a.isDefault) ?? this.accounts[0];
  }

  getTransactions(): TransactionRecord[] {
    return [...this.transactions].sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt)
    );
  }
  getLastTransaction(): TransactionRecord | undefined {
    return this.getTransactions()[0];
  }

  getDebts(): Debt[] {
    return [...this.debts];
  }
  getDebt(id: string): Debt | undefined {
    return this.debts.find((d) => d.id === id);
  }
  getDebtByName(name: string): Debt | undefined {
    const needle = name.toLowerCase();
    return this.debts.find(
      (d) =>
        d.name.toLowerCase().includes(needle) ||
        (d.creditor?.toLowerCase().includes(needle) ?? false)
    );
  }

  getGoals(): SavingGoal[] {
    return [...this.goals];
  }
  getGoal(id: string): SavingGoal | undefined {
    return this.goals.find((g) => g.id === id);
  }
  getGoalByName(name: string): SavingGoal | undefined {
    const needle = name.toLowerCase();
    return this.goals.find((g) => g.name.toLowerCase().includes(needle));
  }

  getLastAction(): LastAction {
    return this.lastAction;
  }

  // ─── Derived ─────────────────────────────────────────────────
  getTotalBalance(): number {
    return this.accounts.reduce((sum, a) => sum + a.balance, 0);
  }
  getRemainingDebt(): number {
    return this.debts
      .filter((d) => d.status === 'active')
      .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
  }

  // ─── Mutate: accounts ────────────────────────────────────────
  upsertAccount(input: Omit<Account, 'id'> & { id?: string }): Account {
    if (input.id) {
      const idx = this.accounts.findIndex((a) => a.id === input.id);
      if (idx >= 0) {
        this.accounts[idx] = { ...this.accounts[idx], ...input, id: this.accounts[idx].id };
        this.emit();
        return this.accounts[idx];
      }
    }
    const acc: Account = {
      id: input.id ?? `acc-${Date.now()}`,
      name: input.name,
      kind: input.kind,
      balance: input.balance,
      isDefault: input.isDefault,
    };
    this.accounts.push(acc);
    this.emit();
    return acc;
  }

  /**
   * UC-03: set balance adjustment.
   * `cash sekarang 450 ribu` → adjusts Cash account to 450_000 (does NOT add).
   */
  setAccountBalance(accountId: string, newBalance: number, note?: string): TransactionRecord {
    const account = this.getAccount(accountId);
    if (!account) throw new Error(`Akun ${accountId} tidak ditemukan.`);
    const delta = newBalance - account.balance;
    account.balance = newBalance;
    const tx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: 'ADJUSTMENT',
      amount: delta,
      accountId,
      occurredAt: nowIso(),
      note: note ?? `Penyesuaian saldo ${account.name}`,
      resultingBalance: newBalance,
    };
    this.transactions.push(tx);
    this.lastAction = { kind: 'transaction', transactionId: tx.id };
    this.emit();
    return tx;
  }

  // ─── Mutate: transactions ────────────────────────────────────
  recordTransaction(input: {
    type: TransactionType;
    amount: number;
    accountId: string;
    categoryId?: string;
    categoryName?: string;
    description?: string;
    occurredAt?: string;
    note?: string;
  }): TransactionRecord {
    const account = this.getAccount(input.accountId);
    if (!account) throw new Error(`Akun ${input.accountId} tidak ditemukan.`);
    const signedAmount = input.type === 'EXPENSE' ? -Math.abs(input.amount) : Math.abs(input.amount);
    account.balance += signedAmount;
    const tx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: input.type,
      amount: signedAmount,
      accountId: input.accountId,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      description: input.description,
      occurredAt: input.occurredAt ?? nowIso(),
      note: input.note,
    };
    this.transactions.push(tx);
    this.lastAction = { kind: 'transaction', transactionId: tx.id };
    this.emit();
    return tx;
  }

  /**
   * UC-11: correction of last action by amount.
   * `salah, tadi 35 ribu` → updates last transaction amount.
   */
  updateLastTransactionAmount(newAmount: number): TransactionRecord | null {
    if (this.lastAction.kind !== 'transaction') return null;
    const transactionId = this.lastAction.transactionId;
    const tx = this.transactions.find((t) => t.id === transactionId);
    if (!tx || !tx.accountId) return null;
    const account = this.getAccount(tx.accountId);
    if (!account) return null;

    // Reverse previous effect on balance.
    account.balance -= tx.amount;

    // Apply new effect.
    const signedAmount = tx.type === 'EXPENSE' ? -Math.abs(newAmount) : Math.abs(newAmount);
    account.balance += signedAmount;
    tx.amount = signedAmount;
    this.emit();
    return tx;
  }

  /**
   * Update last transaction's account.
   * `bukan cash, bank` → moves last transaction to Bank.
   */
  updateLastTransactionAccount(accountId: string): TransactionRecord | null {
    if (this.lastAction.kind !== 'transaction') return null;
    const transactionId = this.lastAction.transactionId;
    const tx = this.transactions.find((t) => t.id === transactionId);
    if (!tx) return null;
    const oldAccount = tx.accountId ? this.getAccount(tx.accountId) : undefined;
    const newAccount = this.getAccount(accountId);
    if (!newAccount) return null;
    if (oldAccount) oldAccount.balance -= tx.amount;
    newAccount.balance += tx.amount;
    tx.accountId = accountId;
    this.emit();
    return tx;
  }

  deleteLastTransaction(): TransactionRecord | null {
    if (this.lastAction.kind !== 'transaction') return null;
    const transactionId = this.lastAction.transactionId;
    const tx = this.transactions.find((t) => t.id === transactionId);
    if (!tx) return null;
    if (tx.accountId) {
      const account = this.getAccount(tx.accountId);
      if (account) account.balance -= tx.amount;
    }
    this.transactions = this.transactions.filter((t) => t.id !== tx.id);
    this.lastAction = { kind: 'none' };
    this.emit();
    return tx;
  }

  /**
   * UC-12: undo last action.
   * Handles transaction (and reverts balance) plus debt payment / goal deposit / withdraw.
   */
  undoLastAction(): string | null {
    if (this.lastAction.kind === 'none') return null;
    if (this.lastAction.kind === 'transaction') {
      this.deleteLastTransaction();
      return 'Transaksi terakhir dibatalkan.';
    }
    if (this.lastAction.kind === 'debt_payment') {
      const transactionId = this.lastAction.transactionId;
      const tx = this.transactions.find((t) => t.id === transactionId);
      if (!tx) return null;
      const debt = this.getDebt(tx.debtId ?? '');
      if (debt) debt.paidAmount = Math.max(0, debt.paidAmount - Math.abs(tx.amount));
      if (tx.accountId) {
        const account = this.getAccount(tx.accountId);
        if (account) account.balance += Math.abs(tx.amount);
      }
      this.transactions = this.transactions.filter((t) => t.id !== tx.id);
      this.lastAction = { kind: 'none' };
      this.emit();
      return 'Pembayaran utang terakhir dibatalkan.';
    }
    if (this.lastAction.kind === 'goal_deposit' || this.lastAction.kind === 'goal_withdraw') {
      const transactionId = this.lastAction.transactionId;
      const tx = this.transactions.find((t) => t.id === transactionId);
      if (!tx) return null;
      const goal = this.getGoal(tx.goalId ?? '');
      if (goal) {
        if (this.lastAction.kind === 'goal_deposit') {
          goal.savedAmount = Math.max(0, goal.savedAmount - Math.abs(tx.amount));
          if (tx.accountId) {
            const account = this.getAccount(tx.accountId);
            if (account) account.balance += Math.abs(tx.amount);
          }
        } else {
          goal.savedAmount = Math.max(0, goal.savedAmount + Math.abs(tx.amount));
          if (tx.accountId) {
            const account = this.getAccount(tx.accountId);
            if (account) account.balance -= Math.abs(tx.amount);
          }
        }
      }
      this.transactions = this.transactions.filter((t) => t.id !== tx.id);
      this.lastAction = { kind: 'none' };
      this.emit();
      return 'Mutasi tabungan terakhir dibatalkan.';
    }
    return null;
  }

  // ─── Mutate: debts ───────────────────────────────────────────
  createDebt(input: {
    name: string;
    totalAmount: number;
    paidAmount?: number;
    creditor?: string;
    dueDate?: string;
    notes?: string;
  }): Debt {
    const paidAmount = Math.max(0, Math.min(input.paidAmount ?? 0, input.totalAmount));
    const debt: Debt = {
      id: `debt-${Date.now()}`,
      name: input.name,
      creditor: input.creditor,
      totalAmount: input.totalAmount,
      paidAmount,
      dueDate: input.dueDate,
      status: paidAmount >= input.totalAmount ? 'paid' : 'active',
      notes: input.notes,
    };
    this.debts.push(debt);
    this.emit();
    return debt;
  }

  payDebt(debtId: string, amount: number, accountId: string): TransactionRecord | null {
    const debt = this.getDebt(debtId);
    const account = this.getAccount(accountId);
    if (!debt || !account) return null;
    const remaining = debt.totalAmount - debt.paidAmount;
    const safeAmount = Math.min(amount, remaining);
    if (safeAmount <= 0) return null;
    debt.paidAmount += safeAmount;
    if (debt.paidAmount >= debt.totalAmount) debt.status = 'paid';
    account.balance -= safeAmount;
    const tx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: 'DEBT_PAYMENT',
      amount: -safeAmount,
      accountId,
      debtId,
      occurredAt: nowIso(),
      note: `Bayar ${debt.name}`,
    };
    this.transactions.push(tx);
    this.lastAction = { kind: 'debt_payment', debtId, transactionId: tx.id };
    this.emit();
    return tx;
  }

  // ─── Mutate: goals ───────────────────────────────────────────
  createGoal(input: {
    name: string;
    targetAmount: number;
    targetDate?: string;
  }): SavingGoal {
    const goal: SavingGoal = {
      id: `goal-${Date.now()}`,
      name: input.name,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate,
      savedAmount: 0,
    };
    this.goals.push(goal);
    this.emit();
    return goal;
  }

  depositGoal(goalId: string, amount: number, accountId: string): TransactionRecord | null {
    const goal = this.getGoal(goalId);
    const account = this.getAccount(accountId);
    if (!goal || !account) return null;
    goal.savedAmount += amount;
    account.balance -= amount;
    const tx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: 'GOAL_DEPOSIT',
      amount: -amount,
      accountId,
      goalId,
      occurredAt: nowIso(),
      note: `Nabung ke ${goal.name}`,
    };
    this.transactions.push(tx);
    this.lastAction = { kind: 'goal_deposit', goalId, transactionId: tx.id };
    this.emit();
    return tx;
  }

  withdrawGoal(goalId: string, amount: number, accountId: string): TransactionRecord | null {
    const goal = this.getGoal(goalId);
    const account = this.getAccount(accountId);
    if (!goal || !account) return null;
    const safeAmount = Math.min(amount, goal.savedAmount);
    if (safeAmount <= 0) return null;
    goal.savedAmount -= safeAmount;
    account.balance += safeAmount;
    const tx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: 'GOAL_WITHDRAW',
      amount: safeAmount,
      accountId,
      goalId,
      occurredAt: nowIso(),
      note: `Tarik dari ${goal.name}`,
    };
    this.transactions.push(tx);
    this.lastAction = { kind: 'goal_withdraw', goalId, transactionId: tx.id };
    this.emit();
    return tx;
  }

  // ─── Reset (testing) ─────────────────────────────────────────
  reset(): void {
    this.accounts = [...defaultAccounts];
    this.transactions = [];
    this.debts = [];
    this.goals = [];
    this.lastAction = { kind: 'none' };
    this.emit();
  }
}

export const financeStore = new FinanceStore();
