Contributing
============

Quick Links for Contributing
----------------------------

 - Our bug tracker:
   https://github.com/sogehige/sogeBot/issues

 - Development Discord.gg channel:
   https://discordapp.com/invite/52KpmuH

Coding Guidelines
-----------------

 - sogeBot uses JavaScript Standard Style, for more
   information, please read here:
   https://standardjs.com/

 - Avoid trailing spaces.  To view trailing spaces before making a
   commit, use "git diff" on your changes.  If colors are enabled for
   git in the command prompt, it will show you any whitespace issues
   marked with red.

 - No Tabs, only Spaces, Space width is 2

Commit Guidelines
----------------

 - sogeBot uses the 50/72 standard for commits.  50 characters max
   for the title (excluding module prefix), an empty line, and then a
   full description of the commit, wrapped to 72 columns max.  See this
   link for more information: http://chris.beams.io/posts/git-commit/

 - Make sure commit titles are always in present tense, and are not
   followed by punctuation.

 - Prefix commit titles with the type/name, followed by a colon and a
   space (unless modifying a file in the base directory). So for example, if you
   are modifying the alias system:

     `system/alias: Fix bug with parsing`

   Or for donationalerts.ru integration:

     `integration/donationalerts: Fix source not displaying`

   If you are updating non project files like CONTRIBUTING.md, travis.yml, use `chore`

      `chore: Update CONTRIBUTING.md`

 - If you still need examples, please view the commit history.
