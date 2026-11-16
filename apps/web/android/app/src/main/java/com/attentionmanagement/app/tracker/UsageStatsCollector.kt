package com.attentionmanagement.app.tracker

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

object UsageStatsCollector {

    private val ignoredPackages = setOf(
        "com.android.systemui",
        "android",
        "com.android.launcher",
        "com.google.android.apps.nexuslauncher",
        "com.sec.android.app.launcher",
        "com.miui.home",
        "com.oppo.launcher",
        "com.huawei.android.launcher"
    )

    private fun formatIso8601(timestamp: Long): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date(timestamp))
    }

    private fun generateEventId(prefix: String, key: String): String {
        val uuid = UUID.nameUUIDFromBytes(key.toByteArray()).toString().replace("-", "")
        return "$prefix-${uuid.take(24)}"
    }

    fun collectUsage(
        context: Context,
        startTime: Long,
        endTime: Long
    ): Pair<List<UsageSession>, List<ContextSwitchEvent>> {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return Pair(emptyList(), emptyList())

        val events = usageStatsManager.queryEvents(startTime, endTime)
        val event = UsageEvents.Event()

        val sessions = mutableListOf<UsageSession>()
        val switches = mutableListOf<ContextSwitchEvent>()

        var currentPackage: String? = null
        var sessionStart: Long = 0

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val pkg = event.packageName ?: continue
            val time = event.timeStamp

            // Skip ignored system UI/launchers
            if (ignoredPackages.contains(pkg)) {
                if (currentPackage != null) {
                    val durationSec = ((time - sessionStart) / 1000).toInt()
                    if (durationSec >= 1) {
                        val appLabel = AppCategoryMapper.getAppLabel(context, currentPackage)
                        val category = AppCategoryMapper.getCategory(context, currentPackage)
                        val startIso = formatIso8601(sessionStart)
                        val endIso = formatIso8601(time)
                        sessions.add(
                            UsageSession(
                                packageName = currentPackage,
                                appName = appLabel,
                                category = category,
                                startedAt = startIso,
                                endedAt = endIso,
                                durationSec = durationSec,
                                idle = false,
                                clientEventId = generateEventId("mob", "${currentPackage}_${startIso}_${endIso}")
                            )
                        )
                    }
                    currentPackage = null
                    sessionStart = 0
                }
                continue
            }

            when (event.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> {
                    if (currentPackage != null && currentPackage != pkg) {
                        // Close previous app session
                        val durationSec = ((time - sessionStart) / 1000).toInt()
                        if (durationSec >= 1) {
                            val appLabel = AppCategoryMapper.getAppLabel(context, currentPackage)
                            val category = AppCategoryMapper.getCategory(context, currentPackage)
                            val startIso = formatIso8601(sessionStart)
                            val endIso = formatIso8601(time)
                            sessions.add(
                                UsageSession(
                                    packageName = currentPackage,
                                    appName = appLabel,
                                    category = category,
                                    startedAt = startIso,
                                    endedAt = endIso,
                                    durationSec = durationSec,
                                    idle = false,
                                    clientEventId = generateEventId("mob", "${currentPackage}_${startIso}_${endIso}")
                                )
                            )
                        }

                        // Record context switch
                        val fromLabel = AppCategoryMapper.getAppLabel(context, currentPackage)
                        val toLabel = AppCategoryMapper.getAppLabel(context, pkg)
                        val switchIso = formatIso8601(time)
                        switches.add(
                            ContextSwitchEvent(
                                fromApp = fromLabel,
                                toApp = toLabel,
                                switchedAt = switchIso,
                                clientEventId = generateEventId("sw", "${currentPackage}_${pkg}_${switchIso}")
                            )
                        )
                    }

                    currentPackage = pkg
                    sessionStart = time
                }

                UsageEvents.Event.ACTIVITY_PAUSED,
                UsageEvents.Event.ACTIVITY_STOPPED -> {
                    if (currentPackage != null && currentPackage == pkg) {
                        val durationSec = ((time - sessionStart) / 1000).toInt()
                        if (durationSec >= 1) {
                            val appLabel = AppCategoryMapper.getAppLabel(context, pkg)
                            val category = AppCategoryMapper.getCategory(context, pkg)
                            val startIso = formatIso8601(sessionStart)
                            val endIso = formatIso8601(time)
                            sessions.add(
                                UsageSession(
                                    packageName = pkg,
                                    appName = appLabel,
                                    category = category,
                                    startedAt = startIso,
                                    endedAt = endIso,
                                    durationSec = durationSec,
                                    idle = false,
                                    clientEventId = generateEventId("mob", "${pkg}_${startIso}_${endIso}")
                                )
                            )
                        }
                        currentPackage = null
                        sessionStart = 0
                    }
                }
            }
        }

        // Close trailing session if still active at window boundary
        if (currentPackage != null && sessionStart > 0 && endTime > sessionStart) {
            val durationSec = ((endTime - sessionStart) / 1000).toInt()
            if (durationSec >= 1) {
                val appLabel = AppCategoryMapper.getAppLabel(context, currentPackage)
                val category = AppCategoryMapper.getCategory(context, currentPackage)
                val startIso = formatIso8601(sessionStart)
                val endIso = formatIso8601(endTime)
                sessions.add(
                    UsageSession(
                        packageName = currentPackage,
                        appName = appLabel,
                        category = category,
                        startedAt = startIso,
                        endedAt = endIso,
                        durationSec = durationSec,
                        idle = false,
                        clientEventId = generateEventId("mob", "${currentPackage}_${startIso}_${endIso}")
                    )
                )
            }
        }

        return Pair(sessions, switches)
    }
}
