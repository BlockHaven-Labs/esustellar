How to add a remote contributor and edit a forked branch
-- git remote add glenjaysondmello https://github.com/glenjaysondmello/SafeGig
Fetch the branches of the added contributor
-- git fetch glenjaysondmello
Checkout into the contributors branch
-- git checkout feat/31-nestjs-scaffold-and-project-folder-structure
Inspect then make changes (or not)
-- git add .
-- git commit -m 'changes made'
-- git push glenjaysondmello branchContainingTheChanges:feat/31-nestjs-scaffold-and-project-folder-structure





git add .
git commit -m "commit message"

git remote add nafiu https://github.com/nafiuishaaq/esustellar.git
git push nafiu pr16:feat/viewFunction