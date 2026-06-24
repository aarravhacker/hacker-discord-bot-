const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { getShoukaku, isSlashCommand, getQueue } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loopqueue')
    .setDescription('Toggle queue loop mode'),
  cooldown: 2,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = isSlashCommand(interaction);
            const shoukaku = getShoukaku();
            if (!shoukaku) return interaction.reply({ content: '❌ Music system not connected!' });

            const player = shoukaku.players.get(interaction.guild.id);
            if (!player) return interaction.reply({ content: '❌ Nothing is playing!' });

            const queue = getQueue(interaction.guild.id);
            if (queue.loop === 'queue') {
              queue.loop = 'none';
              await interaction.reply('➡️ Queue loop disabled');
            } else {
              queue.loop = 'queue';
              await interaction.reply('🔁 Queue loop enabled');
            }
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
      }
  }
};