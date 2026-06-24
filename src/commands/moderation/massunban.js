const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('massunban')
    .setDescription('Unban multiple users at once')
    .addStringOption(option => option.setName('users').setDescription('User IDs separated by spaces').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the mass unban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 30,
  aliases: ['mub'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const usersStr = isSlash ? interaction.options?.getString('users') : args?.[0];
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(1).join(' ') || 'No reason provided');

    if (!usersStr) return interaction.reply({ embeds: [errorEmbed('Please provide user IDs separated by spaces.')] });

    const userIds = usersStr.split(/\s+/).map(id => id.replace(/[<>@!]/g, ''));
    if (userIds.length > 50) return interaction.reply({ embeds: [errorEmbed('You can only mass unban up to 50 users at a time.')] });

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
      try {
        const banList = await interaction.guild.bans.fetch();
        if (!banList.has(userId)) {
          results.push(`❌ ${userId}: Not banned`);
          failCount++;
          continue;
        }

        const caseNumber = await getCaseNumber(interaction.guild.id);
        await addModLog({
          guild_id: interaction.guild.id,
          user_id: userId,
          moderator_id: member.id,
          action: 'massunban',
          reason,
          case_number: caseNumber
        });

        await interaction.guild.members.unban(userId, reason);
        results.push(`✅ ${userId}: Unbanned`);
        successCount++;
      } catch (err) {
        results.push(`❌ ${userId}: ${err.message}`);
        failCount++;
      }
    }

    const guildConfig = await getGuild(interaction.guild.id);
    if (guildConfig?.mod_log_channel) {
      const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
      if (logChannel) {
        logChannel.send({
          embeds: [successEmbed(`**Mass Unban** by ${member.user.tag}\n**Unbanned:** ${successCount}\n**Failed:** ${failCount}\n**Reason:** ${reason}`)]
        });
      }
    }

    const resultStr = results.join('\n');
    return interaction.reply({
      embeds: [successEmbed(`Mass unban complete!\n**Success:** ${successCount}\n**Failed:** ${failCount}\n\n${resultStr}`)]
    });
  }
};
