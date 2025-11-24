# Firebase Setup Guide

This guide explains how to configure Firebase for the SGV School App.

## Overview

The app uses Firebase for:
- **Cloud Messaging (FCM)**: Push notifications
- **Authentication**: User management (if implemented)
- **Firestore/Realtime Database**: Data storage (if implemented)

## Setup Steps

### 1. Get google-services.json

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **sgv-school-4c64f** (or create a new one)
3. Click on the **Android app** (package: `com.sgvschool.app`)
4. Go to **Project Settings** → **General** → **Your apps**
5. Click **Download google-services.json**

### 2. Place the Configuration File

Copy the downloaded `google-services.json` to the project root:

```
sgv-school-app/
├── google-services.json    ← Place here
├── android/
├── app/
└── ...
```

> [!IMPORTANT]
> **Do NOT commit this file to Git!** It's already in `.gitignore` to prevent accidental exposure of API keys.

### 3. Verify Setup

Build the Android app to verify the configuration is working:

```bash
cd android
.\gradlew.bat assembleDebug
```

If successful, you should see:
```
BUILD SUCCESSFUL
```

### 4. Configure Firebase Security Rules (Important!)

The API key in `google-services.json` is a **client-side key** meant to be embedded in apps. To prevent abuse:

1. Go to Firebase Console → **Firestore** (or **Realtime Database**)
2. Set up **Security Rules** to restrict access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Example: Require authentication
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Enable **App Check** for additional security (recommended)

## Troubleshooting

### Build fails with "google-services.json not found"

Make sure the file is in the project root (not in `android/app/`).

### FCM tokens not generating

1. Verify `google-services.json` is correctly placed
2. Check Firebase Console that FCM is enabled
3. Rebuild the Android app

## Security Notes

- ✅ API keys in `google-services.json` are **safe to be client-facing** when properly secured with Firebase Security Rules
- ✅ The file is in `.gitignore` to prevent accidental commits
- ✅ Use Firebase Security Rules to control what authenticated users can access
- ✅ Enable App Check for production apps

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs/android/setup)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [FCM Setup Guide](https://firebase.google.com/docs/cloud-messaging/android/client)
