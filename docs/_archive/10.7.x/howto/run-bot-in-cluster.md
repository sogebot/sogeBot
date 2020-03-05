sogeBot can run in cluster mode consisting main program(master) and clusters.

!> Cluster mode is not supported for sqlite.

To setup cluster, update your `config.json` file

```json
  "cluster": {
    "enabled": "true",
    "id": "e77f8113-5be4-474e-a603-b435d839ab00",
    "mainThreadUrl": "http://exposed-url-to-your-master",
    "port": "30000"
  },
```

This settings is same for all your bot instances.

To startup bot in cluster mode (not as main program but additional instance),
you need to run bot with `CLUSTER` env variable.

`CLUSTER=1 npm start`

!> Cluster instance must be run on different machine (server) to split load.
   You can see higher response time due to nature of internet communication.
