const fs = require('fs');

const COMMIT_EDITMSG = process.argv[2];

const commitMessage = fs.readFileSync(COMMIT_EDITMSG).toString();

fs.writeFileSync(COMMIT_EDITMSG, commitMessage
  .replace(/[  ]/gm, ' ') // replace hard space with normal space
);