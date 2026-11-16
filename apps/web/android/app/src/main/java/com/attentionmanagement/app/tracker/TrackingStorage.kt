package com.attentionmanagement.app.tracker

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.io.File

object TrackingStorage {

    private const val PREFS_NAME = "atn_mobile_tracker_prefs"
    private const val KEY_TRACKING_ENABLED = "tracking_enabled"
    private const val KEY_DEVICE_ID = "device_id"
    private const val KEY_DEVICE_TOKEN = "device_token"
    private const val KEY_SYNC_ENDPOINT = "sync_endpoint"
    private const val KEY_LAST_SYNC_TIMESTAMP = "last_sync_timestamp"

    private const val SESSIONS_FILE = "pending_sessions.json"
    private const val SWITCHES_FILE = "pending_switches.json"

    private val gson = Gson()

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun isTrackingEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_TRACKING_ENABLED, false)
    }

    fun setTrackingEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_TRACKING_ENABLED, enabled).apply()
    }

    fun getDeviceId(context: Context): String? {
        return getPrefs(context).getString(KEY_DEVICE_ID, null)
    }

    fun getDeviceToken(context: Context): String? {
        return getPrefs(context).getString(KEY_DEVICE_TOKEN, null)
    }

    fun getSyncEndpoint(context: Context): String {
        return getPrefs(context).getString(KEY_SYNC_ENDPOINT, "http://10.0.2.2:8000/api/v1/ingest")
            ?: "http://10.0.2.2:8000/api/v1/ingest"
    }

    fun setCredentials(context: Context, deviceId: String, deviceToken: String, syncEndpoint: String?) {
        val editor = getPrefs(context).edit()
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_DEVICE_TOKEN, deviceToken)
        if (!syncEndpoint.isNullOrBlank()) {
            editor.putString(KEY_SYNC_ENDPOINT, syncEndpoint)
        }
        editor.apply()
    }

    fun getLastSyncTimestamp(context: Context): Long {
        return getPrefs(context).getLong(KEY_LAST_SYNC_TIMESTAMP, 0L)
    }

    fun setLastSyncTimestamp(context: Context, timestamp: Long) {
        getPrefs(context).edit().putLong(KEY_LAST_SYNC_TIMESTAMP, timestamp).apply()
    }

    @Synchronized
    fun getPendingSessions(context: Context): MutableList<UsageSession> {
        val file = File(context.filesDir, SESSIONS_FILE)
        if (!file.exists()) return mutableListOf()
        return try {
            val json = file.readText()
            val type = object : TypeToken<MutableList<UsageSession>>() {}.type
            gson.fromJson<MutableList<UsageSession>>(json, type) ?: mutableListOf()
        } catch (_: Exception) {
            mutableListOf()
        }
    }

    @Synchronized
    fun enqueueSessions(context: Context, newSessions: List<UsageSession>) {
        if (newSessions.isEmpty()) return
        val current = getPendingSessions(context)
        val existingIds = current.map { it.clientEventId }.toSet()
        val toAdd = newSessions.filterNot { existingIds.contains(it.clientEventId) }
        if (toAdd.isNotEmpty()) {
            current.addAll(toAdd)
            // Limit queue size to 2000 most recent events to prevent unbounded growth
            val trimmed = if (current.size > 2000) current.takeLast(2000) else current
            val file = File(context.filesDir, SESSIONS_FILE)
            file.writeText(gson.toJson(trimmed))
        }
    }

    @Synchronized
    fun removeSessions(context: Context, clientEventIds: Set<String>) {
        if (clientEventIds.isEmpty()) return
        val current = getPendingSessions(context)
        current.removeAll { clientEventIds.contains(it.clientEventId) }
        val file = File(context.filesDir, SESSIONS_FILE)
        file.writeText(gson.toJson(current))
    }

    @Synchronized
    fun getPendingSwitches(context: Context): MutableList<ContextSwitchEvent> {
        val file = File(context.filesDir, SWITCHES_FILE)
        if (!file.exists()) return mutableListOf()
        return try {
            val json = file.readText()
            val type = object : TypeToken<MutableList<ContextSwitchEvent>>() {}.type
            gson.fromJson<MutableList<ContextSwitchEvent>>(json, type) ?: mutableListOf()
        } catch (_: Exception) {
            mutableListOf()
        }
    }

    @Synchronized
    fun enqueueSwitches(context: Context, newSwitches: List<ContextSwitchEvent>) {
        if (newSwitches.isEmpty()) return
        val current = getPendingSwitches(context)
        val existingIds = current.map { it.clientEventId }.toSet()
        val toAdd = newSwitches.filterNot { existingIds.contains(it.clientEventId) }
        if (toAdd.isNotEmpty()) {
            current.addAll(toAdd)
            val trimmed = if (current.size > 1000) current.takeLast(1000) else current
            val file = File(context.filesDir, SWITCHES_FILE)
            file.writeText(gson.toJson(trimmed))
        }
    }

    @Synchronized
    fun removeSwitches(context: Context, clientEventIds: Set<String>) {
        if (clientEventIds.isEmpty()) return
        val current = getPendingSwitches(context)
        current.removeAll { clientEventIds.contains(it.clientEventId) }
        val file = File(context.filesDir, SWITCHES_FILE)
        file.writeText(gson.toJson(current))
    }
}
