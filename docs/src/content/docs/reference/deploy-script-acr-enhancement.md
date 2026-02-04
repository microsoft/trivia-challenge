# Deploy Script Enhancement - ACR Access Verification

## What Was Added

Enhanced `deploy-image.sh` with comprehensive ACR access verification and authentication checks.

## New Functionality

### 1. Enhanced Prerequisites Check

**Before:**
```bash
- Check Docker installed
- Check Azure CLI installed
- Check Azure login
```

**After:**
```bash
✓ Check Docker installed (+ installation instructions)
✓ Check Azure CLI installed (+ installation instructions)
✓ Check Azure login (+ login commands)
✓ Check ACR access (NEW!)
✓ Verify ACR permissions (NEW!)
✓ Automatic ACR login (NEW!)
```

### 2. New Function: `check_acr_access()`

This function validates:

1. **ACR Exists**: Verifies the ACR is accessible
   ```bash
   az acr show --name <acr> --resource-group <rg>
   ```

2. **User Permissions**: Checks push access
   - Shows current user
   - Verifies AcrPush or Contributor role
   
3. **ACR Login**: Automatically logs into ACR
   ```bash
   az acr login --name <acr>
   ```

4. **Helpful Error Messages**: Provides recovery commands
   - List accessible ACRs
   - Check role assignments
   - Grant permissions command
   - Troubleshooting steps

### 3. Improved Error Messages

Each error now includes:
- **Clear explanation** of what went wrong
- **Possible causes** (numbered list)
- **Resolution commands** (copy-paste ready)
- **Alternative approaches**

#### Example Error Output:

```
✗ Failed to login to ACR 'myacr'

This could mean:
  1. You don't have push permissions (need 'AcrPush' or 'Contributor' role)
  2. Docker daemon is not running
  3. Network connectivity issues

To check your role assignments:
  az role assignment list --assignee user@example.com --scope /subscriptions/.../myacr

To grant push permissions (requires admin):
  az role assignment create \
    --assignee user@example.com \
    --role AcrPush \
    --scope /subscriptions/.../myacr
```

## Workflow Changes

### Before
```
1. Check basic prerequisites
2. Get ACR login server
3. Build Docker image
4. Try to login to ACR ← Could fail here!
5. Push image
6. Update web app
```

### After
```
1. Check basic prerequisites (+installation help)
2. ✓ Verify ACR access (NEW!)
3. ✓ Check ACR permissions (NEW!)
4. ✓ Login to ACR (NEW!)
5. Get ACR login server
6. Build Docker image
7. Push image (already logged in)
8. Update web app
```

## Benefits

### ✓ Early Failure Detection
- Catches authentication issues **before** building the Docker image
- Saves time by not building if push will fail
- Clear feedback at each step

### ✓ Better User Experience
- Helpful error messages with solutions
- No mysterious "access denied" errors
- Copy-paste ready commands

### ✓ Security
- Verifies proper RBAC permissions
- Shows current user context
- Encourages least-privilege access

### ✓ Automation-Friendly
- Clear exit codes
- Structured error messages
- Works in CI/CD pipelines

## Updated Documentation

### DEPLOY-IMAGE.md
- Updated prerequisites section
- Added ACR permission requirements
- Expanded troubleshooting section with:
  - Login issues
  - Permission problems
  - Role assignment commands
  - Manual recovery steps

### Script Help
- All prerequisites now show installation instructions
- Service principal authentication examples
- Role-based access control guidance

## Testing

```bash
# Test 1: Verify script syntax
bash -n deploy-image.sh
✓ Script syntax is valid

# Test 2: Show help (with new permission info)
./deploy-image.sh --help

# Test 3: Run without login (should fail gracefully)
az logout
./deploy-image.sh myacr
# Expected: Clear error with "az login" command

# Test 4: Run without ACR permissions (should fail gracefully)
./deploy-image.sh myacr
# Expected: Clear error with role assignment command
```

## Example Usage Scenarios

### Scenario 1: First-time User
```bash
$ ./deploy-image.sh myacr

ℹ Checking prerequisites...
✗ Not logged into Azure. Please run 'az login' first.

To login to Azure:
  az login

$ az login
# ... login flow ...

$ ./deploy-image.sh myacr

ℹ Checking prerequisites...
✓ All prerequisites met
ℹ Verifying ACR access...
✓ ACR access verified and logged in
# ... continues with deployment ...
```

### Scenario 2: Insufficient Permissions
```bash
$ ./deploy-image.sh myacr

ℹ Checking prerequisites...
✓ All prerequisites met
ℹ Verifying ACR access...
✗ Failed to login to ACR 'myacr'

This could mean:
  1. You don't have push permissions (need 'AcrPush' or 'Contributor' role)
  2. Docker daemon is not running
  3. Network connectivity issues

To check your role assignments:
  az role assignment list --assignee user@example.com --scope ...

# User can now fix permissions and retry
```

### Scenario 3: Wrong ACR Name
```bash
$ ./deploy-image.sh wrongacr

ℹ Checking prerequisites...
✓ All prerequisites met
ℹ Verifying ACR access...
✗ Cannot access ACR 'wrongacr' in resource group 'rg-triviachallenge-bicep'

Possible issues:
  1. ACR doesn't exist - verify the name
  2. Wrong resource group - check with: az acr list -o table
  3. Insufficient permissions - you need at least 'Reader' role

To list all ACRs you have access to:
  az acr list --query "[].{Name:name, ResourceGroup:resourceGroup}" -o table
```

## Compatibility

- ✅ Works with existing quick-deploy.sh wrapper
- ✅ Compatible with CI/CD pipelines
- ✅ Backwards compatible (no breaking changes)
- ✅ Same command-line interface
- ✅ Enhanced error handling only

## Summary

The script now provides a **production-ready deployment experience** with:
- **Proactive validation** before expensive operations
- **Clear, actionable error messages**
- **Automatic ACR authentication**
- **Comprehensive troubleshooting guidance**

No more mysterious authentication failures after building Docker images! 🎉
