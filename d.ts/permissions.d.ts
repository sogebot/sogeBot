declare namespace Permissions {
  type Item = {
    id: string,
    extendsPID: string,
    name: string,
    order: number,
    preserve: boolean,
    automation: null | 'caster' | 'moderators' | 'subscribers' | 'viewers' | 'followers',
    userIds: string[],
  }
}