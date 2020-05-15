sogeBot can run in cluster mode consisting main program(master) and clusters.

!> Cluster mode is not supported for sqlite.

To setup cluster, set your ENV variables or create `.env` file


### Main thread

```env
CLUSTER=true
CLUSTER_TYPE=main
CLUSTER_ID=<shared-id-between-same-clusters>
CLUSTER_PORT=20003
```

### Cluster thread

```env
CLUSTER=true
CLUSTER_TYPE=cluster
CLUSTER_ID=<shared-id-between-same-clusters>
CLUSTER_MAIN_THREAD_URL=<url-to-main-cluster>
CLUSTER_PORT=20003
```

This settings is same for all your bot instances.

!> Cluster instance must be run on different machine (server) to split load.
   You can see higher response time due to nature of internet communication.
