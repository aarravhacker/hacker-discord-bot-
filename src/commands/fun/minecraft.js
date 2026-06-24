const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('minecraft')
    .setDescription('Get Minecraft server info')
    .addStringOption(opt =>
      opt.setName('server').setDescription('Server IP address').setRequired(true)
    ),
  cooldown: 10,
  aliases: ['mc', 'mcping'],
  prefix: true,

  async execute(interaction, args) {
    const server = interaction.options.getString('server') || args[0];

    if (!server) {
      return interaction.reply({
        embeds: [errorEmbed('Please provide a server IP.')],
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#4caf50')
      .setTitle('Minecraft Server Info')
      .addFields(
        { name: 'Server', value: server, inline: true },
        { name: 'Status', value: '✅ Online (simulated)', inline: true },
        { name: 'Players', value: '42/200', inline: true },
        { name: 'Version', value: '1.20.4', inline: true },
        { name: 'Ping', value: '24ms', inline: true },
        { name: 'Motd', value: 'Welcome to the server!' }
      )
      .setFooter({ text: 'Simulated data — use a real API for live info' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
