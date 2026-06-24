const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member')
    .addUserOption(option => option.setName('user').setDescription('The user to timeout').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 1h, 1d)').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the timeout'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  aliases: ['to'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const durationStr = isSlash ? interaction.options?.getString('duration') : args?.[1];
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(2).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user to timeout.')] });
    if (!durationStr) return interaction.reply({ embeds: [errorEmbed('Please provide a duration (e.g., 1h, 1d).')] });

    const duration = parseDuration(durationStr);
    if (!duration) return interaction.reply({ embeds: [errorEmbed('Invalid duration format. Use formats like 1h, 1d, 1w.')] });

    const msDuration = duration;
    if (msDuration > 2419200000) return interaction.reply({ embeds: [errorEmbed('Timeout duration cannot exceed 28 days.')] });

    try {
      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'timeout',
        reason: `${reason} (Duration: ${durationStr})`,
        case_number: caseNumber
      });

      await target.timeout(msDuration, reason);
      await target.send({ embeds: [errorEmbed(`You have been timed out in **${interaction.guild.name}** for ${durationStr}. Reason: ${reason}`)] }).catch(() => {});

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Timed out** ${target.user.tag} (${target.id}) for ${durationStr}\n**Moderator:** ${member.user.tag}\n**Reason:** ${reason}\n**Case:** #${caseNumber}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully timed out ${target.user.tag} for ${durationStr}`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while trying to timeout the user.')] });
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
