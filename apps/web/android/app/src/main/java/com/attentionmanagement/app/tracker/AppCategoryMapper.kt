package com.attentionmanagement.app.tracker

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build

object AppCategoryMapper {

    private val packageNameCategoryMap = mapOf(
        // Communication
        "com.whatsapp" to "communication",
        "com.whatsapp.w4b" to "communication",
        "org.telegram.messenger" to "communication",
        "com.slack" to "communication",
        "com.microsoft.teams" to "communication",
        "com.discord" to "communication",
        "org.thoughtcrime.securesms" to "communication",
        "com.google.android.apps.messaging" to "communication",
        "com.google.android.dialer" to "communication",
        "com.samsung.android.messaging" to "communication",
        "com.google.android.gm" to "communication",
        "com.microsoft.office.outlook" to "communication",

        // Social
        "com.instagram.android" to "social",
        "com.facebook.katana" to "social",
        "com.facebook.orca" to "social",
        "com.twitter.android" to "social",
        "com.zhiliaoapp.musically" to "social",
        "com.reddit.frontpage" to "social",
        "com.linkedin.android" to "social",
        "com.snapchat.android" to "social",
        "com.pinterest" to "social",

        // Entertainment
        "com.google.android.youtube" to "entertainment",
        "com.netflix.mediaclient" to "entertainment",
        "com.spotify.music" to "entertainment",
        "com.amazon.avod.thirdpartyclient" to "entertainment",
        "com.disney.disneyplus" to "entertainment",
        "tv.twitch.android.app" to "entertainment",
        "com.google.android.play.games" to "entertainment",

        // Productive
        "com.google.android.apps.docs" to "productive",
        "com.google.android.apps.docs.editors.sheets" to "productive",
        "com.google.android.apps.docs.editors.slides" to "productive",
        "com.google.android.keep" to "productive",
        "notion.id" to "productive",
        "com.github.android" to "productive",
        "com.todoist" to "productive",
        "com.trello" to "productive",
        "com.termux" to "productive",
        "com.microsoft.office.word" to "productive",
        "com.microsoft.office.excel" to "productive",
        "com.microsoft.office.powerpoint" to "productive",
        "com.microsoft.office.officehubrow" to "productive"
    )

    fun getCategory(context: Context, packageName: String): String {
        val lowerPkg = packageName.lowercase()

        // 1. Direct package dictionary match
        packageNameCategoryMap[lowerPkg]?.let { return it }

        // 2. Query Android ApplicationInfo category (API 26+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val appInfo = context.packageManager.getApplicationInfo(packageName, 0)
                when (appInfo.category) {
                    ApplicationInfo.CATEGORY_PRODUCTIVITY -> return "productive"
                    ApplicationInfo.CATEGORY_SOCIAL -> return "social"
                    ApplicationInfo.CATEGORY_GAME,
                    ApplicationInfo.CATEGORY_IMAGE,
                    ApplicationInfo.CATEGORY_VIDEO,
                    ApplicationInfo.CATEGORY_AUDIO -> return "entertainment"
                }
            } catch (_: Exception) {
                // Ignore missing package error
            }
        }

        // 3. Fallback based on package substring hints
        if (lowerPkg.contains("game") || lowerPkg.contains("video") || lowerPkg.contains("music")) {
            return "entertainment"
        }
        if (lowerPkg.contains("chat") || lowerPkg.contains("mail") || lowerPkg.contains("message")) {
            return "communication"
        }
        if (lowerPkg.contains("doc") || lowerPkg.contains("note") || lowerPkg.contains("code")) {
            return "productive"
        }

        return "other"
    }

    fun getAppLabel(context: Context, packageName: String): String {
        return try {
            val pm = context.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (_: Exception) {
            packageName.substringAfterLast('.')
        }
    }
}
