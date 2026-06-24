const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicesplit')
    .setDescription('Split all members in a voice channel to a different channel')
    .addChannelOption(option => option.setName('source').setDescription('The source voice channel').setRequired(true).addChannelTypes(2))
    .addChannelOption(option => option.setName('target').setDescription('The target voice channel').setRequired(true).addChannelTypes(2))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the split'))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
  cooldown: 30,
  aliases: ['vs'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const source = isSlash ? interaction.options?.getChannel('source') : interaction.guild.channels.cache.get(args?.[0]?.replace(/[<>#]/g, ''));
    const target = isSlash ? interaction.options?.getChannel('target') : interaction.guild.channels.cache.get(args?.[1]?.replace(/[<>#]/g, ''));
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(2).join(' ') || 'No reason provided');

    if (!source || source.type !== 2) return interaction.reply({ embeds: [errorEmbed('Please provide a valid source voice channel.')] });
    if (!target || target.type !== 2) return interaction.reply({ embeds: [errorEmbed('Please provide a valid target voice channel.')] });

    try {
      const members = source.members.array();
      if (members.length === 0) return interaction.reply({ embeds: [errorEmbed('No members in the source channel.')] });

      let successCount = 0;
      for (const m of members) {
        try {
          await m.voice.setChannel(target, reason);
          successCount++;
        } catch (e) {
          console.error(`Failed to move ${m.user.tag}:`, e);
        }
      }

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: 'mass',
        moderator_id: member.id,
        action: 'voicesplit',
        reason: `Moved ${successCount} members from ${source.name} to ${target.name}: ${reason}`,
        case_number: caseNumber
      });

      return interaction.reply({ embeds: [successEmbed(`Successfully moved ${successCount} members from ${source.name} to ${target.name}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while splitting voice channels.')] });
    }
  }
};
