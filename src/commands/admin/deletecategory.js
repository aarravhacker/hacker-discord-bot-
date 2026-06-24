const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletecategory')
    .setDescription('Delete a category')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('category').setDescription('Category to delete').addChannelTypes(ChannelType.GuildCategory).setRequired(true)
    ),
  cooldown: 5,
  aliases: ['catdelete', 'removecategory'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const category = interaction.options?.getChannel('category') || interaction.guild.channels.cache.get(args?.[0]);
    if (!category || category.type !== ChannelType.GuildCategory) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a valid category.')] });
    }

    try {
      const name = category.name;
      await category.delete();
      await interaction.reply({ embeds: [successEmbed(`Deleted category **${name}**`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to delete category: ${err.message}`)] });
    }
  }
};
