const { SlashCommandBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levelupchannel')
    .setDescription('Set the level up notification channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('The channel for level up messages').setRequired(false)
    ),
  cooldown: 5,
  aliases: ['levelupchannel', 'luchannel'],
  prefix: true,
  async execute(interaction, args) {
    if (!interaction.member?.permissions?.has('MANAGE_GUILD')) {
      return interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')] });
    }

    const guildId = interaction.guild?.id;
    const channel = interaction.options?.getChannel('channel') || interaction.mentions?.channels?.first();

    try {
      if (!channel) {
        await updateGuild(guildId, { level_up_channel: null });
        const embed = successEmbed('Level Up Channel Reset')
          .setDescription('Level up messages will now be sent in the channel where the user leveled up.')
          .setColor(0x00FF00);
        return interaction.reply({ embeds: [embed] });
      }

      await updateGuild(guildId, { level_up_channel: channel.id });

      const embed = successEmbed('Level Up Channel Set')
        .setDescription(`Level up messages will now be sent in ${channel}.`)
        .setColor(0x00FF00);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while setting level up channel.')] });
    }
  }
};
