import React, { useState, useEffect } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import { useUsers } from '../../hooks/useUsers';
import clsx from 'clsx';

interface Group {
  id: string;
  name: string;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
}

interface Bill {
  id: string;
  groupId: string;
  title: string;
  currency: string;
  createdBy: string;
  createdAt: string;
  total: number;
  itemCount: number;
}

interface BillItem {
  id: string;
  billId: string;
  description: string;
  amount: number;
  payerId: string;
  splits: { userId: string; amount: number }[];
}

interface Settlement {
  userId: string;
  balance: number;
}

interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export const BillSplitterPage: React.FC = () => {
  const { getAuthHeader, user, accessToken } = useAuth();
  const { users: availableUsers } = useUsers();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Form states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberEmails, setMemberEmails] = useState('');
  const [billTitle, setBillTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemPayer, setItemPayer] = useState('');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  // Ensure mock data exists for this user (runs once)
  useEffect(() => {
    (async () => {
      if (!user || !accessToken) return;
      try {
        await fetch('/api/billsplitter/debug/ensure-data', {
          method: 'POST',
          headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
          credentials: 'include'
        });
      } catch {}
      await fetchGroups();
      await fetchBills();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Authentication check
  useEffect(() => {
    if (!user || !accessToken) {
      console.log('User not authenticated, redirecting to login');
      window.location.href = '/login';
      return;
    }
    console.log('User authenticated:', { user, hasToken: !!accessToken });
  }, [user, accessToken]);

  // Show loading while checking authentication
  if (!user || !accessToken) {
    return (
      <AppLayout title="Bill Splitter">
        <div className="container-fluid">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Checking authentication...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  useEffect(() => {
    fetchGroups();
    fetchBills();
  }, []);

  // Debug effect to log data changes
  useEffect(() => {
    console.log('BillSplitter data updated:', {
      groups: groups.length,
      bills: bills.length,
      selectedGroup,
      selectedBill,
      loading,
      error
    });
  }, [groups, bills, selectedGroup, selectedBill, loading, error]);

  // Data validation effect
  useEffect(() => {
    if (!loading && !error) {
      if (groups.length === 0 && bills.length === 0) {
        console.warn('No data loaded - this might indicate an authentication or API issue');
      } else {
        console.log('Data loaded successfully:', {
          groups: groups.length,
          bills: bills.length,
          sampleGroup: groups[0],
          sampleBill: bills[0]
        });
      }
    }
  }, [groups, bills, loading, error]);

  async function fetchGroups() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/billsplitter/groups', {
        headers: getAuthHeader(),
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError('Authentication required. Please log in.');
          return;
        }
        throw new Error(`HTTP ${res.status}: Failed to fetch groups`);
      }
      const data = await res.json();
      setGroups(data.groups || []);
      console.log('Fetched groups:', data.groups);
    } catch (err: any) {
      console.error('Error fetching groups:', err);
      setError(err.message || 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  }

  async function fetchBills() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/billsplitter/bills', {
        headers: getAuthHeader(),
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError('Authentication required. Please log in.');
          return;
        }
        throw new Error(`HTTP ${res.status}: Failed to fetch bills`);
      }
      const data = await res.json();
      setBills(data.bills || []);
      console.log('Fetched bills:', data.bills);
    } catch (err: any) {
      console.error('Error fetching bills:', err);
      setError(err.message || 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  }

  // (debug/test helpers removed for production UI)

  function resetCreateGroupModal() {
    setShowCreateGroup(false);
    setGroupName('');
    setMemberEmails('');
    setSelectedParticipants([]);
    setError(null);
  }

  async function createGroup() {
    if (!groupName.trim()) return;
    
    setLoading(true);
    try {
      // For demo, parse emails and map to user IDs
      const emails = memberEmails.split(',').map(e => e.trim()).filter(e => e);
      const memberIds = [user?.id];
      
      // Add selected participants from checkboxes if any
      if (selectedParticipants.length > 0) {
        memberIds.push(...selectedParticipants);
      }
      
      // Also add users by email if provided
      if (emails.length > 0) {
        const emailUserIds = availableUsers
          .filter(u => emails.includes(u.email))
          .map(u => u.id);
        memberIds.push(...emailUserIds);
      }
      
      // Remove duplicates
      const uniqueMemberIds = [...new Set(memberIds.filter(id => id))];
      
      if (uniqueMemberIds.length < 2) {
        throw new Error('A group must have at least 2 members');
      }
      
      const res = await fetch('/api/billsplitter/groups', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, memberIds: uniqueMemberIds })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create group');
      }
      
      const data = await res.json();
      setGroups([...groups, data.group]);
      resetCreateGroupModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectGroup(group: Group) {
    setSelectedGroup(group);
    setSelectedBill(null);
    
    try {
      // Fetch group details with bills
      const res = await fetch(`/api/billsplitter/groups/${group.id}`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch group details');
      const data = await res.json();
      // Normalize bills from group details so UI fields exist (createdAt, etc.)
      const normalizedBills = (data.bills || []).map((b: any) => ({
        id: b.id,
        groupId: b.group_id ?? b.groupId,
        title: b.title,
        currency: b.currency,
        createdBy: b.created_by ?? b.createdBy,
        createdAt: b.created_at ?? b.createdAt,
        total: b.total ?? 0,
        itemCount: b.itemCount ?? 0,
      }));
      setBills(normalizedBills);
      
      // Fetch group members
      const membersRes = await fetch(`/api/billsplitter/groups/${group.id}/members`, {
        headers: getAuthHeader()
      });
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        console.log('Fetched group members:', membersData.members);
        setGroupMembers(membersData.members || []);
      } else {
        console.error('Failed to fetch group members:', membersRes.status);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch(`/api/billsplitter/groups/${groupId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete group');
      }
      
      // Remove group from state
      setGroups(prev => prev.filter(g => g.id !== groupId));
      
      // Clear selection if deleted group was selected
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        setSelectedBill(null);
        setBills([]);
        setGroupMembers([]);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createBill() {
    if (!billTitle.trim() || !selectedGroup) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/billsplitter/bills', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroup.id,
          title: billTitle,
          currency: 'USD'
        })
      });
      
      if (!res.ok) throw new Error('Failed to create bill');
      const data = await res.json();
      setBills([...bills, data.bill]);
      setShowCreateBill(false);
      setBillTitle('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectBill(bill: Bill) {
    setSelectedBill(bill);
    
    try {
      const res = await fetch(`/api/billsplitter/bills/${bill.id}`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch bill details');
      const data = await res.json();
      setBillItems(data.items);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function addItem() {
    if (!itemDescription.trim() || !itemAmount || !itemPayer || !selectedBill || !selectedGroup) return;
    
    setLoading(true);
    try {
      const amount = parseFloat(itemAmount);
      let splits: { userId: string; amount: number }[] = [];
      
      if (splitMethod === 'equal') {
        const splitAmount = amount / selectedGroup.memberIds.length;
        splits = selectedGroup.memberIds.map(userId => ({
          userId,
          amount: Math.round(splitAmount * 100) / 100
        }));
      } else {
        splits = Object.entries(customSplits).map(([userId, amt]) => ({
          userId,
          amount: amt
        }));
      }
      
      const res = await fetch(`/api/billsplitter/bills/${selectedBill.id}/items`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: itemDescription,
          amount,
          payerId: itemPayer,
          splits
        })
      });
      
      if (!res.ok) throw new Error('Failed to add item');
      const data = await res.json();
      setBillItems([...billItems, data.item]);
      setShowAddItem(false);
      setItemDescription('');
      setItemAmount('');
      setItemPayer('');
      setCustomSplits({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function calculateSettlements() {
    if (!selectedBill) return;
    
    try {
      const res = await fetch('/api/billsplitter/settlements', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: selectedBill.id })
      });
      
      if (!res.ok) throw new Error('Failed to calculate settlements');
      const data = await res.json();
      setSettlements(data.settlements);
      setTransactions(data.transactions);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function exportBill() {
    if (!selectedBill) return;
    
    try {
      const res = await fetch(`/api/billsplitter/bills/${selectedBill.id}/export`, {
        headers: getAuthHeader()
      });
      
      if (!res.ok) throw new Error('Failed to export bill');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedBill.title}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  }

  const getUserName = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    return user?.name || userId;
  };

  return (
    <AppLayout title="Bill Splitter">
      <div className="container-fluid">
        {/* Summary Cards */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <i className="fas fa-users fa-2x text-primary mb-2"></i>
                <h4 className="mb-1">{groups.length}</h4>
                <p className="text-muted mb-0">Groups</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <i className="fas fa-receipt fa-2x text-success mb-2"></i>
                <h4 className="mb-1">{bills.length}</h4>
                <p className="text-muted mb-0">Total Bills</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <i className="fas fa-dollar-sign fa-2x text-warning mb-2"></i>
                <h4 className="mb-1">${bills.reduce((sum, bill) => sum + bill.total, 0).toFixed(2)}</h4>
                <p className="text-muted mb-0">Total Spent</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <i className="fas fa-chart-line fa-2x text-info mb-2"></i>
                <h4 className="mb-1">{bills.length > 0 ? (bills.reduce((sum, bill) => sum + bill.total, 0) / bills.length).toFixed(2) : 0}</h4>
                <p className="text-muted mb-0">Avg Bill</p>
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

        {/* Production UI: debug buttons removed */}

        <div className="row">
          {/* Groups Section */}
          <div className="col-md-3">
            <div className="card vc-card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Groups</h5>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowCreateGroup(true)}
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              <div className="card-body p-0">
                <div className="list-group list-group-flush">
                  {loading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : groups.length === 0 ? (
                    <p className="text-muted text-center py-3">No groups yet. Create one to get started!</p>
                  ) : (
                    groups.map(group => (
                      <div
                        key={group.id}
                        className={clsx('list-group-item', {
                          'active': selectedGroup?.id === group.id
                        })}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <button
                            className="btn btn-link text-start p-0 border-0 bg-transparent flex-grow-1"
                            onClick={() => selectGroup(group)}
                            style={{ textDecoration: 'none' }}
                          >
                            <div className="d-flex">
                              <span>{group.name}</span>
                            </div>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger ms-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGroup(group.id);
                            }}
                            title="Delete group"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bills Section */}
          <div className="col-md-4">
            {selectedGroup ? (
              <div className="card vc-card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Bills - {selectedGroup.name}</h5>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowCreateBill(true)}
                  >
                    <i className="fas fa-plus"></i> New Bill
                  </button>
                </div>
                <div className="card-body">
                  {loading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : bills.length === 0 ? (
                    <p className="text-muted">No bills yet. Create one to get started!</p>
                  ) : (
                    <div className="list-group">
                      {bills.map(bill => (
                        <button
                          key={bill.id}
                          className={clsx('list-group-item list-group-item-action', {
                            'active': selectedBill?.id === bill.id
                          })}
                          onClick={() => selectBill(bill)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="mb-1">{bill.title}</h6>
                              <small className="text-muted">
                                {new Date(bill.createdAt).toLocaleDateString()}
                              </small>
                            </div>
                            <div className="text-end">
                              <div className="fw-bold">${(Number(bill.total) || 0).toFixed(2)}</div>
                              <small className="text-muted">{bill.itemCount || 0} items</small>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="alert alert-info">
                Select a group to view bills
              </div>
            )}
          </div>

          {/* Bill Details Section */}
          <div className="col-md-5">
            {selectedBill ? (
              <div className="card vc-card">
                <div className="card-header">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">{selectedBill.title}</h5>
                    <div>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={exportBill}
                      >
                        <i className="fas fa-download"></i> Export
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setShowAddItem(true)}
                      >
                        <i className="fas fa-plus"></i> Add Item ({groupMembers.length} members)
                      </button>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {/* Items Table */}
                  <div className="table-responsive mb-4">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>Paid By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billItems.map(item => (
                          <tr key={item.id}>
                            <td>{item.description}</td>
                            <td>${(Number(item.amount) || 0).toFixed(2)}</td>
                            <td>{getUserName(item.payerId)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th>Total</th>
                          <th colSpan={2}>
                            ${billItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toFixed(2)}
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Settlements */}
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6>Settlements</h6>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={calculateSettlements}
                      >
                        Calculate
                      </button>
                    </div>
                    
                    {loading ? (
                      <div className="text-center py-3">
                        <div className="spinner-border text-success" role="status">
                          <span className="visually-hidden">Calculating...</span>
                        </div>
                      </div>
                    ) : settlements.length > 0 && (
                      <>
                        <div className="mb-3">
                          <h6 className="text-muted">Balances</h6>
                          {settlements.map(s => (
                            <div key={s.userId} className="d-flex justify-content-between mb-2">
                              <span>{getUserName(s.userId)}</span>
                              <span className={clsx('fw-bold', {
                                'text-success': s.balance > 0,
                                'text-danger': s.balance < 0
                              })}>
                                {s.balance > 0 ? '+' : ''}{(Number(s.balance) || 0).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div>
                          <h6 className="text-muted">Transactions Needed</h6>
                          {transactions.map((t, i) => (
                            <div key={i} className="alert alert-info py-2">
                              <i className="fas fa-arrow-right me-2"></i>
                              {getUserName(t.from)} owes {getUserName(t.to)} ${(Number(t.amount) || 0).toFixed(2)}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : selectedGroup ? (
              <div className="alert alert-info">
                Select a bill to view details
              </div>
            ) : null}
          </div>
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create Group</h5>
                  <button
                    className="btn-close"
                    onClick={resetCreateGroupModal}
                  ></button>
                </div>
                <div className="modal-body" style={{ maxHeight: '60vh' }}>
                  <div className="mb-3">
                    <label className="form-label">Group Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Weekend Trip"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Participants</label>
                    <div className="text-muted small mb-2">Select at least one participant to create a group</div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {availableUsers.map(availableUser => (
                        <div key={availableUser.id} className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`participant-${availableUser.id}`}
                            checked={selectedParticipants.includes(availableUser.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedParticipants([...selectedParticipants, availableUser.id]);
                              } else {
                                setSelectedParticipants(selectedParticipants.filter(id => id !== availableUser.id));
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor={`participant-${availableUser.id}`}>
                            {availableUser.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={resetCreateGroupModal}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={createGroup}
                    disabled={loading || !groupName.trim() || selectedParticipants.length === 0}
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Bill Modal */}
        {showCreateBill && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create Bill</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowCreateBill(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Bill Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={billTitle}
                      onChange={(e) => setBillTitle(e.target.value)}
                      placeholder="Dinner at Restaurant"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowCreateBill(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={createBill}
                    disabled={loading || !billTitle.trim()}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Item Modal */}
        {showAddItem && selectedGroup && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Item</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowAddItem(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Description</label>
                        <input
                          type="text"
                          className="form-control"
                          value={itemDescription}
                          onChange={(e) => setItemDescription(e.target.value)}
                          placeholder="Appetizer"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Amount</label>
                        <input
                          type="number"
                          className="form-control"
                          value={itemAmount}
                          onChange={(e) => setItemAmount(e.target.value)}
                          placeholder="25.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Paid By</label>
                    <select
                      className="form-select"
                      value={itemPayer}
                      onChange={(e) => setItemPayer(e.target.value)}
                    >
                      <option value="">Select who paid</option>
                      {groupMembers.map(member => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Split Method</label>
                    <div className="btn-group w-100" role="group">
                      <button
                        type="button"
                        className={clsx('btn', splitMethod === 'equal' ? 'btn-primary' : 'btn-outline-primary')}
                        onClick={() => setSplitMethod('equal')}
                      >
                        Equal Split
                      </button>
                      <button
                        type="button"
                        className={clsx('btn', splitMethod === 'custom' ? 'btn-primary' : 'btn-outline-primary')}
                        onClick={() => setSplitMethod('custom')}
                      >
                        Custom Split
                      </button>
                    </div>
                  </div>

                  {splitMethod === 'custom' && (
                    <div>
                      <label className="form-label">Custom Splits</label>
                      {groupMembers.map(member => (
                        <div key={member.id} className="input-group mb-2">
                          <span className="input-group-text">{member.name}</span>
                          <input
                            type="number"
                            className="form-control"
                            value={customSplits[member.id] || ''}
                            onChange={(e) => setCustomSplits({
                              ...customSplits,
                              [member.id]: parseFloat(e.target.value) || 0
                            })}
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowAddItem(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={addItem}
                    disabled={loading || !itemDescription.trim() || !itemAmount || !itemPayer}
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* Custom styles for BillSplitter */
      `}</style>
    </AppLayout>
  );
};