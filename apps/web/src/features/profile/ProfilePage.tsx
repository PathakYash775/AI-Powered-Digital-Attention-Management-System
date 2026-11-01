import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../../api/profile';
import { devicesApi } from '../../api/devices';
import { useAuth } from '../auth/AuthContext';
import { profileSchema, type ProfileFormValues } from './schemas';
import { Spinner } from '../../components/ui/Spinner';
import { getTimezoneGroups } from '../../lib/timezones';
import type { ExtensionStatusResponse, DeviceItem, PairingCodeResponse } from '../../api/types';
import styles from './ProfilePage.module.css';

const timezoneGroups = getTimezoneGroups();

export function ProfilePage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Device pairing state
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<PairingCodeResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Profile data
  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getProfile,
  });

  // Devices and extension connection status
  const {
    data: status,
    refetch: refetchStatus,
    isFetching: isStatusFetching,
  } = useQuery<ExtensionStatusResponse>({
    queryKey: ['extension-status'],
    queryFn: () => devicesApi.getExtensionStatus(),
    refetchInterval: 5000,
  });

  const { data: devicesList, refetch: refetchDevices } = useQuery<DeviceItem[]>({
    queryKey: ['devices'],
    queryFn: () => devicesApi.getDevices(),
  });

  const autoLinkMutation = useMutation({
    mutationFn: () => devicesApi.autoLink(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extension-status'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setConnectMessage('✓ Connection re-synced successfully!');
      setTimeout(() => setConnectMessage(null), 4000);
      refetchStatus();
      refetchDevices();
    },
    onError: () => {
      setConnectMessage('Failed to re-sync connection. Check if backend is running.');
      setTimeout(() => setConnectMessage(null), 4000);
    },
  });

  const codeMutation = useMutation({
    mutationFn: () => devicesApi.createPairingCode(),
    onSuccess: (data) => {
      setActiveCode(data);
      const remaining = Math.max(
        0,
        Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining > 0 ? remaining : 600);
      setCopied(false);
    },
    onError: () => {
      setConnectMessage('Failed to generate pairing code. Please try again.');
      setTimeout(() => setConnectMessage(null), 4000);
    },
  });

  useEffect(() => {
    if (!secondsLeft || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(timer);
          setActiveCode(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleCopyCode = () => {
    if (!activeCode) return;
    navigator.clipboard.writeText(activeCode.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleRefreshAll = () => {
    refetchStatus();
    refetchDevices();
  };

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: 'Yash Pathak',
      timezone: 'Asia/Kolkata',
      occupationType: 'student',
      workStart: '09:00',
      workEnd: '18:00',
    },
  });

  const watchedOccupation = watch('occupationType');
  const watchedDisplayName = watch('displayName');

  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName || 'Yash Pathak',
        timezone: profile.timezone || 'Asia/Kolkata',
        occupationType: profile.occupationType || 'student',
        workStart: profile.workStart || '09:00',
        workEnd: profile.workEnd || '18:00',
      });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => profileApi.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], updated);
      reset(updated);
      setSuccessMessage('Profile settings updated successfully!');
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: () => {
      setErrorMessage('Failed to update profile. Please try again.');
      setSuccessMessage(null);
      setTimeout(() => setErrorMessage(null), 4000);
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    updateMutation.mutate(data);
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage('File size exceeds 2MB limit.');
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarPreview(event.target.result as string);
          setSuccessMessage('Photo selected. Click "Save Changes" to apply.');
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (isProfileLoading) {
    return <Spinner label="Loading profile..." />;
  }

  if (isProfileError) {
    return (
      <div role="alert" className={`${styles.toastNotice} ${styles.toastError}`}>
        Failed to load profile. Please refresh the page.
      </div>
    );
  }

  // Display values
  const currentDisplayName = watchedDisplayName || profile?.displayName || 'Yash Pathak';
  const currentEmail = user?.email && user.email !== 'user@example.com' ? user.email : 'yashpathak086@gmail.com';
  const isStudent = (watchedOccupation || profile?.occupationType || 'student') === 'student';

  // Compute initials
  const initials = currentDisplayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'YP';

  // Device status checks
  const isChromeConnected = Boolean(
    status?.connected || devicesList?.some((d) => d.platform === 'chrome' && !d.revokedAt),
  );
  const isWindowsConnected = Boolean(
    devicesList?.some((d) => d.platform === 'windows' && !d.revokedAt) || status?.connected,
  );

  return (
    <div className={styles.container}>
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/gif"
        style={{ display: 'none' }}
        onChange={handlePhotoUpload}
      />

      {/* Top Header matching Image 1 */}
      <header className={styles.headerRow}>
        <div className={styles.headerIconBox}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <h1 className={styles.pageTitle}>Profile Settings</h1>
          <p className={styles.pageSubtitle}>Update your personal information and device settings.</p>
        </div>
      </header>

      {/* Alert Notices */}
      {successMessage && (
        <div role="status" className={`${styles.toastNotice} ${styles.toastSuccess}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className={`${styles.toastNotice} ${styles.toastError}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {connectMessage && (
        <div role="status" className={`${styles.toastNotice} ${styles.toastSuccess}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{connectMessage}</span>
        </div>
      )}

      {/* Two-Column Grid matching Image 1 */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={styles.layoutGrid}>
          {/* LEFT COLUMN: Personal Info + Work Schedule + Actions */}
          <div className={styles.leftCol}>
            {/* Card 1: Personal Information */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIconBox}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <h2 className={styles.cardTitle}>Personal Information</h2>
                  <p className={styles.cardSubtitle}>Manage your basic profile details.</p>
                </div>
              </div>

              {/* User Avatar & Meta Row */}
              <div className={styles.avatarRow}>
                <div className={styles.avatarUserGroup}>
                  <div className={styles.avatarWrapper}>
                    <div className={styles.avatarCircle}>
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Profile" className={styles.avatarImg} />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.avatarEditBadge}
                      title="Change photo"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                  </div>

                  <div className={styles.avatarText}>
                    <div className={styles.avatarNameRow}>
                      <span className={styles.avatarName}>{currentDisplayName}</span>
                      <span className={styles.roleBadge}>
                        {isStudent ? (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                              <path d="M6 12v5c3 3 9 3 12 0v-5" />
                            </svg>
                            <span>Student</span>
                          </>
                        ) : (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                            <span>Professional</span>
                          </>
                        )}
                      </span>
                    </div>
                    <span className={styles.avatarEmail}>{currentEmail}</span>
                  </div>
                </div>

                <div className={styles.photoUploadGroup}>
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Upload Photo</span>
                  </button>
                  <span className={styles.uploadHelper}>JPG, PNG or GIF (Max size 2MB)</span>
                </div>
              </div>

              {/* Form Inputs: Display Name & Occupation Type */}
              <div className={styles.fieldsGrid}>
                <div className={styles.fieldCol}>
                  <label htmlFor="profile-displayName" className={styles.fieldLabel}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Display Name</span>
                  </label>
                  <input
                    id="profile-displayName"
                    type="text"
                    className={styles.inputBox}
                    placeholder="Your Full Name"
                    {...register('displayName')}
                  />
                  {errors.displayName && (
                    <span className={styles.fieldError}>{errors.displayName.message}</span>
                  )}
                </div>

                <div className={styles.fieldCol}>
                  <label htmlFor="profile-occupationType" className={styles.fieldLabel}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <span>Occupation Type</span>
                  </label>
                  <select
                    id="profile-occupationType"
                    className={styles.inputBox}
                    {...register('occupationType')}
                  >
                    <option value="student">Student</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>
              </div>

              {/* Form Input: Timezone */}
              <div className={styles.fieldCol} style={{ marginTop: '0.5rem' }}>
                <label htmlFor="profile-timezone" className={styles.fieldLabel}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span>Timezone</span>
                </label>
                <select
                  id="profile-timezone"
                  className={styles.inputBox}
                  {...register('timezone')}
                >
                  {timezoneGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((tz) => (
                        <option key={`${group.label}-${tz.value}`} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.timezone && (
                  <span className={styles.fieldError}>{errors.timezone.message}</span>
                )}
              </div>
            </div>

            {/* Card 2: Work Schedule */}
            <div className={`${styles.card} ${styles.workCard}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIconBox}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <h2 className={styles.cardTitle}>Work Schedule</h2>
                  <p className={styles.cardSubtitle}>
                    Set your active working hours to get personalized focus insights.
                  </p>
                </div>
              </div>

              <div className={styles.fieldsGrid}>
                <div className={styles.fieldCol}>
                  <label htmlFor="profile-workStart" className={styles.fieldLabel}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Work Start (HH:mm)</span>
                  </label>
                  <div className={styles.timeInputWrapper}>
                    <input
                      id="profile-workStart"
                      type="time"
                      className={styles.timeInputBox}
                      {...register('workStart')}
                    />
                    <svg className={styles.clockIconInside} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  {errors.workStart && (
                    <span className={styles.fieldError}>{errors.workStart.message}</span>
                  )}
                </div>

                <div className={styles.fieldCol}>
                  <label htmlFor="profile-workEnd" className={styles.fieldLabel}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Work End (HH:mm)</span>
                  </label>
                  <div className={styles.timeInputWrapper}>
                    <input
                      id="profile-workEnd"
                      type="time"
                      className={styles.timeInputBox}
                      {...register('workEnd')}
                    />
                    <svg className={styles.clockIconInside} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  {errors.workEnd && (
                    <span className={styles.fieldError}>{errors.workEnd.message}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions Row: Save Changes & Log Out */}
            <div className={styles.actionsRow}>
              <button
                type="submit"
                className={styles.saveBtn}
                disabled={!isDirty || isSubmitting || updateMutation.isPending}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>{isSubmitting || updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
              </button>

              <button
                type="button"
                className={styles.logoutBtn}
                onClick={() => logout()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Connected Devices */}
          <div className={styles.rightCol}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIconBox}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div>
                  <h2 className={styles.cardTitle}>Connected Devices</h2>
                  <p className={styles.cardSubtitle}>Manage your activity tracking devices.</p>
                </div>
              </div>

              {/* Device 1: Chrome Extension */}
              <div className={styles.devicesList}>
                <div className={styles.deviceItem}>
                  <div className={styles.deviceItemLeft}>
                    <div className={styles.deviceLogoBox}>
                      {/* Official Google Chrome SVG Logo */}
                      <svg width="28" height="28" viewBox="0 0 48 48">
                        <path fill="#4CAF50" d="M45,24c0,11.6-9.4,21-21,21c-5.3,0-10.2-2-13.9-5.2l9.4-16.3c0.8,2.6,3.3,4.5,6.1,4.5h19.1C44.8,26.6,45,25.3,45,24z" />
                        <path fill="#FFC107" d="M10.1,39.8C5.8,35.9,3,30.3,3,24c0-8.8,5.4-16.3,13.1-19.3l9.4,16.3c-2.7,0.7-4.8,3-5.2,5.8L10.1,39.8z" />
                        <path fill="#FF3D00" d="M24,3c8.9,0,16.5,5.6,19.4,13.5H24.3c-2.7,0-5.1,1.5-6.3,3.8L8.6,4C13,3.3,18.3,3,24,3z" />
                        <circle fill="#FFFFFF" cx="24" cy="24" r="10" />
                        <circle fill="#1976D2" cx="24" cy="24" r="8" />
                      </svg>
                    </div>
                    <div className={styles.deviceInfo}>
                      <span className={styles.deviceName}>Chrome Extension</span>
                      <span className={styles.deviceDesc}>Browser activity monitoring</span>
                    </div>
                  </div>

                  {isChromeConnected ? (
                    <div className={styles.connectedPill}>
                      <span className={styles.greenDot} />
                      <span>Connected</span>
                    </div>
                  ) : (
                    <div className={styles.disconnectedPill}>
                      <span className={styles.grayDot} />
                      <span>Not Connected</span>
                    </div>
                  )}
                </div>

                {/* Device 2: Windows Tracker */}
                <div className={styles.deviceItem}>
                  <div className={styles.deviceItemLeft}>
                    <div className={styles.deviceLogoBox}>
                      {/* Official Microsoft Windows 4-Pane Blue Logo */}
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M2 3.8L9.8 2.7V11.2H2V3.8ZM2 12.8H9.8V21.3L2 20.2V12.8ZM11.1 2.5L22 1V11.2H11.1V2.5ZM11.1 12.8H22V23L11.1 21.5V12.8Z" fill="#00A4EF" />
                      </svg>
                    </div>
                    <div className={styles.deviceInfo}>
                      <span className={styles.deviceName}>Windows Tracker</span>
                      <span className={styles.deviceDesc}>Desktop activity tracking</span>
                    </div>
                  </div>

                  {isWindowsConnected ? (
                    <div className={styles.connectedPill}>
                      <span className={styles.greenDot} />
                      <span>Connected</span>
                    </div>
                  ) : (
                    <div className={styles.disconnectedPill}>
                      <span className={styles.grayDot} />
                      <span>Not Connected</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Row matching Image 1 */}
              <div className={styles.deviceButtonsRow}>
                <button
                  type="button"
                  className={styles.pairWindowsBtn}
                  onClick={() => codeMutation.mutate()}
                  disabled={codeMutation.isPending}
                  title="Generate a secure 8-character pairing code"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  <span>{codeMutation.isPending ? 'Generating...' : 'Pair Windows Tracker'}</span>
                </button>

                <button
                  type="button"
                  className={styles.syncConnBtn}
                  onClick={() => autoLinkMutation.mutate()}
                  disabled={autoLinkMutation.isPending}
                  title="Re-synchronize extension and background tracker"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>{autoLinkMutation.isPending ? 'Syncing...' : 'Re-sync Connection'}</span>
                </button>

                <button
                  type="button"
                  className={styles.refreshConnBtn}
                  onClick={handleRefreshAll}
                  disabled={isStatusFetching}
                  title="Refresh device status"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>

              {/* Active Pairing Code Card */}
              {activeCode && secondsLeft && secondsLeft > 0 && (
                <div className={styles.codeCard}>
                  <div className={styles.codeHeader}>
                    <span className={styles.codeLabel}>One-Time Pairing Code:</span>
                    <span className={styles.countdownBadge}>
                      Expires in {formatCountdown(secondsLeft)}
                    </span>
                  </div>
                  <div className={styles.codeBox}>
                    <span className={styles.codeValue}>{activeCode.code}</span>
                    <button type="button" className={styles.copyBtn} onClick={handleCopyCode}>
                      {copied ? '✓ Copied' : 'Copy Code'}
                    </button>
                  </div>
                  <p className={styles.codeInstructions}>
                    Open the Attention Management Windows Desktop App, enter this code, and click <strong>Pair Desktop App</strong>.
                  </p>
                </div>
              )}

              {/* Informative Guidance & Privacy details */}
              <div className={styles.infoDetailsWrapper}>
                <div className={styles.infoCardsGrid}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <p className={styles.infoCardText}>
                      <strong>Privacy Protected:</strong> Background tracker records active apps and focus duration. Keystrokes, clipboard contents, screenshots, or files are never recorded.
                    </p>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <p className={styles.infoCardText}>
                      <strong>Windows Desktop App:</strong> Pairs with your account via the 8-character pairing code or auto-connects when launched locally.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
