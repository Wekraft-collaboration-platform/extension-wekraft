# Publishing GitPilot to VS Code Marketplace

This guide walks through publishing the GitPilot extension to the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com).

## Prerequisites

✅ **Already Complete:**
- `package.json` configured with publisher="wekraft", license=MIT, all metadata
- `LICENSE` file created (MIT license)
- `README.md` with user documentation
- `media/gitpilot.svg` icon
- TypeScript build passes (`npm run build`)
- `dist/` folder with compiled JavaScript

❌ **You Must Complete:**
- Azure DevOps organization (free tier is fine)
- Personal Access Token (PAT) with Marketplace scope
- VS Code Marketplace publisher account (associated with wekraft organization)

## Step-by-Step Publication

### Step 1: Create Azure DevOps Organization

1. Go to [dev.azure.com](https://dev.azure.com)
2. Click **"New organization"**
3. Follow the wizard to create an organization named `wekraft` (or similar)
4. Verify your email to activate the organization

### Step 2: Generate Personal Access Token (PAT)

1. In Azure DevOps, click your **profile icon** (top-right)
2. Select **"Personal access tokens"**
3. Click **"New Token"**
4. Configure:
   - **Name**: `GitPilot VS Code Marketplace`
   - **Organization**: Select your `wekraft` org
   - **Expiration**: 1 year (or your preference)
   - **Scopes**: Select **"Marketplace"** → check all marketplace permissions
   - Leave other scopes unchecked
5. Click **"Create"**
6. **Copy the token** immediately (you won't see it again!)
   - Save it in a secure password manager
   - Format: `{organization}:{PAT_STRING}`

### Step 3: Create VS Code Marketplace Publisher Account

1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com)
2. Click **"Publish extensions"** (top-right)
3. Sign in with your Microsoft account
4. Click **"Create publisher"**
5. Configure:
   - **Publisher ID**: `wekraft` (must match `"publisher"` in package.json)
   - **Publisher name**: `Wekraft`
   - **Website**: `https://wekraft.xyz` (or your company website)
6. Accept terms and click **"Create"**

**Note**: Wait 5-10 minutes for the publisher account to be fully provisioned before publishing.

### Step 4: Install VSCE Tool (if not already installed)

```bash
npm install -g @vscode/vsce
```

Verify installation:
```bash
vsce --version
```

### Step 5: Login to Marketplace (First Time Only)

```bash
vsce login wekraft
```

When prompted:
- **Publisher ID**: `wekraft`
- **Personal Access Token**: Paste the token from Step 2

This command stores credentials locally in your OS credential manager.

### Step 6: Package the Extension

```bash
vsce package
```

This creates a `.vsix` file (e.g., `gitpilot-0.1.0.vsix`) in your project root.

### Step 7: Publish to Marketplace

```bash
vsce publish
```

Or, if you want to package and publish in one step:

```bash
vsce publish --baseImagesUrl https://github.com/wekraft/gitpilot-vscode/raw/main/
```

The `--baseImagesUrl` flag helps marketplace display your README images correctly (if you have any).

**Expected output:**
```
Publishing <publisher>/<name> v0.1.0...
Published to https://marketplace.visualstudio.com/items?itemName=<publisher>.<name>
```

### Step 8: Verify Publication

1. Go to [VS Code Marketplace](https://marketplace.visualstudio.com)
2. Search for **"GitPilot"**
3. Confirm your extension appears with correct metadata:
   - ✅ Publisher: `wekraft`
   - ✅ Version: `0.1.0`
   - ✅ Description matches `package.json`
   - ✅ Icon displays
   - ✅ README renders with formatting
   - ✅ Gallery banner shows

4. Click **"Install"** → Should redirect to VS Code and install normally

## Publishing Updates

### Patch Version (0.1.0 → 0.1.1)

1. Update version in `package.json`:
   ```json
   "version": "0.1.1"
   ```

2. Run build to verify:
   ```bash
   npm run build
   ```

3. Publish patch:
   ```bash
   vsce publish patch
   ```
   (Automatically increments patch version and publishes)

### Minor Version (0.1.0 → 0.2.0)

```bash
vsce publish minor
```

### Major Version (0.1.0 → 1.0.0)

```bash
vsce publish major
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "401 Unauthorized" when publishing | Re-run `vsce login wekraft` and paste fresh PAT |
| "Publisher already exists" | Use the existing publisher ID (contact publisher support if locked) |
| "Invalid publisher ID" | Ensure `"publisher"` in package.json exactly matches marketplace account |
| Extension doesn't install in VS Code | Verify `dist/extension.js` exists and was built successfully |
| README doesn't render | Use relative URLs for images: `media/icon.png` instead of absolute URLs |
| Icon not visible | Ensure `media/gitpilot.svg` exists and SVG is valid XML |

## Commands for Reference

```bash
# Build extension
npm run build

# Package into .vsix (local testing)
vsce package

# Login to marketplace
vsce login wekraft

# Publish new version
vsce publish

# Publish specific version
vsce publish --patch      # 0.1.0 → 0.1.1
vsce publish --minor      # 0.1.0 → 0.2.0
vsce publish --major      # 0.1.0 → 1.0.0

# List all published versions
vsce ls
```

## Marketplace Best Practices

1. **Keep README.md updated** - Marketplace displays the README directly
2. **Use clear, specific keywords** - Helps discoverability (already done in package.json)
3. **Add screenshots/GIFs** - Consider adding to README for visual appeal
4. **Test thoroughly** - Publish to a test organization first if possible
5. **Monitor reviews** - VS Code Marketplace has a review system; respond to user feedback
6. **Semantic versioning** - Follow MAJOR.MINOR.PATCH versioning scheme
7. **Changelog** - Create `CHANGELOG.md` to document changes per version

## Links

- [VSCE Documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VS Code Marketplace](https://marketplace.visualstudio.com)
- [Azure DevOps Personal Access Tokens](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
- [Extension Manifest Best Practices](https://code.visualstudio.com/api/references/extension-manifest)

## Next Steps After Publishing

1. ✅ Share the marketplace link with your team
2. ✅ Update your company website with the link
3. ✅ Submit to relevant aggregators (e.g., "Awesome VS Code" lists)
4. ✅ Gather user feedback and plan v0.2.0 features
5. ✅ Monitor download metrics on the marketplace

---

**Timeline**: ~15 minutes to complete all steps (excluding Azure org verification delays).

Good luck shipping GitPilot! 🚀
