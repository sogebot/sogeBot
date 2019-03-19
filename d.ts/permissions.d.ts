declare namespace Permissions {
  type Item = {
    id: string,
    name: string,
    order: number,
    isCorePermission: boolean,
    isWaterfallAllowed: boolean,
    automation: 'none' | 'casters' | 'moderators' | 'subscribers' | 'viewers' | 'followers' | 'vip',
    userIds: string[],
    filters: Permissions.Filter[],
  }

  type Filter = {
    comparator: '<' | '>' | '==' | '<=' | '>=',
    type: 'points' | 'watched' | 'tips' | 'bits' | 'messages' | 'subtier' | 'subcumulativemonths' | 'substreakmonths',
    value: number,
  }
}