const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveawayreroll')
    .setDescription('Reroll a giveaway winner')
    .addStringOption(opt => opt.setName('messageid').setDescription('Giveaway message ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,
  aliases: ['reroll', 'greroll'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const messageId = interaction.options?.getString('messageid') || args[0];
      if (!messageId) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /giveawayreroll <messageId>')] });
      }

      const db = getDB();
      const giveaway = await db('giveaways').where({ message_id: messageId, guild_id: interaction.guild.id }).first();

      if (!giveaway) {
        return interaction.reply({ embeds: [errorEmbed('Giveaway not found!')] });
      }

      if (!giveaway.ended) {
        return interaction.reply({ embeds: [errorEmbed('This giveaway has not ended yet!')] });
      }

      const channel = interaction.guild.channels.cache.get(giveaway.channel_id);
      if (!channel) {
        return interaction.reply({ embeds: [errorEmbed('Giveaway channel not found!')] });
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) {
        return interaction.reply({ embeds: [errorEmbed('Giveaway message not found!')] });
      }

      const reaction = message.reactions.cache.get('🎉');
      if (!reaction) {
        return interaction.reply({ embeds: [errorEmbed('No reactions found on the giveaway.')] });
      }

      const users = await reaction.users.fetch();
      const entrants = users.filter(u => !u.bot).map(u => u.id);

      if (entrants.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('No valid entrants to reroll!')] });
      }

      const winnerId = entrants[Math.floor(Math.random() * entrants.length)];
      await channel.send(`Congratulations <@${winnerId}>! You won **${giveaway.prize}** (rerolled)!`);
      await interaction.reply({ embeds: [successEmbed(`Rerolled! New winner: <@${winnerId}>`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to reroll giveaway.')] });
    }
  }
};
