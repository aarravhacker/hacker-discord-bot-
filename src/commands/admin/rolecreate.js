const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolecreate')
    .setDescription('Create multiple roles at once')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('names').setDescription('Role names separated by commas').setRequired(true))
    .addStringOption(opt => opt.setName('color').setDescription('Default color for all roles (hex)'))
    .addBooleanOption(opt => opt.setName('hoist').setDescription('Hoist all roles')),
  cooldown: 30,
  aliases: ['masscreaterole', 'batchrole'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const namesRaw = interaction.options?.getString('names') || args?.[0];
    if (!namesRaw) return interaction.reply({ embeds: [errorEmbed('Please provide role names separated by commas.')] });

    const names = namesRaw.split(',').map(n => n.trim()).filter(n => n);
    if (names.length === 0) return interaction.reply({ embeds: [errorEmbed('No valid role names provided.')] });
    if (names.length > 25) return interaction.reply({ embeds: [errorEmbed('Maximum 25 roles at once.')] });

    const color = interaction.options?.getString('color') || args?.[1];
    const hoist = interaction.options?.getBoolean('hoist') ?? args?.[2] === 'true';

    if (isSlash) {
      await interaction.deferReply();
    } else {
      await interaction.channel.sendTyping();
    }

    const created = [];
    const failed = [];

    for (const name of names) {
      try {
        const role = await interaction.guild.roles.create({
          name,
          color: color || undefined,
          hoist,
          reason: `Bulk created by ${user.tag}`
        });
        created.push(role);
      } catch {
        failed.push(name);
      }
    }

    let result = `Created **${created.length}** roles: ${created.map(r => r.toString()).join(', ')}`;
    if (failed.length > 0) result += `\nFailed to create: ${failed.join(', ')}`;

    if (isSlash) {
      await interaction.editReply({ embeds: [successEmbed(result)] });
    } else {
      await interaction.reply({ embeds: [successEmbed(result)] });
    }
  }
};
