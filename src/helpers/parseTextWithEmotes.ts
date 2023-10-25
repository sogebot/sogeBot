export const parseTextWithEmotes = async (text: string | undefined, size: 1 | 2 | 3 = 1)  =>{
  const Emotes = (await import('../emotes.js')).default;
  if (typeof text === 'undefined' || text.length === 0) {
    return '';
  }

  // checking emotes
  for (const emote of Emotes.cache) {
    const split: string[] = (text as string).split(' ');
    for (let i = 0; i < split.length; i++) {
      if (split[i] === emote.code) {
        split[i] = `<span class="simpleChatImage"><img src='${emote.urls[size]}' class="emote" alt="${emote.code}" title="${emote.code}"/></span>`;
      }
    }
    text = split.join(' ');
  }
  return text;
};