const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { getShoukaku, isSlashCommand } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quiet')
    .setDescription('Set volume to low (10%)'),
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

            await player.setGlobalVolume(10);
            await interaction.reply('🔈 Volume set to **10%** (quiet)');
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
      }
  }
};