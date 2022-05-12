currentSnapshot=$(node tools/changelog.js nextSnapshot)
file=./package.json

if [ "$1" = "major" ]
  then
    nextTag=$(node tools/changelog.js nextTagMajor)
  else
    nextTag=$(node tools/changelog.js nextTag)
fi


echo Current Snapshot: $currentSnapshot
echo Next tag: $nextTag
echo

echo Switching to master branch
git checkout master

echo Updating master branch
git pull -r origin master

echo Updating package.json version from $currentSnapshot to $nextTag

node ./tools/changePackageVersion.js $nextTag
git add $file
git commit -m "build: $nextTag"
echo Pushing build commit $nextTag
git push origin master

echo Creating tag $nextTag
git tag $nextTag
echo Pushing to github and triggering release
git push origin --tags
echo Released $nextTag

nextSnapshot=$(node tools/changelog.js nextSnapshot)
echo Updating package.json version from with $nextTag to $nextSnapshot
node ./tools/changePackageVersion.js $nextSnapshot
git add $file
git commit -m "build: $nextSnapshot"
echo Pushing snapshot commit $nextSnapshot
git push origin master

echo Done!