const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempkick')
    .setDescription('Temporarily kick a member (auto-rejoin after duration)')
    .addUserOption(option => option.setName('user').setDescription('The user to tempkick').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('Duration before rejoin (e.g., 1h, 1d)').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the tempkick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  cooldown: 5,
  aliases: ['tk'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const durationStr = isSlash ? interaction.options?.getString('duration') : args?.[1];
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(2).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user to tempkick.')] });
    if (!durationStr) return interaction.reply({ embeds: [errorEmbed('Please provide a duration.')] });
    if (!target.kickable) return interaction.reply({ embeds: [errorEmbed('I cannot kick this user.')] });

    const duration = parseDuration(durationStr);
    if (!duration) return interaction.reply({ embeds: [errorEmbed('Invalid duration format.')] });

    try {
      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'tempkick',
        reason: `${reason} (Duration: ${durationStr})`,
        case_number: caseNumber
      });

      const invite = await interaction.channel.createInvite({ maxAge: duration / 1000, maxUses: 1, temporary: false });
      await target.send({ embeds: [errorEmbed(`You have been kicked from **${interaction.guild.name}** for: ${reason}\nYou can rejoin using this invite (valid for ${durationStr}): ${invite.url}`)] }).catch(() => {});
      await target.kick(reason);

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Tempkicked** ${target.user.tag} (${target.id}) for ${durationStr}\n**Moderator:** ${member.user.tag}\n**Reason:** ${reason}\n**Case:** #${caseNumber}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully tempkicked ${target.user.tag} for ${durationStr}. Invite sent to their DMs.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while trying to tempkick the user.')] });
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
