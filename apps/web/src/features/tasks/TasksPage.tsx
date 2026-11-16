import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi, type CreateTaskPayload } from '../../api/tasks';
import type {
  Task,
  TaskStats,
  TaskPriority,
  TaskStatus,
  TaskPrioritizationResult,
} from '../../api/types';
import styles from './TasksPage.module.css';

export function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrioritization, setAiPrioritization] = useState<TaskPrioritizationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('development');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [deadline, setDeadline] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [taskList, taskStats] = await Promise.all([
        tasksApi.listTasks(statusFilter === 'all' ? undefined : { status: statusFilter }),
        tasksApi.getTaskStats(),
      ]);
      setTasks(taskList);
      setStats(taskStats);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [statusFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const payload: CreateTaskPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        estimatedMinutes,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      };
      await tasksApi.createTask(payload);
      setIsAddModalOpen(false);
      setTitle('');
      setDescription('');
      setDeadline('');
      await loadData();
    } catch {
      // Handle error
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await tasksApi.updateTask(task.id, { status: nextStatus });
      await loadData();
    } catch {
      // Handle error
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksApi.deleteTask(id);
      await loadData();
    } catch {
      // Handle error
    }
  };

  const handleStartFocus = (task: Task) => {
    const min = task.estimatedMinutes || 25;
    navigate(`/focus?taskId=${task.id}&title=${encodeURIComponent(task.title)}&plannedMin=${min}`);
  };

  const handleRunAiPrioritize = async () => {
    try {
      setAiLoading(true);
      setIsAiModalOpen(true);
      const res = await tasksApi.getAiPrioritization();
      setAiPrioritization(res);
    } catch {
      // Handle error
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiPriorities = async () => {
    if (!aiPrioritization) return;
    const suggestions = aiPrioritization.suggestions || aiPrioritization.prioritizedTasks || [];
    if (suggestions.length === 0) return;

    try {
      const updates = suggestions.map((s) => ({
        id: s.id,
        priority: s.suggestedPriority,
        order: s.recommendedOrder,
      }));
      await tasksApi.applyPriorities(updates);
      setIsAiModalOpen(false);
      await loadData();
    } catch {
      // Handle error
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.headerTitle}>Task Manager</h2>
          <p className={styles.headerDesc}>
            Prioritize goals, link focused work sessions, and optimize deep work execution.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.actionBtn} ${styles.aiPrioBtn}`}
            onClick={() => void handleRunAiPrioritize()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
            </svg>
            AI Prioritize
          </button>
          <button
            className={`${styles.actionBtn} ${styles.primaryBtn}`}
            onClick={() => setIsAddModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Task
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Tasks</div>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statSub}>{stats.inProgress} currently active</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Completed Today</div>
            <div className={styles.statValue} style={{ color: '#10b981' }}>{stats.completedToday}</div>
            <div className={styles.statSub}>{stats.completed} all-time</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Completion Rate</div>
            <div className={styles.statValue}>{stats.completionRate}%</div>
            <div className={styles.statSub}>{stats.overdue} overdue</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Focus Minutes Invested</div>
            <div className={styles.statValue} style={{ color: '#8b5cf6' }}>{stats.totalFocusMinutesSpent}m</div>
            <div className={styles.statSub}>Dedicated deep work</div>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.tabGroup}>
          <button
            className={`${styles.tabBtn} ${statusFilter === 'all' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            className={`${styles.tabBtn} ${statusFilter === 'todo' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('todo')}
          >
            To Do
          </button>
          <button
            className={`${styles.tabBtn} ${statusFilter === 'in_progress' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('in_progress')}
          >
            In Progress
          </button>
          <button
            className={`${styles.tabBtn} ${statusFilter === 'completed' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Completed
          </button>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {tasks.length} task{tasks.length === 1 ? '' : 's'} listed
        </span>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          Loading your task queue...
        </div>
      ) : tasks.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No tasks in this category</h3>
          <p>Create a new task to organize your work and track focused sessions against it.</p>
          <button
            className={`${styles.actionBtn} ${styles.primaryBtn}`}
            style={{ marginTop: 12 }}
            onClick={() => setIsAddModalOpen(true)}
          >
            Create Your First Task
          </button>
        </div>
      ) : (
        <div className={styles.taskList}>
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = task.deadline && new Date(task.deadline).getTime() < Date.now() && !isCompleted;

            return (
              <div
                key={task.id}
                className={`${styles.taskCard} ${isCompleted ? styles.taskCompleted : ''}`}
              >
                <div className={styles.taskLeft}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isCompleted}
                    onChange={() => void handleToggleStatus(task)}
                    title={isCompleted ? 'Mark active' : 'Mark completed'}
                  />
                  <div className={styles.taskContent}>
                    <h4 className={`${styles.taskTitle} ${isCompleted ? styles.taskCompletedTitle : ''}`}>
                      {task.title}
                    </h4>
                    {task.description && <p className={styles.taskDesc}>{task.description}</p>}

                    <div className={styles.taskMeta}>
                      <span className={styles.categoryChip}>{task.category}</span>
                      <span
                        className={`${styles.priorityChip} ${
                          task.priority === 'urgent'
                            ? styles.prioUrgent
                            : task.priority === 'high'
                            ? styles.prioHigh
                            : task.priority === 'medium'
                            ? styles.prioMedium
                            : styles.prioLow
                        }`}
                      >
                        {task.priority}
                      </span>
                      {task.deadline && (
                        <span className={`${styles.deadlineContainer} ${isOverdue ? styles.overdue : ''}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {isOverdue ? 'Overdue: ' : 'Due: '}
                          {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {(task.focusMinutesSpent || 0) > 0 && (
                        <span className={styles.focusSpent}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {task.focusMinutesSpent}m focused ({task.sessionsCount || 0} session{(task.sessionsCount || 0) === 1 ? '' : 's'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.taskRight}>
                  {!isCompleted && (
                    <button
                      className={styles.focusBlockBtn}
                      onClick={() => handleStartFocus(task)}
                      title="Launch linked focus block"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Start Focus ({task.estimatedMinutes}m)
                    </button>
                  )}
                  <button
                    className={styles.iconBtn}
                    onClick={() => void handleDeleteTask(task.id)}
                    title="Delete task"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add New Task</h3>
              <button className={styles.iconBtn} onClick={() => setIsAddModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateTask(e)}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Task Title *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g., Implement data ingestion pipeline"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  placeholder="Additional context or deliverables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Category</label>
                  <select
                    className={styles.select}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="development">Development</option>
                    <option value="research">Research</option>
                    <option value="writing">Writing</option>
                    <option value="design">Design</option>
                    <option value="planning">Planning</option>
                    <option value="communication">Communication</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Priority</label>
                  <select
                    className={styles.select}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Estimated Minutes</label>
                  <input
                    type="number"
                    className={styles.input}
                    min={5}
                    max={480}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Deadline</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`}>
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Task Prioritization Modal */}
      {isAiModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAiModalOpen(false)}>
          <div className={styles.modalBox} style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={styles.priorityChip} style={{ background: '#ede9fe', color: '#7c3aed' }}>
                  Gemini AI Optimization
                </span>
                <h3 className={styles.modalTitle}>AI Task Prioritization</h3>
              </div>
              <button className={styles.iconBtn} onClick={() => setIsAiModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {aiLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ width: 32, height: 32, margin: '0 auto 12px', borderRadius: '50%', border: '3px solid #7c3aed', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                Analyzing tasks against deadlines, estimated cognitive load, and stamina windows...
              </div>
            ) : aiPrioritization ? (
              <div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                  {aiPrioritization.reasoning || aiPrioritization.summary}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto', marginBottom: 20 }}>
                  {(aiPrioritization.suggestions || aiPrioritization.prioritizedTasks || []).map((s, idx) => {
                    const task = tasks.find((t) => t.id === s.id);
                    return (
                      <div
                        key={s.id}
                        style={{
                          background: 'var(--bg-subtle)',
                          borderRadius: 8,
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                            #{idx + 1}. {task ? task.title : 'Task'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {s.reason}
                          </div>
                        </div>
                        <span
                          className={`${styles.priorityChip} ${
                            s.suggestedPriority === 'urgent'
                              ? styles.prioUrgent
                              : s.suggestedPriority === 'high'
                              ? styles.prioHigh
                              : s.suggestedPriority === 'medium'
                              ? styles.prioMedium
                              : styles.prioLow
                          }`}
                        >
                          {s.suggestedPriority}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button
                    className={styles.actionBtn}
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                    onClick={() => setIsAiModalOpen(false)}
                  >
                    Dismiss
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.aiPrioBtn}`}
                    onClick={() => void handleApplyAiPriorities()}
                  >
                    Apply Prioritization
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

