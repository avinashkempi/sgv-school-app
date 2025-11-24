package com.sgvschool.app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.google.firebase.messaging.FirebaseMessaging
import android.util.Log

class FCMTokenModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "FCMTokenModule"
    }

    @ReactMethod
    fun getToken(promise: Promise) {
        try {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result
                    Log.d(TAG, "FCM Token retrieved: $token")
                    promise.resolve(token)
                } else {
                    Log.e(TAG, "Failed to get FCM token", task.exception)
                    promise.reject("ERROR", "Failed to get FCM token: ${task.exception?.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception getting FCM token", e)
            promise.reject("ERROR", "Exception getting FCM token: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "FCMTokenModule"
    }
}
