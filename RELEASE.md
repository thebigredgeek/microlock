### Release Guidelines

1) Make sure tests are passing!!!

2) Update and groom changelog.  Follow convention already in the changelog.
Be sure to include PR number and github username reference where applicable.

3) Bump package version.  Follow semver

4) Create a release commit: `git commit -am 'release x.y.z'

5) Push the release commit

6) BUILD THE MODULE! Run `make` or the published files will not match your source.

6) Publish the package: `npm publish`

7) Create a github release: `Release x.y.z`.  Keep changelog notes in the changelog, not the release comment
