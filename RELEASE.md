### Release Guidelines

1) Update and groom changelog.  Follow convention already in the changelog.
Be sure to include PR number and github username reference where applicable.

2) Bump package version.  Follow semver

3) Create a release commit: `git commit -am 'release x.y.z'

4) Push the release commit

5) Publish the package: `npm publish`

6) Create a github release: `Release x.y.z`.  Keep changelog notes in the changelog, not the release comment
