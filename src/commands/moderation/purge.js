const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Purge messages from a channel')
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  cooldown: 5,
  aliases: ['clear', 'prune'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = interaction.member || interaction.guild.members.cache.get(interaction.author?.id);
    const amount = isSlash ? interaction.options?.getInteger('amount') : parseInt(args?.[0]);

    if (!amount || amount < 1 || amount > 100) return interaction.reply({ embeds: [errorEmbed('Please provide a number between 1 and 100.')] });

    try {
      const channel = interaction.channel;
      const deleted = await channel.bulkDelete(amount, true);

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: 'bulk',
        moderator_id: member.id,
        action: 'purge',
        reason: `Purged ${deleted.size} messages in ${channel.name}`,
        case_number: caseNumber
      });

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Purged** ${deleted.size} messages in <#${channel.id}>\n**Moderator:** ${member.user.tag}\n**Case:** #${caseNumber}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully deleted ${deleted.size} messages.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while purging messages.')] });
    }
  }
};
