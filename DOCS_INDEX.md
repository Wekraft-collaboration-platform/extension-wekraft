# GitPilot Documentation Index

All documentation for the GitPilot VS Code extension is organized below. Choose your guide based on your role and goal.

---

## 🚀 **I Want to Deploy RIGHT NOW**

**You are**: A developer who needs to publish the extension to VS Code Marketplace in 15 minutes.

**Start here**: [QUICKSTART.md](./QUICKSTART.md)

What you'll learn:
- Create Azure DevOps organization and PAT token
- Create VS Code Marketplace publisher account
- Login with `vsce` and publish extension
- Verify publication on marketplace

**Time**: ~15 minutes  
**Outcome**: Extension live on VS Code Marketplace

---

## 📚 **I Want to Understand the Full Process**

**You are**: A team lead or release manager overseeing the publication.

**Start here**: [PUBLISHING.md](./PUBLISHING.md)

What you'll learn:
- Detailed explanation of each publication step
- Troubleshooting common issues
- Managing future version releases
- Best practices for marketplace distribution

**Time**: ~20 minutes to read (reference during publication)  
**Outcome**: Complete understanding of publication workflow

---

## 🔧 **I Need to Develop & Contribute**

**You are**: A developer modifying the extension code.

**Start here**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)

What you'll learn:
- Project structure and file organization
- Development workflow (setup, build, test)
- Feature overview and architecture
- Publishing updates after code changes

**Time**: ~30 minutes for full reading  
**Outcome**: Ready to modify code and release updates

---

## 📋 **I'm QA Testing Before Release**

**You are**: QA/tester validating the extension before marketplace submission.

**Start here**: [READY_TO_PUBLISH.md](./READY_TO_PUBLISH.md)

What you'll learn:
- Pre-flight checklist (all items to verify)
- Feature verification steps
- Build validation
- Known limitations

**Time**: ~10 minutes  
**Outcome**: Confirmation extension is publication-ready

---

## 👥 **I'm a User - How Do I Use GitPilot?**

**You are**: An end user who installed GitPilot from marketplace.

**Start here**: [README.md](./README.md)

What you'll learn:
- Feature overview (what GitPilot does)
- How to log in with GitHub
- How to set project deadlines
- How to view commit history
- Troubleshooting and support

**Time**: ~15 minutes  
**Outcome**: Able to use all GitPilot features

---

## 📖 **What Changed? (Version History)**

**You are**: A user or developer checking what's new or what will change.

**Start here**: [CHANGELOG.md](./CHANGELOG.md)

What you'll learn:
- Current version (v0.1.0) features
- Future planned features
- What's different from previous versions

**Time**: ~5 minutes  
**Outcome**: Clear understanding of version features

---

---

## File Reference Guide

| File | Purpose | Audience | Read Time |
|------|---------|----------|-----------|
| [QUICKSTART.md](./QUICKSTART.md) | 15-min deployment guide | Developers publishing | 10 min |
| [PUBLISHING.md](./PUBLISHING.md) | Detailed publication steps | Release managers | 20 min |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Complete developer reference | Developers building | 30 min |
| [READY_TO_PUBLISH.md](./READY_TO_PUBLISH.md) | Pre-flight checklist | QA testers | 10 min |
| [README.md](./README.md) | User guide and features | End users | 15 min |
| [CHANGELOG.md](./CHANGELOG.md) | Version history | Everyone | 5 min |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Full reference manual | Technical leads | 30 min |
| [LICENSE](./LICENSE) | MIT license | Compliance/Legal | 5 min |

---

## Quick Navigation

### By Role

**👨‍💻 Developer Deploying**
1. [QUICKSTART.md](./QUICKSTART.md) — Fast path to publishing
2. [PUBLISHING.md](./PUBLISHING.md) — If you hit issues

**👩‍💼 Technical Team Lead**
1. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — Full context
2. [READY_TO_PUBLISH.md](./READY_TO_PUBLISH.md) — Checklist before release
3. [PUBLISHING.md](./PUBLISHING.md) — Publication workflow

**🧪 QA Tester**
1. [README.md](./README.md) — Feature verification checklist
2. [READY_TO_PUBLISH.md](./READY_TO_PUBLISH.md) — Pre-flight validation
3. [CHANGELOG.md](./CHANGELOG.md) — What to test

**👤 End User**
1. [README.md](./README.md) — How to use GitPilot
2. [CHANGELOG.md](./CHANGELOG.md) — What features are available

**🔧 Developer Contributing**
1. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — Setup and architecture
2. `src/` files — Source code
3. [PUBLISHING.md](./PUBLISHING.md) — How to release your changes

---

## Common Questions Answered

**Q: How do I publish to marketplace?**  
A: Start with [QUICKSTART.md](./QUICKSTART.md) — 15 minutes to live.

**Q: What if publication fails?**  
A: See "Troubleshooting" section in [PUBLISHING.md](./PUBLISHING.md).

**Q: How do I make code changes?**  
A: Follow the development workflow in [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).

**Q: What features does GitPilot have?**  
A: See [README.md](./README.md) or [CHANGELOG.md](./CHANGELOG.md).

**Q: Is everything ready to publish?**  
A: Yes! All items in [READY_TO_PUBLISH.md](./READY_TO_PUBLISH.md) are ✅ complete.

**Q: How do I update the extension after I publish?**  
A: See "Publishing Updates" section in [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) or [PUBLISHING.md](./PUBLISHING.md).

**Q: Are there automated scripts I can use?**  
A: Yes! Run `./publish.sh patch` (macOS/Linux) or `publish.bat patch` (Windows) to automate publishing.

---

## What's in the Extension?

### Core Features ✅
- ✅ GitHub-only authentication
- ✅ Repository listing with deadline tracking
- ✅ Commit history browser
- ✅ Full commit detail view (files, line stats)
- ✅ Pre-push hook for metrics + secret detection
- ✅ Emergency push blocking
- ✅ Relative deadline badges
- ✅ Minimalist Linear-inspired UI

### Ready for Publication ✅
- ✅ TypeScript codebase compiled
- ✅ Package.json configured for marketplace
- ✅ MIT LICENSE file created
- ✅ Comprehensive user documentation
- ✅ Developer guide and reference
- ✅ Publication guide and scripts
- ✅ Automated build scripts

---

## Getting Started in 3 Steps

### Step 1: Deploy (15 min)
```bash
# Follow QUICKSTART.md
# Result: Extension on VS Code Marketplace
```

### Step 2: Share
```
https://marketplace.visualstudio.com/items?itemName=wekraft.gitpilot
```

### Step 3: Gather Feedback & Iterate
- Monitor marketplace reviews
- Plan v0.2.0 features (see [CHANGELOG.md](./CHANGELOG.md))
- Follow [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for updates

---

## Support

**Getting Help?**

1. Check the relevant guide above for your role
2. Search the troubleshooting sections
3. Review [README.md](./README.md) for user-facing help
4. Refer to [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for technical details
5. Consult [PUBLISHING.md](./PUBLISHING.md) for marketplace issues

**Still stuck?**

- Check [VS Code Extension API docs](https://code.visualstudio.com/api)
- Review source code in `src/` folder
- Check GitHub issues and discussions

---

## Next Steps

### 👉 **Choose Your Path:**

1. **I want to publish NOW** → Go to [QUICKSTART.md](./QUICKSTART.md)
2. **I need full details** → Go to [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
3. **I'm testing before release** → Go to [READY_TO_PUBLISH.md](./READY_TO_PUBLISH.md)
4. **I'm a user** → Go to [README.md](./README.md)
5. **I want to know what changed** → Go to [CHANGELOG.md](./CHANGELOG.md)

---

## Status

✅ **All documentation complete**  
✅ **Extension code ready**  
✅ **Build validated**  
✅ **Ready for marketplace**  

**Current Version**: 0.1.0  
**Publisher**: wekraft  
**License**: MIT  

**Your next action**: Read [QUICKSTART.md](./QUICKSTART.md) or [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) based on your role above. 🚀
