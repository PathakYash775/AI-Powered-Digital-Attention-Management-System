package com.attentionmanagement.app.tracker

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

@CapacitorPlugin(name = "MobileUsageTracker")
class MobileUsageTrackerPlugin : Plugin() {

    private val scope = CoroutineScope(Dispatchers.IO)

    @PluginMethod
    fun checkPermission(call: PluginCall) {
        val hasPermission = SyncWorker.hasUsagePermission(context)
        val ret = JSObject().apply {
            put("granted", hasPermission)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            call.resolve(JSObject().put("opened", true))
        } catch (e: Exception) {
            call.reject("Failed to open usage access settings: ${e.message}")
        }
    }

    @PluginMethod
    fun startTracking(call: PluginCall) {
        val hasPermission = SyncWorker.hasUsagePermission(context)
        if (!hasPermission) {
            val ret = JSObject().apply {
                put("success", false)
                put("error", "USAGE_ACCESS_NOT_GRANTED")
            }
            call.resolve(ret)
            return
        }

        TrackingStorage.setTrackingEnabled(context, true)
        SyncWorker.schedulePeriodicSync(context)

        // Trigger immediate background sync
        scope.launch {
            SyncManager.performSync(context)
        }

        val ret = JSObject().apply {
            put("success", true)
            put("trackingEnabled", true)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun stopTracking(call: PluginCall) {
        TrackingStorage.setTrackingEnabled(context, false)
        SyncWorker.cancelPeriodicSync(context)

        val ret = JSObject().apply {
            put("success", true)
            put("trackingEnabled", false)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun getTrackingStatus(call: PluginCall) {
        val enabled = TrackingStorage.isTrackingEnabled(context)
        val hasPermission = SyncWorker.hasUsagePermission(context)
        val deviceId = TrackingStorage.getDeviceId(context)
        val lastSyncTimestamp = TrackingStorage.getLastSyncTimestamp(context)
        val pendingSessions = TrackingStorage.getPendingSessions(context).size
        val pendingSwitches = TrackingStorage.getPendingSwitches(context).size

        val lastSyncIso = if (lastSyncTimestamp > 0) {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            sdf.timeZone = TimeZone.getTimeZone("UTC")
            sdf.format(Date(lastSyncTimestamp))
        } else {
            null
        }

        val ret = JSObject().apply {
            put("trackingEnabled", enabled)
            put("hasPermission", hasPermission)
            put("deviceId", deviceId)
            put("lastSyncTime", lastSyncIso)
            put("pendingEventsCount", pendingSessions + pendingSwitches)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun setDeviceCredentials(call: PluginCall) {
        val deviceId = call.getString("deviceId")
        val deviceToken = call.getString("deviceToken")
        val syncEndpoint = call.getString("syncEndpoint")

        if (deviceId.isNullOrBlank() || deviceToken.isNullOrBlank()) {
            call.reject("deviceId and deviceToken are required")
            return
        }

        TrackingStorage.setCredentials(context, deviceId, deviceToken, syncEndpoint)
        call.resolve(JSObject().put("success", true))
    }

    @PluginMethod
    fun syncNow(call: PluginCall) {
        scope.launch {
            val result = SyncManager.performSync(context)
            val nowIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }.format(Date())

            val ret = JSObject().apply {
                put("success", result.success)
                put("syncedSessionsCount", result.syncedSessionsCount)
                put("syncedSwitchesCount", result.syncedSwitchesCount)
                put("failedCount", result.failedCount)
                put("lastSyncTime", nowIso)
                if (result.errorMessage != null) {
                    put("errorMessage", result.errorMessage)
                }
            }
            call.resolve(ret)
        }
    }

    @PluginMethod
    fun queryUsage(call: PluginCall) {
        val now = System.currentTimeMillis()
        val defaultStart = now - (24 * 60 * 60 * 1000L) // past 24 hours
        val startTime = call.getDouble("startTime")?.toLong() ?: defaultStart
        val endTime = call.getDouble("endTime")?.toLong() ?: now

        scope.launch {
            try {
                val (sessions, switches) = UsageStatsCollector.collectUsage(context, startTime, endTime)
                val sessionsArray = JSArray()
                for (s in sessions) {
                    val obj = JSObject().apply {
                        put("packageName", s.packageName)
                        put("appName", s.appName)
                        put("category", s.category)
                        put("startedAt", s.startedAt)
                        put("endedAt", s.endedAt)
                        put("durationSec", s.durationSec)
                        put("idle", s.idle)
                        put("clientEventId", s.clientEventId)
                    }
                    sessionsArray.put(obj)
                }

                val switchesArray = JSArray()
                for (sw in switches) {
                    val obj = JSObject().apply {
                        put("fromApp", sw.fromApp)
                        put("toApp", sw.toApp)
                        put("switchedAt", sw.switchedAt)
                        put("clientEventId", sw.clientEventId)
                    }
                    switchesArray.put(obj)
                }

                val ret = JSObject().apply {
                    put("sessions", sessionsArray)
                    put("switches", switchesArray)
                }
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Failed to query usage: ${e.message}")
            }
        }
    }
}
