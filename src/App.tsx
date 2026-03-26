/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, Component } from 'react';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Trash2, 
  LogOut, 
  User, 
  Lock, 
  Mail,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  FileUp,
  FileCheck,
  PieChart as PieChartIcon,
  List as ListIcon,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let message = "Algo deu errado.";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) message = `Erro: ${parsed.error}`;
      } catch (e) {
        message = error.message || message;
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-100 max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Ops! Ocorreu um erro</h2>
            <p className="text-zinc-600 mb-6">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// --- Types ---
interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category?: string;
  isBank?: boolean;
  bankName?: string;
}

interface BankAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  currencyCode: string;
}

type Page = 'login' | 'register' | 'dashboard';

// --- Components ---

interface LoginPageProps {
  loginEmail: string;
  setLoginEmail: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  setCurrentPage: (page: Page) => void;
}

const LoginPage = ({ 
  loginEmail, 
  setLoginEmail, 
  loginPassword, 
  setLoginPassword, 
  handleLogin, 
  setCurrentPage 
}: LoginPageProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="min-h-screen flex items-center justify-center bg-zinc-50 p-4"
  >
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-zinc-100">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Wallet className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900">NepDev</h1>
        <p className="text-zinc-500 mt-2">Bem-vindo de volta!</p>
      </div>

      <form className="space-y-4" onSubmit={handleLogin}>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input 
            type="email" 
            placeholder="Email de Usuário" 
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
            required
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input 
            type="password" 
            placeholder="Senha" 
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
            required
          />
        </div>
        <button 
          type="submit"
          className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-colors shadow-lg active:scale-[0.98]"
        >
          Entrar
        </button>
      </form>

      <p className="text-center mt-8 text-zinc-600">
        Não tem uma conta?{' '}
        <button 
          onClick={() => setCurrentPage('register')}
          className="text-zinc-900 font-bold hover:underline"
        >
          Cadastre-se
        </button>
      </p>

      <div className="mt-12 pt-8 border-t border-zinc-100 text-center text-xs text-zinc-400">
        <p>© 2025 NepDev - Desenvolvido por Vitoria</p>
      </div>
    </div>
  </motion.div>
);

interface RegisterPageProps {
  registerEmail: string;
  setRegisterEmail: (val: string) => void;
  registerPassword: string;
  setRegisterPassword: (val: string) => void;
  registerConfirmPassword: string;
  setRegisterConfirmPassword: (val: string) => void;
  handleRegister: (e: React.FormEvent) => void;
  setCurrentPage: (page: Page) => void;
}

const RegisterPage = ({
  registerEmail,
  setRegisterEmail,
  registerPassword,
  setRegisterPassword,
  registerConfirmPassword,
  setRegisterConfirmPassword,
  handleRegister,
  setCurrentPage
}: RegisterPageProps) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="min-h-screen flex items-center justify-center bg-zinc-50 p-4"
  >
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-zinc-100">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Wallet className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900">Criar Conta</h1>
        <p className="text-zinc-500 mt-2 text-center">Crie um login para acessar o sistema!</p>
      </div>

      <form className="space-y-4" onSubmit={handleRegister}>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input 
            type="email" 
            placeholder="Email de Usuário" 
            value={registerEmail}
            onChange={(e) => setRegisterEmail(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
            required
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input 
            type="password" 
            placeholder="Senha" 
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
            required
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input 
            type="password" 
            placeholder="Confirmar Senha" 
            value={registerConfirmPassword}
            onChange={(e) => setRegisterConfirmPassword(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
            required
          />
        </div>
        <button 
          type="submit"
          className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-colors shadow-lg active:scale-[0.98]"
        >
          Cadastrar
        </button>
      </form>

      <p className="text-center mt-8 text-zinc-600">
        Já tem uma conta?{' '}
        <button 
          onClick={() => setCurrentPage('login')}
          className="text-zinc-900 font-bold hover:underline"
        >
          Faça Login
        </button>
      </p>
    </div>
  </motion.div>
);

interface DashboardPageProps {
  handleLogout: () => void;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isImporting: boolean;
  error: string | null;
  totalIncome: number;
  totalExpense: number;
  monthBalance: number;
  selectedMonth: number;
  setSelectedMonth: (val: number) => void;
  selectedYear: number;
  setSelectedYear: (val: number) => void;
  totalBalance: number;
  description: string;
  setDescription: (val: string) => void;
  amount: string;
  setAmount: (val: string) => void;
  type: 'income' | 'expense';
  setType: (val: 'income' | 'expense') => void;
  category: string;
  setCategory: (val: string) => void;
  handleAddTransaction: (e: React.FormEvent) => void;
  filteredTransactions: Transaction[];
  handleDeleteTransaction: (id: string, isBank: boolean) => void;
  months: string[];
  years: number[];
  formatCurrency: (val: number) => string;
  parseDate: (dateStr: string) => Date;
  activeTab: 'transactions' | 'analysis';
  setActiveTab: (val: 'transactions' | 'analysis') => void;
  categories: string[];
}

const CategoryAnalysis = ({ transactions, formatCurrency }: { transactions: Transaction[], formatCurrency: (v: number) => string }) => {
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);
  
  const categoryTotals = expenses.reduce((acc, t) => {
    const cat = t.category || 'Outros';
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 p-6 rounded-3xl text-white shadow-lg">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total de Saídas</p>
        <h4 className="text-3xl font-bold">{formatCurrency(totalExpense)}</h4>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-tight">Distribuição de Despesas</h4>
          <span className="px-3 py-1 bg-zinc-100 text-zinc-500 text-[10px] font-bold rounded-full uppercase">Percentual por Categoria</span>
        </div>
        <div className="divide-y divide-zinc-100">
          {data.map((item, idx) => {
            const percentage = (item.value / totalExpense) * 100;
            return (
              <div key={item.name} className="p-5 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-900">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                      <p className="text-sm font-bold text-zinc-900">{percentage.toFixed(1)}%</p>
                    </div>
                    <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-zinc-900"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right ml-8 min-w-[100px]">
                  <p className="text-sm font-bold text-zinc-900">{formatCurrency(item.value)}</p>
                </div>
              </div>
            );
          })}
          {data.length === 0 && (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-zinc-200" />
              </div>
              <p className="text-zinc-400 font-medium">Nenhuma despesa registrada neste período.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
        <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
          * Esta análise considera apenas as <strong>saídas (despesas)</strong> do período selecionado. 
          Entradas e transferências não são contabilizadas aqui para manter o foco no seu consumo.
        </p>
      </div>
    </div>
  );
};

const DashboardPage = ({
  handleLogout,
  handleImportFile,
  isImporting,
  error,
  totalIncome,
  totalExpense,
  monthBalance,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  totalBalance,
  description,
  setDescription,
  amount,
  setAmount,
  type,
  setType,
  category,
  setCategory,
  handleAddTransaction,
  filteredTransactions,
  handleDeleteTransaction,
  months,
  years,
  formatCurrency,
  parseDate,
  activeTab,
  setActiveTab,
  categories
}: DashboardPageProps) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="min-h-screen bg-zinc-50 pb-12"
  >
    {/* Header */}
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md">
            <Wallet className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-zinc-900">NepDev</span>
        </div>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-md">
            <FileUp className="w-4 h-4" />
            Importar Extrato
            <input 
              type="file" 
              accept=".csv,.ofx" 
              className="hidden" 
              onChange={handleImportFile}
              disabled={isImporting}
            />
          </label>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-zinc-500 hover:text-red-600 font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </div>
    </header>

    <main className="max-w-6xl mx-auto px-4 mt-8">
      {/* Error Alert */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-500 font-medium">Entradas Totais</span>
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
              <TrendingUp className="text-emerald-600 w-5 h-5" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</h2>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-500 font-medium">Saídas Totais</span>
            <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center">
              <TrendingDown className="text-rose-600 w-5 h-5" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-rose-600">{formatCurrency(totalExpense)}</h2>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-zinc-900 p-6 rounded-3xl shadow-lg border border-zinc-800"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-300 font-medium">Saldo do Mês</span>
            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
              <DollarSign className="text-zinc-100 w-5 h-5" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">{formatCurrency(monthBalance)}</h2>
        </motion.div>
      </div>

      {/* Month Selector */}
      <div className="flex flex-wrap items-center gap-4 mb-8 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase">Período:</span>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            {months.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="h-8 w-px bg-zinc-100 hidden sm:block" />
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-bold text-zinc-400 uppercase">Saldo Geral:</span>
          <span className={`text-sm font-bold ${totalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(totalBalance)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Import Info Section */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">Importação de Dados</h3>
            <p className="text-sm text-zinc-500 mb-6">
              Para manter seus dados atualizados, você pode importar arquivos <span className="font-bold">CSV</span> ou <span className="font-bold">OFX</span> exportados do seu banco.
            </p>
            
            <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-200 transition-all border-2 border-dashed border-zinc-200">
              <FileUp className="w-5 h-5" />
              Selecionar Arquivo
              <input 
                type="file" 
                accept=".csv,.ofx" 
                className="hidden" 
                onChange={handleImportFile}
                disabled={isImporting}
              />
            </label>
          </div>

          {/* Manual Form Section */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Lançamento Manual</h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Descrição</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Dinheiro extra..."
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Categoria</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm font-medium"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    type === 'income' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'bg-zinc-50 text-zinc-500 border border-zinc-200 hover:bg-emerald-50'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Entrada
                </button>
                <button 
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    type === 'expense' 
                      ? 'bg-rose-600 text-white shadow-md' 
                      : 'bg-zinc-50 text-zinc-500 border border-zinc-200 hover:bg-rose-50'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  Saída
                </button>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-colors shadow-lg mt-2 flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-5 h-5" />
                Adicionar
              </button>
            </form>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 min-h-[600px]">
            <div className="flex items-center gap-8 mb-8 border-b border-zinc-100">
              <button 
                onClick={() => setActiveTab('transactions')}
                className={`pb-4 text-sm font-bold transition-all relative ${
                  activeTab === 'transactions' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ListIcon className="w-4 h-4" />
                  Transações
                </div>
                {activeTab === 'transactions' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('analysis')}
                className={`pb-4 text-sm font-bold transition-all relative ${
                  activeTab === 'analysis' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4" />
                  Análise de Saídas
                </div>
                {activeTab === 'analysis' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'transactions' ? (
                <motion.div 
                  key="transactions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">Extrato de {months[selectedMonth]}</h3>
                      <p className="text-sm text-zinc-400 mt-1">Manual + Bancos Conectados</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {filteredTransactions.length} itens
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {filteredTransactions.length === 0 ? (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center justify-center py-20 text-zinc-400"
                        >
                          <Wallet className="w-16 h-16 mb-4 opacity-20" />
                          <p className="text-sm">Nenhuma transação registrada para este mês.</p>
                        </motion.div>
                      ) : (
                        filteredTransactions
                          .sort((a, b) => {
                            const dateA = parseDate(a.date).getTime();
                            const dateB = parseDate(b.date).getTime();
                            return dateB - dateA;
                          })
                          .map((t) => (
                            <motion.div 
                              key={t.id}
                              layout
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="flex items-center justify-between p-5 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-zinc-200 transition-all group"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                                  t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                }`}>
                                  {t.type === 'income' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-zinc-900">{t.description}</h4>
                                    {t.isBank && (
                                      <span className="px-2 py-0.5 bg-zinc-200 text-zinc-500 rounded-md text-[8px] font-bold uppercase">
                                        {t.bankName}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t.date}</span>
                                    {t.category && (
                                      <span className="text-[10px] text-zinc-400 font-medium bg-white px-2 py-0.5 rounded-full border border-zinc-100">
                                        {t.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <span className={`font-bold text-lg ${
                                  t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                  {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                </span>
                                {!t.isBank ? (
                                  <button 
                                    onClick={() => handleDeleteTransaction(t.id, false)}
                                    className="p-2 text-zinc-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                ) : (
                                  <div className="w-9 h-9 flex items-center justify-center text-zinc-200">
                                    <FileCheck className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="analysis"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CategoryAnalysis transactions={filteredTransactions} formatCurrency={formatCurrency} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  </motion.div>
);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [manualTransactions, setManualTransactions] = useState<Transaction[]>([]);
  const [bankTransactions, setBankTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (user) {
        setCurrentPage('dashboard');
      } else {
        setCurrentPage('login');
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!user) {
      setManualTransactions([]);
      setBankTransactions([]);
      return;
    }

    const q = query(collection(db, 'transactions'), where('userId', '==', user.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactions: Transaction[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          description: data.description,
          amount: data.amount,
          type: data.type,
          date: data.date,
          category: data.category,
          isBank: data.isBank,
          bankName: data.bankName,
        });
      });

      // Split transactions
      setManualTransactions(transactions.filter(t => !t.isBank));
      setBankTransactions(transactions.filter(t => t.isBank));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'transactions');
    });

    return () => unsubscribe();
  }, [user]);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const parseDate = (dateStr: string) => {
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    return new Date(dateStr);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const content = e.target?.result as string;
      
      if (file.name.endsWith('.csv')) {
        Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              for (const row of results.data as any[]) {
                // More robust mapping
                const getField = (row: any, possibleNames: string[]) => {
                  for (const name of possibleNames) {
                    if (row[name] !== undefined) return row[name];
                    // Case insensitive check
                    const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
                    if (key) return row[key];
                  }
                  // Special check for accented characters if not found
                  if (possibleNames.includes('descrição')) {
                    const key = Object.keys(row).find(k => k.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase() === 'descricao');
                    if (key) return row[key];
                  }
                  return null;
                };

                const rawAmount = getField(row, ['valor', 'amount', 'value']);
                if (rawAmount === null) continue;
                
                const finalAmount = parseFloat(String(rawAmount).replace(',', '.'));
                if (isNaN(finalAmount)) continue;

                const finalDescription = getField(row, ['descrição', 'descricao', 'description', 'memo', 'payee']) || 'Transação Importada';
                const finalDate = getField(row, ['data', 'date', 'dtposted']) || new Date().toISOString();
                const type = finalAmount >= 0 ? 'income' : 'expense';

                // Unique ID to prevent duplicates
                const txId = `csv_${user.uid}_${String(finalDate).trim()}_${String(finalDescription).trim().toLowerCase()}_${Math.abs(finalAmount)}_${type}`;
                const safeTxId = txId.replace(/[\/\s\.]/g, '_').substring(0, 150);

                // Check if already exists
                const docRef = doc(db, 'transactions', safeTxId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) continue;

                // Simple category guessing
                let guessedCategory = 'Outros';
                const descLower = String(finalDescription).toLowerCase();
                
                if (descLower.includes('transferencia') || descLower.includes('pix')) {
                  guessedCategory = 'Transferência';
                } else if (descLower.includes('fatura') || descLower.includes('boleto')) {
                  guessedCategory = 'Contas';
                } else if (descLower.includes('drogaria') || descLower.includes('remedios')) {
                  guessedCategory = 'Médico';
                } else if (descLower.includes('rdb')) {
                  guessedCategory = 'Guardar';
                } else if (descLower.includes('uber') || descLower.includes('99app') || descLower.includes('posto') || descLower.includes('combustivel')) {
                  guessedCategory = 'Transporte';
                } else if (descLower.includes('ifood') || descLower.includes('mercado') || descLower.includes('restaurante') || descLower.includes('padaria') || descLower.includes('supermercado')) {
                  guessedCategory = 'Alimentação';
                } else if (descLower.includes('netflix') || descLower.includes('spotify') || descLower.includes('cinema') || descLower.includes('jogos')) {
                  guessedCategory = 'Lazer';
                } else if (descLower.includes('farmacia') || descLower.includes('hospital') || descLower.includes('medico')) {
                  guessedCategory = 'Saúde';
                } else if (descLower.includes('aluguel') || descLower.includes('condominio') || descLower.includes('energia') || descLower.includes('agua') || descLower.includes('internet')) {
                  guessedCategory = 'Moradia';
                }

                await setDoc(docRef, {
                  description: String(finalDescription).trim(),
                  amount: Math.abs(finalAmount),
                  date: String(finalDate).trim(),
                  type,
                  category: guessedCategory,
                  isBank: true,
                  bankName: 'Importado (CSV)',
                  userId: user.email || 'unknown',
                  transactionId: safeTxId,
                  createdAt: serverTimestamp()
                });
              }
              setIsImporting(false);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, 'transactions');
            }
          },
          error: (err) => {
            console.error('Erro ao processar CSV:', err);
            setError('Erro ao processar arquivo CSV. Verifique o formato.');
            setIsImporting(false);
          }
        });
      } else if (file.name.endsWith('.ofx')) {
        try {
          const stmtrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
          let match;
          
          while ((match = stmtrnRegex.exec(content)) !== null) {
            const block = match[1];
            const rawAmount = block.match(/<TRNAMT>(.*)/)?.[1] || '0';
            const amount = parseFloat(rawAmount.replace(',', '.'));
            
            if (isNaN(amount)) continue;

            const dateStr = block.match(/<DTPOSTED>(.*)/)?.[1] || '';
            const memo = block.match(/<MEMO>(.*)/)?.[1] || block.match(/<NAME>(.*)/)?.[1] || 'Transação OFX';
            const fitid = block.match(/<FITID>(.*)/)?.[1] || '';
            
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const finalDate = `${year}-${month}-${day}`;
            const type = amount >= 0 ? 'income' : 'expense';

            // Unique ID to prevent duplicates
            // Prefer FITID if available, otherwise generate one
            const txId = fitid ? `ofx_${user.uid}_${fitid}` : `ofx_${user.uid}_${finalDate}_${memo.trim().toLowerCase()}_${Math.abs(amount)}_${type}`;
            const safeTxId = txId.replace(/[\/\s\.]/g, '_').substring(0, 150);

            // Check if already exists
            const docRef = doc(db, 'transactions', safeTxId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) continue;

            // Simple category guessing
            let guessedCategory = 'Outros';
            const descLower = String(memo).toLowerCase();
            
            if (descLower.includes('transferencia') || descLower.includes('pix')) {
              guessedCategory = 'Transferência';
            } else if (descLower.includes('fatura') || descLower.includes('boleto')) {
              guessedCategory = 'Contas';
            } else if (descLower.includes('drogaria') || descLower.includes('remedios')) {
              guessedCategory = 'Médico';
            } else if (descLower.includes('rdb')) {
              guessedCategory = 'Guardar';
            } else if (descLower.includes('uber') || descLower.includes('99app') || descLower.includes('posto') || descLower.includes('combustivel')) {
              guessedCategory = 'Transporte';
            } else if (descLower.includes('ifood') || descLower.includes('mercado') || descLower.includes('restaurante') || descLower.includes('padaria') || descLower.includes('supermercado')) {
              guessedCategory = 'Alimentação';
            } else if (descLower.includes('netflix') || descLower.includes('spotify') || descLower.includes('cinema') || descLower.includes('jogos')) {
              guessedCategory = 'Lazer';
            } else if (descLower.includes('farmacia') || descLower.includes('hospital') || descLower.includes('medico')) {
              guessedCategory = 'Saúde';
            } else if (descLower.includes('aluguel') || descLower.includes('condominio') || descLower.includes('energia') || descLower.includes('agua') || descLower.includes('internet')) {
              guessedCategory = 'Moradia';
            }

            await setDoc(docRef, {
              description: memo.trim(),
              amount: Math.abs(amount),
              date: finalDate,
              type,
              category: guessedCategory,
              isBank: true,
              bankName: 'Importado (OFX)',
              userId: user.email || 'unknown',
              transactionId: safeTxId,
              createdAt: serverTimestamp()
            });
          }
          
          setIsImporting(false);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'transactions');
          setIsImporting(false);
        }
      }
    };

    reader.readAsText(file);
  };
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('Outros');
  const [activeTab, setActiveTab] = useState<'transactions' | 'analysis'>('transactions');

  const categories = [
    'Alimentação', 
    'Transporte', 
    'Lazer', 
    'Saúde', 
    'Educação', 
    'Moradia', 
    'Serviços', 
    'Transferência',
    'Contas',
    'Médico',
    'Guardar',
    'Outros'
  ];

  // Combine transactions for summary
  const allTransactions = [...manualTransactions, ...bankTransactions];

  const filteredTransactions = allTransactions.filter(t => {
    const date = parseDate(t.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const monthBalance = totalIncome - totalExpense;
  
  // Total balance (all time)
  const totalBalance = allTransactions
    .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !user) return;

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount)) {
      setError('O valor informado é inválido.');
      return;
    }

    try {
      await addDoc(collection(db, 'transactions'), {
        description,
        amount: parsedAmount,
        type,
        date: new Date().toLocaleDateString('pt-BR'),
        category,
        isBank: false,
        userId: user.email || 'unknown',
        createdAt: serverTimestamp()
      });

      setDescription('');
      setAmount('');
      setCategory('Outros');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions');
    }
  };

  const handleDeleteTransaction = async (id: string, isBank: boolean) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err: any) {
      setError('Falha no login. Verifique suas credenciais.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (registerPassword !== registerConfirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      // Create user profile
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: registerEmail.split('@')[0],
        email: registerEmail,
        role: 'user'
      });
    } catch (err: any) {
      setError('Falha ao criar conta. ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // --- Components ---


  return (
    <ErrorBoundary>
      <div className="font-sans antialiased text-zinc-900 selection:bg-zinc-900 selection:text-white">
        <AnimatePresence mode="wait">
          {!isAuthReady ? (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
              <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {currentPage === 'login' && (
                <LoginPage 
                  loginEmail={loginEmail}
                  setLoginEmail={setLoginEmail}
                  loginPassword={loginPassword}
                  setLoginPassword={setLoginPassword}
                  handleLogin={handleLogin}
                  setCurrentPage={setCurrentPage}
                />
              )}
              {currentPage === 'register' && (
                <RegisterPage 
                  registerEmail={registerEmail}
                  setRegisterEmail={setRegisterEmail}
                  registerPassword={registerPassword}
                  setRegisterPassword={setRegisterPassword}
                  registerConfirmPassword={registerConfirmPassword}
                  setRegisterConfirmPassword={setRegisterConfirmPassword}
                  handleRegister={handleRegister}
                  setCurrentPage={setCurrentPage}
                />
              )}
              {currentPage === 'dashboard' && (
                <DashboardPage 
                  handleLogout={handleLogout}
                  handleImportFile={handleImportFile}
                  isImporting={isImporting}
                  error={error}
                  totalIncome={totalIncome}
                  totalExpense={totalExpense}
                  monthBalance={monthBalance}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                  selectedYear={selectedYear}
                  setSelectedYear={setSelectedYear}
                  totalBalance={totalBalance}
                  description={description}
                  setDescription={setDescription}
                  amount={amount}
                  setAmount={setAmount}
                  type={type}
                  setType={setType}
                  category={category}
                  setCategory={setCategory}
                  handleAddTransaction={handleAddTransaction}
                  filteredTransactions={filteredTransactions}
                  handleDeleteTransaction={handleDeleteTransaction}
                  months={months}
                  years={years}
                  formatCurrency={formatCurrency}
                  parseDate={parseDate}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  categories={categories}
                />
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
