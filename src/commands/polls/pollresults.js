const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pollresults')
    .setDescription('Get poll results')
    .addStringOption(opt => opt.setName('messageid').setDescription('Poll message ID').setRequired(true)),
  cooldown: 5,
  aliases: ['results'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const messageId = interaction.options?.getString('messageid') || args[0];
      if (!messageId) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /pollresults <messageId>')] });
      }

      const db = getDB();
      const poll = await db('polls').where({ message_id: messageId, guild_id: interaction.guild.id }).first();

      if (!poll) {
        return interaction.reply({ embeds: [errorEmbed('Poll not found!')] });
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
      const results = [];

      for (let i = 0; i < options.length; i++) {
        const reaction = message.reactions.cache.get(reactions[i]);
        const count = reaction ? reaction.count - 1 : 0;
        totalVotes += count;
        results.push({ option: options[i], votes: count });
      }

      results.sort((a, b) => b.votes - a.votes);

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.poll || '#3498DB')
        .setTitle(`📊 ${poll.question}`)
        .setTimestamp();

      if (totalVotes === 0) {
        embed.setDescription('No votes yet!');
      } else {
        const description = results.map((r, i) => {
          const bar = totalVotes > 0 ? '█'.repeat(Math.round((r.votes / totalVotes) * 20)) : '';
          return `**${i + 1}.** ${r.option}\n${bar} ${r.votes} vote(s) (${totalVotes > 0 ? Math.round((r.votes / totalVotes) * 100) : 0}%)`;
        }).join('\n\n');
        embed.setDescription(description);
        embed.setFooter({ text: `Total votes: ${totalVotes}` });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to get poll results.')] });
    }
  }
};
