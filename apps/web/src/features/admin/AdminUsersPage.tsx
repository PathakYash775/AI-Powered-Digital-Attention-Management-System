import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import type { AdminUserItem, AdminUserDetails } from '../../api/types';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from '../../components/ui/Spinner';
import styles from './AdminUsersPage.module.css';

export function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [stats, setStats] = useState<{ totalUsers: number; activeUsers: number; inactiveUsers: number; totalAdmins: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [detailsUser, setDetailsUser] = useState<AdminUserDetails | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    type: 'status' | 'role';
    user: AdminUserItem;
    targetValue: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
      setUsers(res.users);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch {
      setActionError('Failed to load registered users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleViewDetails = async (userId: string) => {
    try {
      const details = await adminApi.getUserDetails(userId);
      setDetailsUser(details);
    } catch {
      setActionError('Failed to retrieve user telemetry details');
    }
  };

  const handleOpenStatusConfirm = (u: AdminUserItem) => {
    if (u.id === currentAdmin?.id) {
      setActionError('Safety Protection: You cannot deactivate your own active administrator account.');
      return;
    }
    const nextStatus = u.status === 'active' ? 'inactive' : 'active';
    setConfirmModal({ type: 'status', user: u, targetValue: nextStatus });
  };

  const handleOpenRoleConfirm = (u: AdminUserItem) => {
    if (u.id === currentAdmin?.id) {
      setActionError('Safety Protection: You cannot demote your own administrator account.');
      return;
    }
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    setConfirmModal({ type: 'role', user: u, targetValue: nextRole });
  };

  const handleExecuteConfirmedAction = async () => {
    if (!confirmModal) return;
    try {
      setIsUpdating(true);
      setActionError(null);
      if (confirmModal.type === 'status') {
        await adminApi.updateUserStatus(confirmModal.user.id, confirmModal.targetValue === 'active');
      } else if (confirmModal.type === 'role') {
        await adminApi.updateUserRole(confirmModal.user.id, confirmModal.targetValue as 'user' | 'admin');
      }
      setConfirmModal(null);
      await fetchUsers();
    } catch (err: any) {
      setActionError(err.response?.data?.error?.message || 'Action failed');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Breadcrumb & Heading */}
      <div className={styles.topHeader}>
        <div className={styles.breadcrumbs}>
          Admin <span>/</span> Platform Governance
        </div>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.pageTitle}>User Management</h1>
            <p className={styles.pageSubtitle}>View registered accounts, account status, and role-based permissions</p>
          </div>
          <button type="button" onClick={fetchUsers} className={styles.actionBtn} aria-label="Refresh users list">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={styles.tabsBar}>
        <div className={styles.navTabs}>
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `${styles.tabLink} ${isActive ? styles.tabLinkActive : ''}`}
          >
            Overview
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) => `${styles.tabLink} ${isActive ? styles.tabLinkActive : ''}`}
          >
            Users
          </NavLink>
        </div>
      </div>

      {/* Quick Summary Stat Pills */}
      <div className={styles.statsPillsRow}>
        <div className={styles.statPill}>
          <span>Total Registered:</span>
          <span className={styles.statPillValue}>{stats?.totalUsers ?? users.length}</span>
        </div>
        <div className={styles.statPill}>
          <span>Active Users:</span>
          <span className={styles.statPillValue} style={{ color: '#10b981' }}>{stats?.activeUsers ?? users.length}</span>
        </div>
        <div className={styles.statPill}>
          <span>Inactive Accounts:</span>
          <span className={styles.statPillValue} style={{ color: '#f59e0b' }}>{stats?.inactiveUsers ?? 0}</span>
        </div>
        <div className={styles.statPill}>
          <span>Administrators:</span>
          <span className={styles.statPillValue} style={{ color: '#8b5cf6' }}>{stats?.totalAdmins ?? 1}</span>
        </div>
      </div>

      {actionError ? (
        <div role="alert" style={{ color: '#ef4444', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', fontSize: '0.85rem' }}>
          {actionError}
        </div>
      ) : null}

      {/* Filter & Search Toolbar */}
      <div className={styles.filterBar}>
        <form onSubmit={handleSearchSubmit} className={styles.searchInputWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={styles.filterSelect}
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          <option value="user">Users Only</option>
          <option value="admin">Administrators Only</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <Spinner label="Loading users directory..." size="lg" />
      ) : users.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No users found matching your filters.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>User Account</th>
                <th className={styles.th}>Role</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Sessions</th>
                <th className={styles.th}>Registered</th>
                <th className={styles.th}>Last Active</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const initials = (u.displayName || u.email).slice(0, 2).toUpperCase();
                const isSelf = u.id === currentAdmin?.id;
                const regDate = new Date(u.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const lastActiveStr = u.lastActiveAt
                  ? new Date(u.lastActiveAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Active today';

                return (
                  <tr key={u.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.userCell}>
                        <div
                          className={styles.avatar}
                          style={{
                            background: u.role === 'admin'
                              ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                              : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className={styles.userName}>
                            {u.displayName || 'User'}
                            {isSelf ? <span style={{ fontSize: '0.7rem', color: 'var(--color-primary, #3b82f6)', marginLeft: 6 }}>(You)</span> : null}
                          </div>
                          <div className={styles.userEmail}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className={styles.td}>
                      {u.role === 'admin' ? (
                        <span className={styles.roleBadgeAdmin}>Admin</span>
                      ) : (
                        <span className={styles.roleBadgeUser}>User</span>
                      )}
                    </td>

                    <td className={styles.td}>
                      {u.status === 'active' ? (
                        <span className={styles.statusBadgeActive}>
                          <span className={styles.statusDot} /> Active
                        </span>
                      ) : (
                        <span className={styles.statusBadgeInactive}>
                          <span className={styles.statusDot} /> Inactive
                        </span>
                      )}
                    </td>

                    <td className={styles.td}>
                      <span style={{ fontWeight: 600 }}>{u.sessionsCount}</span>
                    </td>

                    <td className={styles.td}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{regDate}</span>
                    </td>

                    <td className={styles.td}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{lastActiveStr}</span>
                    </td>

                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <div className={styles.actionsCell} style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => void handleViewDetails(u.id)}
                          title="View user details and productivity records"
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          className={styles.actionBtn}
                          disabled={isSelf}
                          onClick={() => handleOpenStatusConfirm(u)}
                          title={isSelf ? 'Cannot deactivate yourself' : u.status === 'active' ? 'Deactivate account' : 'Activate account'}
                          style={{ color: u.status === 'active' ? '#f59e0b' : '#10b981' }}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          type="button"
                          className={styles.actionBtn}
                          disabled={isSelf}
                          onClick={() => handleOpenRoleConfirm(u)}
                          title={isSelf ? 'Cannot change own role' : u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        >
                          {u.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* User Details Modal */}
      {detailsUser ? (
        <div className={styles.modalBackdrop} onClick={() => setDetailsUser(null)}>
          <div className={styles.detailsModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.modalTitle}>{detailsUser.profile.displayName || 'User'} Account Details</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{detailsUser.profile.email}</div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsUser(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div className={styles.detailsGrid}>
              {/* Box 1: Profile & Status */}
              <div className={styles.detailBox}>
                <div className={styles.detailBoxTitle}>
                  <span>👤</span> Profile Information
                </div>
                <div className={styles.detailItemRow}>
                  <span className={styles.detailItemLabel}>Account Role:</span>
                  <span className={styles.detailItemVal} style={{ textTransform: 'uppercase' }}>{detailsUser.profile.role}</span>
                </div>
                <div className={styles.detailItemRow}>
                  <span className={styles.detailItemLabel}>Account Status:</span>
                  <span className={styles.detailItemVal} style={{ color: detailsUser.profile.status === 'active' ? '#10b981' : '#f59e0b' }}>
                    {detailsUser.profile.status}
                  </span>
                </div>
                <div className={styles.detailItemRow}>
                  <span className={styles.detailItemLabel}>Timezone:</span>
                  <span className={styles.detailItemVal}>{detailsUser.profile.timezone || 'UTC'}</span>
                </div>
                <div className={styles.detailItemRow}>
                  <span className={styles.detailItemLabel}>Registered:</span>
                  <span className={styles.detailItemVal}>{new Date(detailsUser.profile.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Box 2: Registered Devices */}
              <div className={styles.detailBox}>
                <div className={styles.detailBoxTitle}>
                  <span>💻</span> Registered Devices ({detailsUser.devices.length})
                </div>
                {detailsUser.devices.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No devices paired yet.</span>
                ) : (
                  detailsUser.devices.map((d) => (
                    <div key={d.id} className={styles.detailItemRow}>
                      <span className={styles.detailItemLabel}>{d.platform.toUpperCase()} - {d.name}</span>
                      <span className={styles.detailItemVal} style={{ fontSize: '0.75rem', color: '#10b981' }}>Active</span>
                    </div>
                  ))
                )}
              </div>

              {/* Box 3: Productivity Summary */}
              <div className={styles.detailBox}>
                <div className={styles.detailBoxTitle}>
                  <span>🎯</span> Productivity Summary
                </div>
                <div className={styles.detailItemRow}>
                  <span className={styles.detailItemLabel}>Total Focus Sessions:</span>
                  <span className={styles.detailItemVal}>{detailsUser.productivitySummary.totalFocusSessions}</span>
                </div>
                <div className={styles.detailItemRow}>
                  <span className={styles.detailItemLabel}>Completed Sessions:</span>
                  <span className={styles.detailItemVal}>{detailsUser.productivitySummary.completedFocusSessions}</span>
                </div>
                <div className={styles.detailItemRow}>
                  <span className={styles.detailItemLabel}>Focus Screen Time:</span>
                  <span className={styles.detailItemVal}>{Math.round(detailsUser.productivitySummary.totalScreenMinutes / 60)}h</span>
                </div>
                <div className={styles.detailItemRow}>
                  <span className={styles.detailItemLabel}>Focus Rating:</span>
                  <span className={styles.detailItemVal} style={{ color: '#10b981' }}>{detailsUser.productivitySummary.focusRating}</span>
                </div>
              </div>

              {/* Box 4: Activity Summary */}
              <div className={styles.detailBox}>
                <div className={styles.detailBoxTitle}>
                  <span>📊</span> Activity Summary
                </div>
                <div className={styles.detailItemRow}>
                  <span className={styles.detailItemLabel}>Recent Context Switches:</span>
                  <span className={styles.detailItemVal}>{detailsUser.activitySummary.totalSwitches}</span>
                </div>
                <div className={styles.detailItemRow}>
                  <span className={styles.detailItemLabel}>Notification Events:</span>
                  <span className={styles.detailItemVal}>{detailsUser.activitySummary.totalNotifications}</span>
                </div>
                <div className={styles.detailItemRow}>
                  <span className={styles.detailItemLabel}>Logged Activities:</span>
                  <span className={styles.detailItemVal}>{detailsUser.activitySummary.recentActivity.length} recent</span>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setDetailsUser(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirmation Modal */}
      {confirmModal ? (
        <div className={styles.modalBackdrop} onClick={() => setConfirmModal(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {confirmModal.type === 'status'
                ? confirmModal.targetValue === 'inactive'
                  ? 'Deactivate User Account'
                  : 'Activate User Account'
                : confirmModal.targetValue === 'admin'
                ? 'Promote User to Admin'
                : 'Demote Admin to User'}
            </h3>

            <p className={styles.modalBody}>
              {confirmModal.type === 'status'
                ? confirmModal.targetValue === 'inactive'
                  ? `Are you sure you want to deactivate account "${confirmModal.user.email}"? The user will immediately be signed out, all refresh tokens invalidated, and active devices suspended.`
                  : `Are you sure you want to reactivate account "${confirmModal.user.email}"?`
                : confirmModal.targetValue === 'admin'
                ? `Are you sure you want to promote "${confirmModal.user.email}" to Administrator? They will receive full access to the Admin Portal and platform settings.`
                : `Are you sure you want to demote "${confirmModal.user.email}" from Administrator to standard User?`}
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setConfirmModal(null)}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => void handleExecuteConfirmedAction()}
                disabled={isUpdating}
                style={{
                  background: confirmModal.type === 'status' && confirmModal.targetValue === 'inactive' ? '#ef4444' : 'var(--color-primary, #3b82f6)'
                }}
              >
                {isUpdating ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
