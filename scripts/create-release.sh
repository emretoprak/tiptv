#!/bin/bash

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

echo "Creating release for version: $VERSION"

# Create and push tag
git tag "v$VERSION"
git push origin "v$VERSION"

echo "Tag v$VERSION created and pushed. GitHub Actions will now build and create the release."
echo "Check the Actions tab in your GitHub repository to monitor the build progress."