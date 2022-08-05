## List permissions

`!permission list`

!> Default permission is **CASTERS**

### Examples

<blockquote>
  <strong>caster:</strong> !permission list<br>
  <strong>bot:</strong> List of your permissions:<br>
  <strong>bot:</strong> ≥ | Casters | 4300ed23-dca0-4ed9-8014-f5f2f7af55a9<br>
  <strong>bot:</strong> ≥ | Moderators | b38c5adb-e912-47e3-937a-89fabd12393a<br>
  <strong>bot:</strong> ≥ | VIP | e8490e6e-81ea-400a-b93f-57f55aad8e31<br>
  <strong>bot:</strong> ≥ | Subscribers | e3b557e7-c26a-433c-a183-e56c11003ab7<br>
  <strong>bot:</strong> ≥ | Viewers | 0efd7b1c-e460-4167-8e06-8aaf2c170311<br>
</blockquote>

## Add user to exclude list for permissions

`!permission exclude-add -p <uuid|name> -u <username>`

!> Default permission is **CASTERS**

### Parameters

- `-p <uuid|name>`
  - *available values:* list of permission can be obtained by `!permissions list`
    or in UI
  - **NOTE:** You cannot add user to exclude list of core permissions like
    Viewers, Subscribers, etc. You need to create own permission group.
- `-u <username>`
  - username of user who you wish to add to exclude list

### Examples

<blockquote>
  <strong>caster:</strong> !permission -p YourOwnPermissionGroup soge<br>
  <strong>bot:</strong> caster, you added soge to exclude list for permission YourOwnPermissionGroup <br>
</blockquote>

<blockquote style="border-left-color: #f66">
  <strong>caster:</strong> !permission exclude-add -p Viewers soge<br>
  <strong>bot:</strong> caster, you cannot manually exclude user for core permission Viewers <br>
</blockquote>

## Add user to exclude list for permissions

`!permission exclude-rm -p <uuid|name> -u <username>`

!> Default permission is **CASTERS**

### Parameters

- `-p <uuid|name>`
  - *available values:* list of permission can be obtained by `!permissions list`
    or in UI
  - **NOTE:** You cannot remove user to exclude list of core permissions like
    Viewers, Subscribers, etc. You need to create own permission group.
- `-u <username>`
  - username of user who you wish to remove from exclude list

### Examples

<blockquote>
  <strong>caster:</strong> !permission exclude-rm -p YourOwnPermissionGroup soge<br>
  <strong>bot:</strong> caster, you removed soge from exclude list for permission YourOwnPermissionGroup <br>
</blockquote>
