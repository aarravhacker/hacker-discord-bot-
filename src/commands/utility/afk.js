const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Sets your AFK status')
    .addStringOption(opt => opt.setName('reason').setDescription('AFK reason').setRequired(false)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    const reason = isSlash ? (interaction.options?.getString('reason') || 'AFK') : (args?.join(' ') || 'AFK');
    const member = isSlash ? interaction.member : interaction.guild?.members?.cache?.get(interaction.author?.id);

    if (!interaction.client.afkUsers) interaction.client.afkUsers = new Map();

    interaction.client.afkUsers.set(user.id, {
      reason: reason,
      since: Date.now(),
      guildId: interaction.guild?.id,
      channelId: interaction.channel.id
    });

    try {
      const oldNick = member.nickname || member.user.username;
      if (!oldNick.startsWith('[AFK] ')) {
        await member.setNickname(`[AFK] ${oldNick.substring(0, 26)}`).catch(() => {});
      }
    } catch (e) {}

    const embed = new EmbedBuilder()
      .setTitle('AFK Set')
      .setColor(config.embedColors.success)
      .setDescription(`You are now AFK: **${reason}**`)
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
