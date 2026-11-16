package com.attentionmanagement.app.tracker

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val context = applicationContext
        if (!TrackingStorage.isTrackingEnabled(context)) {
            Log.d(TAG, "SyncWorker skipped: tracking disabled")
            return@withContext Result.success()
        }

        if (!hasUsagePermission(context)) {
            Log.w(TAG, "SyncWorker skipped: Usage access permission revoked by user")
            return@withContext Result.success()
        }

        val syncResult = SyncManager.performSync(context)
        if (syncResult.success) {
            Log.d(TAG, "SyncWorker succeeded: ${syncResult.syncedSessionsCount} sessions synced")
            Result.success()
        } else {
            Log.w(TAG, "SyncWorker retry requested: ${syncResult.failedCount} events failed to upload")
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "MobileSyncWorker"
        const val UNIQUE_WORK_NAME = "ATN_MOBILE_SYNC_WORK"

        fun schedulePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )
            Log.d(TAG, "Periodic sync work scheduled (every 15 min)")
        }

        fun cancelPeriodicSync(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_WORK_NAME)
            Log.d(TAG, "Periodic sync work cancelled")
        }

        fun hasUsagePermission(context: Context): Boolean {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? android.app.AppOpsManager
                ?: return false
            val mode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            }
            return mode == android.app.AppOpsManager.MODE_ALLOWED
        }
    }
}
