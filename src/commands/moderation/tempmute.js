const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempmute')
    .setDescription('Temporarily mute a member')
    .addUserOption(option => option.setName('user').setDescription('The user to tempmute').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 1h, 1d)').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the tempmute'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  aliases: ['tm'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const durationStr = isSlash ? interaction.options?.getString('duration') : args?.[1];
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(2).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user to tempmute.')] });
    if (!durationStr) return interaction.reply({ embeds: [errorEmbed('Please provide a duration.')] });

    const duration = parseDuration(durationStr);
    if (!duration) return interaction.reply({ embeds: [errorEmbed('Invalid duration format.')] });

    try {
      const guildConfig = await getGuild(interaction.guild.id);
      const muteRoleId = guildConfig?.mute_role;
      if (!muteRoleId) return interaction.reply({ embeds: [errorEmbed('No mute role configured. Use `/setmuterole` to set one.')] });

      const muteRole = interaction.guild.roles.cache.get(muteRoleId);
      if (!muteRole) return interaction.reply({ embeds: [errorEmbed('The configured mute role no longer exists.')] });

      if (target.roles.cache.has(muteRoleId)) return interaction.reply({ embeds: [errorEmbed('This user is already muted.')] });

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'tempmute',
        reason: `${reason} (Duration: ${durationStr})`,
        case_number: caseNumber
      });

      await target.roles.add(muteRoleId, reason);
      await target.send({ embeds: [errorEmbed(`You have been temporarily muted in **${interaction.guild.name}** for ${durationStr}. Reason: ${reason}`)] }).catch(() => {});

      setTimeout(async () => {
        try {
          const memberNow = interaction.guild.members.cache.get(target.id) || await interaction.guild.members.fetch(target.id);
          if (memberNow.roles.cache.has(muteRoleId)) {
            await memberNow.roles.remove(muteRoleId, 'Tempmute duration expired');
            if (guildConfig?.mod_log_channel) {
              const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
              if (logChannel) {
                logChannel.send({ embeds: [successEmbed(`**Auto-unmuted** ${target.user.tag} (${target.id}) - Tempmute expired`)] });
              }
            }
          }
        } catch (e) {
          console.error('Failed to auto-unmute:', e);
        }
      }, duration);

      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Tempmuted** ${target.user.tag} (${target.id}) for ${durationStr}\n**Moderator:** ${member.user.tag}\n**Reason:** ${reason}\n**Case:** #${caseNumber}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully tempmuted ${target.user.tag} for ${durationStr}`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while trying to tempmute the user.')] });
    }
  }
};

function parseDuration(str) {
  const match = str.match(/^(\d+)([smhdw])$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return num * multipliers[unit];
}
