export function generateUsername(): string {
  const adject = ['Encouraging', 'Plucky', 'Glamorous', 'Endearing', 'Fast', 'Agitated', 'Mushy', 'Muddy', 'Sarcastic', 'Real', 'Boring'];
  const subject = ['Sloth', 'Beef', 'Fail', 'Fish', 'Fast', 'Raccoon', 'Dog', 'Man', 'Pepperonis', 'RuleFive', 'Slug', 'Cat', 'SogeBot'];
  return adject[Math.floor(Math.random() * adject.length)] + subject[Math.floor(Math.random() * subject.length)];
}