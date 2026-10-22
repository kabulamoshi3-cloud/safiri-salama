#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <passenger|driver|both> <android|ios|all> [preview|production]" >&2
  exit 2
}

[[ $# -ge 2 && $# -le 3 ]] || usage
apps="$1"
platform="$2"
profile="${3:-preview}"

case "$apps" in
  passenger) app_list=(passenger-app) ;;
  driver) app_list=(driver-app) ;;
  both) app_list=(passenger-app driver-app) ;;
  *) usage ;;
esac
case "$platform" in android|ios|all) ;; *) usage ;; esac
case "$profile" in preview|production) ;; *) usage ;; esac

for app in "${app_list[@]}"; do
  echo "Building $app ($platform, $profile)"
  (
    cd "apps/$app"
    # Install the native notification package listed in app.json and keep the
    # SDK-compatible version/lockfile in sync before EAS uploads the project.
    npx expo install expo-notifications expo-constants
    npx eas-cli build --non-interactive --platform "$platform" --profile "$profile"
  )
done
