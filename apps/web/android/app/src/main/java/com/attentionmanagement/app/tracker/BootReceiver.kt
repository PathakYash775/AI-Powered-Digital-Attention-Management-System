package com.attentionmanagement.app.tracker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED ||
            intent?.action == Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            Log.d("BootReceiver", "Boot or package update event received")
            if (TrackingStorage.isTrackingEnabled(context)) {
                SyncWorker.schedulePeriodicSync(context)
                Log.d("BootReceiver", "Periodic mobile tracking resumed after boot")
            }
        }
    }
}
