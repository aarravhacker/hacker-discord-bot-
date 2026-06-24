const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rradd')
    .setDescription('Add an emoji-role pair (short alias)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('id').setDescription('Reaction role ID').setRequired(true))
    .addStringOption(opt => opt.setName('emoji').setDescription('The emoji').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('The role').setRequired(true)),
  cooldown: 5,
  aliases: ['reactionroleadd'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const db = getDB();
    const id = isSlash ? interaction.options?.getInteger('id') : (args?.[0] ? parseInt(args[0]) : null);
    const emoji = isSlash ? interaction.options?.getString('emoji') : args?.[1];
    const role = isSlash ? interaction.options?.getRole('role') : (args?.[2] ? interaction.guild.roles.cache.get(args[2].replace(/[<@&>]/g, '')) : null);

    const rr = await db('reaction_roles').where({ id, guild_id: interaction.guild.id }).first();
    if (!rr) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Reaction role not found.')] });

    const roles = Array.isArray(rr.roles) ? [...rr.roles] : [];
    roles.push({ emoji, roleId: role.id });
    await db('reaction_roles').where({ id }).update({ roles: JSON.stringify(roles) });

    try {
      const channel = await interaction.guild.channels.fetch(rr.channel_id);
      const message = await channel.messages.fetch(rr.message_id);
      await message.react(emoji);
    } catch (e) {}

    return interaction.reply({ embeds: [successEmbed('Added', `Added ${emoji} → ${role} to reaction role #${id}.`)] });
  }
};
