const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily ban a member')
    .addUserOption(option => option.setName('user').setDescription('The user to tempban').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 1h, 1d, 1w)').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the tempban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,
  aliases: ['tb'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const durationStr = isSlash ? interaction.options?.getString('duration') : args?.[1];
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(2).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user to tempban.')] });
    if (!durationStr) return interaction.reply({ embeds: [errorEmbed('Please provide a duration (e.g., 1h, 1d, 1w).')] });
    if (!target.bannable) return interaction.reply({ embeds: [errorEmbed('I cannot ban this user.')] });

    const duration = parseDuration(durationStr);
    if (!duration) return interaction.reply({ embeds: [errorEmbed('Invalid duration format. Use formats like 1h, 1d, 1w.')] });

    try {
      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'tempban',
        reason: `${reason} (Duration: ${durationStr})`,
        case_number: caseNumber
      });

      await target.send({ embeds: [errorEmbed(`You have been temporarily banned from **${interaction.guild.name}** for ${durationStr}. Reason: ${reason}`)] }).catch(() => {});
      await target.ban({ reason: `Tempban: ${reason}` });

      setTimeout(async () => {
        try {
          await interaction.guild.members.unban(target.id, 'Tempban duration expired');
          const guildConfig = await getGuild(interaction.guild.id);
          if (guildConfig?.mod_log_channel) {
            const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
            if (logChannel) {
              logChannel.send({ embeds: [successEmbed(`**Auto-unbanned** ${target.user.tag} (${target.id}) - Tempban expired`)] });
            }
          }
        } catch (e) {
          console.error('Failed to auto-unban:', e);
        }
      }, duration);

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Tempbanned** ${target.user.tag} (${target.id}) for ${durationStr}\n**Moderator:** ${member.user.tag}\n**Reason:** ${reason}\n**Case:** #${caseNumber}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully tempbanned ${target.user.tag} for ${durationStr}`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while trying to tempban the user.')] });
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
