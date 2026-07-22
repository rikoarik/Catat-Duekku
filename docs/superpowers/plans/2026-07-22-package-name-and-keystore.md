# Package Name & Release Keystore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure package name `com.catatduekku.app` in `app.json` and generate an Android release keystore with secure credentials.

**Architecture:** Update Expo configuration for Android and iOS bundle IDs, add security rules to `.gitignore`, generate Java PKCS12 keystore using `keytool`, and save credential files locally.

**Tech Stack:** Expo SDK 57, Java `keytool`, Git.

## Global Constraints

- Android Package Name: `com.catatduekku.app`
- iOS Bundle Identifier: `com.catatduekku.app`
- Keystore validity: 10000 days
- Key alias: `catatduekku-key-alias`

---

### Task 1: Update Expo App Configuration & Git Ignore

**Files:**
- Modify: `app.json`
- Modify: `.gitignore`

- [ ] **Step 1: Update app.json with android package and ios bundleIdentifier**
- [ ] **Step 2: Add keystore secrets patterns to .gitignore**
- [ ] **Step 3: Verify expo config validation**

### Task 2: Generate Release Keystore & Save Credentials

**Files:**
- Create: `catat-duekku-release.keystore`
- Create: `keystore.properties`
- Create: `RELEASE_KEYSTORE_INFO.md`

- [ ] **Step 1: Execute keytool command to generate release keystore**
- [ ] **Step 2: Verify keystore generation using keytool -list**
- [ ] **Step 3: Create keystore.properties and RELEASE_KEYSTORE_INFO.md**
