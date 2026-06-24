const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createrole')
    .setDescription('Create a new role')
    .addStringOption(option => option.setName('name').setDescription('Role name').setRequired(true))
    .addStringOption(option => option.setName('color').setDescription('Role color (hex code)'))
    .addBooleanOption(option => option.setName('hoist').setDescription('Show role separately'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  cooldown: 10,
  aliases: ['cr'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const name = isSlash ? interaction.options?.getString('name') : args?.[0];
    const colorStr = isSlash ? interaction.options?.getString('color') : args?.[1];
    const hoist = isSlash ? interaction.options?.getBoolean('hoist') : false;

    if (!name) return interaction.reply({ embeds: [errorEmbed('Please provide a role name.')] });

    try {
      const roleOptions = { name, hoist };
      if (colorStr) {
        const color = parseInt(colorStr.replace('#', ''), 16);
        if (isNaN(color)) return interaction.reply({ embeds: [errorEmbed('Invalid color format. Use a hex code like #FF0000.')] });
        roleOptions.color = color;
      }

      const role = await interaction.guild.roles.create(roleOptions);

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: 'role',
        moderator_id: member.id,
        action: 'createrole',
        reason: `Created role ${role.name}`,
        case_number: caseNumber
      });

      return interaction.reply({ embeds: [successEmbed(`Successfully created role ${role}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while creating the role.')] });
    }
  }
};
