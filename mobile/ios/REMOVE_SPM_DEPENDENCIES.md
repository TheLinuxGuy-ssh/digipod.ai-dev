# How to Remove SPM Firebase Dependencies

The project is currently configured to use Swift Package Manager (SPM) for Firebase, but we want to use CocoaPods instead.

## Steps to Fix:

1. **Open Xcode** and open `digipod.xcworkspace`

2. **Go to Project Settings:**
   - Click on the project name "digipod" in the navigator
   - Select the "digipod" target

3. **Remove SPM Dependencies:**
   - Go to "Package Dependencies" tab
   - Find any Firebase-related packages
   - Select them and click the "-" button to remove them
   - Or delete the entire "Package Dependencies" section if it only contains Firebase

4. **Clean Build Folder:**
   - In Xcode menu: Product → Clean Build Folder
   - Or press Cmd+Shift+K

5. **Build the Project:**
   - Press Cmd+B to build
   - The Firebase dependencies should now come from CocoaPods

## Alternative Quick Fix:

If you can't find the SPM dependencies, try:
1. Close Xcode
2. Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData/digipod-*`
3. Reopen the workspace and build

The CocoaPods are already installed and should work once SPM dependencies are removed. 