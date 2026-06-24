const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrolechannel')
    .setDescription('Set or change the channel for a reaction role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('id').setDescription('Reaction role ID').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('The new channel').setRequired(true)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      try {
            const db = getDB();
            const id = isSlash ? interaction.options?.getInteger('id') : (args?.[0] ? parseInt(args[0]) : null);
            const channel = isSlash ? interaction.options?.getChannel('channel') : (args?.[1] ? interaction.guild.channels.cache.get(args[1].replace(/[<>#]/g, '')) : null);

            if (!channel) return interaction.reply({ embeds: [errorEmbed('Invalid Channel', 'Channel not found.')] });
            if (!channel.isTextBased()) return interaction.reply({ embeds: [errorEmbed('Invalid Channel', 'Channel must be a text channel.')] });

            const updated = await db('reaction_roles').where({ id, guild_id: interaction.guild.id }).update({ channel_id: channel.id });
            if (!updated) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Reaction role not found.')] });

            return interaction.reply({ embeds: [successEmbed('Updated', `Reaction role #${id} channel set to ${channel}.`)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
