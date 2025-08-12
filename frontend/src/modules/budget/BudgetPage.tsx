import React, { useState, useEffect } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import clsx from 'clsx';

interface Budget {
  id: string;
  teamId: string;
  teamName: string;
  name: string;
  period: 'month' | 'quarter' | 'year';
  year: number;
  month?: number;
  quarter?: number;
  currency: string;
  totalLimit: number;
  totalSpent: number;
  createdAt: string;
}

interface Category {
  id: string;
  budgetId: string;
  name: string;
  limit: number;
  spent: number;
  utilization: number;
  remaining: number;
}

interface Expense {
  id: string;
  budgetId: string;
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  createdBy: string;
  receipts?: string[];
}

interface BudgetSummary {
  totalLimit: number;
  totalSpent: number;
  utilization: number;
  categoriesOverBudget: number;
}

export const BudgetPage: React.FC = () => {
  const { getAuthHeader, user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [budgetName, setBudgetName] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [budgetMonth, setBudgetMonth] = useState(new Date().getMonth() + 1);
  const [categoryName, setCategoryName] = useState('');
  const [categoryLimit, setCategoryLimit] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Filters
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Ensure demo access then fetch budgets on mount and filter change
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        await fetch('/api/budget/debug/ensure-access', {
          method: 'POST',
          headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
          credentials: 'include'
        });
      } catch {}
      await fetchBudgets();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPeriod, filterYear, user]);

  // Debug effect to log data changes
  useEffect(() => {
    console.log('Budget data updated:', {
      budgets: budgets.length,
      selectedBudget,
      categories: categories.length,
      expenses: expenses.length,
      loading,
      error
    });
  }, [budgets, selectedBudget, categories, expenses, loading, error]);

  // Data validation effect
  useEffect(() => {
    if (!loading && !error) {
      if (budgets.length === 0) {
        console.warn('No budgets loaded - this might indicate an authentication or API issue');
      } else {
        console.log('Budget data loaded successfully:', {
          budgets: budgets.length,
          sampleBudget: budgets[0]
        });
      }
    }
  }, [budgets, loading, error]);

  async function fetchBudgets() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterPeriod) params.append('period', filterPeriod);
      if (filterYear) params.append('year', filterYear);
      
      const res = await fetch(`/api/budget?${params}`, {
        headers: getAuthHeader(),
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError('Authentication required. Please log in.');
          return;
        }
        throw new Error(`HTTP ${res.status}: Failed to fetch budgets`);
      }
      const data = await res.json();
      setBudgets(data.budgets || []);
      console.log('Fetched budgets:', data.budgets);
    } catch (err: any) {
      console.error('Error fetching budgets:', err);
      setError(err.message || 'Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  }

  async function selectBudget(budget: Budget) {
    setSelectedBudget(budget);
    setLoading(true);
    
    try {
      const res = await fetch(`/api/budget/budgets/${budget.id}`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch budget details');
      const data = await res.json();
      setCategories(data.categories);
      setExpenses(data.recentExpenses);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createBudget() {
    if (!budgetName.trim()) return;
    
    setLoading(true);
    try {
      // For demo, use first team
      const teamId = 'team1'; // In real app, this would be selected
      
      const res = await fetch('/api/budget/budgets', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          name: budgetName,
          period: budgetPeriod,
          year: budgetYear,
          month: budgetPeriod === 'month' ? budgetMonth : undefined,
          quarter: budgetPeriod === 'quarter' ? Math.ceil(budgetMonth / 3) : undefined
        })
      });
      
      if (!res.ok) throw new Error('Failed to create budget');
      const data = await res.json();
      setBudgets([data.budget, ...budgets]);
      setShowCreateBudget(false);
      setBudgetName('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addCategory() {
    if (!categoryName.trim() || !categoryLimit || !selectedBudget) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/budget/budgets/${selectedBudget.id}/categories`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName,
          limit: parseFloat(categoryLimit)
        })
      });
      
      if (!res.ok) throw new Error('Failed to add category');
      const data = await res.json();
      setCategories([...categories, { ...data.category, utilization: 0, remaining: data.category.limit }]);
      setShowAddCategory(false);
      setCategoryName('');
      setCategoryLimit('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addExpense() {
    if (!expenseDescription.trim() || !expenseAmount || !expenseCategory || !selectedBudget) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/budget/budgets/${selectedBudget.id}/expenses`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: expenseCategory,
          amount: parseFloat(expenseAmount),
          description: expenseDescription,
          date: expenseDate
        })
      });
      
      if (!res.ok) throw new Error('Failed to add expense');
      const data = await res.json();
      setExpenses([data.expense, ...expenses]);
      
      // Update category spent amount
      setCategories(categories.map(cat => {
        if (cat.id === expenseCategory) {
          const newSpent = cat.spent + parseFloat(expenseAmount);
          return {
            ...cat,
            spent: newSpent,
            utilization: (newSpent / cat.limit) * 100,
            remaining: cat.limit - newSpent
          };
        }
        return cat;
      }));
      
      setShowAddExpense(false);
      setExpenseDescription('');
      setExpenseAmount('');
      setExpenseCategory('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function exportBudget() {
    if (!selectedBudget) return;
    
    try {
      const res = await fetch(`/api/budget/budgets/${selectedBudget.id}/export`, {
        headers: getAuthHeader()
      });
      
      if (!res.ok) throw new Error('Failed to export budget');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedBudget.name}-expenses.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function getUtilizationColor(utilization: number) {
    if (utilization >= 100) return 'danger';
    if (utilization >= 80) return 'warning';
    if (utilization >= 50) return 'info';
    return 'success';
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  return (
    <AppLayout title="Budget Management">
      <div className="container-fluid">
        {/* Summary Cards */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <i className="fas fa-folder fa-2x text-primary mb-2"></i>
                <h4 className="mb-1">{budgets.length}</h4>
                <p className="text-muted mb-0">Total Budgets</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <i className="fas fa-dollar-sign fa-2x text-success mb-2"></i>
                <h4 className="mb-1">${budgets.reduce((sum, budget) => sum + budget.totalLimit, 0).toLocaleString()}</h4>
                <p className="text-muted mb-0">Total Budget</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <i className="fas fa-chart-pie fa-2x text-warning mb-2"></i>
                <h4 className="mb-1">${budgets.reduce((sum, budget) => sum + budget.totalSpent, 0).toLocaleString()}</h4>
                <p className="text-muted mb-0">Total Spent</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <i className="fas fa-percentage fa-2x text-info mb-2"></i>
                <h4 className="mb-1">{budgets.length > 0 ? (budgets.reduce((sum, budget) => sum + (budget.totalSpent / budget.totalLimit * 100), 0) / budgets.length).toFixed(1) : 0}%</h4>
                <p className="text-muted mb-0">Avg Utilization</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}

        <div className="row">
          {/* Budget List */}
          <div className="col-md-3">
            <div className="card vc-card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Budgets</h5>
                {user?.role !== 'user' && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowCreateBudget(true)}
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                )}
              </div>
              <div className="card-body">
                {/* Filters */}
                <div className="mb-3">
                  <select
                    className="form-select form-select-sm mb-2"
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                  >
                    <option value="">All Periods</option>
                    <option value="month">Monthly</option>
                    <option value="quarter">Quarterly</option>
                    <option value="year">Yearly</option>
                  </select>
                  <select
                    className="form-select form-select-sm"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                  >
                    <option value="">All Years</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                  </select>
                </div>
                
                {/* Budget List */}
                <div className="budget-list">
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2">Loading budgets...</p>
                    </div>
                  ) : budgets.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="fas fa-folder-open fa-4x text-muted mb-3"></i>
                      <h5>No budgets found</h5>
                      <p className="text-muted">Create a new budget to get started.</p>
                    </div>
                  ) : (
                    budgets.map(budget => (
                      <div
                        key={budget.id}
                        className={clsx('budget-item', {
                          'selected': selectedBudget?.id === budget.id
                        })}
                        onClick={() => selectBudget(budget)}
                      >
                        <div className="fw-semibold">{budget.name}</div>
                        <div className="small text-muted">{budget.teamName}</div>
                        <div className="d-flex justify-content-between mt-1">
                          <span className="badge bg-secondary">{budget.period}</span>
                          <span className={clsx('small', {
                            'text-danger': budget.totalSpent > budget.totalLimit,
                            'text-warning': budget.totalSpent > budget.totalLimit * 0.8
                          })}>
                            {Math.round((budget.totalSpent / budget.totalLimit) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Budget Details */}
          <div className="col-md-9">
            {selectedBudget && summary ? (
              <>
                {/* Summary Cards */}
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card vc-card">
                      <div className="card-body">
                        <div className="text-muted small">Total Budget</div>
                        <div className="h4 mb-0">{formatCurrency(summary.totalLimit)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card vc-card">
                      <div className="card-body">
                        <div className="text-muted small">Total Spent</div>
                        <div className="h4 mb-0">{formatCurrency(summary.totalSpent)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card vc-card">
                      <div className="card-body">
                        <div className="text-muted small">Remaining</div>
                        <div className="h4 mb-0 text-success">
                          {formatCurrency(summary.totalLimit - summary.totalSpent)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card vc-card">
                      <div className="card-body">
                        <div className="text-muted small">Utilization</div>
                        <div className={clsx('h4 mb-0', `text-${getUtilizationColor(summary.utilization)}`)}>
                          {Math.round(summary.utilization)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="card vc-card mb-4">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Categories</h5>
                    <div>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={exportBudget}
                      >
                        <i className="fas fa-download"></i> Export
                      </button>
                      {user?.role !== 'user' && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setShowAddCategory(true)}
                        >
                          <i className="fas fa-plus"></i> Add Category
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Budget</th>
                            <th>Spent</th>
                            <th>Remaining</th>
                            <th>Utilization</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map(category => (
                            <tr key={category.id}>
                              <td>{category.name}</td>
                              <td>{formatCurrency(category.limit)}</td>
                              <td>{formatCurrency(category.spent)}</td>
                              <td className={category.remaining < 0 ? 'text-danger' : 'text-success'}>
                                {formatCurrency(category.remaining)}
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="progress flex-grow-1 me-2" style={{ height: '10px' }}>
                                    <div
                                      className={`progress-bar bg-${getUtilizationColor(category.utilization)}`}
                                      style={{ width: `${Math.min(category.utilization, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className={`small text-${getUtilizationColor(category.utilization)}`}>
                                    {Math.round(category.utilization)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Recent Expenses */}
                <div className="card vc-card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Recent Expenses</h5>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setShowAddExpense(true)}
                    >
                      <i className="fas fa-plus"></i> Add Expense
                    </button>
                  </div>
                  <div className="card-body">
                    <div className="expense-list">
                      {expenses.map(expense => {
                        const category = categories.find(c => c.id === expense.categoryId);
                        return (
                          <div key={expense.id} className="expense-item">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <div className="fw-semibold">{expense.description}</div>
                                <div className="small text-muted">
                                  {category?.name} • {new Date(expense.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="fw-bold">{formatCurrency(expense.amount)}</div>
                                {expense.receipts && expense.receipts.length > 0 && (
                                  <i className="fas fa-paperclip text-muted small"></i>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="card vc-card">
                <div className="card-body text-center py-5">
                  <i className="fas fa-chart-pie fa-4x text-muted mb-3"></i>
                  <h5>Select a budget to view details</h5>
                  <p className="text-muted">Choose from the list on the left</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Budget Modal */}
        {showCreateBudget && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create Budget</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowCreateBudget(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Budget Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={budgetName}
                      onChange={(e) => setBudgetName(e.target.value)}
                      placeholder="Q1 2024 Budget"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Period</label>
                    <select
                      className="form-select"
                      value={budgetPeriod}
                      onChange={(e) => setBudgetPeriod(e.target.value as any)}
                    >
                      <option value="month">Monthly</option>
                      <option value="quarter">Quarterly</option>
                      <option value="year">Yearly</option>
                    </select>
                  </div>
                  <div className="row">
                    <div className="col">
                      <label className="form-label">Year</label>
                      <input
                        type="number"
                        className="form-control"
                        value={budgetYear}
                        onChange={(e) => setBudgetYear(parseInt(e.target.value))}
                        min="2020"
                        max="2030"
                      />
                    </div>
                    {budgetPeriod === 'month' && (
                      <div className="col">
                        <label className="form-label">Month</label>
                        <select
                          className="form-select"
                          value={budgetMonth}
                          onChange={(e) => setBudgetMonth(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowCreateBudget(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={createBudget}
                    disabled={loading || !budgetName.trim()}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        {showAddCategory && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Category</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowAddCategory(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Category Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="Marketing"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Budget Limit</label>
                    <input
                      type="number"
                      className="form-control"
                      value={categoryLimit}
                      onChange={(e) => setCategoryLimit(e.target.value)}
                      placeholder="5000"
                      step="100"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowAddCategory(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={addCategory}
                    disabled={loading || !categoryName.trim() || !categoryLimit}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Expense Modal */}
        {showAddExpense && categories.length > 0 && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Expense</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowAddExpense(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <input
                      type="text"
                      className="form-control"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      placeholder="Team lunch at restaurant"
                    />
                  </div>
                  <div className="row">
                    <div className="col">
                      <label className="form-label">Amount</label>
                      <input
                        type="number"
                        className="form-control"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="125.50"
                        step="0.01"
                      />
                    </div>
                    <div className="col">
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowAddExpense(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={addExpense}
                    disabled={loading || !expenseDescription.trim() || !expenseAmount || !expenseCategory}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .budget-container {
          padding: 20px;
        }

        .budget-list {
          max-height: 500px;
          overflow-y: auto;
        }

        .budget-item {
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 8px;
          transition: all 0.2s;
        }

        .budget-item:hover {
          background-color: var(--vc-hover);
        }

        .budget-item.selected {
          background-color: var(--vc-primary);
          color: white;
        }

        .budget-item.selected .text-muted {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .expense-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .expense-item {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        .expense-item:last-child {
          border-bottom: none;
        }

        .expense-item:hover {
          background-color: var(--vc-hover);
        }

        .progress {
          background-color: #e0e0e0;
        }
      `}</style>
    </AppLayout>
  );
}; 
