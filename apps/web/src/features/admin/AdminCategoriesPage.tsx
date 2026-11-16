import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin';
import type { DomainCategoryItem } from '../../api/types';
import { Spinner } from '../../components/ui/Spinner';
import styles from './AdminCategoriesPage.module.css';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<DomainCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formKind, setFormKind] = useState<'domain' | 'app'>('domain');
  const [formPattern, setFormPattern] = useState('');
  const [formCategory, setFormCategory] = useState<string>('productive');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getCategories({
        search: search.trim() || undefined,
        kind: kindFilter || undefined,
        category: categoryFilter || undefined,
      });
      setCategories(res);
    } catch {
      setError('Failed to load category classification rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [kindFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCategories();
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPattern.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await adminApi.createCategory({
        kind: formKind,
        pattern: formPattern.trim().toLowerCase(),
        category: formCategory,
      });
      setShowAddModal(false);
      setFormPattern('');
      await fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create category classification rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this classification rule?')) return;
    try {
      setDeletingId(id);
      await adminApi.deleteCategory(id);
      await fetchCategories();
    } catch {
      setError('Failed to delete category rule');
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryBadgeStyle = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'productive':
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
      case 'social':
        return { background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' };
      case 'communication':
        return { background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' };
      case 'entertainment':
        return { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
      default:
        return { background: 'rgba(100, 116, 139, 0.15)', color: '#64748b' };
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div>
          <h2 className={styles.pageHeading}>Classification Rules</h2>
          <p className={styles.pageSubheading}>
            Manage system-wide website domain and desktop application productivity categorization
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className={styles.addBtn}
        >
          <span>+ Add Classification Rule</span>
        </button>
      </div>

      {error ? (
        <div role="alert" style={{ color: '#ef4444', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px' }}>
          {error}
        </div>
      ) : null}

      {/* Filter Toolbar */}
      <div className={styles.filterBar}>
        <form onSubmit={handleSearchSubmit} className={styles.searchInputWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search pattern e.g. github.com or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </form>

        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className={styles.filterSelect}
          aria-label="Filter by target type"
        >
          <option value="">All Types (Domain &amp; App)</option>
          <option value="domain">Web Domains Only</option>
          <option value="app">Desktop Apps Only</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={styles.filterSelect}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          <option value="productive">Productive</option>
          <option value="communication">Communication</option>
          <option value="social">Social</option>
          <option value="entertainment">Entertainment</option>
          <option value="other">Other / Utility</option>
        </select>
      </div>

      {/* Rules Table */}
      {loading ? (
        <Spinner label="Loading classification rules..." size="lg" />
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Type</th>
                <th className={styles.th}>Target Pattern</th>
                <th className={styles.th}>Assigned Category</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.td} style={{ textAlign: 'center', padding: '2rem' }}>
                    No classification rules found matching your filters.
                  </td>
                </tr>
              ) : (
                categories.map((rule) => (
                  <tr key={rule.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={rule.kind === 'domain' ? styles.kindBadgeDomain : styles.kindBadgeApp}>
                        {rule.kind === 'domain' ? '🌐 Domain' : '💻 App'}
                      </span>
                    </td>

                    <td className={styles.td}>
                      <span className={styles.patternCode}>{rule.pattern}</span>
                    </td>

                    <td className={styles.td}>
                      <span
                        className={styles.catBadge}
                        style={getCategoryBadgeStyle(rule.category)}
                      >
                        ● {rule.category}
                      </span>
                    </td>

                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        disabled={deletingId === rule.id}
                        onClick={() => handleDeleteRule(rule.id)}
                        aria-label={`Delete rule for ${rule.pattern}`}
                      >
                        {deletingId === rule.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Rule Modal */}
      {showAddModal ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard} role="dialog" aria-modal="true">
            <h3 className={styles.modalTitle}>Add Classification Rule</h3>
            <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="rule-kind">Target Type</label>
                <select
                  id="rule-kind"
                  value={formKind}
                  onChange={(e) => setFormKind(e.target.value as 'domain' | 'app')}
                  className={styles.formInput}
                >
                  <option value="domain">🌐 Website Domain (e.g. docs.google.com)</option>
                  <option value="app">💻 Desktop Application (e.g. figma.exe or code)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="rule-pattern">
                  {formKind === 'domain' ? 'Domain Hostname' : 'Application Process Name'}
                </label>
                <input
                  id="rule-pattern"
                  type="text"
                  required
                  placeholder={formKind === 'domain' ? 'e.g. figma.com or stackoverflow.com' : 'e.g. cursor or slack'}
                  value={formPattern}
                  onChange={(e) => setFormPattern(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="rule-category">Productivity Category</label>
                <select
                  id="rule-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className={styles.formInput}
                >
                  <option value="productive">Productive (Work, Study, Coding, Research)</option>
                  <option value="communication">Communication (Slack, Teams, Email, Chat)</option>
                  <option value="social">Social Media (Twitter/X, Instagram, Reddit)</option>
                  <option value="entertainment">Entertainment (YouTube, Netflix, Spotify)</option>
                  <option value="other">Other / Utility (File Manager, Settings, System)</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  disabled={isSubmitting}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.confirmBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving Rule...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

