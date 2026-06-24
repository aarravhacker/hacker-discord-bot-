const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purgeall')
    .setDescription('Purge messages from all channels')
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete per channel (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 60,
  aliases: ['pa'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const amount = isSlash ? interaction.options?.getInteger('amount') : parseInt(args?.[0]);

    if (!amount || amount < 1 || amount > 100) return interaction.reply({ embeds: [errorEmbed('Please provide a number between 1 and 100.')] });

    try {
      const channels = interaction.guild.channels.cache.filter(c => c.isTextBased() && c.viewable);
      let totalDeleted = 0;

      for (const [, channel] of channels) {
        try {
          const deleted = await channel.bulkDelete(amount, true);
          totalDeleted += deleted.size;
        } catch (e) {
          console.error(`Failed to purge ${channel.name}:`, e);
        }
      }

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: 'purgeall',
        moderator_id: member.id,
        action: 'purgeall',
        reason: `Purged ${totalDeleted} messages across ${channels.size} channels`,
        case_number: caseNumber
      });

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Purge All** by ${member.user.tag}\n**Total deleted:** ${totalDeleted} messages\n**Channels:** ${channels.size}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully purged ${totalDeleted} messages across ${channels.size} channels.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while purging all channels.')] });
    }
  }
};
