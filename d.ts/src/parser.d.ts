type DiscordJsTextChannel = import('discord.js').TextChannel;
type DiscordJsUser = import('discord.js').User;
type ChatUser = import('@twurple/chat').ChatUser;

export interface CommandResponse {
  response: string | Promise<string>;
  sender: CommandOptions['sender'];
  discord: CommandOptions['discord'];
  attr: CommandOptions['attr'];
}

export interface CommandOptions {
  sender: Omit<ChatUser, '_userName' | '_userData' | '_parseBadgesLike'>
  emotesOffsets: Map<string, string[]>
  discord: { author: DiscordJsUser; channel: DiscordJsTextChannel } | undefined
  command: string;
  parameters: string;
  isAction: boolean,
  isHighlight: boolean,
  isFirstTimeMessage: boolean,
  createdAt: number;
  attr: {
    skip?: boolean;
    quiet?: boolean;
    [attr: string]: any;
  };
}