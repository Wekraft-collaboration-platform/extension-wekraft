# GitPilot Quick Start Guide

Welcome to GitPilot! This guide gets you from zero to published in ~15 minutes.

## 🎯 Goal

Publish the **GitPilot** extension to VS Code Marketplace so your team can install it.

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] A GitHub account
- [ ] A Microsoft account (for Azure DevOps and VS Code Marketplace)
- [ ] Git installed on your machine (`git --version`)
- [ ] Node.js v16+ installed (`node --version`)
- [ ] VS Code installed

All set? Let's go! ⬇️

---

## Step 1: Set Up Your Local Machine (5 minutes)

### 1a. Install VSCE Tool (One-Time)

```bash
npm install -g @vsce/vsce
vsce --version  # Should show version number
```

### 1b. Build GitPilot Locally

```bash
cd extension  # Navigate to extension directory
npm install
npm run build
```

**Expected output**: No errors, `dist/extension.js` created ✅

---

## Step 2: Create Azure DevOps Organization & PAT (5 minutes)

### 2a. Create Azure DevOps Organization

1. Go to **[dev.azure.com](https://dev.azure.com)**
2. Click **"New organization"**
3. Follow wizard:
   - Name: `wekraft`
   - Region: Choose your region
   - Verify email when prompted
4. **✅ Save**: You now have an Azure DevOps org

### 2b. Generate Personal Access Token (PAT)

1. In Azure DevOps, click your **profile icon** (top-right corner)
2. Select **"Personal access tokens"**
3. Click **"New Token"**
4. Fill in:
   - **Name**: `GitPilot VS Code Marketplace`
   - **Organization**: `wekraft` (select from dropdown)
   - **Expiration**: 1 year (or your preference)
   - **Scopes**: Click **"Marketplace"** and check all permissions
5. Click **"Create"**
6. **⚠️ IMPORTANT**: Copy the token immediately
   - You will NOT see it again
   - Save in password manager (format: organization:token)

**✅ Save**: You now have a PAT token (e.g., `wekraft:a1b2c3d4e5f6...`)

---

## Step 3: Create VS Code Marketplace Publisher (2 minutes)

1. Go to **[Visual Studio Marketplace](https://marketplace.visualstudio.com)**
2. Click **"Publish extensions"** (top-right)
3. Sign in with your **Microsoft account**
4. Click **"Create publisher"**
5. Fill in:
   - **Publisher ID**: `wekraft`
   - **Publisher name**: `Wekraft`
   - **Website**: `https://wekraft.xyz`
6. Accept terms and click **"Create"**

**⏳ Wait 5-10 minutes** for provisioning to complete. You'll receive an email confirmation.

**✅ Done**: Marketplace publisher account ready

---

## Step 4: Login to Marketplace (2 minutes)

Once your publisher is provisioned, log in locally:

```bash
vsce login wekraft
```

When prompted: **Paste your PAT token** from Step 2b

**Expected output**:
```
The Personal Access Token verification succeeded. The token will be used for all future requests.
```

**✅ Done**: VSCE is now authenticated

---

## Step 5: Publish to Marketplace (1 minute)

```bash
vsce publish
```

**What happens**:
1. Packages the extension into `.vsix` file
2. Uploads to VS Code Marketplace
3. Processes metadata (README, icon, keywords)
4. Publishes v0.1.0

**Expected output**:
```
Publishing wekraft/gitpilot v0.1.0...
Published to https://marketplace.visualstudio.com/items?itemName=wekraft.gitpilot
```

**✅ Published!** 🎉

---

## Step 6: Verify Publication (2 minutes)

1. Go to **[VS Code Marketplace](https://marketplace.visualstudio.com)**
2. Search for **"GitPilot"**
3. Confirm listing shows:
   - ✅ Publisher: **wekraft**
   - ✅ Version: **0.1.0**
   - ✅ Icon displays
   - ✅ Description visible
4. Click **"Install"** → Redirects to VS Code
5. Test installation in VS Code ✅

**✅ Done**: Extension is live on marketplace!

---

## 🚀 Share Your Extension

Now that GitPilot is published, share the link:

```
https://marketplace.visualstudio.com/items?itemName=wekraft.gitpilot
```

**Where to share:**
- Slack/Teams team channel
- GitHub org README
- Wekraft website
- Social media

---

## 📝 Publishing Future Updates

### Bug Fix (0.1.0 → 0.1.1)

```bash
npm run build
vsce publish patch
```

### New Feature (0.1.0 → 0.2.0)

```bash
npm run build
vsce publish minor
```

### Major Release (0.1.0 → 1.0.0)

```bash
npm run build
vsce publish major
```

**That's it!** No need to manually update version numbers—VSCE handles it.

---

## ❓ Troubleshooting

### "401 Unauthorized"

```bash
# Re-authenticate with fresh PAT
vsce login wekraft
# Paste new token when prompted
```

### "Publisher not found" or "Cannot publish"

- Wait 10-15 minutes after creating publisher (provisioning delay)
- Verify `"publisher": "wekraft"` in `package.json`
- Check you're logged in: `vsce ls`

### Extension doesn't show in marketplace

- Refresh marketplace search (browser cache)
- Wait 5 minutes for indexing
- Verify `package.json` has correct metadata

### "VSCE not found"

```bash
npm install -g @vsce/vsce
```

---

## 📚 Full Documentation

For detailed information, see:

- **[PUBLISHING.md](./PUBLISHING.md)** — Step-by-step publication guide
- **[README.md](./README.md)** — User documentation
- **[CHANGELOG.md](./CHANGELOG.md)** — Feature list
- **[READY_TO_PUBLISH.md](./READY_TO_PUBLISH.md)** — Pre-flight checklist

---

## ✅ You're Done!

GitPilot is now published and ready for your team to use. Congratulations! 🎉

**Next steps:**
1. Share the marketplace link
2. Gather feedback from your team
3. Plan v0.2.0 features
4. Keep maintaining and updating

**Questions?** Refer to full documentation files or VS Code extension documentation at [code.visualstudio.com/api](https://code.visualstudio.com/api)

---

**Timeline Summary:**
- Step 1 (Local setup): ~5 min
- Step 2 (Azure PAT): ~5 min
- Step 3 (Publisher account): ~2 min + 5-10 min wait
- Step 4 (Login): ~2 min
- Step 5 (Publish): ~1 min
- Step 6 (Verify): ~2 min

**Total: ~15-20 minutes** ⏱️
