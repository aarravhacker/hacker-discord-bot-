const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purgeimages')
    .setDescription('Purge image messages from a channel')
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to check (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  cooldown: 5,
  aliases: ['pi'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const amount = isSlash ? interaction.options?.getInteger('amount') : parseInt(args?.[0]);

    if (!amount || amount < 1 || amount > 100) return interaction.reply({ embeds: [errorEmbed('Please provide a number between 1 and 100.')] });

    try {
      const channel = interaction.channel;
      const messages = await channel.messages.fetch({ limit: 100 });
      const imageMessages = messages.filter(m => {
        return m.attachments.size > 0 || m.embeds.length > 0;
      }).first(amount);
      const deleted = await channel.bulkDelete(imageMessages, true);

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: 'bulk',
        moderator_id: member.id,
        action: 'purgeimages',
        reason: `Purged ${deleted.size} image messages in ${channel.name}`,
        case_number: caseNumber
      });

      return interaction.reply({ embeds: [successEmbed(`Successfully deleted ${deleted.size} image messages.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while purging image messages.')] });
    }
  }
};
