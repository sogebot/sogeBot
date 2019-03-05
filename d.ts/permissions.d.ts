declare namespace Permissions {
  type Item = {
    id: string,
    extendsPID: string,
    name: string,
    order: number,
    isCorePermission: boolean,
    automation: null | 'caster' | 'moderators' | 'subscribers' | 'viewers' | 'followers',
    userIds: string[],
    filters: Permissions.Filter[],
  }

  type Filter = {
    comparator: '<' | '>' | '==' | '<=' | '>=',
    type: 'watched' | 'tips' | 'bits' | 'messages',
    value: number,
  }
}