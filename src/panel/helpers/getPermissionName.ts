import type { PermissionsInterface } from 'src/bot/database/entity/permissions';

const getPermissionName = (id: string | null, permissions: PermissionsInterface[]) => {
  if (!id) {
    return 'Disabled';
  }
  const permission = permissions.find((o) => {
    return o.id === id;
  });
  if (typeof permission !== 'undefined') {
    if (permission.name.trim() === '') {
      return permission.id;
    } else {
      return permission.name;
    }
  } else {
    return null;
  }
};

export { getPermissionName };