function getMigrationType(type: string) {
  switch(type) {
    case 'mysql':
    case 'mariadb':
      return 'mysql';
    case 'postgres':
      return 'postgres';
    default:
      return 'sqlite';
  }
}

export { getMigrationType };