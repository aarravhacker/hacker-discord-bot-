const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member')
    .addUserOption(option => option.setName('user').setDescription('The user to mute').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the mute'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  aliases: ['m'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = interaction.member || interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(1).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user to mute.')] });

    try {
      const guildConfig = await getGuild(interaction.guild.id);
      const muteRoleId = guildConfig?.mute_role;
      if (!muteRoleId) return interaction.reply({ embeds: [errorEmbed('No mute role configured. Use `!setmuterole` to set one.')] });

      const muteRole = interaction.guild.roles.cache.get(muteRoleId);
      if (!muteRole) return interaction.reply({ embeds: [errorEmbed('The configured mute role no longer exists.')] });

      if (target.roles.cache.has(muteRoleId)) return interaction.reply({ embeds: [errorEmbed('This user is already muted.')] });

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'mute',
        reason,
        case_number: caseNumber
      });

      await target.roles.add(muteRole, reason);
      await target.send({ embeds: [errorEmbed(`You have been muted in **${interaction.guild.name}** for: ${reason}`)] }).catch(() => {});

      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Muted** ${target.user.tag} (${target.id})\n**Moderator:** ${member.user.tag}\n**Reason:** ${reason}\n**Case:** #${caseNumber}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully muted ${target.user.tag} for: ${reason}`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while trying to mute the user.')] });
    }
  }
};
