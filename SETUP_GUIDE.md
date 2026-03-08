# ETTR App — Device Setup Guide

Every phone and computer that uses the ETTR app must be set up one time. Setup takes about 2 minutes. You will need two things:

1. The **Repository URL** (same on every device — copy it from below)
2. A **Personal Access Token** (different per device — see the table below)

---

## The Repository URL (Same for Every Device)

```
https://github.com/sign-it-now/ETTR
```

Type or paste this exactly. Every device uses this same URL.

---

## Which Token to Use — Per Device

| Device | Token Name to Use | Who Selects in "Who are you?" |
|--------|------------------|-------------------------------|
| **Mac** (office computer) | `ETTR-mac` | Tim Smith |
| **Tim's iPhone** | `ETTR-Tim` | Tim Smith |
| **Bruce's phone/tablet** | `ETTR-Bruce` | Bruce Edgerton |
| **Any driver's phone** | `ETTR Driver-shared` | That driver's name |

> **Do not use** `ETTR Sync` or `ETTR App` for device setup — those are reserved for automation.

---

## Step 1 — Get the Token Value from GitHub

GitHub only shows a token's value **once** (when it was first created). Since these tokens were created without saving the values, you need to **regenerate** each one before using it.

Do this for each token **before** setting up that device:

1. Open a browser and go to **github.com**
2. Click your **profile photo** in the top-right corner of the page
3. Click **Settings** in the dropdown menu
4. In the left sidebar, scroll all the way to the bottom → click **Developer settings**
5. Click **Personal access tokens** → click **Tokens (classic)**
6. You will see the list: ETTR-mac, ETTR-Tim, ETTR-Bruce, ETTR Driver-shared, etc.
7. Click the name of the token you need (example: click `ETTR-mac`)
8. Click the **Regenerate token** button
9. A new token value appears — it looks like: `ghp_AbCdEfGhIjKlMnOpQrStUvWxYz123456`
10. **Copy it immediately** and save it somewhere (Notes app, text message to yourself) — it disappears the moment you leave this page
11. Click **Regenerate token** to confirm

Repeat this for each token you need (one per device being set up).

---

## Step 2 — Set Up Each Device

### Mac (Office Computer)
**Token:** `ETTR-mac` | **Profile:** Tim Smith

1. On the Mac, open **Chrome** or **Safari**
2. Go to **ettrapp.com**
3. The app opens to a dark screen with two input fields — this is the Setup screen
4. In the **Repository URL** field → type: `https://github.com/sign-it-now/ETTR`
5. In the **Personal Access Token** field → paste the `ETTR-mac` token value you copied (starts with `ghp_`)
6. In the **Who are you?** dropdown → select **Tim Smith**
7. Click **Save & Start**
8. The app connects to GitHub, pulls all the data, and opens the dashboard — setup is done

---

### Tim's iPhone
**Token:** `ETTR-Tim` | **Profile:** Tim Smith

1. On Tim's iPhone, open **Safari**
2. Go to **ettrapp.com**
3. The Setup screen appears (dark background, two fields)
4. In **Repository URL** → type: `https://github.com/sign-it-now/ETTR`
5. In **Personal Access Token** → paste the `ETTR-Tim` token value
6. In **Who are you?** → select **Tim Smith**
7. Tap **Save & Start**
8. Dashboard opens — setup is done

---

### Bruce's Phone or Tablet
**Token:** `ETTR-Bruce` | **Profile:** Bruce Edgerton

1. On Bruce's device, open **Safari**
2. Go to **ettrapp.com**
3. The Setup screen appears
4. In **Repository URL** → type: `https://github.com/sign-it-now/ETTR`
5. In **Personal Access Token** → paste the `ETTR-Bruce` token value
6. In **Who are you?** → select **Bruce Edgerton**
7. Tap **Save & Start**
8. Dashboard opens — setup is done

---

### Any Driver's Phone
**Token:** `ETTR Driver-shared` | **Profile:** That driver's name

1. On the driver's phone, open **Safari**
2. Go to **ettrapp.com**
3. The Setup screen appears
4. In **Repository URL** → type: `https://github.com/sign-it-now/ETTR`
5. In **Personal Access Token** → paste the `ETTR Driver-shared` token value
6. In **Who are you?** → select that driver's name from the list
7. Tap **Save & Start**
8. Dashboard opens — setup is done

> **Note:** All drivers share one token (`ETTR Driver-shared`). If a phone is lost and you need to cut off access, regenerate the `ETTR Driver-shared` token and re-enter the new value on all active driver phones.

---

## If a Token Value Is Lost

If you forgot to save a token value after regenerating it, just regenerate it again:

1. Go to **github.com → profile photo → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click the name of the token you need
3. Click **Regenerate token** → copy the new `ghp_...` value immediately
4. On the affected device, open the ETTR app → go to **Settings** (gear icon)
5. Find the **GitHub Token** field → clear it → paste the new token value
6. Tap **Save**

---

## What Gets Stored Where

- **All data** (loads, drivers, brokers, invoices) is stored in the `ettr-data/` folder inside the GitHub repo
- **Nothing** is stored on a private server — GitHub is the only backend
- Each device keeps a local copy in the browser's storage for offline use
- When you make a change, the app pushes it to GitHub automatically
- When another device opens the app, it pulls the latest data from GitHub

---

## Verification — Did It Work?

After tapping **Save & Start**, you should see:
- ✅ The **Dashboard** screen opens (not the setup screen)
- ✅ Any existing loads/drivers/brokers are visible
- ✅ The top of the screen shows the app name, not a setup form

If you see an error message instead:
- Double-check the Repository URL is exactly: `https://github.com/sign-it-now/ETTR`
- Make sure you copied the full token value (it should be around 40 characters starting with `ghp_`)
- Try regenerating the token again — the old value may have expired
