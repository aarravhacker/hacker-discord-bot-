const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roblox')
    .setDescription('Get Roblox user info')
    .addStringOption(opt =>
      opt.setName('username').setDescription('Roblox username').setRequired(true)
    ),
  cooldown: 10,
  aliases: ['rbx'],
  prefix: true,

  async execute(interaction, args) {
    const username = interaction.options.getString('username') || args.join(' ');

    if (!username) {
      return interaction.reply({
        embeds: [errorEmbed('Please provide a Roblox username.')],
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#e2231a')
      .setTitle('Roblox User Info')
      .addFields(
        { name: 'Username', value: username, inline: true },
        { name: 'ID', value: `${Math.floor(Math.random() * 9000000000) + 1000000000}`, inline: true },
        { name: 'Status', value: 'Online', inline: true },
        { name: 'Friends', value: `${Math.floor(Math.random() * 5000)}`, inline: true },
        { name: 'Followers', value: `${Math.floor(Math.random() * 10000)}`, inline: true },
        { name: 'Created', value: 'Jan 2018', inline: true }
      )
      .setFooter({ text: 'Simulated data — use Roblox API for real info' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
