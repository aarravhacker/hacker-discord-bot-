const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vmute')
    .setDescription('Voice mute a member')
    .addUserOption(option => option.setName('user').setDescription('The user to voice mute').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the voice mute'))
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),
  cooldown: 5,
  aliases: ['vm'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(1).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user to voice mute.')] });
    if (!target.voice.channel) return interaction.reply({ embeds: [errorEmbed('This user is not in a voice channel.')] });

    try {
      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'vmute',
        reason,
        case_number: caseNumber
      });

      await target.voice.setMute(true, reason);

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Voice Muted** ${target.user.tag} (${target.id})\n**Moderator:** ${member.user.tag}\n**Reason:** ${reason}\n**Case:** #${caseNumber}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully voice muted ${target.user.tag}`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while trying to voice mute the user.')] });
    }
  }
};
