!> If NeDB is your <a href="#/configuration/database">database</a> of choice,
   cpu is always set to 1.

```config.json
{
  ...
  "threads": "auto",
  ...
}
```

#### What is this?
Sets how many threads will bot use to perform operations.

#### Available values

- *auto* - will be set automatically on number of threads on machine
- Any integer value greater than 0

?> It's not advised to set threads value higher than 4.