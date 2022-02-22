const fs = require('fs');

console.log(process.argv);

const COMMIT_EDITMSG = process.argv[2];
const commitMessage = fs.readFileSync(COMMIT_EDITMSG).toString();

console.log(`Cleaning up hard space from commit message: "${commitMessage}"`);

fs.writeFileSync(COMMIT_EDITMSG, commitMessage
  .replace(/[  ]/gm, ' '), // eslint-disable-line no-irregular-whitespace
);