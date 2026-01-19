fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios staging

```sh
[bundle exec] fastlane ios staging
```

Build iOS IPA for staging (Ad-hoc) - For Firebase App Distribution

### ios production

```sh
[bundle exec] fastlane ios production
```

Build iOS IPA for production (App Store)

### ios production_upload

```sh
[bundle exec] fastlane ios production_upload
```

Build and upload to App Store

### ios production_testflight

```sh
[bundle exec] fastlane ios production_testflight
```

Build and upload to TestFlight

### ios production_firebase

```sh
[bundle exec] fastlane ios production_firebase
```

Build iOS IPA for production (Ad-hoc) and upload to Firebase

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
