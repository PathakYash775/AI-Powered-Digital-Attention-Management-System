package com.attentionmanagement.app.tracker

import com.google.gson.annotations.SerializedName

data class UsageSession(
    @SerializedName("packageName") val packageName: String,
    @SerializedName("appName") val appName: String,
    @SerializedName("category") val category: String,
    @SerializedName("startedAt") val startedAt: String,
    @SerializedName("endedAt") val endedAt: String,
    @SerializedName("durationSec") val durationSec: Int,
    @SerializedName("idle") val idle: Boolean,
    @SerializedName("clientEventId") val clientEventId: String
)

data class ContextSwitchEvent(
    @SerializedName("fromApp") val fromApp: String,
    @SerializedName("toApp") val toApp: String,
    @SerializedName("switchedAt") val switchedAt: String,
    @SerializedName("clientEventId") val clientEventId: String
)

data class TrackingStatus(
    val trackingEnabled: Boolean,
    val hasPermission: Boolean,
    val deviceId: String?,
    val lastSyncTime: String?,
    val pendingEventsCount: Int
)
