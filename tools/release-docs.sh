#!/bin/bash

echo "Releasing new docs"
rm -rf new-docs
git checkout -B docs-release
mkdir new-docs
cp -r docs/_master new-docs/
cp -r docs/_master/* new-docs/
cp docs/.nojekyll new-docs/
cp docs/_navbar.md new-docs/
cp docs/index.html new-docs/
rm -rf docs
mv new-docs docs
git commit -am 'chore: update docs

[skip-tests]'
git push -fu origin docs-release
git checkout master
echo "Done"