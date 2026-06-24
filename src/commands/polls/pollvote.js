const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pollvote')
    .setDescription('Vote on a poll')
    .addStringOption(opt => opt.setName('messageid').setDescription('Poll message ID').setRequired(true))
    .addIntegerOption(opt => opt.setName('option').setDescription('Option number to vote for').setRequired(true)),
  cooldown: 3,
  aliases: ['vote'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const messageId = interaction.options?.getString('messageid') || args[0];
      const optionNum = interaction.options?.getInteger('option') || parseInt(args[1]);

      if (!messageId || !optionNum) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /pollvote <messageId> <option number>')] });
      }

      const db = getDB();
      const poll = await db('polls').where({ message_id: messageId, guild_id: interaction.guild.id }).first();

      if (!poll) {
        return interaction.reply({ embeds: [errorEmbed('Poll not found!')] });
      }

      if (poll.ended) {
        return interaction.reply({ embeds: [errorEmbed('This poll has ended!')] });
      }

      const options = JSON.parse(poll.options);
      if (optionNum < 1 || optionNum > options.length) {
        return interaction.reply({ embeds: [errorEmbed(`Invalid option. Choose between 1 and ${options.length}`)] });
      }

      const channel = interaction.guild.channels.cache.get(poll.channel_id);
      if (!channel) {
        return interaction.reply({ embeds: [errorEmbed('Poll channel not found!')] });
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) {
        return interaction.reply({ embeds: [errorEmbed('Poll message not found!')] });
      }

      const reactions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      const reaction = message.reactions.cache.get(reactions[optionNum - 1]);
      if (reaction) {
        await reaction.users.add(user.id);
      }

      await interaction.reply({ embeds: [infoEmbed(`You voted for option ${optionNum}: **${options[optionNum - 1]}**`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to vote.')] });
    }
  }
};
