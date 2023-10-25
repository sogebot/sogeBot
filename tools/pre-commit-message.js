import fs from 'node:fs';

const COMMIT_EDITMSG = process.argv[2];
const commitMessage = fs.readFileSync(COMMIT_EDITMSG).toString().trim();

console.log(`Cleaning up hard space from commit message: "${commitMessage}"`);

fs.writeFileSync(COMMIT_EDITMSG, commitMessage
  .replace(/[  ]/gm, ' '), // eslint-disable-line no-irregular-whitespace
);