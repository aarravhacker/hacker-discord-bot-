const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clonechannel')
    .setDescription('Clone a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to clone').setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('Name for the cloned channel')),
  cooldown: 5,
  aliases: ['chclone', 'copychannel'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
    if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

    const name = interaction.options?.getString('name') || args?.[1];

    try {
      const cloned = await channel.clone({
        name: name || channel.name,
        reason: `Cloned by ${user.tag}`
      });
      await interaction.reply({
        embeds: [successEmbed(`Cloned ${channel} as ${cloned}`)]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to clone channel: ${err.message}`)] });
    }
  }
};
