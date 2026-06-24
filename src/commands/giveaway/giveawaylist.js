const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveawaylist')
    .setDescription('List all active giveaways'),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const giveaways = await db('giveaways')
        .where({ guild_id: interaction.guild.id, ended: false })
        .orderBy('end_time', 'asc');

      if (giveaways.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('No active giveaways in this server.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.giveaway || '#FFD700')
        .setTitle('Active Giveaways')
        .setTimestamp();

      const description = giveaways.map((g, i) => {
        return `**${i + 1}.** ${g.prize}\nEnds: <t:${Math.floor(new Date(g.end_time).getTime() / 1000)}:R> | Winners: ${g.winners}`;
      }).join('\n\n');

      embed.setDescription(description);
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to list giveaways.')] });
    }
  }
};
