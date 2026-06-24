const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveawayend')
    .setDescription('End a giveaway early')
    .addStringOption(opt => opt.setName('messageid').setDescription('Giveaway message ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,
  aliases: ['gend', 'gstop'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const messageId = interaction.options?.getString('messageid') || args[0];
      if (!messageId) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /giveawayend <messageId>')] });
      }

      const db = getDB();
      const giveaway = await db('giveaways').where({ message_id: messageId, guild_id: interaction.guild.id }).first();

      if (!giveaway) {
        return interaction.reply({ embeds: [errorEmbed('Giveaway not found!')] });
      }

      if (giveaway.ended) {
        return interaction.reply({ embeds: [errorEmbed('This giveaway has already ended!')] });
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
        const embed = new EmbedBuilder()
          .setColor(config.embedColors.error || '#FF0000')
          .setTitle('🎉 GIVEAWAY ENDED 🎉')
          .setDescription(`**Prize:** ${giveaway.prize}\n\nNo valid entrants!`);
        await message.edit({ embeds: [embed] });
        await db('giveaways').where({ message_id: messageId }).update({ ended: true });
        return interaction.reply({ embeds: [successEmbed('Giveaway ended with no valid entrants.')] });
      }

      const winnerCount = Math.min(giveaway.winners, entrants.length);
      const winners = [];
      const shuffled = [...entrants].sort(() => 0.5 - Math.random());
      for (let i = 0; i < winnerCount; i++) {
        winners.push(shuffled[i]);
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.giveaway || '#FFD700')
        .setTitle('🎉 GIVEAWAY ENDED 🎉')
        .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner(s):** ${winners.map(id => `<@${id}>`).join(', ')}`)
        .setTimestamp();

      await message.edit({ embeds: [embed] });
      await db('giveaways').where({ message_id: messageId }).update({ ended: true });

      await channel.send(`Congratulations ${winners.map(id => `<@${id}>`).join(', ')}! You won **${giveaway.prize}**!`);
      await interaction.reply({ embeds: [successEmbed(`Giveaway ended! Winner(s): ${winners.map(id => `<@${id}>`).join(', ')}`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to end giveaway.')] });
    }
  }
};
