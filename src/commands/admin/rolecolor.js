const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolecolor')
    .setDescription('Change a role color')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
    .addStringOption(opt => opt.setName('color').setDescription('Color (hex, e.g. #ff5733 or random)').setRequired(true)),
  cooldown: 3,
  aliases: ['setcolor', 'rcolor'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.get(args?.[0]?.replace(/[<@&>]/g, ''));
    if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });

    let color = interaction.options?.getString('color') || args?.[1] || 'random';

    if (color.toLowerCase() === 'random') {
      color = Math.floor(Math.random() * 0xFFFFFF);
    }

    try {
      await role.setColor(color, `Color changed by ${user.tag}`);
      await interaction.reply({
        embeds: [successEmbed(`Color of ${role} changed to **${role.hexColor}**`)]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to change color: ${err.message}`)] });
    }
  }
};
