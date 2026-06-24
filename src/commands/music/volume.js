const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { getShoukaku, isSlashCommand } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the volume (0-100)')
    .addIntegerOption(opt => opt.setName('level').setDescription('Volume level 0-100').setRequired(true).setMinValue(0).setMaxValue(100)),
  cooldown: 2,
  aliases: ['vol'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = isSlashCommand(interaction);
      const shoukaku = getShoukaku();
      if (!shoukaku) return interaction.reply({ content: '❌ Music system not connected!' });

      const player = shoukaku.players.get(interaction.guild.id);
      if (!player) return interaction.reply({ content: '❌ Nothing is playing!' });

      let volume;
      if (isSlash) {
        volume = interaction.options?.getInteger('level');
      } else {
        volume = parseInt(args?.[0]);
      }

      if (isNaN(volume) || volume < 0 || volume > 100) {
        return interaction.reply({ content: '❌ Please provide a valid volume between 0 and 100!' });
      }

      await player.setGlobalVolume(volume);
      await interaction.reply(`🔊 Volume set to **${volume}%**`);
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
    }
  }
};
