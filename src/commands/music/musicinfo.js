const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { getShoukaku, getNode, isNodeReady, isSlashCommand, getQueue } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('musicinfo')
    .setDescription('Show music system information'),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = isSlashCommand(interaction);
            const shoukaku = getShoukaku();
            if (!shoukaku) return interaction.reply({ content: '❌ Music system not connected!' });

            const node = getNode();
            const player = shoukaku.players.get(interaction.guild.id);
            const queue = getQueue(interaction.guild.id);

            let nodeInfo = 'No nodes connected';
            if (node) {
              const ready = isNodeReady();
              const status = ready ? '🟢 Connected' : '🔴 Disconnected';
              nodeInfo = `**${node.name}**: ${status} | Players: ${node.players.size} | Region: ${node.region || 'N/A'}`;
            }

            let playerInfo = 'No player active in this guild';
            if (player) {
              const track = queue.current;
              playerInfo = [
                `**State**: ${player.track ? '▶️ Playing' : player.paused ? '⏸️ Paused' : '⏹️ Stopped'}`,
                `**Volume**: ${player.volume}%`,
                `**Queue**: ${queue.length} track(s)`,
                `**Loop**: ${queue.loop || 'none'}`,
                `**Current**: ${track ? track.info?.title || 'Unknown' : 'None'}`
              ].join('\n');
            }

            const embed = {
              title: '🎶 Music System Info',
              color: 0x1db954,
              fields: [
                { name: 'Lavalink Nodes', value: nodeInfo, inline: false },
                { name: 'Guild Player', value: playerInfo, inline: false }
              ]
            };

            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
      }
  }
};