const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forge')
    .setDescription('Create custom roles or items')
    .addStringOption(opt => opt.setName('type').setDescription('Type: role').setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('Name').setRequired(true))
    .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g. ff0000)'))
    .addStringOption(opt => opt.setName('hoist').setDescription('Hoist above others? (true/false)')),
  cooldown: 0,
  aliases: ['fg'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    const type = isSlash ? interaction.options?.getString('type') : args?.[0];
    const name = isSlash ? interaction.options?.getString('name') : args?.[1];
    const colorHex = isSlash ? interaction.options?.getString('color') : args?.[2];
    const hoistStr = isSlash ? interaction.options?.getString('hoist') : args?.[3];

    if (!type || !name) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('Missing Args').setDescription('Usage: `!forge role <name> [color] [hoist]`')
      ] });
    }

    if (type === 'role') {
      try {
        const color = colorHex ? parseInt(colorHex, 16) : 0x5865f2;
        const hoist = hoistStr === 'true';

        const role = await interaction.guild.roles.create({
          name,
          color,
          hoist,
          reason: 'Role created via Forge'
        });

        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('Role Forged')
          .addFields(
            { name: 'Name', value: `${role}`, inline: true },
            { name: 'Color', value: `\`#${color.toString(16).padStart(6, '0')}\``, inline: true },
            { name: 'Hoist', value: hoist ? '`Yes`' : '`No`', inline: true },
            { name: 'ID', value: `\`${role.id}\``, inline: true }
          )
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setColor(0xff0000).setTitle('Error').setDescription(`Failed to create role: ${err.message}`)
        ] });
      }
    }

    return interaction.reply({ embeds: [
      new EmbedBuilder().setColor(0xff0000).setTitle('Invalid Type').setDescription('Currently only `role` type is supported.')
    ] });
  }
};
