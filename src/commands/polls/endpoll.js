const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('endpoll')
    .setDescription('End a poll')
    .addStringOption(opt => opt.setName('messageid').setDescription('Poll message ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,
  aliases: ['closepoll'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const messageId = interaction.options?.getString('messageid') || args[0];
      if (!messageId) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /endpoll <messageId>')] });
      }

      const db = getDB();
      const poll = await db('polls').where({ message_id: messageId, guild_id: interaction.guild.id }).first();

      if (!poll) {
        return interaction.reply({ embeds: [errorEmbed('Poll not found!')] });
      }

      if (poll.ended) {
        return interaction.reply({ embeds: [errorEmbed('This poll has already ended!')] });
      }

      const channel = interaction.guild.channels.cache.get(poll.channel_id);
      if (!channel) {
        return interaction.reply({ embeds: [errorEmbed('Poll channel not found!')] });
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) {
        return interaction.reply({ embeds: [errorEmbed('Poll message not found!')] });
      }

      const options = JSON.parse(poll.options);
      const reactions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      let totalVotes = 0;
      let winner = { option: 'No votes', votes: 0 };

      for (let i = 0; i < options.length; i++) {
        const reaction = message.reactions.cache.get(reactions[i]);
        const count = reaction ? reaction.count - 1 : 0;
        totalVotes += count;
        if (count > winner.votes) {
          winner = { option: options[i], votes: count };
        }
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.poll || '#3498DB')
        .setTitle(`📊 ${poll.question} - ENDED`)
        .setDescription(`**Winner:** ${winner.option} (${winner.votes} vote(s))\nTotal votes: ${totalVotes}`)
        .setTimestamp();

      await message.edit({ embeds: [embed] });
      await db('polls').where({ message_id: messageId }).update({ ended: true });

      await interaction.reply({ embeds: [successEmbed(`Poll ended! Winner: **${winner.option}** with ${winner.votes} vote(s)`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to end poll.')] });
    }
  }
};
