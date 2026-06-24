const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createcategory')
    .setDescription('Create a new category')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('name').setDescription('Category name').setRequired(true)),
  cooldown: 3,
  aliases: ['catcreate', 'addcategory'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const name = interaction.options?.getString('name') || args?.[0];
    if (!name) return interaction.reply({ embeds: [errorEmbed('Please provide a category name.')] });

    try {
      const category = await interaction.guild.channels.create({
        name,
        type: 4
      });
      await interaction.reply({ embeds: [successEmbed(`Created category **${category.name}**`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to create category: ${err.message}`)] });
    }
  }
};
