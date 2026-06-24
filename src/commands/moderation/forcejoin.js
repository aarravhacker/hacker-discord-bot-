const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forcejoin')
    .setDescription('Force a member to join a voice channel')
    .addUserOption(option => option.setName('user').setDescription('The user to force join').setRequired(true))
    .addChannelOption(option => option.setName('channel').setDescription('The channel to force join to').setRequired(true).addChannelTypes(2))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the force join'))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
  cooldown: 5,
  aliases: ['fj'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const channel = isSlash ? interaction.options?.getChannel('channel') : interaction.guild.channels.cache.get(args?.[1]?.replace(/[<>#]/g, ''));
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(2).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
    if (!channel || channel.type !== 2) return interaction.reply({ embeds: [errorEmbed('Please provide a valid voice channel.')] });

    try {
      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'forcejoin',
        reason: `Force joined to ${channel.name}: ${reason}`,
        case_number: caseNumber
      });

      await target.voice.setChannel(channel, reason);

      return interaction.reply({ embeds: [successEmbed(`Successfully force joined ${target.user.tag} to ${channel.name}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while force joining the user.')] });
    }
  }
};
