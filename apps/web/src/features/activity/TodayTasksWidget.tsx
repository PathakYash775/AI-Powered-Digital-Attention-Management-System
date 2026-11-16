import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../../api/tasks';
import type { Task } from '../../api/types';
import styles from './TodayTasksWidget.module.css';

export function TodayTasksWidget() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await tasksApi.listTasks({ limit: 5 });
      setTasks(data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const handleToggle = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await tasksApi.updateTask(task.id, { status: nextStatus });
      await loadTasks();
    } catch {
      // Error handling
    }
  };

  const handleStartFocus = (task: Task) => {
    navigate(`/focus?taskId=${task.id}&title=${encodeURIComponent(task.title)}&plannedMin=${task.estimatedMinutes || 25}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          Priority Tasks
        </h3>
        <span className={styles.viewAllLink} onClick={() => navigate('/tasks')}>
          View All →
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className={styles.emptyState}>
          No pending tasks. <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/tasks')}>Create one</span> to focus on today.
        </div>
      ) : (
        <div className={styles.taskList}>
          {tasks.slice(0, 4).map((task) => {
            const isCompleted = task.status === 'completed';
            return (
              <div key={task.id} className={styles.taskItem}>
                <div className={styles.taskLeft}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isCompleted}
                    onChange={() => void handleToggle(task)}
                  />
                  <span className={`${styles.taskTitle} ${isCompleted ? styles.taskCompleted : ''}`}>
                    {task.title}
                  </span>
                </div>

                {!isCompleted && (
                  <button
                    className={styles.focusBtn}
                    onClick={() => handleStartFocus(task)}
                  >
                    Focus ({task.estimatedMinutes}m)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

