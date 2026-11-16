package com.attentionmanagement.app.tracker

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object SyncManager {

    private const val TAG = "MobileSyncManager"
    private val gson = Gson()

    data class SyncResult(
        val success: Boolean,
        val syncedSessionsCount: Int,
        val syncedSwitchesCount: Int,
        val failedCount: Int,
        val errorMessage: String? = null
    )

    fun performSync(context: Context): SyncResult {
        val deviceToken = TrackingStorage.getDeviceToken(context)
        if (deviceToken.isNullOrBlank()) {
            Log.w(TAG, "Sync skipped: No deviceToken registered")
            return SyncResult(false, 0, 0, 0, "Device not registered or paired yet")
        }

        val baseEndpoint = TrackingStorage.getSyncEndpoint(context).trimEnd('/')
        val now = System.currentTimeMillis()
        var lastSync = TrackingStorage.getLastSyncTimestamp(context)

        // If never synced before, collect past 6 hours of usage
        if (lastSync == 0L) {
            lastSync = now - (6 * 60 * 60 * 1000L)
        }

        // 1. Collect newly recorded usage from Android UsageStatsManager
        try {
            val (newSessions, newSwitches) = UsageStatsCollector.collectUsage(context, lastSync, now)
            TrackingStorage.enqueueSessions(context, newSessions)
            TrackingStorage.enqueueSwitches(context, newSwitches)
        } catch (e: Exception) {
            Log.e(TAG, "Error collecting usage stats: ${e.message}", e)
        }

        var totalSessionsSynced = 0
        var totalSwitchesSynced = 0
        var failedCount = 0

        // 2. Synchronize Sessions in chunks of 100
        val pendingSessions = TrackingStorage.getPendingSessions(context)
        for (batch in pendingSessions.chunked(100)) {
            val payload = JSONObject()
            val eventsArray = JSONArray()

            for (session in batch) {
                val item = JSONObject().apply {
                    put("clientEventId", session.clientEventId)
                    put("source", "mobile")
                    put("app", session.appName.lowercase())
                    put("startedAt", session.startedAt)
                    put("endedAt", session.endedAt)
                    put("idle", session.idle)
                }
                eventsArray.put(item)
            }
            payload.put("events", eventsArray)

            val activityUrl = "$baseEndpoint/activity"
            val success = postJson(activityUrl, deviceToken, payload.toString())
            if (success) {
                val ids = batch.map { it.clientEventId }.toSet()
                TrackingStorage.removeSessions(context, ids)
                totalSessionsSynced += batch.size
            } else {
                failedCount += batch.size
                break // Stop further batches on connection error
            }
        }

        // 3. Synchronize Context Switches in chunks of 100
        val pendingSwitches = TrackingStorage.getPendingSwitches(context)
        for (batch in pendingSwitches.chunked(100)) {
            val payload = JSONObject()
            val eventsArray = JSONArray()

            for (switch in batch) {
                val item = JSONObject().apply {
                    put("clientEventId", switch.clientEventId)
                    put("fromApp", switch.fromApp.lowercase())
                    put("toApp", switch.toApp.lowercase())
                    put("switchedAt", switch.switchedAt)
                }
                eventsArray.put(item)
            }
            payload.put("events", eventsArray)

            val switchesUrl = "$baseEndpoint/switches"
            val success = postJson(switchesUrl, deviceToken, payload.toString())
            if (success) {
                val ids = batch.map { it.clientEventId }.toSet()
                TrackingStorage.removeSwitches(context, ids)
                totalSwitchesSynced += batch.size
            } else {
                failedCount += batch.size
                break
            }
        }

        if (failedCount == 0) {
            TrackingStorage.setLastSyncTimestamp(context, now)
        }

        return SyncResult(
            success = failedCount == 0,
            syncedSessionsCount = totalSessionsSynced,
            syncedSwitchesCount = totalSwitchesSynced,
            failedCount = failedCount
        )
    }

    private fun postJson(urlStr: String, bearerToken: String, jsonBody: String): Boolean {
        var conn: HttpURLConnection? = null
        return try {
            val url = URL(urlStr)
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $bearerToken")
                setRequestProperty("Accept", "application/json")
            }

            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(jsonBody)
                writer.flush()
            }

            val code = conn.responseCode
            if (code in 200..299) {
                true
            } else {
                val errorStream = conn.errorStream?.bufferedReader()?.readText() ?: ""
                Log.e(TAG, "POST $urlStr failed with HTTP $code: $errorStream")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Network exception connecting to $urlStr: ${e.message}")
            false
        } finally {
            conn?.disconnect()
        }
    }
}
