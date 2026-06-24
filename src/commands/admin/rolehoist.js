const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolehoist')
    .setDescription('Toggle hoist (show separately) on a role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
    .addBooleanOption(opt => opt.setName('hoist').setDescription('Enable or disable hoist').setRequired(true)),
  cooldown: 3,
  aliases: ['sethoist', 'togglehoist'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.get(args?.[0]?.replace(/[<@&>]/g, ''));
    if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });

    const hoist = interaction.options?.getBoolean('hoist') ?? (args?.[1] !== 'false');

    try {
      await role.setHoist(hoist, `Hoist changed by ${user.tag}`);
      await interaction.reply({
        embeds: [successEmbed(`${hoist ? '✅ Enabled' : '❌ Disabled'} hoist for ${role}`)]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed: ${err.message}`)] });
    }
  }
};
