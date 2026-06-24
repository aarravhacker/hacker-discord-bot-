const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleposition')
    .setDescription('Change role position or view role hierarchy')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('move').setDescription('Move a role to a position')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
      .addIntegerOption(opt => opt.setName('position').setDescription('New position').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('View role hierarchy')),
  cooldown: 3,
  aliases: ['rpos', 'rolepos'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const sub = interaction.options?.getSubcommand() || args?.[0];

    if (sub === 'list') {
      const roles = interaction.guild.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position);
      const list = roles.map(r => `**${r.position}.** ${r} (${r.members.size} members)`).join('\n');
      return interaction.reply({ embeds: [infoEmbed(list.slice(0, 4000))] });
    }

    if (sub === 'move') {
      const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.get(args?.[1]?.replace(/[<@&>]/g, ''));
      const position = interaction.options?.getInteger('position') || parseInt(args?.[2]);

      if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });
      if (!position || position < 1) return interaction.reply({ embeds: [errorEmbed('Please provide a valid position.')] });

      try {
        await role.setPosition(position, `Position changed by ${user.tag}`);
        return interaction.reply({ embeds: [successEmbed(`Moved ${role} to position **${position}**`)] });
      } catch (err) {
        return await interaction.reply({ embeds: [errorEmbed(`Failed: ${err.message}`)] });
      }
    }

    return interaction.reply({ embeds: [errorEmbed('Invalid subcommand. Use `move` or `list`.')] });
  }
};
