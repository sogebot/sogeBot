Bot can be started with various environment variables

## DISABLE

Force system to be disabled. Mainly used for moderation system

- `DISABLE=moderation`
- nothing is set *default*

## HEAP

Enables HEAP snapshot tracking and saving for a bot. In normal environment, you **should not** enable this environment variable.

- `HEAP=true`
- `HEAP=false` *default*

Heaps are saved in `./heap/main` and `./heap/cluster` folders

!> **WINDOWS:** You need to have proper packages installed on windows<br>`npm install --global --production windows-build-tools`

!> You need to install before HEAP use<br>`npm install v8-profiler-node8`

## LOGLEVEL

Changes log level of a bot

- `LOGLEVEL=debug`
- `LOGLEVEL=info` *default*