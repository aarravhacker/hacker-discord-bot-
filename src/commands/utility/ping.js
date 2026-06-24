const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Shows bot latency and API response time'),
  cooldown: 3,
  aliases: ['latency'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();

      const sent = await interaction.reply({ embeds: [new EmbedBuilder().setDescription('Pinging...').setColor(config.embedColors.info)], fetchReply: true });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      const apiLatency = Math.round(interaction.client.ws.ping);

      const embed = new EmbedBuilder()
        .setTitle('Pong!')
        .setColor(config.embedColors.success)
        .addFields(
          { name: 'Roundtrip Latency', value: `\`${latency}ms\``, inline: true },
          { name: 'API Latency', value: `\`${apiLatency}ms\``, inline: true }
        )
        .setTimestamp();

      await sent.edit({ embeds: [embed] });
    } catch (err) {
      interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
    }
  }
};
