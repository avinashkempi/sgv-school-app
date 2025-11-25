# Backend Implementation Guide: Push Notifications for News

This guide provides complete backend code to implement push notifications when news is created.

## Prerequisites

1. **Firebase Admin SDK**: Install the Firebase Admin SDK

   ```bash
   npm install firebase-admin
   ```

2. **Firebase Service Account**: Download your Firebase service account key from Firebase Console → Project Settings → Service Accounts → Generate New Private Key

3. **Environment Variable**: Add the path to your service account JSON file in `.env`:
   ```
   FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/serviceAccountKey.json
   ```

---

## Step 1: Database Schema

Create a collection/table to store FCM tokens:

### MongoDB Schema (fcm_tokens.js)

```javascript
const mongoose = require("mongoose");

const fcmTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  platform: {
    type: String,
    enum: ["ios", "android"],
    required: true,
  },
  isAuthenticated: {
    type: Boolean,
    default: false,
    index: true, // Index for efficient filtering
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
fcmTokenSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("FCMToken", fcmTokenSchema);
```

---

## Step 2: Initialize Firebase Admin SDK

### config/firebase.js

```javascript
const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin SDK
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, "../serviceAccountKey.json");

try {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin SDK:", error);
  throw error;
}

module.exports = admin;
```

---

## Step 3: FCM Token Registration Endpoint

### routes/fcm.js

```javascript
const express = require("express");
const router = express.Router();
const FCMToken = require("../models/fcm_tokens");

/**
 * POST /api/fcm/register
 * Register a device's FCM token
 */
router.post("/register", async (req, res) => {
  try {
    const { token, userId, platform, isAuthenticated } = req.body;

    if (!token || !userId || !platform) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: token, userId, platform",
      });
    }

    // Check if token already exists
    let fcmToken = await FCMToken.findOne({ token });

    if (fcmToken) {
      // Update existing token
      fcmToken.userId = userId;
      fcmToken.platform = platform;
      fcmToken.isAuthenticated = isAuthenticated || false;
      fcmToken.updatedAt = new Date();
      await fcmToken.save();

      console.log(`[FCM] Updated existing token for user: ${userId}`);
    } else {
      // Create new token
      fcmToken = new FCMToken({
        userId,
        token,
        platform,
        isAuthenticated: isAuthenticated || false,
      });
      await fcmToken.save();

      console.log(`[FCM] Registered new token for user: ${userId}`);
    }

    res.status(200).json({
      success: true,
      message: "FCM token registered successfully",
      tokenId: fcmToken._id,
    });
  } catch (error) {
    console.error("[FCM] Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register FCM token",
      error: error.message,
    });
  }
});

/**
 * POST /api/fcm/unregister
 * Unregister a device's FCM token
 */
router.post("/unregister", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    await FCMToken.deleteOne({ token });

    res.status(200).json({
      success: true,
      message: "FCM token unregistered successfully",
    });
  } catch (error) {
    console.error("[FCM] Unregistration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unregister FCM token",
      error: error.message,
    });
  }
});

module.exports = router;
```

---

## Step 4: Notification Sending Service

### services/notificationService.js

```javascript
const admin = require("../config/firebase");
const FCMToken = require("../models/fcm_tokens");

/**
 * Send push notification to multiple devices
 * @param {Array} tokens - Array of FCM tokens
 * @param {Object} notification - Notification payload
 * @param {Object} data - Data payload (optional)
 */
async function sendBatchNotifications(tokens, notification, data = {}) {
  if (!tokens || tokens.length === 0) {
    console.log("[Notifications] No tokens to send to");
    return { success: true, successCount: 0, failureCount: 0 };
  }

  try {
    // Firebase supports sending to max 500 tokens at once
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      batches.push(tokens.slice(i, i + batchSize));
    }

    let totalSuccess = 0;
    let totalFailure = 0;
    const failedTokens = [];

    for (const batch of batches) {
      const message = {
        notification,
        data,
        tokens: batch,
      };

      const response = await admin.messaging().sendMulticast(message);

      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      // Remove failed/invalid tokens from database
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(batch[idx]);
            console.error(
              `[Notifications] Failed to send to token:`,
              resp.error
            );
          }
        });
      }
    }

    // Clean up invalid tokens
    if (failedTokens.length > 0) {
      await FCMToken.deleteMany({ token: { $in: failedTokens } });
      console.log(
        `[Notifications] Removed ${failedTokens.length} invalid tokens`
      );
    }

    console.log(
      `[Notifications] Sent: ${totalSuccess} success, ${totalFailure} failures`
    );

    return {
      success: true,
      successCount: totalSuccess,
      failureCount: totalFailure,
    };
  } catch (error) {
    console.error("[Notifications] Send error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send notification when news is created
 * @param {Object} newsData - The created news object
 */
async function sendNewsNotification(newsData) {
  try {
    const { title, description, privateNews, _id } = newsData;

    console.log(`[Notifications] Sending notification for news: ${title}`);
    console.log(`[Notifications] Private news: ${privateNews}`);

    // Get tokens based on privateNews flag
    let tokenQuery = {};

    if (privateNews) {
      // Private news: only send to authenticated users
      tokenQuery = { isAuthenticated: true };
      console.log("[Notifications] Sending to authenticated users only");
    } else {
      // Public news: send to all users (authenticated + guests)
      console.log("[Notifications] Sending to all users");
    }

    const fcmTokenDocs = await FCMToken.find(tokenQuery);
    const tokens = fcmTokenDocs.map((doc) => doc.token);

    console.log(`[Notifications] Found ${tokens.length} tokens to send to`);

    if (tokens.length === 0) {
      console.log(
        "[Notifications] No tokens found, skipping notification send"
      );
      return { success: true, message: "No tokens to send to" };
    }

    const notification = {
      title: "📰 New News Update",
      body: title,
    };

    const data = {
      type: "news",
      newsId: _id.toString(),
      title,
      description: description.substring(0, 100),
      privateNews: privateNews.toString(),
    };

    const result = await sendBatchNotifications(tokens, notification, data);

    return result;
  } catch (error) {
    console.error("[Notifications] Error sending news notification:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendBatchNotifications,
  sendNewsNotification,
};
```

---

## Step 5: Update News Creation Endpoint

### routes/news.js (Modify existing POST /api/news)

```javascript
const express = require("express");
const router = express.Router();
const News = require("../models/news");
const { sendNewsNotification } = require("../services/notificationService");

/**
 * POST /api/news
 * Create new news (admin only)
 */
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, url, privateNews } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    // Create news
    const news = new News({
      title,
      description,
      url: url || undefined,
      privateNews: privateNews !== undefined ? privateNews : true,
      createdBy: req.user._id, // Assuming you have auth middleware
      creationDate: new Date(),
    });

    await news.save();

    // Send push notification asynchronously (don't block response)
    // Using setImmediate to ensure it runs after response is sent
    setImmediate(async () => {
      try {
        await sendNewsNotification(news);
      } catch (error) {
        console.error("[News] Failed to send notification:", error);
        // Don't fail the request if notification fails
      }
    });

    res.status(201).json({
      success: true,
      message: "News created successfully",
      news,
    });
  } catch (error) {
    console.error("[News] Creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create news",
      error: error.message,
    });
  }
});

module.exports = router;
```

---

## Step 6: Register Routes

### app.js or server.js

```javascript
const fcmRoutes = require("./routes/fcm");

// Register FCM routes
app.use("/api/fcm", fcmRoutes);

// Your existing news routes
app.use("/api/news", newsRoutes);
```

---

## Testing the Implementation

### 1. Test FCM Token Registration

```bash
curl -X POST http://localhost:10000/api/fcm/register \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-fcm-token-123",
    "userId": "guest",
    "platform": "android",
    "isAuthenticated": false
  }'
```

Expected response:

```json
{
  "success": true,
  "message": "FCM token registered successfully",
  "tokenId": "..."
}
```

### 2. Test News Creation with Notification

```bash
curl -X POST http://localhost:10000/api/news \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Test News",
    "description": "This is a test news item",
    "privateNews": false
  }'
```

Check backend logs for:

```
[Notifications] Sending notification for news: Test News
[Notifications] Private news: false
[Notifications] Sending to all users
[Notifications] Found X tokens to send to
[Notifications] Sent: X success, 0 failures
```

---

## Important Notes

1. **privateNews Logic**:

   - `privateNews: true` → Only authenticated users receive notification
   - `privateNews: false` → All users (authenticated + guests) receive notification

2. **Token Cleanup**: Failed tokens are automatically removed from the database

3. **Async Notifications**: Notifications are sent asynchronously to avoid blocking the API response

4. **Error Handling**: If notification sending fails, the news creation still succeeds

5. **Scalability**: Batch sending supports up to 500 tokens per batch (Firebase limit)

---

## Deployment Checklist

- [ ] Install `firebase-admin` package
- [ ] Add Firebase service account JSON file to backend
- [ ] Set `FIREBASE_SERVICE_ACCOUNT_PATH` environment variable
- [ ] Create FCMToken model/schema
- [ ] Add `/api/fcm/register` and `/api/fcm/unregister` routes
- [ ] Create notification service
- [ ] Update news creation endpoint to send notifications
- [ ] Test with real devices
- [ ] Monitor Firebase Console for notification delivery stats
