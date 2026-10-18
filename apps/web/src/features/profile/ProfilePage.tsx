import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../../api/profile';
import { useAuth } from '../auth/AuthContext';
import { profileSchema, type ProfileFormValues } from './schemas';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Spinner } from '../../components/ui/Spinner';
import { DevicePairingSection } from '../devices/DevicePairingSection';
import styles from './ProfilePage.module.css';

import { getTimezoneGroups, getBrowserTimezone } from '../../lib/timezones';

const timezoneGroups = getTimezoneGroups();

export function ProfilePage() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getProfile,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      timezone: 'Asia/Kolkata',
      occupationType: 'professional',
      workStart: '09:00',
      workEnd: '17:00',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName,
        timezone: profile.timezone,
        occupationType: profile.occupationType,
        workStart: profile.workStart,
        workEnd: profile.workEnd,
      });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => profileApi.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], updated);
      reset(updated);
      setSuccessMessage('Profile updated successfully.');
      setErrorMessage(null);
    },
    onError: () => {
      setErrorMessage('Failed to update profile. Please try again.');
      setSuccessMessage(null);
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <Spinner label="Loading profile..." />;
  }

  if (isError) {
    return (
      <div role="alert" className={styles.errorAlert}>
        Failed to load profile. Please refresh the page.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Profile Settings</h1>
        <Button variant="secondary" onClick={() => logout()}>
          Log out
        </Button>
      </header>

      {successMessage ? (
        <div role="status" className={styles.successAlert}>
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div role="alert" className={styles.errorAlert}>
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
        <Field id="profile-name" label="Display Name" error={errors.displayName?.message}>
          <input
            id="profile-name"
            type="text"
            aria-describedby={errors.displayName ? 'profile-name-error' : undefined}
            {...register('displayName')}
          />
        </Field>

        <Field
          id="profile-timezone"
          label="Timezone"
          action={
            <button
              type="button"
              className={styles.detectTzBtn}
              onClick={() => {
                const detected = getBrowserTimezone();
                setValue('timezone', detected, { shouldDirty: true });
              }}
              title="Detect and set to Indian/local timezone"
            >
              📍 Detect Local Timezone
            </button>
          }
          error={errors.timezone?.message}
        >
          <select
            id="profile-timezone"
            aria-describedby={errors.timezone ? 'profile-timezone-error' : undefined}
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
        </Field>

        <Field
          id="profile-occupation"
          label="Occupation Type"
          error={errors.occupationType?.message}
        >
          <select
            id="profile-occupation"
            aria-describedby={errors.occupationType ? 'profile-occupation-error' : undefined}
            {...register('occupationType')}
          >
            <option value="student">Student</option>
            <option value="professional">Professional</option>
          </select>
        </Field>

        <div className={styles.timeRow}>
          <Field
            id="profile-workStart"
            label="Work Start (HH:mm)"
            error={errors.workStart?.message}
          >
            <input
              id="profile-workStart"
              type="time"
              aria-describedby={errors.workStart ? 'profile-workStart-error' : undefined}
              {...register('workStart')}
            />
          </Field>

          <Field id="profile-workEnd" label="Work End (HH:mm)" error={errors.workEnd?.message}>
            <input
              id="profile-workEnd"
              type="time"
              aria-describedby={errors.workEnd ? 'profile-workEnd-error' : undefined}
              {...register('workEnd')}
            />
          </Field>
        </div>

        <Button
          type="submit"
          disabled={!isDirty || isSubmitting || updateMutation.isPending}
          className={styles.saveBtn}
        >
          {isSubmitting || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>

      <DevicePairingSection />
    </div>
  );
}
