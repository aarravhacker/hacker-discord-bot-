const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for a channel')
    .addIntegerOption(option => option.setName('seconds').setDescription('Slowmode duration in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption(option => option.setName('channel').setDescription('The channel to set slowmode for'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 5,
  aliases: ['sm'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const seconds = isSlash ? interaction.options?.getInteger('seconds') : parseInt(args?.[0]);
    const channel = isSlash ? interaction.options?.getChannel('channel') : interaction.channel;

    if (seconds === undefined || seconds === null || seconds < 0 || seconds > 21600) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a valid number of seconds (0-21600).')] });
    }

    try {
      await channel.setRateLimitPerUser(seconds, `Slowmode set by ${member.user.tag}`);

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: 'channel',
        moderator_id: member.id,
        action: 'slowmode',
        reason: `Set slowmode to ${seconds}s in ${channel.name}`,
        case_number: caseNumber
      });

      return interaction.reply({ embeds: [successEmbed(`Slowmode for ${channel} set to ${seconds} second${seconds !== 1 ? 's' : ''}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while setting slowmode.')] });
    }
  }
};
